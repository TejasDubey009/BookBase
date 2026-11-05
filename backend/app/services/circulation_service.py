"""
The lending engine: checkout, FIFO waitlist and returns. Each public function is one atomic
transaction. Every operation on a title first locks that title's row, so on PostgreSQL two
requests for the same book run one after the other. A return reaches the admin portal as a
request raised by a student, and confirming it hands the copy straight to the next waiting patron.
"""
import datetime
from typing import Optional

from app.config import (
    COPY_CONDITIONS,
    LOAN_DURATION_DAYS,
    MAX_FINE_DAYS,
    MAX_LOANS_PER_USER,
    MAX_OUTSTANDING_FINES_FOR_BORROWING,
    OVERDUE_FINE_RATE_PER_DAY,
)
from app.core.clock import utc_now, utc_now_iso
from app.core.errors import BadRequestError, ConflictError, NotFoundError
from app.core.security import CurrentUser, ensure_can_act_for
from app.db.audit import log_audit
from app.db.connection import FOR_NO_KEY_UPDATE, FOR_UPDATE, immediate_transaction
from app.db.queries import RETURN_REQUEST_DETAILS_SELECT, count_active_loans
from app.db.types import Connection, Cursor, Row
from app.schemas.circulation import (
    CheckoutRequest,
    CheckoutResponse,
    LendingPolicyOut,
    ReturnRequestConfirm,
    ReturnRequestCreate,
    ReturnResponse,
    WaitlistRequest,
    WaitlistResponse,
)

ISSUED_VIA_DIRECT = "Direct Checkout"
ISSUED_VIA_WAITLIST = "Waitlist Auto-Fulfill"


def get_lending_policy() -> LendingPolicyOut:
    return LendingPolicyOut(
        overdue_fine_rate_per_day=OVERDUE_FINE_RATE_PER_DAY,
        loan_duration_days=LOAN_DURATION_DAYS,
        max_loans_per_user=MAX_LOANS_PER_USER,
        max_fine_days=MAX_FINE_DAYS,
        copy_conditions=list(COPY_CONDITIONS)
    )


def overdue_days(due_date: datetime.datetime, at: datetime.datetime) -> int:
    """Whole days overdue. Any part of a first late day counts as one day."""
    if at <= due_date:
        return 0
    overdue = at - due_date
    if overdue.days == 0 and overdue.seconds > 0:
        return 1
    return overdue.days


def calculate_overdue_fine(due_date: datetime.datetime, returned_at: datetime.datetime) -> float:
    return round(min(overdue_days(due_date, returned_at), MAX_FINE_DAYS) * OVERDUE_FINE_RATE_PER_DAY, 2)


def _lock_book(cursor: Cursor, book_id: int) -> None:
    """Held until the transaction ends. No two checkouts, waitlist joins or returns of a title overlap."""
    cursor.execute(f"SELECT book_id FROM books WHERE book_id = ?{FOR_UPDATE}", (book_id,))


def _valid_condition(condition: str) -> str:
    if condition not in COPY_CONDITIONS:
        raise BadRequestError(f"Condition must be one of: {', '.join(COPY_CONDITIONS)}")
    return condition


def _user_holds_title(cursor: Cursor, user_id: int, book_id: int) -> bool:
    cursor.execute(
        """
        SELECT cl.loan_id
        FROM circulation_loans cl
        JOIN book_copies bc ON cl.copy_id = bc.copy_id
        WHERE cl.user_id = ? AND bc.book_id = ? AND cl.return_date IS NULL
        """,
        (user_id, book_id)
    )
    return cursor.fetchone() is not None


