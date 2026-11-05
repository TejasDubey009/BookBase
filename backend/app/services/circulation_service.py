"""
The lending engine: checkout, FIFO waitlist and returns. Each public function is one
atomic transaction, and a return hands the copy straight to the next waiting patron.
"""
import datetime
import sqlite3
from typing import Optional

from app.config import (
    LOAN_DURATION_DAYS,
    MAX_LOANS_PER_USER,
    MAX_OUTSTANDING_FINES_FOR_BORROWING,
    OVERDUE_FINE_RATE_PER_DAY,
)
from app.core.clock import utc_now, utc_now_iso
from app.core.errors import BadRequestError, ConflictError, NotFoundError
from app.core.security import CurrentUser, ensure_can_act_for
from app.db.audit import log_audit
from app.db.connection import immediate_transaction
from app.db.queries import count_active_loans
from app.schemas.circulation import (
    CheckoutRequest,
    CheckoutResponse,
    LendingPolicyOut,
    ReturnRequest,
    ReturnResponse,
    WaitlistRequest,
    WaitlistResponse,
)

ISSUED_VIA_DIRECT = "Direct Checkout"
ISSUED_VIA_WAITLIST = "Waitlist Auto-Fulfill"

_ACTIVE_LOAN_DETAILS_SELECT = """
    SELECT cl.loan_id, cl.copy_id, cl.user_id, cl.due_date, bc.book_id, bc.barcode, b.title, u.full_name as borrower_name
    FROM circulation_loans cl
    JOIN book_copies bc ON cl.copy_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id
    JOIN users u ON cl.user_id = u.user_id
"""


