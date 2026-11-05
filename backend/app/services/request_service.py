"""Student book acquisition requests and their librarian review."""
import sqlite3
from typing import List, Optional

from app.core.clock import utc_now_iso
from app.core.errors import BadRequestError, NotFoundError
from app.db.audit import log_audit
from app.db.queries import BOOK_REQUEST_DETAILS_SELECT
from app.schemas.requests import BookRequestCreate, BookRequestOut, BookRequestUpdate
from app.services.mappers import enrollment_or_fallback, to_book_request_out

VALID_STATUSES = {"Pending", "Approved", "Procured", "Rejected"}
DEFAULT_CATEGORY = "Core Computer Science"


def list_requests(db: sqlite3.Connection, user_id: Optional[int] = None) -> List[BookRequestOut]:
    cursor = db.cursor()
    query = BOOK_REQUEST_DETAILS_SELECT
    params = []
    if user_id:
        query += " WHERE br.user_id = ?"
        params.append(user_id)

    query += " ORDER BY br.created_at DESC"
    cursor.execute(query, params)
    return [to_book_request_out(row) for row in cursor.fetchall()]


def create_request(db: sqlite3.Connection, payload: BookRequestCreate, user_id: int) -> BookRequestOut:
    cursor = db.cursor()

    cursor.execute("SELECT user_id, full_name, enrollment_no, email FROM users WHERE user_id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        raise NotFoundError("User not found")

    now_iso = utc_now_iso()
    cursor.execute(
        """
        INSERT INTO book_requests (user_id, book_id, title, author, category, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
        """,
        (
            user_id,
            payload.book_id,
            payload.title.strip(),
            (payload.author or "").strip() or None,
            payload.category or DEFAULT_CATEGORY,
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
        f"request_id: {req_id}, user_id: {user_id}, title: {payload.title}"
    )
    db.commit()

    return BookRequestOut(
        request_id=req_id,
        user_id=user["user_id"],
        user_name=user["full_name"],
        user_enrollment_no=enrollment_or_fallback(user["enrollment_no"], user["user_id"]),
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


def update_status(db: sqlite3.Connection, request_id: int, payload: BookRequestUpdate) -> BookRequestOut:
    cursor = db.cursor()
    if payload.status not in VALID_STATUSES:
        raise BadRequestError(
            f"Invalid status '{payload.status}'. Must be one of: {', '.join(VALID_STATUSES)}"
        )

    cursor.execute(f"{BOOK_REQUEST_DETAILS_SELECT} WHERE br.request_id = ?", (request_id,))
    req = cursor.fetchone()
    if not req:
        raise NotFoundError("Book request not found")

    now_iso = utc_now_iso()
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

    # The row was read before the update, so overlay the new values on the response
    return to_book_request_out(req).model_copy(update={"status": payload.status, "updated_at": now_iso})
