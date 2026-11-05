"""Catalog search, book details and adding titles or physical copies."""
import sqlite3
from typing import Dict, List, Optional

from app.core.clock import utc_now_iso
from app.core.errors import BadRequestError, NotFoundError
from app.db.audit import log_audit
from app.db.queries import QUEUE_POSITION_SUBQUERY
from app.schemas.books import BookCreateRequest, BookOut, CopyCreateRequest, CopyOut, UserContext

_BOOK_WITH_COUNTS_SELECT = """
    SELECT
        b.book_id, b.isbn, b.title, b.author, b.category,
        b.published_year, b.description, b.cover_url, b.card_tint,
        COUNT(DISTINCT bc.copy_id) as total_copies,
        COUNT(DISTINCT CASE WHEN bc.status = 'Available' THEN bc.copy_id END) as available_copies,
        COUNT(DISTINCT CASE WHEN wr.status = 'Waiting' THEN wr.reservation_id END) as waitlist_count
    FROM books b
    LEFT JOIN book_copies bc ON b.book_id = bc.book_id
    LEFT JOIN waitlist_reservations wr ON b.book_id = wr.book_id AND wr.status = 'Waiting'
"""

_COPY_WITH_BORROWER_SELECT = """
    SELECT bc.copy_id, bc.book_id, bc.barcode, bc.shelf_location, bc.status, bc.condition,
           u.full_name as current_borrower_name, cl.due_date as current_due_date
    FROM book_copies bc
    LEFT JOIN circulation_loans cl ON bc.copy_id = cl.copy_id AND cl.return_date IS NULL
    LEFT JOIN users u ON cl.user_id = u.user_id
"""

_USER_ACTIVE_LOANS_SELECT = """
    SELECT cl.loan_id, bc.book_id, bc.barcode
    FROM circulation_loans cl
    JOIN book_copies bc ON cl.copy_id = bc.copy_id
    WHERE cl.user_id = ? AND cl.return_date IS NULL
"""

_USER_WAITLIST_SELECT = f"""
    SELECT wr.book_id, wr.reservation_id, {QUEUE_POSITION_SUBQUERY} as queue_pos
    FROM waitlist_reservations wr
    WHERE wr.user_id = ? AND wr.status = 'Waiting'
"""


def _to_copy_out(row: sqlite3.Row, show_borrower: bool) -> CopyOut:
    """Who holds a copy is a patron's private data. The due date alone is public."""
    return CopyOut(
        copy_id=row["copy_id"],
        book_id=row["book_id"],
        barcode=row["barcode"],
        shelf_location=row["shelf_location"],
        status=row["status"],
        condition=row["condition"],
        current_borrower_name=row["current_borrower_name"] if show_borrower else None,
        current_due_date=row["current_due_date"]
    )


def _to_book_out(row: sqlite3.Row, copies: List[CopyOut], user_context: Optional[UserContext]) -> BookOut:
    return BookOut(
        book_id=row["book_id"],
        isbn=row["isbn"],
        title=row["title"],
        author=row["author"],
        category=row["category"],
        published_year=row["published_year"],
        description=row["description"],
        cover_url=row["cover_url"],
        card_tint=row["card_tint"],
        total_copies=row["total_copies"],
        available_copies=row["available_copies"],
        waitlist_count=row["waitlist_count"],
        copies=copies,
        user_context=user_context
    )


def _to_user_context(active_loan: Optional[sqlite3.Row], waitlist_entry: Optional[sqlite3.Row]) -> UserContext:
    return UserContext(
        has_active_loan=bool(active_loan),
        active_loan_id=active_loan["loan_id"] if active_loan else None,
        active_copy_barcode=active_loan["barcode"] if active_loan else None,
        waitlist_position=waitlist_entry["queue_pos"] if waitlist_entry else None,
        waitlist_reservation_id=waitlist_entry["reservation_id"] if waitlist_entry else None
    )


def list_books(
    db: sqlite3.Connection,
    search: Optional[str] = None,
    category: Optional[str] = None,
    availability: Optional[str] = None,
    user_id: Optional[int] = None,
    show_borrowers: bool = False,
) -> List[BookOut]:
    cursor = db.cursor()

    query = f"{_BOOK_WITH_COUNTS_SELECT} WHERE 1=1"
    params = []

    if category and category.lower() != "all":
        query += " AND LOWER(b.category) = LOWER(?)"
        params.append(category)

    if search:
        search_pattern = f"%{search.strip()}%"
        query += """
         AND (
            LOWER(b.title) LIKE LOWER(?)
            OR LOWER(b.author) LIKE LOWER(?)
            OR LOWER(b.isbn) LIKE LOWER(?)
            OR b.book_id IN (
                SELECT book_id FROM book_copies
                WHERE LOWER(shelf_location) LIKE LOWER(?)
                   OR LOWER(barcode) LIKE LOWER(?)
            )
         )
        """
        params.extend([search_pattern] * 5)

    query += " GROUP BY b.book_id ORDER BY b.book_id ASC"
    cursor.execute(query, params)
    book_rows = cursor.fetchall()

    # Pre-fetch the patron's active loans and waitlist spots once, rather than per book
    active_loans_by_book: Dict[int, sqlite3.Row] = {}
    waitlist_by_book: Dict[int, sqlite3.Row] = {}
    if user_id:
        cursor.execute(_USER_ACTIVE_LOANS_SELECT, (user_id,))
        active_loans_by_book = {row["book_id"]: row for row in cursor.fetchall()}
        cursor.execute(_USER_WAITLIST_SELECT, (user_id,))
        waitlist_by_book = {row["book_id"]: row for row in cursor.fetchall()}

    cursor.execute(f"{_COPY_WITH_BORROWER_SELECT} ORDER BY bc.copy_id ASC")
    copies_by_book: Dict[int, List[CopyOut]] = {}
    for copy_row in cursor.fetchall():
        copies_by_book.setdefault(copy_row["book_id"], []).append(_to_copy_out(copy_row, show_borrowers))

    results = []
    for b in book_rows:
        # Availability filter post-aggregation
        if availability:
            if availability.lower() == "available" and b["available_copies"] == 0:
                continue
            if availability.lower() == "waitlist" and b["available_copies"] > 0:
                continue

        user_context = None
        if user_id:
            user_context = _to_user_context(active_loans_by_book.get(b["book_id"]), waitlist_by_book.get(b["book_id"]))

        results.append(_to_book_out(b, copies_by_book.get(b["book_id"], []), user_context))

    return results


