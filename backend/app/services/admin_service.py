"""The librarian console: KPIs, library-wide queues, the borrowers matrix and clearing fines."""
import datetime
from typing import Dict, List, Optional

from app.core.clock import utc_now
from app.core.errors import BadRequestError, NotFoundError
from app.core.security import CurrentUser, issue_token
from app.db.audit import log_audit
from app.db.connection import FOR_NO_KEY_UPDATE
from app.db.queries import (
    BOOK_REQUEST_DETAILS_SELECT,
    LOAN_DETAILS_SELECT,
    QUEUE_POSITION_SUBQUERY,
    RETURN_REQUEST_DETAILS_SELECT,
)
from app.db.seed import seed_database
from app.db.types import Connection, Cursor
from app.schemas.admin import (
    AdminKPIs,
    AdminOverviewOut,
    BookBorrowerOut,
    GroupedBookBorrowersOut,
    SettleFineRequest,
    StudentFineOut,
)
from app.schemas.circulation import LoanOut, WaitlistEntryOut
from app.services.circulation_service import calculate_overdue_fine
from app.services.mappers import (
    enrollment_or_fallback,
    to_active_loan_out,
    to_book_request_out,
    to_return_request_out,
)

RECENT_AUDIT_LOG_LIMIT = 30


def _borrower_status(return_date: Optional[str], due_date: datetime.datetime, now: datetime.datetime) -> str:
    if return_date is not None:
        return "Returned"
    if now > due_date:
        return "Overdue"
    return "Active"


def _borrowers_by_book(cursor: Cursor, now: datetime.datetime) -> Dict[int, List[BookBorrowerOut]]:
    """Everyone who has ever borrowed each title: active loans first, then past ones."""
    cursor.execute(
        """
        SELECT
            bc.book_id, cl.loan_id, cl.copy_id, bc.barcode, bc.shelf_location,
            cl.user_id, u.full_name as student_name, u.enrollment_no as student_enrollment_no, u.email as student_email,
            cl.issue_date, cl.due_date, cl.return_date, cl.fine_assessed,
            cl.condition_at_issue, cl.condition_at_return
        FROM circulation_loans cl
        JOIN book_copies bc ON cl.copy_id = bc.copy_id
        JOIN users u ON cl.user_id = u.user_id
        ORDER BY (cl.return_date IS NULL) DESC, cl.due_date ASC, cl.issue_date DESC
        """
    )
    borrowers: Dict[int, List[BookBorrowerOut]] = {}
    for row in cursor.fetchall():
        due_dt = datetime.datetime.fromisoformat(row["due_date"])
        fine_assessed = float(row["fine_assessed"] or 0.0)
        borrowers.setdefault(row["book_id"], []).append(
            BookBorrowerOut(
                loan_id=row["loan_id"],
                copy_id=row["copy_id"],
                barcode=row["barcode"],
                shelf_location=row["shelf_location"],
                user_id=row["user_id"],
                student_name=row["student_name"],
                student_enrollment_no=enrollment_or_fallback(row["student_enrollment_no"], row["user_id"]),
                student_email=row["student_email"],
                issue_date=row["issue_date"],
                due_date=row["due_date"],
                return_date=row["return_date"],
                status=_borrower_status(row["return_date"], due_dt, now),
                fine_assessed=fine_assessed,
                accrued_fine=fine_assessed if row["return_date"] else calculate_overdue_fine(due_dt, now),
                days_remaining=(due_dt - now).days,
                condition_at_issue=row["condition_at_issue"],
                condition_at_return=row["condition_at_return"]
            )
        )
    return borrowers


