import sqlite3
import datetime
from contextlib import contextmanager
from typing import Generator
from app.config import DB_PATH

def get_raw_connection() -> sqlite3.Connection:
    """
    Creates an SQLite connection with:
    - Foreign key constraints enabled (PRAGMA foreign_keys = ON)
    - WAL journal mode for concurrent read/write transactions
    - Row factory enabled for column name dictionary mapping
    - Busy timeout for concurrency handling
    """
    conn = sqlite3.connect(DB_PATH, timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        conn.execute("PRAGMA journal_mode = WAL;")
    except Exception:
        conn.execute("PRAGMA journal_mode = DELETE;")
    return conn

@contextmanager
def get_db_context() -> Generator[sqlite3.Connection, None, None]:
    conn = get_raw_connection()
    try:
        yield conn
    finally:
        conn.close()

def get_db():
    conn = get_raw_connection()
    try:
        yield conn
    finally:
        conn.close()

def log_audit(
    conn: sqlite3.Connection,
    operation_type: str,
    sql_summary: str,
    affected_entities: str
) -> int:
    """
    Appends an entry to the live DBMS telemetry table db_audit_logs.
    """
    cursor = conn.cursor()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    cursor.execute(
        """
        INSERT INTO db_audit_logs (operation_type, sql_summary, affected_entities, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (operation_type, sql_summary, affected_entities, now_iso)
    )
    return cursor.lastrowid

def init_db_schema(conn: sqlite3.Connection):
    """
    Initializes the 3NF schema, tables, and partial indexes.
    Includes automated migration for enrollment numbers and book requests.
    """
    cursor = conn.cursor()
    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_no TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
        max_books_quota INTEGER DEFAULT 4 NOT NULL CHECK (max_books_quota > 0),
        outstanding_fines REAL DEFAULT 0.00 NOT NULL CHECK (outstanding_fines >= 0.0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS books (
        book_id INTEGER PRIMARY KEY AUTOINCREMENT,
        isbn TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        category TEXT NOT NULL,
        published_year INTEGER NOT NULL,
        description TEXT,
        cover_url TEXT NOT NULL,
        card_tint TEXT DEFAULT 'indigo' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS book_copies (
        copy_id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
        barcode TEXT UNIQUE NOT NULL,
        shelf_location TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('Available', 'Issued', 'Maintenance', 'Lost')),
        condition TEXT DEFAULT 'Good' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS circulation_loans (
        loan_id INTEGER PRIMARY KEY AUTOINCREMENT,
        copy_id INTEGER NOT NULL REFERENCES book_copies(copy_id) ON DELETE RESTRICT,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
        issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        due_date TIMESTAMP NOT NULL,
        return_date TIMESTAMP NULL,
        fine_assessed REAL DEFAULT 0.00 NOT NULL CHECK (fine_assessed >= 0.0),
        issued_via TEXT DEFAULT 'Direct Checkout' NOT NULL CHECK (issued_via IN ('Direct Checkout', 'Waitlist Auto-Fulfill'))
    );

    CREATE TABLE IF NOT EXISTS waitlist_reservations (
        reservation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('Waiting', 'Fulfilled', 'Cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        fulfilled_at TIMESTAMP NULL
    );

    CREATE TABLE IF NOT EXISTS book_requests (
        request_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        book_id INTEGER REFERENCES books(book_id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        author TEXT,
        category TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Procured', 'Rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS db_audit_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_type TEXT NOT NULL,
        sql_summary TEXT NOT NULL,
        affected_entities TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- Partial index 1: Storage-engine level lock preventing double-booking of any physical copy
    CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_loan_per_copy 
        ON circulation_loans(copy_id) 
        WHERE return_date IS NULL;

    -- Partial index 2: Index-only lookup for real-time copy availability (3NF compliance)
    CREATE INDEX IF NOT EXISTS idx_copies_book_status 
        ON book_copies(book_id, status);

    -- Partial index 3: Strict FIFO queue order for O(1) waitlist lookup
    CREATE INDEX IF NOT EXISTS idx_waitlist_fifo 
        ON waitlist_reservations(book_id, created_at ASC, reservation_id ASC) 
        WHERE status = 'Waiting';

    -- Partial index 4: Constraint preventing a user from holding duplicate waiting spots
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_waitlist_per_user 
        ON waitlist_reservations(book_id, user_id) 
        WHERE status = 'Waiting';

    -- Partial index 5: Speed up user active loans dashboard
    CREATE INDEX IF NOT EXISTS idx_active_loans_user 
        ON circulation_loans(user_id) 
        WHERE return_date IS NULL;

    -- Index 6: Fast lookup for student requests
    CREATE INDEX IF NOT EXISTS idx_book_requests_user 
        ON book_requests(user_id, status);
    """)

    # Backward-compatible column migration for users.enrollment_no
    cursor.execute("PRAGMA table_info(users);")
    user_cols = [c[1] for c in cursor.fetchall()]
    if "enrollment_no" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN enrollment_no TEXT;")
        conn.commit()

        # Populate pre-existing users
        enrollments = {
            "admin@bookbase.in": "ADMIN001",
            "tejas@bookbase.in": "CSBS2022001",
            "akash@bookbase.in": "CSBS2022002",
            "saikartikeya@bookbase.in": "CSBS2022003",
            "biba@bookbase.in": "CSBS2022004",
            "jaidanya@bookbase.in": "CSBS2022005"
        }
        for email, en_no in enrollments.items():
            cursor.execute("UPDATE users SET enrollment_no = ? WHERE email = ?", (en_no, email))
        
        # Populate any remaining with a fallback
        cursor.execute("SELECT user_id FROM users WHERE enrollment_no IS NULL OR enrollment_no = ''")
        for row in cursor.fetchall():
            cursor.execute("UPDATE users SET enrollment_no = ? WHERE user_id = ?", (f"STU{row[0]:05d}", row[0]))
        conn.commit()

    # Ensure unique index exists on enrollment_no
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_enrollment_no ON users(enrollment_no);")
    conn.commit()

