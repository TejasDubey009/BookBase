from fastapi import APIRouter, Depends
import sqlite3
import datetime
from app.database import get_db, log_audit
from app.seed_data import seed_database
from app.schemas import AdminOverviewOut, AdminKPIs, LoanOut, WaitlistEntryOut

router = APIRouter(prefix="/admin", tags=["Admin Operations & Inventory Management"])

@router.get("/overview", response_model=AdminOverviewOut)
def get_admin_overview(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. KPIs
    cursor.execute("SELECT COUNT(*) FROM books")
    total_titles = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM book_copies")
    physical_copies = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM book_copies WHERE status = 'Available'")
    available_copies = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM circulation_loans WHERE return_date IS NULL")
    active_loans_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM waitlist_reservations WHERE status = 'Waiting'")
    waitlist_queue_depth = cursor.fetchone()[0]

    cursor.execute("SELECT COALESCE(SUM(outstanding_fines), 0.0) FROM users")
    total_fines = float(cursor.fetchone()[0])

    kpis = AdminKPIs(
        total_titles=total_titles,
        physical_copies=physical_copies,
        available_copies=available_copies,
        active_loans=active_loans_count,
        waitlist_queue_depth=waitlist_queue_depth,
        total_fines=total_fines
    )

    # 2. Active Loans across all patrons
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
        WHERE cl.return_date IS NULL
        ORDER BY cl.due_date ASC
        """
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

    # 3. Waitlist Queue across all titles
    cursor.execute(
        """
        SELECT 
            wr.reservation_id, wr.book_id, wr.user_id, wr.status, wr.created_at, wr.fulfilled_at,
            b.title as book_title,
            u.full_name as user_name, u.email as user_email,
            (
                SELECT COUNT(*) 
                FROM waitlist_reservations wr2
                WHERE wr2.book_id = wr.book_id 
                  AND wr2.status = 'Waiting'
                  AND (wr2.created_at < wr.created_at OR (wr2.created_at = wr.created_at AND wr2.reservation_id <= wr.reservation_id))
            ) as queue_pos
        FROM waitlist_reservations wr
        JOIN books b ON wr.book_id = b.book_id
        JOIN users u ON wr.user_id = u.user_id
        WHERE wr.status = 'Waiting'
        ORDER BY wr.book_id ASC, wr.created_at ASC
        """
    )
    waitlist_queue = [
        WaitlistEntryOut(
            reservation_id=row["reservation_id"],
            book_id=row["book_id"],
            book_title=row["book_title"],
            user_id=row["user_id"],
            user_name=row["user_name"],
            user_email=row["user_email"],
            queue_position=row["queue_pos"],
            status=row["status"],
            created_at=row["created_at"],
            fulfilled_at=row["fulfilled_at"]
        ) for row in cursor.fetchall()
    ]

    # 4. Recent db_audit_logs
    cursor.execute(
        """
        SELECT log_id, operation_type, sql_summary, affected_entities, created_at
        FROM db_audit_logs
        ORDER BY log_id DESC
        LIMIT 30
        """
    )
    recent_logs = [dict(row) for row in cursor.fetchall()]

    return AdminOverviewOut(
        kpis=kpis,
        active_loans=active_loans,
        waitlist_queue=waitlist_queue,
        recent_audit_logs=recent_logs
    )

@router.post("/reset-demo")
def reset_demo(db: sqlite3.Connection = Depends(get_db)):
    """
    Resets the database back to clean seeded state at any time for repeat viva demonstrations.
    """
    seed_database(db, force_reset=True)
    return {"success": True, "message": "BookBase database cleanly reset to demo state."}