def build_grouped_books(db: Connection, search: Optional[str] = None) -> List[GroupedBookBorrowersOut]:
    cursor = db.cursor()
    now = utc_now()

    books_query = """
        SELECT
            b.book_id, b.isbn, b.title, b.author, b.category, b.published_year, b.cover_url, b.card_tint,
            COUNT(bc.copy_id) as total_copies,
            SUM(CASE WHEN bc.status = 'Available' THEN 1 ELSE 0 END) as available_copies,
            SUM(CASE WHEN bc.status = 'Issued' THEN 1 ELSE 0 END) as active_loans_count,
            (
                SELECT COUNT(*)
                FROM waitlist_reservations wr
                WHERE wr.book_id = b.book_id AND wr.status = 'Waiting'
            ) as waitlist_count
        FROM books b
        LEFT JOIN book_copies bc ON b.book_id = bc.book_id
    """
    params = []
    if search and search.strip():
        term = f"%{search.strip()}%"
        books_query += """
            WHERE LOWER(b.title) LIKE LOWER(?) OR LOWER(b.author) LIKE LOWER(?)
               OR LOWER(b.isbn) LIKE LOWER(?) OR LOWER(b.category) LIKE LOWER(?)
               OR b.book_id IN (
                   SELECT bc_sub.book_id FROM circulation_loans cl_sub
                   JOIN book_copies bc_sub ON cl_sub.copy_id = bc_sub.copy_id
                   JOIN users u_sub ON cl_sub.user_id = u_sub.user_id
                   WHERE LOWER(u_sub.full_name) LIKE LOWER(?) OR LOWER(u_sub.enrollment_no) LIKE LOWER(?)
                      OR LOWER(u_sub.email) LIKE LOWER(?) OR LOWER(bc_sub.barcode) LIKE LOWER(?)
               )
        """
        params.extend([term] * 8)

    books_query += " GROUP BY b.book_id ORDER BY b.book_id ASC"
    cursor.execute(books_query, params)
    book_rows = cursor.fetchall()
    borrowers = _borrowers_by_book(cursor, now)

    return [
        GroupedBookBorrowersOut(
            book_id=b["book_id"],
            isbn=b["isbn"],
            title=b["title"],
            author=b["author"],
            category=b["category"],
            published_year=b["published_year"],
            cover_url=b["cover_url"],
            card_tint=b["card_tint"],
            total_copies=b["total_copies"] or 0,
            available_copies=b["available_copies"] or 0,
            active_loans_count=b["active_loans_count"] or 0,
            waitlist_count=b["waitlist_count"],
            borrowers=borrowers.get(b["book_id"], [])
        ) for b in book_rows
    ]


def _scalar(cursor: Cursor, sql: str):
    cursor.execute(sql)
    return cursor.fetchone()[0]


def _kpis(cursor: Cursor) -> AdminKPIs:
    return AdminKPIs(
        total_titles=_scalar(cursor, "SELECT COUNT(*) FROM books"),
        physical_copies=_scalar(cursor, "SELECT COUNT(*) FROM book_copies"),
        available_copies=_scalar(cursor, "SELECT COUNT(*) FROM book_copies WHERE status = 'Available'"),
        active_loans=_scalar(cursor, "SELECT COUNT(*) FROM circulation_loans WHERE return_date IS NULL"),
        waitlist_queue_depth=_scalar(cursor, "SELECT COUNT(*) FROM waitlist_reservations WHERE status = 'Waiting'"),
        total_fines=float(_scalar(cursor, "SELECT COALESCE(SUM(outstanding_fines), 0.0) FROM users")),
        pending_requests_count=_scalar(cursor, "SELECT COUNT(*) FROM book_requests WHERE status = 'Pending'"),
        pending_returns_count=_scalar(cursor, "SELECT COUNT(*) FROM return_requests WHERE status = 'Pending'")
    )


def _active_loans(cursor: Cursor, now: datetime.datetime) -> List[LoanOut]:
    cursor.execute(f"{LOAN_DETAILS_SELECT} WHERE cl.return_date IS NULL ORDER BY cl.due_date ASC")
    return [to_active_loan_out(row, now) for row in cursor.fetchall()]


def _waitlist_queue(cursor: Cursor) -> List[WaitlistEntryOut]:
    cursor.execute(
        f"""
        SELECT
            wr.reservation_id, wr.book_id, wr.user_id, wr.status, wr.created_at, wr.fulfilled_at,
            b.title as book_title,
            u.full_name as user_name, u.email as user_email, u.enrollment_no as user_enrollment_no,
            {QUEUE_POSITION_SUBQUERY} as queue_pos
        FROM waitlist_reservations wr
        JOIN books b ON wr.book_id = b.book_id
        JOIN users u ON wr.user_id = u.user_id
        WHERE wr.status = 'Waiting'
        ORDER BY wr.book_id ASC, wr.created_at ASC
        """
    )
    return [
        WaitlistEntryOut(
            reservation_id=row["reservation_id"],
            book_id=row["book_id"],
            book_title=row["book_title"],
            user_id=row["user_id"],
            user_name=row["user_name"],
            user_email=row["user_email"],
            user_enrollment_no=enrollment_or_fallback(row["user_enrollment_no"], row["user_id"]),
            queue_position=row["queue_pos"],
            status=row["status"],
            created_at=row["created_at"],
            fulfilled_at=row["fulfilled_at"]
        ) for row in cursor.fetchall()
    ]