def _assert_can_borrow(cursor: Cursor, user_id: int, book_id: int) -> None:
    # Locked so two checkouts of different titles can't both pass the quota check
    cursor.execute(
        f"SELECT full_name, max_books_quota, outstanding_fines FROM users WHERE user_id = ?{FOR_NO_KEY_UPDATE}",
        (user_id,)
    )
    user = cursor.fetchone()
    if not user:
        raise NotFoundError("Patron not found")

    if user["outstanding_fines"] > MAX_OUTSTANDING_FINES_FOR_BORROWING:
        raise BadRequestError(
            f"Borrowing blocked: Outstanding fines of ₹{user['outstanding_fines']:.2f} exceed ₹{MAX_OUTSTANDING_FINES_FOR_BORROWING:.2f} limit."
        )

    active_loans_count = count_active_loans(cursor, user_id)
    if active_loans_count >= user["max_books_quota"]:
        raise BadRequestError(
            f"Quota reached: You already have {active_loans_count} of {user['max_books_quota']} allowed loans."
        )

    if _user_holds_title(cursor, user_id, book_id):
        raise BadRequestError("You already have an active borrowed copy of this book.")


_COPY_COLUMNS = "copy_id, book_id, barcode, shelf_location, status, condition"


def _copy_by_code(cursor: Cursor, book_id: int, barcode: str) -> Row:
    """The physical copy whose label the patron read out, checked against what they asked to borrow."""
    code = barcode.strip().upper()
    cursor.execute(f"SELECT {_COPY_COLUMNS} FROM book_copies WHERE UPPER(barcode) = ?", (code,))
    copy = cursor.fetchone()
    if not copy:
        raise NotFoundError(f"No copy has the code {code}. Check the label on the book.")
    if copy["book_id"] != book_id:
        raise BadRequestError(f"Code {code} belongs to a different book. Check the label on the book.")
    if copy["status"] != "Available":
        raise ConflictError(f"Copy {copy['barcode']} isn't available to borrow. Its status is {copy['status']}.")
    return copy


def _select_available_copy(cursor: Cursor, book_id: int, copy_id: Optional[int], barcode: Optional[str]) -> Row:
    if barcode and barcode.strip():
        return _copy_by_code(cursor, book_id, barcode)

    if copy_id:
        cursor.execute(
            f"SELECT {_COPY_COLUMNS} FROM book_copies WHERE copy_id = ? AND book_id = ? AND status = 'Available'",
            (copy_id, book_id)
        )
    else:
        cursor.execute(
            f"""
            SELECT {_COPY_COLUMNS}
            FROM book_copies
            WHERE book_id = ? AND status = 'Available'
            ORDER BY copy_id ASC
            LIMIT 1
            """,
            (book_id,)
        )

    copy = cursor.fetchone()
    if not copy:
        raise ConflictError("No physical copies available right now. Please join the FIFO Waitlist queue.")
    return copy


def _insert_loan(
    cursor: Cursor,
    copy_id: int,
    user_id: int,
    issued_at: datetime.datetime,
    issued_via: str,
    condition: str,
) -> tuple[int, str]:
    """Links the copy to the patron's profile as an active loan. Returns (loan_id, due date as ISO string)."""
    due_iso = (issued_at + datetime.timedelta(days=LOAN_DURATION_DAYS)).isoformat()
    cursor.execute(
        """
        INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, return_date, fine_assessed, issued_via, condition_at_issue)
        VALUES (?, ?, ?, ?, NULL, 0.0, ?, ?)
        """,
        (copy_id, user_id, issued_at.isoformat(), due_iso, issued_via, condition)
    )
    return cursor.lastrowid, due_iso


