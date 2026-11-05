"""Read access to the db_audit_logs telemetry table."""
import sqlite3
from typing import List, Optional

from app.schemas.telemetry import AuditLogOut


def list_logs(db: sqlite3.Connection, limit: int, operation_type: Optional[str] = None) -> List[AuditLogOut]:
    cursor = db.cursor()
    query = "SELECT log_id, operation_type, sql_summary, affected_entities, created_at FROM db_audit_logs WHERE 1=1"
    params = []

    if operation_type and operation_type.upper() != "ALL":
        query += " AND operation_type = ?"
        params.append(operation_type.strip())

    query += " ORDER BY log_id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    return [
        AuditLogOut(
            log_id=r["log_id"],
            operation_type=r["operation_type"],
            sql_summary=r["sql_summary"],
            affected_entities=r["affected_entities"],
            created_at=r["created_at"]
        ) for r in cursor.fetchall()
    ]
