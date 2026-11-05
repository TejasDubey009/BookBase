"""Live DBMS telemetry: every state-changing operation appends a row to db_audit_logs."""
import sqlite3

from app.core.clock import utc_now_iso


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
    cursor.execute(
        """
        INSERT INTO db_audit_logs (operation_type, sql_summary, affected_entities, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (operation_type, sql_summary, affected_entities, utc_now_iso())
    )
    return cursor.lastrowid
