"""Database connections and transaction handling: PostgreSQL (Supabase) or a local SQLite file."""
import sqlite3
from contextlib import contextmanager
from typing import Iterator

import psycopg

from app.config import DATABASE_URL, DB_PATH
from app.core.errors import ConflictError, ServiceError
from app.db.postgres import PostgresConnection
from app.db.types import Connection, Cursor

IS_POSTGRES = bool(DATABASE_URL)

# Row locks exist on PostgreSQL only. SQLite doesn't need them: BEGIN IMMEDIATE below holds the
# whole database. NO KEY UPDATE locks a row without blocking inserts that reference it.
FOR_UPDATE = " FOR UPDATE" if IS_POSTGRES else ""
FOR_NO_KEY_UPDATE = " FOR NO KEY UPDATE" if IS_POSTGRES else ""

INTEGRITY_ERRORS = (sqlite3.IntegrityError, psycopg.IntegrityError)


def get_raw_connection() -> Connection:
    """
    Connects to DATABASE_URL when it is set. Otherwise opens the SQLite file, with:
    - Foreign key constraints enabled (PRAGMA foreign_keys = ON)
    - WAL journal mode for concurrent read/write transactions
    - Row factory enabled for column name dictionary mapping
    - Busy timeout for concurrency handling
    """
    if IS_POSTGRES:
        return PostgresConnection(DATABASE_URL)

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
    conn: Connection,
    error_prefix: str = "Database transaction error: ",
) -> Iterator[Cursor]:
    """
    Runs the block as one transaction so concurrent checkouts and returns cannot interleave. SQLite
    takes its write lock up front with BEGIN IMMEDIATE. PostgreSQL relies on the row locks each
    operation takes with FOR_UPDATE. Commits on success and rolls back on any error. Unexpected
    errors surface as a ServiceError (HTTP 500) carrying the database message.
    """
    cursor = conn.cursor()
    try:
        if not IS_POSTGRES:
            cursor.execute("BEGIN IMMEDIATE")
        yield cursor
        conn.commit()
    except ServiceError:
        conn.rollback()
        raise
    except INTEGRITY_ERRORS as e:
        conn.rollback()
        raise ConflictError("That change conflicts with a newer one. Please refresh and try again.") from e
    except Exception as e:
        conn.rollback()
        raise ServiceError(f"{error_prefix}{e}") from e
