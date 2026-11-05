"""
Gives a PostgreSQL connection the small interface the services use on SQLite: `?` placeholders,
`cursor.lastrowid`, rows readable by name or position, and `with conn:` as a transaction.
Keeping the differences here means every query in the services runs unchanged on both databases.
"""
import datetime
import decimal
import re
from typing import Any, Dict, Iterator, List, Optional, Sequence

import psycopg
from psycopg import conninfo

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
_INSERT_INTO = re.compile(r"^\s*INSERT\s+INTO\s+(\w+)", re.IGNORECASE)

# So an INSERT can report the new row's id the way sqlite3's cursor.lastrowid does
_PRIMARY_KEYS = {
    "users": "user_id",
    "books": "book_id",
    "book_copies": "copy_id",
    "circulation_loans": "loan_id",
    "waitlist_reservations": "reservation_id",
    "book_requests": "request_id",
    "return_requests": "return_request_id",
    "db_audit_logs": "log_id",
}


def _plain_value(value: Any) -> Any:
    """The services read timestamps as ISO-8601 UTC strings and money as floats, on both databases."""
    if isinstance(value, datetime.datetime):
        return value.astimezone(datetime.timezone.utc).isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    return value


class PostgresRow:
    """Reads like sqlite3.Row: by column name, by position, or through dict(row)."""

    __slots__ = ("_positions", "_values")

    def __init__(self, positions: Dict[str, int], values: Sequence[Any]):
        self._positions = positions
        self._values = [_plain_value(value) for value in values]

    def __getitem__(self, key):
        return self._values[key if isinstance(key, int) else self._positions[key]]

    def keys(self) -> List[str]:
        return list(self._positions)


def _row_factory(cursor):
    positions = {column.name: i for i, column in enumerate(cursor.description or [])}
    return lambda values: PostgresRow(positions, values)


class PostgresCursor:
    def __init__(self, cursor):
        self._cursor = cursor
        self.lastrowid: Optional[int] = None

    def execute(self, sql: str, params: Sequence[Any] = ()) -> "PostgresCursor":
        match = _INSERT_INTO.match(sql)
        primary_key = _PRIMARY_KEYS.get(match.group(1)) if match else None
        if primary_key:
            sql = f"{sql.rstrip().rstrip(';')} RETURNING {primary_key}"

        self._cursor.execute(_placeholders(sql, params), params or None)

        if primary_key:
            self.lastrowid = self._cursor.fetchone()[0]
        return self

    def executemany(self, sql: str, rows: Sequence[Sequence[Any]]) -> None:
        self._cursor.executemany(_placeholders(sql, rows), rows)

    def executescript(self, script: str) -> None:
        self._cursor.execute(script)

    def fetchone(self) -> Optional[PostgresRow]:
        return self._cursor.fetchone()

    def fetchall(self) -> List[PostgresRow]:
        return self._cursor.fetchall()

    def __iter__(self) -> Iterator[PostgresRow]:
        return iter(self._cursor)

    @property
    def rowcount(self) -> int:
        return self._cursor.rowcount


def _placeholders(sql: str, params: Sequence[Any]) -> str:
    """psycopg only reads placeholders when it is given parameters, and `%` is special if it is."""
    return sql.replace("%", "%%").replace("?", "%s") if params else sql


class PostgresConnection:
    def __init__(self, url: str):
        # Prepared statements are off because Supabase's transaction pooler can't keep them
        self._connection = psycopg.connect(
            url,
            prepare_threshold=None,
            row_factory=_row_factory,
            connect_timeout=15,
            **_ssl_options(url),
        )

    def cursor(self) -> PostgresCursor:
        return PostgresCursor(self._connection.cursor())

    def execute(self, sql: str, params: Sequence[Any] = ()) -> PostgresCursor:
        return self.cursor().execute(sql, params)

    def commit(self) -> None:
        self._connection.commit()

    def rollback(self) -> None:
        self._connection.rollback()

    def close(self) -> None:
        self._connection.close()

    # Unlike psycopg's own connection, and like sqlite3's, leaving the block does not close it
    def __enter__(self) -> "PostgresConnection":
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        if exc_type is None:
            self.commit()
        else:
            self.rollback()


def _ssl_options(url: str) -> dict:
    """Anything leaving this machine must be encrypted, unless the connection string says otherwise."""
    settings = conninfo.conninfo_to_dict(url)
    if settings.get("sslmode") or settings.get("host") in _LOCAL_HOSTS:
        return {}
    return {"sslmode": "require"}
