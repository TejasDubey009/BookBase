from fastapi import APIRouter, Depends, HTTPException
import sqlite3
import datetime
from app.database import get_db
from app.schemas import UserDashboardOut, UserOut, LoanOut, UserWaitlistCard

router = APIRouter(prefix="/users", tags=["Patron Dashboards"])

@router.get("/{user_id}/dashboard", response_model=UserDashboardOut)
def get_user_dashboard(user_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()

    # 1. User info
    cursor.execute(
        """
        SELECT user_id, full_name, email, role, max_books_quota, outstanding_fines
        FROM users
        WHERE user_id = ?
        """,
        (user_id,)
    )
    user_row = cursor.fetchone()
    if not user_row:
        raise HTTPException(status_code=404, detail="Patron not found")

    now = datetime.datetime.now(datetime.timezone.utc)

    # 2. Active Loans
    cursor.execute(
        """
        SELECT 
            cl.loan_id, cl.copy_id, cl.user_id, cl.issue_date, cl.due_date, cl.return_date,
            cl.fine_assessed, cl.issued_via,
            bc.barcode, bc.shelf_location,
            b.book_id, b.title, b.author, b.isbn, b.cover_url, b.card_tint,
            u.full_name as user_name, u.email as user_email
        FROM circulation_loans cl
        JOIN book_copies bc ON cl.copy_id = bc.copy_id
        JOIN books b ON bc.book_id = b.book_id
        JOIN users u ON cl.user_id = u.user_id
        WHERE cl.user_id = ? AND cl.return_date IS NULL
        ORDER BY cl.due_date ASC
        """,
        (user_id,)
    )
    active_loans = []
    for r in cursor.fetchall():
        due_dt = datetime.datetime.fromisoformat(r["due_date"])
        is_overdue = now > due_dt
        days_rem = (due_dt - now).days
        active_loans.append(
            LoanOut(
                loan_id=r["loan_id"],
                copy_id=r["copy_id"],
                user_id=r["user_id"],
                user_name=r["user_name"],
                user_email=r["user_email"],
                book_id=r["book_id"],
                title=r["title"],
                author=r["author"],
                isbn=r["isbn"],
                cover_url=r["cover_url"],
                card_tint=r["card_tint"],
                barcode=r["barcode"],
                shelf_location=r["shelf_location"],
                issue_date=r["issue_date"],
                due_date=r["due_date"],
                return_date=r["return_date"],
                fine_assessed=float(r["fine_assessed"]),
                issued_via=r["issued_via"],
                is_overdue=is_overdue,
                days_remaining=days_rem
            )
        )

    # 3. Loan History
    cursor.execute(
        """
        SELECT 
            cl.loan_id, cl.copy_id, cl.user_id, cl.issue_date, cl.due_date, cl.return_date,
            cl.fine_assessed, cl.issued_via,
            bc.barcode, bc.shelf_location,
            b.book_id, b.title, b.author, b.isbn, b.cover_url, b.card_tint,
            u.full_name as user_name, u.email as user_email
        FROM circulation_loans cl
        JOIN book_copies bc ON cl.copy_id = bc.copy_id
        JOIN books b ON bc.book_id = b.book_id
        JOIN users u ON cl.user_id = u.user_id
        WHERE cl.user_id = ? AND cl.return_date IS NOT NULL
        ORDER BY cl.return_date DESC
        LIMIT 20
        """,
        (user_id,)
    )
    loan_history = []
    for r in cursor.fetchall():
        due_dt = datetime.datetime.fromisoformat(r["due_date"])
        is_overdue = datetime.datetime.fromisoformat(r["return_date"]) > due_dt
        loan_history.append(
            LoanOut(
                loan_id=r["loan_id"],
                copy_id=r["copy_id"],
                user_id=r["user_id"],
                user_name=r["user_name"],
                user_email=r["user_email"],
                book_id=r["book_id"],
                title=r["title"],
                author=r["author"],
                isbn=r["isbn"],
                cover_url=r["cover_url"],
                card_tint=r["card_tint"],
                barcode=r["barcode"],
                shelf_location=r["shelf_location"],
                issue_date=r["issue_date"],
                due_date=r["due_date"],
                return_date=r["return_date"],
                fine_assessed=float(r["fine_assessed"]),
                issued_via=r["issued_via"],
                is_overdue=is_overdue,
                days_remaining=0
            )
        )

    # 4. Active Waitlist Queue Cards
    cursor.execute(
        """
        SELECT 
            wr.reservation_id, wr.book_id, wr.created_at,
            b.title, b.author, b.isbn, b.cover_url, b.card_tint,
            (
                SELECT COUNT(*) 
                FROM waitlist_reservations wr2
                WHERE wr2.book_id = wr.book_id 
                  AND wr2.status = 'Waiting'
                  AND (wr2.created_at < wr.created_at OR (wr2.created_at = wr.created_at AND wr2.reservation_id <= wr.reservation_id))
            ) as queue_pos,
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
    waitlist_cards = [
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

    user_out = UserOut(
        user_id=user_row["user_id"],
        full_name=user_row["full_name"],
        email=user_row["email"],
        role=user_row["role"],
        max_books_quota=user_row["max_books_quota"],
        outstanding_fines=float(user_row["outstanding_fines"]),
        active_loans_count=len(active_loans)
    )

    return UserDashboardOut(
        user=user_out,
        active_loans=active_loans,
        loan_history=loan_history,
        active_waitlists=waitlist_cards
    )

