"""The database objects the services work with. SQLite provides them natively, and db/postgres.py for PostgreSQL."""
import sqlite3
from typing import Union

from app.db.postgres import PostgresConnection, PostgresCursor, PostgresRow

Connection = Union[sqlite3.Connection, PostgresConnection]
Cursor = Union[sqlite3.Cursor, PostgresCursor]
Row = Union[sqlite3.Row, PostgresRow]
