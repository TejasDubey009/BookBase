from fastapi import APIRouter, Depends, HTTPException, status
import sqlite3
import datetime
from typing import Optional
from app.database import get_db, log_audit
from app.config import LOAN_DURATION_DAYS, OVERDUE_FINE_RATE_PER_DAY
from app.schemas import (
    CheckoutRequest, CheckoutResponse,
    WaitlistRequest, WaitlistResponse,
    ReturnRequest, ReturnResponse
)

router = APIRouter(prefix="/circulation", tags=["Circulation & FIFO Waitlist Engine"])

@router.post("/checkout", response_model=CheckoutResponse)
def checkout_book(payload: CheckoutRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Atomic Checkout Transaction:
    1. Validates user's loan quota and outstanding fines.
    2. Validates user does not already hold this title.
    3. Locks first available physical copy (status = 'Available').
    4. Creates active circulation loan and updates copy status to 'Issued'.
    5. Fulfills any active waitlist reservation for this user on this book.
    6. Logs TX_CHECKOUT to db_audit_logs.
    """
    cursor = db.cursor()

    try:
        # Begin exclusive transaction
        cursor.execute("BEGIN IMMEDIATE")

        # 1. Check user status
        cursor.execute(
            "SELECT full_name, max_books_quota, outstanding_fines FROM users WHERE user_id = ?",
            (payload.user_id,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Patron not found")

        if user["outstanding_fines"] > 25.0:
            raise HTTPException(
                status_code=400,
                detail=f"Borrowing blocked: Outstanding fines of ${user['outstanding_fines']:.2f} exceed $25.00 limit."
            )

        # Count active loans
        cursor.execute(
            "SELECT COUNT(*) FROM circulation_loans WHERE user_id = ? AND return_date IS NULL",
            (payload.user_id,)
        )
        active_loans_count = cursor.fetchone()[0]
        if active_loans_count >= user["max_books_quota"]:
            raise HTTPException(
                status_code=400,
                detail=f"Quota reached: You already have {active_loans_count} of {user['max_books_quota']} allowed loans."
            )

        # Check if user already holds a copy of this book
        cursor.execute(
            """
            SELECT cl.loan_id 
            FROM circulation_loans cl
            JOIN book_copies bc ON cl.copy_id = bc.copy_id
            WHERE cl.user_id = ? AND bc.book_id = ? AND cl.return_date IS NULL
            """,
            (payload.user_id, payload.book_id)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="You already have an active borrowed copy of this book."
            )

        # 2. Select and lock an available physical copy
        if payload.copy_id:
            cursor.execute(
                """
                SELECT copy_id, barcode, shelf_location 
                FROM book_copies 
                WHERE copy_id = ? AND book_id = ? AND status = 'Available'
                """,
                (payload.copy_id, payload.book_id)
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
                (payload.book_id,)
            )

        copy = cursor.fetchone()
        if not copy:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No physical copies available right now. Please join the FIFO Waitlist queue."
            )

        now = datetime.datetime.now(datetime.timezone.utc)
        due_date = now + datetime.timedelta(days=LOAN_DURATION_DAYS)
        now_iso = now.isoformat()
        due_iso = due_date.isoformat()

        # 3. Create circulation loan
        cursor.execute(
            """
            INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, return_date, fine_assessed, issued_via)
            VALUES (?, ?, ?, ?, NULL, 0.0, 'Direct Checkout')
            """,
            (copy["copy_id"], payload.user_id, now_iso, due_iso)
        )
        loan_id = cursor.lastrowid

        # 4. Mark copy as Issued
        cursor.execute(
            "UPDATE book_copies SET status = 'Issued' WHERE copy_id = ?",
            (copy["copy_id"],)
        )

        # 5. Clean up any waiting reservation this user had for this book
        cursor.execute(
            """
            UPDATE waitlist_reservations 
            SET status = 'Fulfilled', fulfilled_at = ?
            WHERE book_id = ? AND user_id = ? AND status = 'Waiting'
            """,
            (now_iso, payload.book_id, payload.user_id)
        )

        # 6. Audit telemetry
        log_audit(
            db,
            "TX_CHECKOUT",
            f"SELECT copy_id FROM book_copies WHERE copy_id={copy['copy_id']} FOR UPDATE; "
            f"INSERT INTO circulation_loans (loan_id={loan_id}, user_id={payload.user_id}, copy_id={copy['copy_id']}, due='{due_iso[:10]}'); "
            f"UPDATE book_copies SET status='Issued' WHERE copy_id={copy['copy_id']};",
            f"user_id: {payload.user_id}, book_id: {payload.book_id}, copy_id: {copy['copy_id']}, barcode: {copy['barcode']}, loan_id: {loan_id}"
        )

        db.commit()

        return CheckoutResponse(
            success=True,
            loan_id=loan_id,
            book_id=payload.book_id,
            copy_id=copy["copy_id"],
            barcode=copy["barcode"],
            due_date=due_iso,
            issued_via="Direct Checkout",
            message=f"Book checked out successfully! Physical barcode: {copy['barcode']} (Due: {due_iso[:10]})."
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction error: {str(e)}")

@router.post("/waitlist", response_model=WaitlistResponse)
def join_waitlist(payload: WaitlistRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    FIFO Waitlist Registration:
    1. Validates that 0 copies are currently available.
    2. Validates patron doesn't already hold an active loan or reservation.
    3. Inserts into waitlist_reservations.
    4. Computes patron's 1-based FIFO position.
    5. Logs TX_WAITLIST_JOIN to db_audit_logs.
    """
    cursor = db.cursor()

    try:
        cursor.execute("BEGIN IMMEDIATE")

        # 1. Verify user exists
        cursor.execute("SELECT full_name FROM users WHERE user_id = ?", (payload.user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # 2. Verify book exists and count available copies
        cursor.execute(
            """
            SELECT COUNT(*) FROM book_copies 
            WHERE book_id = ? AND status = 'Available'
            """,
            (payload.book_id,)
        )
        available_count = cursor.fetchone()[0]
        if available_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"There are {available_count} physical copies available right now! You can borrow directly instead of joining the waitlist."
            )

        # 3. Check if user already holds an active loan
        cursor.execute(
            """
            SELECT cl.loan_id 
            FROM circulation_loans cl
            JOIN book_copies bc ON cl.copy_id = bc.copy_id
            WHERE cl.user_id = ? AND bc.book_id = ? AND cl.return_date IS NULL
            """,
            (payload.user_id, payload.book_id)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="You already have an active loan for this book."
            )

        # 4. Check if user is already waiting in queue
        cursor.execute(
            """
            SELECT reservation_id FROM waitlist_reservations 
            WHERE book_id = ? AND user_id = ? AND status = 'Waiting'
            """,
            (payload.book_id, payload.user_id)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="You are already in the waitlist queue for this book."
            )

        now = datetime.datetime.now(datetime.timezone.utc)
        now_iso = now.isoformat()

        # 5. Insert waitlist record
        cursor.execute(
            """
            INSERT INTO waitlist_reservations (book_id, user_id, status, created_at)
            VALUES (?, ?, 'Waiting', ?)
            """,
            (payload.book_id, payload.user_id, now_iso)
        )
        reservation_id = cursor.lastrowid

        # 6. Compute 1-based queue position
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
            f"INSERT INTO waitlist_reservations (reservation_id={reservation_id}, book_id={payload.book_id}, user_id={payload.user_id}, status='Waiting'); "
            f"SELECT COUNT(*) as queue_position FROM waitlist_reservations WHERE book_id={payload.book_id} AND status='Waiting';",
            f"user_id: {payload.user_id}, book_id: {payload.book_id}, reservation_id: {reservation_id}, queue_position: #{queue_pos}"
        )

        db.commit()

        return WaitlistResponse(
            success=True,
            reservation_id=reservation_id,
            book_id=payload.book_id,
            user_id=payload.user_id,
            queue_position=queue_pos,
            status="Waiting",
            message=f"Joined waitlist! You are Queue #{queue_pos}. The next returned copy will be automatically assigned to you when you reach #1."
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction error: {str(e)}")

@router.delete("/waitlist/{reservation_id}")
def cancel_waitlist(reservation_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Cancels an active waitlist reservation.
    """
    cursor = db.cursor()
    try:
        cursor.execute("BEGIN IMMEDIATE")
        cursor.execute(
            "SELECT reservation_id, book_id, user_id, status FROM waitlist_reservations WHERE reservation_id = ?",
            (reservation_id,)
        )
        res = cursor.fetchone()
        if not res or res["status"] != "Waiting":
            raise HTTPException(status_code=404, detail="Active reservation not found")

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
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
        db.commit()
        return {"success": True, "message": "Reservation cancelled successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/return", response_model=ReturnResponse)
def return_book(payload: ReturnRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    CRITICAL WAITLIST HANDOFF & AUTO-ASSIGNMENT ENGINE:
    1. Verify loan is active (return_date IS NULL).
    2. Mark return_date = NOW(), assess fines ($2.00/day if overdue).
    3. Query waitlist_reservations for oldest 'Waiting' entry (ORDER BY created_at ASC, reservation_id ASC LIMIT 1).
    4. IF waitlisted user found (#1 in line):
       - Mark waitlist row as 'Fulfilled' (fulfilled_at = NOW()).
       - Auto-insert new row into circulation_loans for this copy_id and waitlisted_user_id (issued_via = 'Waitlist Auto-Fulfill').
       - Keep copy status as 'Issued'.
       - Log TRIGGER_WAITLIST_AUTO_CHECKOUT in db_audit_logs.
    5. ELSE (no waitlist):
       - Set copy status = 'Available'.
       - Log TX_RETURN_TO_SHELF in db_audit_logs.
    """
    cursor = db.cursor()

    try:
        cursor.execute("BEGIN IMMEDIATE")

        # 1. Locate the active loan
        if payload.loan_id:
            cursor.execute(
                """
                SELECT cl.loan_id, cl.copy_id, cl.user_id, cl.due_date, bc.book_id, bc.barcode, b.title, u.full_name as borrower_name
                FROM circulation_loans cl
                JOIN book_copies bc ON cl.copy_id = bc.copy_id
                JOIN books b ON bc.book_id = b.book_id
                JOIN users u ON cl.user_id = u.user_id
                WHERE cl.loan_id = ? AND cl.return_date IS NULL
                """,
                (payload.loan_id,)
            )
        elif payload.copy_id:
            cursor.execute(
                """
                SELECT cl.loan_id, cl.copy_id, cl.user_id, cl.due_date, bc.book_id, bc.barcode, b.title, u.full_name as borrower_name
                FROM circulation_loans cl
                JOIN book_copies bc ON cl.copy_id = bc.copy_id
                JOIN books b ON bc.book_id = b.book_id
                JOIN users u ON cl.user_id = u.user_id
                WHERE cl.copy_id = ? AND cl.return_date IS NULL
                """,
                (payload.copy_id,)
            )
        else:
            raise HTTPException(status_code=400, detail="Must supply either loan_id or copy_id to process return.")

        loan = cursor.fetchone()
        if not loan:
            raise HTTPException(status_code=404, detail="Active loan record not found for this book copy.")

        loan_id = loan["loan_id"]
        copy_id = loan["copy_id"]
        book_id = loan["book_id"]
        user_id = loan["user_id"]
        borrower_name = loan["borrower_name"]
        barcode = loan["barcode"]
        book_title = loan["title"]

        now = datetime.datetime.now(datetime.timezone.utc)
        now_iso = now.isoformat()

        # 2. Check Overdue Fine
        due_dt = datetime.datetime.fromisoformat(loan["due_date"])
        fine = 0.0
        if now > due_dt:
            days_overdue = (now - due_dt).days
            if (now - due_dt).seconds > 0 and days_overdue == 0:
                days_overdue = 1
            if days_overdue > 0:
                fine = round(days_overdue * OVERDUE_FINE_RATE_PER_DAY, 2)

        # Update circulation loan with return timestamp and fine
        cursor.execute(
            """
            UPDATE circulation_loans 
            SET return_date = ?, fine_assessed = ?
            WHERE loan_id = ?
            """,
            (now_iso, fine, loan_id)
        )

        if fine > 0.0:
            cursor.execute(
                "UPDATE users SET outstanding_fines = outstanding_fines + ? WHERE user_id = ?",
                (fine, user_id)
            )

        # 3. Query strict FIFO Waitlist for #1 waiting patron
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
        waitlisted = cursor.fetchone()

        if waitlisted:
            # === CRITICAL PATH A: AUTO-ASSIGN COPY TO WAITLIST #1 ===
            next_user_id = waitlisted["user_id"]
            next_user_name = waitlisted["full_name"]
            next_user_email = waitlisted["email"]
            res_id = waitlisted["reservation_id"]

            # Mark waitlist reservation fulfilled
            cursor.execute(
                """
                UPDATE waitlist_reservations
                SET status = 'Fulfilled', fulfilled_at = ?
                WHERE reservation_id = ?
                """,
                (now_iso, res_id)
            )

            # Insert NEW active circulation loan for the waitlisted patron
            new_due_date = now + datetime.timedelta(days=LOAN_DURATION_DAYS)
            new_due_iso = new_due_date.isoformat()
            cursor.execute(
                """
                INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, return_date, fine_assessed, issued_via)
                VALUES (?, ?, ?, ?, NULL, 0.0, 'Waitlist Auto-Fulfill')
                """,
                (copy_id, next_user_id, now_iso, new_due_iso)
            )
            new_loan_id = cursor.lastrowid

            # Keep copy status as 'Issued' (it never touched the shelf!)
            cursor.execute("UPDATE book_copies SET status = 'Issued' WHERE copy_id = ?", (copy_id,))

            # Telemetry Log
            log_audit(
                db,
                "TRIGGER_WAITLIST_AUTO_CHECKOUT",
                f"-- [FIFO Promotion Trigger Fired]\n"
                f"UPDATE circulation_loans SET return_date='{now_iso}' WHERE loan_id={loan_id};\n"
                f"UPDATE waitlist_reservations SET status='Fulfilled', fulfilled_at='{now_iso}' WHERE reservation_id={res_id};\n"
                f"INSERT INTO circulation_loans (loan_id={new_loan_id}, copy_id={copy_id}, user_id={next_user_id}, issued_via='Waitlist Auto-Fulfill', due='{new_due_iso[:10]}');\n"
                f"-- Copy {barcode} bypassed shelf and auto-assigned to Queue #1 ({next_user_name})",
                f"returned_by: {borrower_name} (uid:{user_id}), auto_assigned_to: {next_user_name} (uid:{next_user_id}), book: '{book_title}', barcode: {barcode}, new_loan_id: {new_loan_id}, fine: ${fine:.2f}"
            )

            db.commit()

            return ReturnResponse(
                success=True,
                status="AUTO_ASSIGNED_TO_WAITLIST",
                message=(
                    f"'{book_title}' (Copy {barcode}) returned by {borrower_name}. "
                    f"⚡ FIFO AUTO-ASSIGNED to #1 waitlisted patron: {next_user_name} ({next_user_email})! "
                    f"Copy remains issued and loan #{new_loan_id} is active."
                ),
                fine_assessed=fine,
                loan_id=loan_id,
                copy_id=copy_id,
                book_id=book_id,
                new_loan_id=new_loan_id,
                next_user={
                    "user_id": next_user_id,
                    "full_name": next_user_name,
                    "email": next_user_email
                }
            )

        else:
            # === CRITICAL PATH B: NO WAITLIST -> RETURN COPY TO SHELF ===
            cursor.execute(
                "UPDATE book_copies SET status = 'Available' WHERE copy_id = ?",
                (copy_id,)
            )

            log_audit(
                db,
                "TX_RETURN_TO_SHELF",
                f"UPDATE circulation_loans SET return_date='{now_iso}', fine_assessed={fine} WHERE loan_id={loan_id};\n"
                f"UPDATE book_copies SET status='Available' WHERE copy_id={copy_id};",
                f"returned_by: {borrower_name} (uid:{user_id}), copy_id: {copy_id}, barcode: {barcode}, fine: ${fine:.2f}, status: Available on shelf"
            )

            db.commit()

            return ReturnResponse(
                success=True,
                status="RETURNED_TO_SHELF",
                message=f"'{book_title}' (Copy {barcode}) successfully returned to shelf by {borrower_name}. Status updated to Available.",
                fine_assessed=fine,
                loan_id=loan_id,
                copy_id=copy_id,
                book_id=book_id,
                new_loan_id=None,
                next_user=None
            )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction error: {str(e)}")