def get_lending_policy() -> LendingPolicyOut:
    return LendingPolicyOut(
        overdue_fine_rate_per_day=OVERDUE_FINE_RATE_PER_DAY,
        loan_duration_days=LOAN_DURATION_DAYS,
        max_loans_per_user=MAX_LOANS_PER_USER
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
    return round(overdue_days(due_date, returned_at) * OVERDUE_FINE_RATE_PER_DAY, 2)


def _user_holds_title(cursor: sqlite3.Cursor, user_id: int, book_id: int) -> bool:
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


def _assert_can_borrow(cursor: sqlite3.Cursor, user_id: int, book_id: int) -> None:
    cursor.execute(
        "SELECT full_name, max_books_quota, outstanding_fines FROM users WHERE user_id = ?",
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


def _select_available_copy(cursor: sqlite3.Cursor, book_id: int, copy_id: Optional[int]) -> sqlite3.Row:
    if copy_id:
        cursor.execute(
            """
            SELECT copy_id, barcode, shelf_location
            FROM book_copies
            WHERE copy_id = ? AND book_id = ? AND status = 'Available'
            """,
            (copy_id, book_id)
        )
    else:
        cursor.execute(
            """
            SELECT copy_id, barcode, shelf_location
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
    cursor: sqlite3.Cursor,
    copy_id: int,
    user_id: int,
    issued_at: datetime.datetime,
    issued_via: str,
) -> tuple[int, str]:
    """Creates an active loan and returns (loan_id, due date as ISO string)."""
    due_iso = (issued_at + datetime.timedelta(days=LOAN_DURATION_DAYS)).isoformat()
    cursor.execute(
        """
        INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, return_date, fine_assessed, issued_via)
        VALUES (?, ?, ?, ?, NULL, 0.0, ?)
        """,
        (copy_id, user_id, issued_at.isoformat(), due_iso, issued_via)
    )
    return cursor.lastrowid, due_iso


def checkout(db: sqlite3.Connection, payload: CheckoutRequest, user_id: int) -> CheckoutResponse:
    with immediate_transaction(db) as cursor:
        _assert_can_borrow(cursor, user_id, payload.book_id)
        copy = _select_available_copy(cursor, payload.book_id, payload.copy_id)

        now = utc_now()
        now_iso = now.isoformat()
        loan_id, due_iso = _insert_loan(cursor, copy["copy_id"], user_id, now, ISSUED_VIA_DIRECT)

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
            f"SELECT copy_id FROM book_copies WHERE copy_id={copy['copy_id']} FOR UPDATE; "
            f"INSERT INTO circulation_loans (loan_id={loan_id}, user_id={user_id}, copy_id={copy['copy_id']}, due='{due_iso[:10]}'); "
            f"UPDATE book_copies SET status='Issued' WHERE copy_id={copy['copy_id']};",
            f"user_id: {user_id}, book_id: {payload.book_id}, copy_id: {copy['copy_id']}, barcode: {copy['barcode']}, loan_id: {loan_id}"
        )

    return CheckoutResponse(
        success=True,
        loan_id=loan_id,
        book_id=payload.book_id,
        copy_id=copy["copy_id"],
        barcode=copy["barcode"],
        due_date=due_iso,
        issued_via=ISSUED_VIA_DIRECT,
        message=f"Book checked out successfully! Physical barcode: {copy['barcode']} (Due: {due_iso[:10]})."
    )


def join_waitlist(db: sqlite3.Connection, payload: WaitlistRequest, user_id: int) -> WaitlistResponse:
    with immediate_transaction(db) as cursor:
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


def cancel_reservation(db: sqlite3.Connection, reservation_id: int, actor: CurrentUser) -> dict:
    with immediate_transaction(db, error_prefix="") as cursor:
        cursor.execute(
            "SELECT reservation_id, book_id, user_id, status FROM waitlist_reservations WHERE reservation_id = ?",
            (reservation_id,)
        )
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


def _find_active_loan(cursor: sqlite3.Cursor, payload: ReturnRequest) -> sqlite3.Row:
    if payload.loan_id:
        cursor.execute(
            f"{_ACTIVE_LOAN_DETAILS_SELECT} WHERE cl.loan_id = ? AND cl.return_date IS NULL",
            (payload.loan_id,)
        )
    elif payload.copy_id:
        cursor.execute(
            f"{_ACTIVE_LOAN_DETAILS_SELECT} WHERE cl.copy_id = ? AND cl.return_date IS NULL",
            (payload.copy_id,)
        )
    else:
        raise BadRequestError("Must supply either loan_id or copy_id to process return.")

    loan = cursor.fetchone()
    if not loan:
        raise NotFoundError("Active loan record not found for this book copy.")
    return loan


def _next_waiting_patron(cursor: sqlite3.Cursor, book_id: int) -> Optional[sqlite3.Row]:
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
    db: sqlite3.Connection,
    cursor: sqlite3.Cursor,
    loan: sqlite3.Row,
    next_patron: sqlite3.Row,
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

    new_loan_id, new_due_iso = _insert_loan(cursor, loan["copy_id"], next_user_id, now, ISSUED_VIA_WAITLIST)

    # Keep copy status as 'Issued' (it never touched the shelf!)
    cursor.execute("UPDATE book_copies SET status = 'Issued' WHERE copy_id = ?", (loan["copy_id"],))

    log_audit(
        db,
        "TRIGGER_WAITLIST_AUTO_CHECKOUT",
        f"-- [FIFO Promotion Trigger Fired]\n"
        f"UPDATE circulation_loans SET return_date='{now_iso}' WHERE loan_id={loan['loan_id']};\n"
        f"UPDATE waitlist_reservations SET status='Fulfilled', fulfilled_at='{now_iso}' WHERE reservation_id={res_id};\n"
        f"INSERT INTO circulation_loans (loan_id={new_loan_id}, copy_id={loan['copy_id']}, user_id={next_user_id}, issued_via='{ISSUED_VIA_WAITLIST}', due='{new_due_iso[:10]}');\n"
        f"-- Copy {loan['barcode']} bypassed shelf and auto-assigned to Queue #1 ({next_user_name})",
        f"returned_by: {loan['borrower_name']} (uid:{loan['user_id']}), auto_assigned_to: {next_user_name} (uid:{next_user_id}), book: '{loan['title']}', barcode: {loan['barcode']}, new_loan_id: {new_loan_id}, fine: ₹{fine:.2f}"
    )

    return ReturnResponse(
        success=True,
        status="AUTO_ASSIGNED_TO_WAITLIST",
        message=(
            f"'{loan['title']}' (Copy {loan['barcode']}) returned by {loan['borrower_name']}. "
            f"⚡ FIFO AUTO-ASSIGNED to #1 waitlisted patron: {next_user_name} ({next_user_email})! "
            f"Copy remains issued and loan #{new_loan_id} is active."
        ),
        fine_assessed=fine,
        loan_id=loan["loan_id"],
        copy_id=loan["copy_id"],
        book_id=loan["book_id"],
        new_loan_id=new_loan_id,
        next_user={
            "user_id": next_user_id,
            "full_name": next_user_name,
            "email": next_user_email
        }
    )


def _return_to_shelf(
    db: sqlite3.Connection,
    cursor: sqlite3.Cursor,
    loan: sqlite3.Row,
    now: datetime.datetime,
    fine: float,
) -> ReturnResponse:
    cursor.execute("UPDATE book_copies SET status = 'Available' WHERE copy_id = ?", (loan["copy_id"],))

    log_audit(
        db,
        "TX_RETURN_TO_SHELF",
        f"UPDATE circulation_loans SET return_date='{now.isoformat()}', fine_assessed={fine} WHERE loan_id={loan['loan_id']};\n"
        f"UPDATE book_copies SET status='Available' WHERE copy_id={loan['copy_id']};",
        f"returned_by: {loan['borrower_name']} (uid:{loan['user_id']}), copy_id: {loan['copy_id']}, barcode: {loan['barcode']}, fine: ₹{fine:.2f}, status: Available on shelf"
    )

    return ReturnResponse(
        success=True,
        status="RETURNED_TO_SHELF",
        message=f"'{loan['title']}' (Copy {loan['barcode']}) successfully returned to shelf by {loan['borrower_name']}. Status updated to Available.",
        fine_assessed=fine,
        loan_id=loan["loan_id"],
        copy_id=loan["copy_id"],
        book_id=loan["book_id"],
        new_loan_id=None,
        next_user=None
    )


def return_book(db: sqlite3.Connection, payload: ReturnRequest, actor: CurrentUser) -> ReturnResponse:
    with immediate_transaction(db) as cursor:
        loan = _find_active_loan(cursor, payload)
        ensure_can_act_for(actor, loan["user_id"])

        now = utc_now()
        fine = calculate_overdue_fine(datetime.datetime.fromisoformat(loan["due_date"]), now)

        cursor.execute(
            """
            UPDATE circulation_loans
            SET return_date = ?, fine_assessed = ?
            WHERE loan_id = ?
            """,
            (now.isoformat(), fine, loan["loan_id"])
        )

        if fine > 0.0:
            cursor.execute(
                "UPDATE users SET outstanding_fines = outstanding_fines + ? WHERE user_id = ?",
                (fine, loan["user_id"])
            )

        next_patron = _next_waiting_patron(cursor, loan["book_id"])
        if next_patron:
            return _hand_off_to_waitlist(db, cursor, loan, next_patron, now, fine)
        return _return_to_shelf(db, cursor, loan, now, fine)