def _student_fines(cursor: Cursor) -> List[StudentFineOut]:
    """Every student, plus anyone else with a balance, so the ledger adds up to the total_fines KPI."""
    cursor.execute(
        """
        SELECT user_id, full_name, enrollment_no, email, outstanding_fines
        FROM users
        WHERE role = 'member' OR outstanding_fines > 0
        ORDER BY outstanding_fines DESC, full_name ASC
        """
    )
    return [
        StudentFineOut(
            user_id=row["user_id"],
            full_name=row["full_name"],
            enrollment_no=enrollment_or_fallback(row["enrollment_no"], row["user_id"]),
            email=row["email"],
            outstanding_fines=float(row["outstanding_fines"])
        ) for row in cursor.fetchall()
    ]


def get_overview(db: Connection) -> AdminOverviewOut:
    cursor = db.cursor()
    now = utc_now()

    kpis = _kpis(cursor)
    active_loans = _active_loans(cursor, now)
    waitlist_queue = _waitlist_queue(cursor)

    # Only what students have actively raised and nobody has resolved yet
    cursor.execute(f"{RETURN_REQUEST_DETAILS_SELECT} WHERE rr.status = 'Pending' ORDER BY rr.created_at ASC")
    return_requests = [to_return_request_out(row) for row in cursor.fetchall()]

    cursor.execute(f"{BOOK_REQUEST_DETAILS_SELECT} ORDER BY br.created_at DESC")
    book_requests = [to_book_request_out(row) for row in cursor.fetchall()]

    grouped_books = build_grouped_books(db)

    cursor.execute(
        """
        SELECT log_id, operation_type, sql_summary, affected_entities, created_at
        FROM db_audit_logs
        ORDER BY log_id DESC
        LIMIT ?
        """,
        (RECENT_AUDIT_LOG_LIMIT,)
    )
    recent_logs = [dict(row) for row in cursor.fetchall()]

    return AdminOverviewOut(
        kpis=kpis,
        active_loans=active_loans,
        waitlist_queue=waitlist_queue,
        return_requests=return_requests,
        book_requests=book_requests,
        grouped_books=grouped_books,
        student_fines=_student_fines(cursor),
        recent_audit_logs=recent_logs
    )


def settle_fine(db: Connection, payload: SettleFineRequest) -> dict:
    # Written as "not > 0" so that NaN, which compares false to everything, is rejected too
    if payload.amount_settled is not None and not payload.amount_settled > 0:
        raise BadRequestError("Settlement amount must be greater than zero.")

    cursor = db.cursor()
    # Locked so a fine charged at the same moment isn't overwritten
    cursor.execute(
        f"SELECT user_id, full_name, enrollment_no, outstanding_fines FROM users WHERE user_id = ?{FOR_NO_KEY_UPDATE}",
        (payload.user_id,)
    )
    user = cursor.fetchone()
    if not user:
        raise NotFoundError("Student patron not found")

    current_fine = float(user["outstanding_fines"])
    to_settle = payload.amount_settled if (payload.amount_settled is not None and payload.amount_settled <= current_fine) else current_fine
    new_fine = max(0.0, round(current_fine - to_settle, 2))

    cursor.execute("UPDATE users SET outstanding_fines = ? WHERE user_id = ?", (new_fine, payload.user_id))
    db.commit()

    log_audit(
        db,
        "TX_SETTLE_FINE",
        f"Librarian collected/settled fine of ₹{to_settle:.2f} for {user['full_name']} ({user['enrollment_no']})",
        f"user_id: {payload.user_id}, amount_settled: {to_settle}, remaining_fine: {new_fine}"
    )
    db.commit()
    return {
        "success": True,
        "message": f"Successfully settled ₹{to_settle:.2f} for {user['full_name']} ({user['enrollment_no']}). Remaining fine: ₹{new_fine:.2f}",
        "user_id": payload.user_id,
        "outstanding_fines": new_fine
    }


def reset_demo(db: Connection, actor: CurrentUser) -> dict:
    seed_database(db, force_reset=True)

    # Re-seeding recreates every account, which ends all sessions. Keep the librarian who asked signed in.
    cursor = db.cursor()
    cursor.execute("SELECT user_id, created_at FROM users WHERE user_id = ? AND role = 'admin'", (actor.user_id,))
    admin = cursor.fetchone()
    return {
        "success": True,
        "message": "BookBase database cleanly reset to demo state.",
        "token": issue_token(admin["user_id"], admin["created_at"]) if admin else None
    }