def checkout(db: Connection, payload: CheckoutRequest, user_id: int) -> CheckoutResponse:
    with immediate_transaction(db) as cursor:
        _lock_book(cursor, payload.book_id)
        _assert_can_borrow(cursor, user_id, payload.book_id)
        copy = _select_available_copy(cursor, payload.book_id, payload.copy_id, payload.barcode)

        now = utc_now()
        now_iso = now.isoformat()
        loan_id, due_iso = _insert_loan(cursor, copy["copy_id"], user_id, now, ISSUED_VIA_DIRECT, copy["condition"])

        cursor.execute("UPDATE book_copies SET status = 'Issued' WHERE copy_id = ?", (copy["copy_id"],))

        # Clean up any waiting reservation this user had for this book
        cursor.execute(
            """
            UPDATE waitlist_reservations
            SET status = 'Fulfilled', fulfilled_at = ?
            WHERE book_id = ? AND user_id = ? AND status = 'Waiting'
            """,
            (now_iso, payload.book_id, user_id)
        )

        log_audit(
            db,
            "TX_CHECKOUT",
            f"SELECT book_id FROM books WHERE book_id={payload.book_id} FOR UPDATE; "
            f"INSERT INTO circulation_loans (loan_id={loan_id}, user_id={user_id}, copy_id={copy['copy_id']}, due='{due_iso[:10]}'); "
            f"UPDATE book_copies SET status='Issued' WHERE copy_id={copy['copy_id']};",
            f"user_id: {user_id}, book_id: {payload.book_id}, copy_id: {copy['copy_id']}, barcode: {copy['barcode']}, condition: {copy['condition']}, loan_id: {loan_id}"
        )

    return CheckoutResponse(
        success=True,
        loan_id=loan_id,
        book_id=payload.book_id,
        copy_id=copy["copy_id"],
        barcode=copy["barcode"],
        due_date=due_iso,
        issued_via=ISSUED_VIA_DIRECT,
        message=f"Book checked out! Copy {copy['barcode']} is due back on {due_iso[:10]}."
    )


