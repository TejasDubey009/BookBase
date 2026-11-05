"""Populates an empty database with the demo library, or wipes and re-seeds it on request."""
import datetime
import secrets
from typing import Optional, Tuple

from app.config import SEED_ADMIN_PASSWORD
from app.core.clock import utc_now, utc_now_iso
from app.core.security import hash_password, verify_password
from app.db.audit import log_audit
from app.db.connection import IS_POSTGRES
from app.db.schema import init_db_schema, lock_database_setup
from app.db.seed_data import BOOKS, RETIRED_DEMO_ACCOUNTS, SAMPLE_REQUESTS, USERS
from app.db.types import Connection

# Book 3 (CLRS) and book 14 (DDIA) start with a single, already-issued copy so the
# waitlist and overdue flows can be demonstrated immediately.
CLRS_BOOK_ID = 3
DDIA_BOOK_ID = 14
TEJAS_USER_ID = 2
AKASH_USER_ID = 3
LIBRARIAN_ENROLLMENT = "ADMIN001"


def _wipe_all_tables(conn: Connection) -> None:
    cursor = conn.cursor()
    if IS_POSTGRES:
        cursor.execute(
            """
            TRUNCATE TABLE db_audit_logs, book_requests, return_requests, waitlist_reservations,
                circulation_loans, book_copies, books, users
            RESTART IDENTITY CASCADE
            """
        )
        return

    cursor.execute("DELETE FROM db_audit_logs;")
    cursor.execute("DELETE FROM book_requests;")
    cursor.execute("DELETE FROM return_requests;")
    cursor.execute("DELETE FROM waitlist_reservations;")
    cursor.execute("DELETE FROM circulation_loans;")
    cursor.execute("DELETE FROM book_copies;")
    cursor.execute("DELETE FROM books;")
    cursor.execute("DELETE FROM users;")
    # Reset AUTOINCREMENT sequences
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('users', 'books', 'book_copies', 'circulation_loans', 'return_requests', 'waitlist_reservations', 'book_requests', 'db_audit_logs');")


def _seed_sample_requests_if_empty(conn: Connection) -> None:
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


def _librarian_password_hash(current_hash: Optional[str]) -> str:
    """
    A configured password wins. Otherwise a reset keeps the current one, so the librarian who asked
    for it isn't locked out, and a brand new database gets a generated one, shown only this once.
    """
    if SEED_ADMIN_PASSWORD:
        return hash_password(SEED_ADMIN_PASSWORD)
    if current_hash:
        return current_hash

    generated = secrets.token_urlsafe(12)
    print("=" * 70)
    print(f"Librarian account created. Sign in to the admin portal as {LIBRARIAN_ENROLLMENT} with this password:")
    print(f"    {generated}")
    print("It is shown only this once. To choose your own, set BOOKBASE_ADMIN_PASSWORD in backend/.env and restart.")
    print("=" * 70)
    return hash_password(generated)


def _current_librarian_hash(conn: Connection) -> Optional[str]:
    row = conn.execute("SELECT password_hash FROM users WHERE enrollment_no = ?", (LIBRARIAN_ENROLLMENT,)).fetchone()
    return row[0] if row else None


def _apply_configured_librarian_password(conn: Connection) -> None:
    """Setting BOOKBASE_ADMIN_PASSWORD changes the librarian's password on an existing database too."""
    current_hash = _current_librarian_hash(conn)
    if SEED_ADMIN_PASSWORD and current_hash and not verify_password(SEED_ADMIN_PASSWORD, current_hash):
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE enrollment_no = ?",
            (hash_password(SEED_ADMIN_PASSWORD), LIBRARIAN_ENROLLMENT)
        )


