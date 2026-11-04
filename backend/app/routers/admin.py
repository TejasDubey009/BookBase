from fastapi import APIRouter, Depends, HTTPException
import sqlite3
import datetime
from typing import List, Optional
from app.database import get_db, log_audit
from app.seed_data import seed_database
from app.schemas import (
    AdminOverviewOut, AdminKPIs, LoanOut, WaitlistEntryOut, 
    BookRequestOut, GroupedBookBorrowersOut, BookBorrowerOut, SettleFineRequest
)

router = APIRouter(prefix="/admin", tags=["Admin Operations & Inventory Management"])

def build_grouped_books(db: sqlite3.Connection, search: Optional[str] = None) -> List[GroupedBookBorrowersOut]:
    cursor = db.cursor()
    now = datetime.datetime.now(datetime.timezone.utc)
    
    books_query = """
        SELECT 
            b.book_id, b.isbn, b.title, b.author, b.category, b.published_year, b.cover_url, b.card_tint,
            COUNT(bc.copy_id) as total_copies,
            SUM(CASE WHEN bc.status = 'Available' THEN 1 ELSE 0 END) as available_copies,
            SUM(CASE WHEN bc.status = 'Issued' THEN 1 ELSE 0 END) as active_loans_count
        FROM books b
        LEFT JOIN book_copies bc ON b.book_id = bc.book_id
    """
    params = []
    if search and search.strip():
        term = f"%{search.strip()}%"
        books_query += """
            WHERE b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.category LIKE ?
               OR b.book_id IN (
                   SELECT bc_sub.book_id FROM circulation_loans cl_sub
                   JOIN book_copies bc_sub ON cl_sub.copy_id = bc_sub.copy_id
                   JOIN users u_sub ON cl_sub.user_id = u_sub.user_id
                   WHERE u_sub.full_name LIKE ? OR u_sub.enrollment_no LIKE ? OR u_sub.email LIKE ? OR bc_sub.barcode LIKE ?
               )
        """
        params.extend([term, term, term, term, term, term, term, term])
        
    books_query += " GROUP BY b.book_id ORDER BY b.book_id ASC"
    cursor.execute(books_query, params)
    books_rows = cursor.fetchall()
    
    grouped_list = []
    for b in books_rows:
        book_id = b["book_id"]
        # Fetch all borrowers (active and past) for this book
        cursor.execute(
            """
            SELECT 
                cl.loan_id, cl.copy_id, bc.barcode, bc.shelf_location,
                cl.user_id, u.full_name as student_name, u.enrollment_no as student_enrollment_no, u.email as student_email,
                cl.issue_date, cl.due_date, cl.return_date, cl.fine_assessed
            FROM circulation_loans cl
            JOIN book_copies bc ON cl.copy_id = bc.copy_id
            JOIN users u ON cl.user_id = u.user_id
            WHERE bc.book_id = ?
            ORDER BY (cl.return_date IS NULL) DESC, cl.due_date ASC, cl.issue_date DESC
            """,
            (book_id,)
        )
        borrowers_rows = cursor.fetchall()
        borrowers = []
        for br in borrowers_rows:
            due_dt = datetime.datetime.fromisoformat(br["due_date"])
            days_rem = (due_dt - now).days
            if br["return_date"] is not None:
                loan_status = "Returned"
            elif now > due_dt:
                loan_status = "Overdue"
            else:
                loan_status = "Active"
                
            borrowers.append(
                BookBorrowerOut(
                    loan_id=br["loan_id"],
                    copy_id=br["copy_id"],
                    barcode=br["barcode"],
                    shelf_location=br["shelf_location"],
                    user_id=br["user_id"],
                    student_name=br["student_name"],
                    student_enrollment_no=br["student_enrollment_no"] or f"STU{br['user_id']:05d}",
                    student_email=br["student_email"],
                    issue_date=br["issue_date"],
                    due_date=br["due_date"],
                    return_date=br["return_date"],
                    status=loan_status,
                    fine_assessed=float(br["fine_assessed"] or 0.0),
                    days_remaining=days_rem
                )
            )
            
        grouped_list.append(
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
                borrowers=borrowers
            )
        )
    return grouped_list

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

    cursor.execute("SELECT COUNT(*) FROM book_requests WHERE status = 'Pending'")
    pending_requests_count = cursor.fetchone()[0]

    kpis = AdminKPIs(
        total_titles=total_titles,
        physical_copies=physical_copies,
        available_copies=available_copies,
        active_loans=active_loans_count,
        waitlist_queue_depth=waitlist_queue_depth,
        total_fines=total_fines,
        pending_requests_count=pending_requests_count
    )

    # 2. Active Loans across all patrons
    cursor.execute(
        """
        SELECT 
            cl.loan_id, cl.copy_id, cl.user_id, cl.issue_date, cl.due_date, cl.return_date,
            cl.fine_assessed, cl.issued_via,
            bc.barcode, bc.shelf_location,
            b.book_id, b.title, b.author, b.isbn, b.cover_url, b.card_tint,
            u.full_name as user_name, u.email as user_email, u.enrollment_no as user_enrollment_no
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
                user_enrollment_no=r["user_enrollment_no"] or f"STU{r['user_id']:05d}",
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

    # 4. Student Book Requests
    cursor.execute(
        """
        SELECT 
            br.request_id, br.user_id, br.book_id, br.title, br.author, br.category, 
            br.notes, br.status, br.created_at, br.updated_at,
            u.full_name as user_name, u.enrollment_no as user_enrollment_no, u.email as user_email
        FROM book_requests br
        JOIN users u ON br.user_id = u.user_id
        ORDER BY br.created_at DESC
        """
    )
    book_requests = [
        BookRequestOut(
            request_id=r["request_id"],
            user_id=r["user_id"],
            user_name=r["user_name"],
            user_enrollment_no=r["user_enrollment_no"] or f"STU{r['user_id']:05d}",
            user_email=r["user_email"],
            book_id=r["book_id"],
            title=r["title"],
            author=r["author"],
            category=r["category"],
            notes=r["notes"],
            status=r["status"],
            created_at=r["created_at"],
            updated_at=r["updated_at"]
        ) for r in cursor.fetchall()
    ]

    # 5. Grouped Books with Borrowers Matrix
    grouped_books = build_grouped_books(db)

    # 6. Recent db_audit_logs
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
        book_requests=book_requests,
        grouped_books=grouped_books,
        recent_audit_logs=recent_logs
    )

@router.get("/grouped-books", response_model=List[GroupedBookBorrowersOut])
def get_admin_grouped_books(search: Optional[str] = None, db: sqlite3.Connection = Depends(get_db)):
    """
    Dedicated endpoint returning curriculum books and their full borrower history/active loans.
    """
    return build_grouped_books(db, search=search)

@router.post("/settle-fine")
def settle_user_fine(payload: SettleFineRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Librarian action to record fine payment / waive fine for a student patron.
    """
    cursor = db.cursor()
    cursor.execute("SELECT user_id, full_name, enrollment_no, outstanding_fines FROM users WHERE user_id = ?", (payload.user_id,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Student patron not found")
        
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

@router.post("/reset-demo")
def reset_demo(db: sqlite3.Connection = Depends(get_db)):
    """
    Resets the database back to clean seeded state at any time for repeat viva demonstrations.
    """
    seed_database(db, force_reset=True)
    return {"success": True, "message": "BookBase database cleanly reset to demo state."}