def join_waitlist(db: Connection, payload: WaitlistRequest, user_id: int) -> WaitlistResponse:
    with immediate_transaction(db) as cursor:
        _lock_book(cursor, payload.book_id)
        cursor.execute("SELECT full_name FROM users WHERE user_id = ?", (user_id,))
        if not cursor.fetchone():
            raise NotFoundError("User not found")

        cursor.execute(
            "SELECT COUNT(*) FROM book_copies WHERE book_id = ? AND status = 'Available'",
            (payload.book_id,)
        )
        available_count = cursor.fetchone()[0]
        if available_count > 0:
            raise BadRequestError(
                f"There are {available_count} physical copies available right now! You can borrow directly instead of joining the waitlist."
            )

        if _user_holds_title(cursor, user_id, payload.book_id):
            raise BadRequestError("You already have an active loan for this book.")

        cursor.execute(
            """
            SELECT reservation_id FROM waitlist_reservations
            WHERE book_id = ? AND user_id = ? AND status = 'Waiting'
            """,
            (payload.book_id, user_id)
        )
        if cursor.fetchone():
            raise BadRequestError("You are already in the waitlist queue for this book.")

        now_iso = utc_now_iso()
        cursor.execute(
            """
            INSERT INTO waitlist_reservations (book_id, user_id, status, created_at)
            VALUES (?, ?, 'Waiting', ?)
            """,
            (payload.book_id, user_id, now_iso)
        )
        reservation_id = cursor.lastrowid

        # Compute 1-based queue position
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM waitlist_reservations
            WHERE book_id = ?
              AND status = 'Waiting'
              AND (created_at < ? OR (created_at = ? AND reservation_id <= ?))
            """,
            (payload.book_id, now_iso, now_iso, reservation_id)
        )
        queue_pos = cursor.fetchone()[0]

        log_audit(
            db,
            "TX_WAITLIST_JOIN",
            f"INSERT INTO waitlist_reservations (reservation_id={reservation_id}, book_id={payload.book_id}, user_id={user_id}, status='Waiting'); "
            f"SELECT COUNT(*) as queue_position FROM waitlist_reservations WHERE book_id={payload.book_id} AND status='Waiting';",
            f"user_id: {user_id}, book_id: {payload.book_id}, reservation_id: {reservation_id}, queue_position: #{queue_pos}"
        )

    return WaitlistResponse(
        success=True,
        reservation_id=reservation_id,
        book_id=payload.book_id,
        user_id=user_id,
        queue_position=queue_pos,
        status="Waiting",
        message=f"Joined waitlist! You are Queue #{queue_pos}. The next returned copy will be automatically assigned to you when you reach #1."
    )


def cancel_reservation(db: Connection, reservation_id: int, actor: CurrentUser) -> dict:
    with immediate_transaction(db, error_prefix="") as cursor:
        reservation_sql = "SELECT reservation_id, book_id, user_id, status FROM waitlist_reservations WHERE reservation_id = ?"
        cursor.execute(reservation_sql, (reservation_id,))
        res = cursor.fetchone()
        if res:
            # Read again under the lock: a return may have just handed this patron the copy
            _lock_book(cursor, res["book_id"])
            cursor.execute(reservation_sql, (reservation_id,))
            res = cursor.fetchone()
        if not res or res["status"] != "Waiting":
            raise NotFoundError("Active reservation not found")
        ensure_can_act_for(actor, res["user_id"])

        cursor.execute(
            "UPDATE waitlist_reservations SET status = 'Cancelled' WHERE reservation_id = ?",
            (reservation_id,)
        )

        log_audit(
            db,
            "TX_WAITLIST_CANCEL",
            f"UPDATE waitlist_reservations SET status='Cancelled' WHERE reservation_id={reservation_id};",
            f"reservation_id: {reservation_id}, book_id: {res['book_id']}, user_id: {res['user_id']}"
        )

    return {"success": True, "message": "Reservation cancelled successfully"}


def _next_waiting_patron(cursor: Cursor, book_id: int) -> Optional[Row]:
    """Strict FIFO: the oldest 'Waiting' reservation for this book."""
    cursor.execute(
        """
        SELECT wr.reservation_id, wr.user_id, u.full_name, u.email
        FROM waitlist_reservations wr
        JOIN users u ON wr.user_id = u.user_id
        WHERE wr.book_id = ? AND wr.status = 'Waiting'
        ORDER BY wr.created_at ASC, wr.reservation_id ASC
        LIMIT 1
        """,
        (book_id,)
    )
    return cursor.fetchone()


def _hand_off_to_waitlist(
    db: Connection,
    cursor: Cursor,
    returned: Row,
    next_patron: Row,
    condition: str,
    now: datetime.datetime,
    fine: float,
) -> ReturnResponse:
    """The copy never touches the shelf: it goes straight to the #1 waiting patron."""
    now_iso = now.isoformat()
    next_user_id = next_patron["user_id"]
    next_user_name = next_patron["full_name"]
    next_user_email = next_patron["email"]
    res_id = next_patron["reservation_id"]

    cursor.execute(
        """
        UPDATE waitlist_reservations
        SET status = 'Fulfilled', fulfilled_at = ?
        WHERE reservation_id = ?
        """,
        (now_iso, res_id)
    )

    new_loan_id, new_due_iso = _insert_loan(cursor, returned["copy_id"], next_user_id, now, ISSUED_VIA_WAITLIST, condition)

    log_audit(
        db,
        "TRIGGER_WAITLIST_AUTO_CHECKOUT",
        f"-- [FIFO Promotion Trigger Fired]\n"
        f"UPDATE circulation_loans SET return_date='{returned['created_at']}' WHERE loan_id={returned['loan_id']};\n"
        f"UPDATE waitlist_reservations SET status='Fulfilled', fulfilled_at='{now_iso}' WHERE reservation_id={res_id};\n"
        f"INSERT INTO circulation_loans (loan_id={new_loan_id}, copy_id={returned['copy_id']}, user_id={next_user_id}, issued_via='{ISSUED_VIA_WAITLIST}', due='{new_due_iso[:10]}');\n"
        f"-- Copy {returned['barcode']} bypassed shelf and auto-assigned to Queue #1 ({next_user_name})",
        f"returned_by: {returned['user_name']} (uid:{returned['user_id']}), auto_assigned_to: {next_user_name} (uid:{next_user_id}), book: '{returned['title']}', barcode: {returned['barcode']}, new_loan_id: {new_loan_id}, fine: ₹{fine:.2f}"
    )

    return ReturnResponse(
        success=True,
        status="AUTO_ASSIGNED_TO_WAITLIST",
        message=(
            f"'{returned['title']}' (Copy {returned['barcode']}) returned by {returned['user_name']}. "
            f"⚡ FIFO AUTO-ASSIGNED to #1 waitlisted patron: {next_user_name} ({next_user_email})! "
            f"Copy remains issued and loan #{new_loan_id} is active."
        ),
        fine_assessed=fine,
        loan_id=returned["loan_id"],
        copy_id=returned["copy_id"],
        book_id=returned["book_id"],
        new_loan_id=new_loan_id,
        next_user={
            "user_id": next_user_id,
            "full_name": next_user_name,
            "email": next_user_email
        }
    )


