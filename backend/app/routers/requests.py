from fastapi import APIRouter, Depends, HTTPException, status
import sqlite3
import datetime
from typing import List, Optional
from app.database import get_db, log_audit
from app.schemas import BookRequestCreate, BookRequestUpdate, BookRequestOut

router = APIRouter(prefix="/requests", tags=["Student Book Requests & Acquisition"])

@router.get("", response_model=List[BookRequestOut])
def get_book_requests(user_id: Optional[int] = None, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    query = """
        SELECT 
            br.request_id, br.user_id, br.book_id, br.title, br.author, br.category, 
            br.notes, br.status, br.created_at, br.updated_at,
            u.full_name as user_name, u.enrollment_no as user_enrollment_no, u.email as user_email
        FROM book_requests br
        JOIN users u ON br.user_id = u.user_id
    """
    params = []
    if user_id:
        query += " WHERE br.user_id = ?"
        params.append(user_id)
    
    query += " ORDER BY br.created_at DESC"
    cursor.execute(query, params)
    
    results = []
    for r in cursor.fetchall():
        results.append(
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
            )
        )
    return results

@router.post("", response_model=BookRequestOut, status_code=status.HTTP_201_CREATED)
def create_book_request(payload: BookRequestCreate, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    
    # Verify user exists
    cursor.execute("SELECT user_id, full_name, enrollment_no, email FROM users WHERE user_id = ?", (payload.user_id,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    cursor.execute(
        """
        INSERT INTO book_requests (user_id, book_id, title, author, category, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
        """,
        (
            payload.user_id,
            payload.book_id,
            payload.title.strip(),
            (payload.author or "").strip() or None,
            payload.category or "Core Computer Science",
            (payload.notes or "").strip() or None,
            now_iso,
            now_iso
        )
    )
    db.commit()
    req_id = cursor.lastrowid
    
    log_audit(
        db,
        "TX_BOOK_REQUEST",
        f"Student {user['full_name']} submitted procurement request for '{payload.title}'",
        f"request_id: {req_id}, user_id: {payload.user_id}, title: {payload.title}"
    )
    db.commit()

    return BookRequestOut(
        request_id=req_id,
        user_id=user["user_id"],
        user_name=user["full_name"],
        user_enrollment_no=user["enrollment_no"] or f"STU{user['user_id']:05d}",
        user_email=user["email"],
        book_id=payload.book_id,
        title=payload.title,
        author=payload.author,
        category=payload.category,
        notes=payload.notes,
        status="Pending",
        created_at=now_iso,
        updated_at=now_iso
    )

@router.patch("/{request_id}", response_model=BookRequestOut)
def update_book_request_status(
    request_id: int, 
    payload: BookRequestUpdate, 
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()
    valid_statuses = {"Pending", "Approved", "Procured", "Rejected"}
    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(valid_statuses)}"
        )
        
    cursor.execute(
        """
        SELECT 
            br.request_id, br.user_id, br.book_id, br.title, br.author, br.category, 
            br.notes, br.status, br.created_at, br.updated_at,
            u.full_name as user_name, u.enrollment_no as user_enrollment_no, u.email as user_email
        FROM book_requests br
        JOIN users u ON br.user_id = u.user_id
        WHERE br.request_id = ?
        """,
        (request_id,)
    )
    req = cursor.fetchone()
    if not req:
        raise HTTPException(status_code=404, detail="Book request not found")
        
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    cursor.execute(
        "UPDATE book_requests SET status = ?, updated_at = ? WHERE request_id = ?",
        (payload.status, now_iso, request_id)
    )
    db.commit()
    
    log_audit(
        db,
        "TX_UPDATE_REQUEST",
        f"Librarian updated book request #{request_id} to '{payload.status}'",
        f"request_id: {request_id}, status: {payload.status}"
    )
    db.commit()
    
    return BookRequestOut(
        request_id=req["request_id"],
        user_id=req["user_id"],
        user_name=req["user_name"],
        user_enrollment_no=req["user_enrollment_no"] or f"STU{req['user_id']:05d}",
        user_email=req["user_email"],
        book_id=req["book_id"],
        title=req["title"],
        author=req["author"],
        category=req["category"],
        notes=req["notes"],
        status=payload.status,
        created_at=req["created_at"],
        updated_at=now_iso
    )
