"""Populates an empty database with the demo library, or wipes and re-seeds it on request."""
import datetime
import sqlite3
from typing import Tuple

from app.core.clock import utc_now, utc_now_iso
from app.core.security import hash_password
from app.db.audit import log_audit
from app.db.schema import init_db_schema
from app.db.seed_data import BOOKS, SAMPLE_REQUESTS, USERS

# Book 3 (CLRS) and book 14 (DDIA) start with a single, already-issued copy so the
# waitlist and overdue flows can be demonstrated immediately.
CLRS_BOOK_ID = 3
DDIA_BOOK_ID = 14
TEJAS_USER_ID = 2
AKASH_USER_ID = 3


def _wipe_all_tables(conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()
    cursor.execute("DELETE FROM db_audit_logs;")
    cursor.execute("DELETE FROM waitlist_reservations;")
    cursor.execute("DELETE FROM circulation_loans;")
    cursor.execute("DELETE FROM book_copies;")
    cursor.execute("DELETE FROM books;")
    cursor.execute("DELETE FROM users;")
    # Reset AUTOINCREMENT sequences
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('users', 'books', 'book_copies', 'circulation_loans', 'waitlist_reservations', 'db_audit_logs');")
    conn.commit()


def _seed_sample_requests_if_empty(conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM book_requests;")
    if cursor.fetchone()[0] != 0:
        return
    now_iso = utc_now_iso()
    cursor.executemany(
        """
        INSERT INTO book_requests (user_id, book_id, title, author, category, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [(*request, now_iso, now_iso) for request in SAMPLE_REQUESTS]
    )
    conn.commit()


def _seed_users(conn: sqlite3.Connection, now_iso: str) -> None:
    conn.cursor().executemany(
        """
        INSERT INTO users (full_name, enrollment_no, email, password_hash, role, max_books_quota, outstanding_fines, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [(name, enrollment, email, hash_password(password), role, quota, fines, now_iso)
         for name, enrollment, email, password, role, quota, fines in USERS]
    )
    conn.commit()


def _seed_books(conn: sqlite3.Connection, now_iso: str) -> None:
    conn.cursor().executemany(
        """
        INSERT INTO books (isbn, title, author, category, published_year, description, cover_url, card_tint, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [(*book, now_iso) for book in BOOKS]
    )
    conn.commit()


def _seed_copies(conn: sqlite3.Connection, now_iso: str) -> None:
    """Generates realistic barcodes and shelf locations in the Central Library."""
    copies = []
    for book_id in range(1, len(BOOKS) + 1):
        if book_id == CLRS_BOOK_ID:
            copies.append((book_id, f"LIB-CSBS-{book_id:03d}A", "Central Library • Stack Floor 2, Rack A-04", "Issued", "Pristine"))
        elif book_id == DDIA_BOOK_ID:
            copies.append((book_id, f"LIB-CSBS-{book_id:03d}A", "Central Library • Stack Floor 2, Rack B-11", "Issued", "Good"))
        else:
            # 2 copies per book
            shelf = f"Central Library • Stack Floor {(book_id % 3) + 1}, Rack C-{book_id:02d}"
            copies.append((book_id, f"LIB-CSBS-{book_id:03d}A", shelf, "Available", "Pristine"))
            copies.append((book_id, f"LIB-CSBS-{book_id:03d}B", shelf, "Available", "Good"))

    conn.cursor().executemany(
        """
        INSERT INTO book_copies (book_id, barcode, shelf_location, status, condition, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        [(*copy, now_iso) for copy in copies]
    )
    conn.commit()


def _insert_seed_loan(conn: sqlite3.Connection, book_id: int, user_id: int, issue_date: str, due_date: str) -> Tuple[int, int]:
    """Lends the first copy of a book. Returns (copy_id, loan_id)."""
    cursor = conn.cursor()
    cursor.execute("SELECT copy_id FROM book_copies WHERE book_id = ? LIMIT 1;", (book_id,))
    copy_id = cursor.fetchone()[0]
    cursor.execute(
        """
        INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, return_date, fine_assessed, issued_via)
        VALUES (?, ?, ?, ?, NULL, 0.0, 'Direct Checkout')
        """,
        (copy_id, user_id, issue_date, due_date)
    )
    return copy_id, cursor.lastrowid


def _seed_circulation(conn: sqlite3.Connection, now: datetime.datetime) -> None:
    """Tejas holds an overdue CLRS and an on-time DDIA; Akash is Queue #1 for CLRS."""
    clrs_copy_id, clrs_loan_id = _insert_seed_loan(
        conn, CLRS_BOOK_ID, TEJAS_USER_ID,
        issue_date=(now - datetime.timedelta(days=16)).isoformat(),
        due_date=(now - datetime.timedelta(days=2)).isoformat(),
    )
    ddia_copy_id, ddia_loan_id = _insert_seed_loan(
        conn, DDIA_BOOK_ID, TEJAS_USER_ID,
        issue_date=(now - datetime.timedelta(days=3)).isoformat(),
        due_date=(now + datetime.timedelta(days=11)).isoformat(),
    )
    conn.commit()

    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO waitlist_reservations (book_id, user_id, status, created_at)
        VALUES (?, ?, 'Waiting', ?)
        """,
        (CLRS_BOOK_ID, AKASH_USER_ID, (now - datetime.timedelta(days=1)).isoformat())
    )
    reservation_id = cursor.lastrowid
    conn.commit()

    log_audit(
        conn,
        "TX_CHECKOUT",
        f"Borrow copy {clrs_copy_id} issued to patron Tejas (user_id={TEJAS_USER_ID})",
        f"user_id: {TEJAS_USER_ID}, book_id: {CLRS_BOOK_ID}, copy_id: {clrs_copy_id}, loan_id: {clrs_loan_id}"
    )
    log_audit(
        conn,
        "TX_CHECKOUT",
        f"Borrow copy {ddia_copy_id} issued to patron Tejas (user_id={TEJAS_USER_ID})",
        f"user_id: {TEJAS_USER_ID}, book_id: {DDIA_BOOK_ID}, copy_id: {ddia_copy_id}, loan_id: {ddia_loan_id}"
    )
    log_audit(
        conn,
        "TX_WAITLIST_JOIN",
        f"Patron Akash (user_id={AKASH_USER_ID}) joined reservation queue for book_id={CLRS_BOOK_ID}",
        f"user_id: {AKASH_USER_ID}, book_id: {CLRS_BOOK_ID}, reservation_id: {reservation_id}, queue_position: 1"
    )
    conn.commit()


def seed_database(conn: sqlite3.Connection, force_reset: bool = False) -> None:
    """
    Seeds the Central Library database with the complete
    curriculum collection for the 5-Year Integrated B.Tech (CSBS) program,
    along with corresponding O'Reilly Professional Editions.
    """
    init_db_schema(conn)

    if force_reset:
        _wipe_all_tables(conn)

    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users;")
    if cursor.fetchone()[0] == 0:
        now = utc_now()
        now_iso = now.isoformat()
        _seed_users(conn, now_iso)
        _seed_books(conn, now_iso)
        _seed_copies(conn, now_iso)
        _seed_circulation(conn, now)
        print("Database successfully seeded with 5-Year B.Tech CSBS curriculum collection!")

    # Book requests get sample data even if the database was initialized earlier.
    # They reference users, so this has to come after the users exist.
    _seed_sample_requests_if_empty(conn)