def _return_to_shelf(db: Connection, cursor: Cursor, returned: Row, fine: float) -> ReturnResponse:
    cursor.execute("UPDATE book_copies SET status = 'Available' WHERE copy_id = ?", (returned["copy_id"],))

    log_audit(
        db,
        "TX_RETURN_TO_SHELF",
        f"UPDATE circulation_loans SET return_date='{returned['created_at']}', fine_assessed={fine} WHERE loan_id={returned['loan_id']};\n"
        f"UPDATE book_copies SET status='Available' WHERE copy_id={returned['copy_id']};",
        f"returned_by: {returned['user_name']} (uid:{returned['user_id']}), copy_id: {returned['copy_id']}, barcode: {returned['barcode']}, fine: ₹{fine:.2f}, status: Available on shelf"
    )

    return ReturnResponse(
        success=True,
        status="RETURNED_TO_SHELF",
        message=f"'{returned['title']}' (Copy {returned['barcode']}) successfully returned to shelf by {returned['user_name']}. Status updated to Available.",
        fine_assessed=fine,
        loan_id=returned["loan_id"],
        copy_id=returned["copy_id"],
        book_id=returned["book_id"],
        new_loan_id=None,
        next_user=None
    )


def raise_return_request(db: Connection, payload: ReturnRequestCreate, actor: CurrentUser) -> dict:
    """
    A student asks to return a loan at the library portal, typing the code from the book's label so
    the right physical copy is on record. Nothing is returned yet: a librarian reviews the request.
    """
    condition = _valid_condition(payload.condition)

    with immediate_transaction(db) as cursor:
        cursor.execute(
            """
            SELECT cl.loan_id, cl.user_id, cl.copy_id, bc.barcode, b.title, rr.return_request_id
            FROM circulation_loans cl
            JOIN book_copies bc ON cl.copy_id = bc.copy_id
            JOIN books b ON bc.book_id = b.book_id
            LEFT JOIN return_requests rr ON rr.loan_id = cl.loan_id AND rr.status = 'Pending'
            WHERE cl.loan_id = ? AND cl.return_date IS NULL
            """,
            (payload.loan_id,)
        )
        loan = cursor.fetchone()
        if not loan:
            raise NotFoundError("Active loan record not found for this book copy.")
        ensure_can_act_for(actor, loan["user_id"])

        if payload.barcode.strip().upper() != loan["barcode"].upper():
            raise BadRequestError(
                f"Code {payload.barcode.strip().upper()} isn't the copy issued on this loan. Check the label on the book you're returning."
            )
        if loan["return_request_id"]:
            raise BadRequestError("A return request for this book is already waiting for a librarian.")

        now_iso = utc_now_iso()
        cursor.execute(
            """
            INSERT INTO return_requests (loan_id, reported_condition, notes, status, created_at)
            VALUES (?, ?, ?, 'Pending', ?)
            """,
            (payload.loan_id, condition, (payload.notes or "").strip() or None, now_iso)
        )
        return_request_id = cursor.lastrowid

        log_audit(
            db,
            "TX_RETURN_REQUEST",
            f"INSERT INTO return_requests (return_request_id={return_request_id}, loan_id={payload.loan_id}, reported_condition='{condition}', status='Pending');",
            f"user_id: {loan['user_id']}, loan_id: {payload.loan_id}, copy_id: {loan['copy_id']}, barcode: {loan['barcode']}, reported_condition: {condition}"
        )

    return {
        "success": True,
        "return_request_id": return_request_id,
        "message": f"Return requested for '{loan['title']}' (Copy {loan['barcode']}). A librarian will confirm it.",
    }


