from fastapi import APIRouter, Depends, Query
import sqlite3
from typing import List, Optional
from app.database import get_db
from app.schemas import AuditLogOut

router = APIRouter(prefix="/telemetry", tags=["DBMS Telemetry Logs"])

@router.get("/logs", response_model=List[AuditLogOut])
def get_telemetry_logs(
    limit: int = Query(50, ge=1, le=200),
    operation_type: Optional[str] = Query(None),
    db: sqlite3.Connection = Depends(get_db)
):
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

