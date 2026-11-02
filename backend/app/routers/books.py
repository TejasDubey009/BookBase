from fastapi import APIRouter, Depends, HTTPException, Query, status
import sqlite3
from typing import List, Optional
import datetime
import random
from app.database import get_db, log_audit
from app.schemas import BookOut, CopyOut, UserContext, BookCreateRequest, CopyCreateRequest

router = APIRouter(prefix="/books", tags=["Catalog & Inventory"])

@router.get("", response_model=List[BookOut])
def list_books(
    search: Optional[str] = Query(None, description="Search across Title, Author, ISBN, or Shelf Location"),
    category: Optional[str] = Query(None, description="Filter by Category"),
    availability: Optional[str] = Query(None, description="'available' | 'waitlist' | 'all'"),
    user_id: Optional[int] = Query(None, description="Compute active loan/waitlist context for this patron"),
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()

    query = """
    SELECT 
        b.book_id, b.isbn, b.title, b.author, b.category, 
        b.published_year, b.description, b.cover_url, b.card_tint,
        COUNT(DISTINCT bc.copy_id) as total_copies,
        COUNT(DISTINCT CASE WHEN bc.status = 'Available' THEN bc.copy_id END) as available_copies,
        COUNT(DISTINCT CASE WHEN wr.status = 'Waiting' THEN wr.reservation_id END) as waitlist_count
    FROM books b
    LEFT JOIN book_copies bc ON b.book_id = bc.book_id
    LEFT JOIN waitlist_reservations wr ON b.book_id = wr.book_id AND wr.status = 'Waiting'
    WHERE 1=1
    """
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
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])

    query += " GROUP BY b.book_id ORDER BY b.book_id ASC"
    cursor.execute(query, params)
    book_rows = cursor.fetchall()

    results = []

    # Pre-fetch user active loans and waitlists if user_id is provided
    user_active_loans = {}
    user_waitlist_positions = {}
    if user_id:
        # Check active loans
        cursor.execute(
            """
            SELECT cl.loan_id, bc.book_id, bc.barcode
            FROM circulation_loans cl
            JOIN book_copies bc ON cl.copy_id = bc.copy_id
            WHERE cl.user_id = ? AND cl.return_date IS NULL
            """,
            (user_id,)
        )
        for row in cursor.fetchall():
            user_active_loans[row["book_id"]] = (row["loan_id"], row["barcode"])

        # Check waitlist position
        # A patron's position is COUNT(*) of 'Waiting' entries for that book created <= their reservation
        cursor.execute(
            """
            SELECT wr.book_id, wr.reservation_id, wr.created_at,
                   (
                       SELECT COUNT(*) 
                       FROM waitlist_reservations wr2
                       WHERE wr2.book_id = wr.book_id 
                         AND wr2.status = 'Waiting'
                         AND (wr2.created_at < wr.created_at OR (wr2.created_at = wr.created_at AND wr2.reservation_id <= wr.reservation_id))
                   ) as queue_pos
            FROM waitlist_reservations wr
            WHERE wr.user_id = ? AND wr.status = 'Waiting'
            """,
            (user_id,)
        )
        for row in cursor.fetchall():
            user_waitlist_positions[row["book_id"]] = (row["queue_pos"], row["reservation_id"])

    # Fetch copies for all books
    cursor.execute(
        """
        SELECT bc.copy_id, bc.book_id, bc.barcode, bc.shelf_location, bc.status, bc.condition,
               u.full_name as current_borrower_name, cl.due_date as current_due_date
        FROM book_copies bc
        LEFT JOIN circulation_loans cl ON bc.copy_id = cl.copy_id AND cl.return_date IS NULL
        LEFT JOIN users u ON cl.user_id = u.user_id
        ORDER BY bc.copy_id ASC
        """
    )
    copies_by_book = {}
    for copy_row in cursor.fetchall():
        b_id = copy_row["book_id"]
        if b_id not in copies_by_book:
            copies_by_book[b_id] = []
        copies_by_book[b_id].append(
            CopyOut(
                copy_id=copy_row["copy_id"],
                book_id=copy_row["book_id"],
                barcode=copy_row["barcode"],
                shelf_location=copy_row["shelf_location"],
                status=copy_row["status"],
                condition=copy_row["condition"],
                current_borrower_name=copy_row["current_borrower_name"],
                current_due_date=copy_row["current_due_date"]
            )
        )

    for b in book_rows:
        total = b["total_copies"]
        available = b["available_copies"]
        waitlist_cnt = b["waitlist_count"]

        # Availability filter post-aggregation
        if availability:
            if availability.lower() == "available" and available == 0:
                continue
            if availability.lower() == "waitlist" and available > 0:
                continue

        # Build user context
        u_context = None
        if user_id:
            has_loan = b["book_id"] in user_active_loans
            active_loan_info = user_active_loans.get(b["book_id"])
            waitlist_info = user_waitlist_positions.get(b["book_id"])
            u_context = UserContext(
                has_active_loan=has_loan,
                active_loan_id=active_loan_info[0] if active_loan_info else None,
                active_copy_barcode=active_loan_info[1] if active_loan_info else None,
                waitlist_position=waitlist_info[0] if waitlist_info else None,
                waitlist_reservation_id=waitlist_info[1] if waitlist_info else None
            )

        results.append(
            BookOut(
                book_id=b["book_id"],
                isbn=b["isbn"],
                title=b["title"],
                author=b["author"],
                category=b["category"],
                published_year=b["published_year"],
                description=b["description"],
                cover_url=b["cover_url"],
                card_tint=b["card_tint"],
                total_copies=total,
                available_copies=available,
                waitlist_count=waitlist_cnt,
                copies=copies_by_book.get(b["book_id"], []),
                user_context=u_context
            )
        )

    return results

