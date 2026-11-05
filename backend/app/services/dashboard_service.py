"""The student shelf: a patron's loans, history, reservations and acquisition requests."""
import datetime
import sqlite3
from typing import List

from app.core.clock import utc_now
from app.core.errors import NotFoundError
from app.db.queries import (
    BOOK_REQUEST_DETAILS_SELECT,
    LOAN_DETAILS_SELECT,
    QUEUE_POSITION_SUBQUERY,
    USER_PROFILE_SELECT,
)
from app.schemas.circulation import LoanOut
from app.schemas.dashboard import UserDashboardOut, UserWaitlistCard
from app.services.mappers import to_book_request_out, to_loan_out, to_user_out

LOAN_HISTORY_LIMIT = 20


def _active_loans(cursor: sqlite3.Cursor, user_id: int) -> List[LoanOut]:
    now = utc_now()
    cursor.execute(
        f"{LOAN_DETAILS_SELECT} WHERE cl.user_id = ? AND cl.return_date IS NULL ORDER BY cl.due_date ASC",
        (user_id,)
    )
    loans = []
    for row in cursor.fetchall():
        due_dt = datetime.datetime.fromisoformat(row["due_date"])
        loans.append(to_loan_out(row, is_overdue=now > due_dt, days_remaining=(due_dt - now).days))
    return loans


def _loan_history(cursor: sqlite3.Cursor, user_id: int) -> List[LoanOut]:
    cursor.execute(
        f"{LOAN_DETAILS_SELECT} WHERE cl.user_id = ? AND cl.return_date IS NOT NULL ORDER BY cl.return_date DESC LIMIT ?",
        (user_id, LOAN_HISTORY_LIMIT)
    )
    loans = []
    for row in cursor.fetchall():
        due_dt = datetime.datetime.fromisoformat(row["due_date"])
        returned_late = datetime.datetime.fromisoformat(row["return_date"]) > due_dt
        loans.append(to_loan_out(row, is_overdue=returned_late, days_remaining=0))
    return loans


def _waitlist_cards(cursor: sqlite3.Cursor, user_id: int) -> List[UserWaitlistCard]:
    cursor.execute(
        f"""
        SELECT
            wr.reservation_id, wr.book_id, wr.created_at,
            b.title, b.author, b.isbn, b.cover_url, b.card_tint,
            {QUEUE_POSITION_SUBQUERY} as queue_pos,
            (
                SELECT COUNT(*)
                FROM waitlist_reservations wr3
                WHERE wr3.book_id = wr.book_id AND wr3.status = 'Waiting'
            ) as total_in_queue
        FROM waitlist_reservations wr
        JOIN books b ON wr.book_id = b.book_id
        WHERE wr.user_id = ? AND wr.status = 'Waiting'
        ORDER BY wr.created_at ASC
        """,
        (user_id,)
    )
    return [
        UserWaitlistCard(
            reservation_id=row["reservation_id"],
            book_id=row["book_id"],
            title=row["title"],
            author=row["author"],
            isbn=row["isbn"],
            cover_url=row["cover_url"],
            card_tint=row["card_tint"],
            queue_position=row["queue_pos"],
            total_waiting=row["total_in_queue"],
            created_at=row["created_at"]
        ) for row in cursor.fetchall()
    ]


def get_user_dashboard(db: sqlite3.Connection, user_id: int) -> UserDashboardOut:
    cursor = db.cursor()

    cursor.execute(f"{USER_PROFILE_SELECT} WHERE user_id = ?", (user_id,))
    user_row = cursor.fetchone()
    if not user_row:
        raise NotFoundError("Patron not found")

    active_loans = _active_loans(cursor, user_id)
    loan_history = _loan_history(cursor, user_id)
    waitlist_cards = _waitlist_cards(cursor, user_id)

    cursor.execute(
        f"{BOOK_REQUEST_DETAILS_SELECT} WHERE br.user_id = ? ORDER BY br.created_at DESC",
        (user_id,)
    )
    book_requests = [to_book_request_out(row) for row in cursor.fetchall()]

    return UserDashboardOut(
        user=to_user_out(user_row, active_loans_count=len(active_loans)),
        active_loans=active_loans,
        loan_history=loan_history,
        active_waitlists=waitlist_cards,
        book_requests=book_requests
    )