def get_book_detail(
    db: sqlite3.Connection,
    book_id: int,
    user_id: Optional[int] = None,
    show_borrowers: bool = False,
) -> BookOut:
    cursor = db.cursor()
    cursor.execute(f"{_BOOK_WITH_COUNTS_SELECT} WHERE b.book_id = ? GROUP BY b.book_id", (book_id,))
    book_row = cursor.fetchone()
    if not book_row:
        raise NotFoundError("Book not found")

    cursor.execute(f"{_COPY_WITH_BORROWER_SELECT} WHERE bc.book_id = ? ORDER BY bc.copy_id ASC", (book_id,))
    copies = [_to_copy_out(row, show_borrowers) for row in cursor.fetchall()]

    user_context = None
    if user_id:
        cursor.execute(f"{_USER_ACTIVE_LOANS_SELECT} AND bc.book_id = ?", (user_id, book_id))
        active_loan = cursor.fetchone()
        cursor.execute(f"{_USER_WAITLIST_SELECT} AND wr.book_id = ?", (user_id, book_id))
        waitlist_entry = cursor.fetchone()
        user_context = _to_user_context(active_loan, waitlist_entry)

    return _to_book_out(book_row, copies, user_context)


def create_book(db: sqlite3.Connection, payload: BookCreateRequest) -> dict:
    cursor = db.cursor()
    cursor.execute("SELECT book_id FROM books WHERE isbn = ?", (payload.isbn.strip(),))
    if cursor.fetchone():
        raise BadRequestError(f"Book with ISBN {payload.isbn} already exists")

    now_iso = utc_now_iso()
    cursor.execute(
        """
        INSERT INTO books (isbn, title, author, category, published_year, description, cover_url, card_tint, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload.isbn.strip(),
            payload.title.strip(),
            payload.author.strip(),
            payload.category.strip(),
            payload.published_year,
            payload.description.strip() if payload.description else "",
            payload.cover_url.strip(),
            payload.card_tint or "indigo",
            now_iso
        )
    )
    new_book_id = cursor.lastrowid

    # Auto-generate initial physical copies
    cat_code = payload.category[:3].upper()
    initial_count = max(1, payload.initial_copies_count or 1)
    shelf = payload.shelf_location or "Floor 2 • Aisle 4A"

    for i in range(initial_count):
        char_suffix = chr(ord('A') + i)
        barcode = f"BB-{cat_code}-{new_book_id:03d}{char_suffix}"
        cursor.execute(
            """
            INSERT INTO book_copies (book_id, barcode, shelf_location, status, condition, created_at)
            VALUES (?, ?, ?, 'Available', 'Good', ?)
            """,
            (new_book_id, barcode, shelf, now_iso)
        )

    log_audit(
        db,
        "TX_ADD_BOOK",
        f"INSERT INTO books (book_id={new_book_id}, title='{payload.title}'); INSERT INTO book_copies ({initial_count} physical copies);",
        f"book_id: {new_book_id}, isbn: {payload.isbn}, copies_added: {initial_count}"
    )
    db.commit()

    return {"message": "Book and copies successfully created", "book_id": new_book_id}


def add_copy(db: sqlite3.Connection, book_id: int, payload: CopyCreateRequest) -> dict:
    cursor = db.cursor()
    cursor.execute("SELECT book_id, title FROM books WHERE book_id = ?", (book_id,))
    if not cursor.fetchone():
        raise NotFoundError("Book not found")

    cursor.execute("SELECT copy_id FROM book_copies WHERE barcode = ?", (payload.barcode.strip(),))
    if cursor.fetchone():
        raise BadRequestError(f"Barcode {payload.barcode} already in use")

    cursor.execute(
        """
        INSERT INTO book_copies (book_id, barcode, shelf_location, status, condition, created_at)
        VALUES (?, ?, ?, 'Available', ?, ?)
        """,
        (book_id, payload.barcode.strip(), payload.shelf_location.strip(), payload.condition or "Good", utc_now_iso())
    )
    copy_id = cursor.lastrowid

    log_audit(
        db,
        "TX_ADD_COPY",
        f"INSERT INTO book_copies (copy_id={copy_id}, book_id={book_id}, barcode='{payload.barcode}');",
        f"book_id: {book_id}, copy_id: {copy_id}, barcode: {payload.barcode}"
    )
    db.commit()

    return {"message": "Physical copy added successfully", "copy_id": copy_id, "barcode": payload.barcode}