@router.get("/{book_id}", response_model=BookOut)
def get_book_detail(
    book_id: int, 
    user_id: Optional[int] = Query(None),
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT 
            b.book_id, b.isbn, b.title, b.author, b.category, 
            b.published_year, b.description, b.cover_url, b.card_tint,
            COUNT(DISTINCT bc.copy_id) as total_copies,
            COUNT(DISTINCT CASE WHEN bc.status = 'Available' THEN bc.copy_id END) as available_copies,
            COUNT(DISTINCT CASE WHEN wr.status = 'Waiting' THEN wr.reservation_id END) as waitlist_count
        FROM books b
        LEFT JOIN book_copies bc ON b.book_id = bc.book_id
        LEFT JOIN waitlist_reservations wr ON b.book_id = wr.book_id AND wr.status = 'Waiting'
        WHERE b.book_id = ?
        GROUP BY b.book_id
        """,
        (book_id,)
    )
    b = cursor.fetchone()
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")

    # Fetch physical copies
    cursor.execute(
        """
        SELECT bc.copy_id, bc.book_id, bc.barcode, bc.shelf_location, bc.status, bc.condition,
               u.full_name as current_borrower_name, cl.due_date as current_due_date
        FROM book_copies bc
        LEFT JOIN circulation_loans cl ON bc.copy_id = cl.copy_id AND cl.return_date IS NULL
        LEFT JOIN users u ON cl.user_id = u.user_id
        WHERE bc.book_id = ?
        ORDER BY bc.copy_id ASC
        """,
        (book_id,)
    )
    copies = [
        CopyOut(
            copy_id=row["copy_id"],
            book_id=row["book_id"],
            barcode=row["barcode"],
            shelf_location=row["shelf_location"],
            status=row["status"],
            condition=row["condition"],
            current_borrower_name=row["current_borrower_name"],
            current_due_date=row["current_due_date"]
        ) for row in cursor.fetchall()
    ]

    u_context = None
    if user_id:
        cursor.execute(
            """
            SELECT cl.loan_id, bc.barcode
            FROM circulation_loans cl
            JOIN book_copies bc ON cl.copy_id = bc.copy_id
            WHERE cl.user_id = ? AND bc.book_id = ? AND cl.return_date IS NULL
            """,
            (user_id, book_id)
        )
        active_loan = cursor.fetchone()

        cursor.execute(
            """
            SELECT wr.reservation_id,
                   (
                       SELECT COUNT(*) 
                       FROM waitlist_reservations wr2
                       WHERE wr2.book_id = ? 
                         AND wr2.status = 'Waiting'
                         AND (wr2.created_at < wr.created_at OR (wr2.created_at = wr.created_at AND wr2.reservation_id <= wr.reservation_id))
                   ) as queue_pos
            FROM waitlist_reservations wr
            WHERE wr.user_id = ? AND wr.book_id = ? AND wr.status = 'Waiting'
            """,
            (book_id, user_id, book_id)
        )
        waitlist_info = cursor.fetchone()

        u_context = UserContext(
            has_active_loan=bool(active_loan),
            active_loan_id=active_loan["loan_id"] if active_loan else None,
            active_copy_barcode=active_loan["barcode"] if active_loan else None,
            waitlist_position=waitlist_info["queue_pos"] if waitlist_info else None,
            waitlist_reservation_id=waitlist_info["reservation_id"] if waitlist_info else None
        )

    return BookOut(
        book_id=b["book_id"],
        isbn=b["isbn"],
        title=b["title"],
        author=b["author"],
        category=b["category"],
        published_year=b["published_year"],
        description=b["description"],
        cover_url=b["cover_url"],
        card_tint=b["card_tint"],
        total_copies=b["total_copies"],
        available_copies=b["available_copies"],
        waitlist_count=b["waitlist_count"],
        copies=copies,
        user_context=u_context
    )

@router.post("", status_code=status.HTTP_201_CREATED)
def create_book(payload: BookCreateRequest, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    # Check ISBN uniqueness
    cursor.execute("SELECT book_id FROM books WHERE isbn = ?", (payload.isbn.strip(),))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail=f"Book with ISBN {payload.isbn} already exists")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
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

@router.post("/{book_id}/copies", status_code=status.HTTP_201_CREATED)
def add_book_copy(book_id: int, payload: CopyCreateRequest, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT book_id, title FROM books WHERE book_id = ?", (book_id,))
    book = cursor.fetchone()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    cursor.execute("SELECT copy_id FROM book_copies WHERE barcode = ?", (payload.barcode.strip(),))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail=f"Barcode {payload.barcode} already in use")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    cursor.execute(
        """
        INSERT INTO book_copies (book_id, barcode, shelf_location, status, condition, created_at)
        VALUES (?, ?, ?, 'Available', ?, ?)
        """,
        (book_id, payload.barcode.strip(), payload.shelf_location.strip(), payload.condition or "Good", now_iso)
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