def _seed_users(conn: Connection, now_iso: str, current_librarian_hash: Optional[str]) -> None:
    conn.cursor().executemany(
        """
        INSERT INTO users (full_name, enrollment_no, email, password_hash, role, max_books_quota, outstanding_fines, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [(
            name, enrollment, email,
            hash_password(password) if password else _librarian_password_hash(current_librarian_hash),
            role, quota, fines, now_iso
        ) for name, enrollment, email, password, role, quota, fines in USERS]
    )


def _add_missing_seeded_students(conn: Connection) -> None:
    """Seeding only fills an empty database, so one seeded earlier gets later additions here."""
    for name, enrollment, email, password, role, quota, fines in USERS:
        if role != "member":
            continue
        # Someone may have signed up with either value since, and both must stay unique
        taken = conn.execute(
            "SELECT 1 FROM users WHERE UPPER(enrollment_no) = ? OR LOWER(email) = ?",
            (enrollment.upper(), email.lower())
        ).fetchone()
        if taken:
            continue
        conn.execute(
            """
            INSERT INTO users (full_name, enrollment_no, email, password_hash, role, max_books_quota, outstanding_fines, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (name, enrollment, email, hash_password(password), role, quota, fines, utc_now_iso())
        )
        print(f"Added seeded student {name} ({enrollment}).")


def _remove_retired_demo_accounts(conn: Connection) -> None:
    """
    Removes these from databases that already hold them, along with their book requests, waitlist
    spots and audit entries. An account with loan records stays, because those must be kept.
    """
    for full_name, enrollment, email in RETIRED_DEMO_ACCOUNTS:
        account = conn.execute(
            "SELECT user_id FROM users WHERE enrollment_no = ? AND email = ?",
            (enrollment, email)
        ).fetchone()
        if not account:
            continue

        has_loans = conn.execute("SELECT 1 FROM circulation_loans WHERE user_id = ? LIMIT 1", (account[0],)).fetchone()
        if has_loans:
            print(f"Keeping retired demo account {full_name} ({enrollment}): it has loan records.")
            continue

        conn.execute(
            "DELETE FROM db_audit_logs WHERE sql_summary LIKE ? OR affected_entities LIKE ?",
            (f"%{full_name}%", f"%{email}%")
        )
        conn.execute("DELETE FROM users WHERE user_id = ?", (account[0],))
        print(f"Removed retired demo account {full_name} ({enrollment}).")


def _seed_books(conn: Connection, now_iso: str) -> None:
    conn.cursor().executemany(
        """
        INSERT INTO books (isbn, title, author, category, published_year, description, cover_url, card_tint, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [(*book, now_iso) for book in BOOKS]
    )


def _seed_copies(conn: Connection, now_iso: str) -> None:
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


def _insert_seed_loan(conn: Connection, book_id: int, user_id: int, issue_date: str, due_date: str) -> Tuple[int, int]:
    """Lends the first copy of a book. Returns (copy_id, loan_id)."""
    cursor = conn.cursor()
    cursor.execute("SELECT copy_id, condition FROM book_copies WHERE book_id = ? ORDER BY copy_id ASC LIMIT 1;", (book_id,))
    copy = cursor.fetchone()
    copy_id = copy[0]
    cursor.execute(
        """
        INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, return_date, fine_assessed, issued_via, condition_at_issue)
        VALUES (?, ?, ?, ?, NULL, 0.0, 'Direct Checkout', ?)
        """,
        (copy_id, user_id, issue_date, due_date, copy[1])
    )
    return copy_id, cursor.lastrowid


def _seed_circulation(conn: Connection, now: datetime.datetime) -> None:
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

    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO waitlist_reservations (book_id, user_id, status, created_at)
        VALUES (?, ?, 'Waiting', ?)
        """,
        (CLRS_BOOK_ID, AKASH_USER_ID, (now - datetime.timedelta(days=1)).isoformat())
    )
    reservation_id = cursor.lastrowid

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


def _seed_library(conn: Connection, current_librarian_hash: Optional[str]) -> None:
    now = utc_now()
    now_iso = now.isoformat()
    _seed_users(conn, now_iso, current_librarian_hash)
    _seed_books(conn, now_iso)
    _seed_copies(conn, now_iso)
    _seed_circulation(conn, now)


def seed_database(conn: Connection, force_reset: bool = False) -> None:
    """
    Seeds the Central Library database with the complete
    curriculum collection for the 5-Year Integrated B.Tech (CSBS) program,
    along with corresponding O'Reilly Professional Editions.
    """
    init_db_schema(conn)

    # One transaction: if anything fails, a reset leaves the existing data untouched
    with conn:
        lock_database_setup(conn)

        current_librarian_hash = None
        if force_reset:
            current_librarian_hash = _current_librarian_hash(conn)
            _wipe_all_tables(conn)

        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users;")
        is_empty = cursor.fetchone()[0] == 0
        if is_empty:
            _seed_library(conn, current_librarian_hash)
        else:
            _add_missing_seeded_students(conn)
            _remove_retired_demo_accounts(conn)

        # Sample requests reference seeded users and books, so they must come after them.
        # They are also added to a database initialized before requests existed.
        _seed_sample_requests_if_empty(conn)
        _apply_configured_librarian_password(conn)

    if is_empty:
        print("Database successfully seeded with 5-Year B.Tech CSBS curriculum collection!")