def _pending_return_request(cursor: Cursor, return_request_id: int) -> Row:
    """Read before and again after locking the book: another librarian may have just resolved it."""
    cursor.execute(
        f"{RETURN_REQUEST_DETAILS_SELECT} WHERE rr.return_request_id = ? AND rr.status = 'Pending'",
        (return_request_id,)
    )
    request = cursor.fetchone()
    if not request:
        raise NotFoundError("This return request is no longer waiting for a librarian.")
    return request


def confirm_return_request(
    db: Connection,
    return_request_id: int,
    payload: ReturnRequestConfirm,
    actor: CurrentUser,
) -> ReturnResponse:
    """
    CRITICAL WAITLIST HANDOFF & AUTO-ASSIGNMENT ENGINE. The fine stops at the moment the student
    raised the request, however long the review takes. If a patron is waiting, the copy goes
    straight to them. Otherwise it goes back on the shelf.
    """
    condition = _valid_condition(payload.condition)

    with immediate_transaction(db) as cursor:
        _lock_book(cursor, _pending_return_request(cursor, return_request_id)["book_id"])
        returned = _pending_return_request(cursor, return_request_id)

        now = utc_now()
        fine = calculate_overdue_fine(
            datetime.datetime.fromisoformat(returned["due_date"]),
            datetime.datetime.fromisoformat(returned["created_at"])
        )

        cursor.execute(
            """
            UPDATE circulation_loans
            SET return_date = ?, fine_assessed = ?, condition_at_return = ?
            WHERE loan_id = ?
            """,
            (returned["created_at"], fine, condition, returned["loan_id"])
        )
        cursor.execute(
            """
            UPDATE return_requests
            SET status = 'Completed', resolved_at = ?, resolved_by = ?
            WHERE return_request_id = ?
            """,
            (now.isoformat(), actor.user_id, return_request_id)
        )
        cursor.execute("UPDATE book_copies SET condition = ? WHERE copy_id = ?", (condition, returned["copy_id"]))

        if fine > 0.0:
            cursor.execute(
                "UPDATE users SET outstanding_fines = outstanding_fines + ? WHERE user_id = ?",
                (fine, returned["user_id"])
            )

        next_patron = _next_waiting_patron(cursor, returned["book_id"])
        if next_patron:
            return _hand_off_to_waitlist(db, cursor, returned, next_patron, condition, now, fine)
        return _return_to_shelf(db, cursor, returned, fine)


def reject_return_request(db: Connection, return_request_id: int, actor: CurrentUser) -> dict:
    """For a request raised without the book being handed in. The loan stays active."""
    with immediate_transaction(db) as cursor:
        _lock_book(cursor, _pending_return_request(cursor, return_request_id)["book_id"])
        request = _pending_return_request(cursor, return_request_id)

        cursor.execute(
            """
            UPDATE return_requests
            SET status = 'Rejected', resolved_at = ?, resolved_by = ?
            WHERE return_request_id = ?
            """,
            (utc_now_iso(), actor.user_id, return_request_id)
        )

        log_audit(
            db,
            "TX_RETURN_REQUEST_REJECTED",
            f"UPDATE return_requests SET status='Rejected' WHERE return_request_id={return_request_id};",
            f"return_request_id: {return_request_id}, loan_id: {request['loan_id']}, barcode: {request['barcode']}, resolved_by: {actor.user_id}"
        )

    return {
        "success": True,
        "message": f"Return request for '{request['title']}' rejected. The loan stays with {request['user_name']}.",
    }
