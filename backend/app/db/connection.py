"""SQLite connections and transaction handling."""
import sqlite3
from contextlib import contextmanager
from typing import Iterator

from app.config import DB_PATH
from app.core.errors import ServiceError


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


def get_db():
    """FastAPI dependency: one connection per request."""
    conn = get_raw_connection()
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def immediate_transaction(
    conn: sqlite3.Connection,
    error_prefix: str = "Database transaction error: ",
) -> Iterator[sqlite3.Cursor]:
    """
    Runs the block inside BEGIN IMMEDIATE, taking the write lock up front so concurrent
    checkouts and returns cannot interleave. Commits on success and rolls back on any error.
    Unexpected errors surface as a ServiceError (HTTP 500) carrying the database message.
    """
    cursor = conn.cursor()
    try:
        cursor.execute("BEGIN IMMEDIATE")
        yield cursor
        conn.commit()
    except ServiceError:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise ServiceError(f"{error_prefix}{e}") from e
