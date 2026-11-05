import sqlite3
from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.core.auth import require_admin
from app.db.connection import get_db
from app.schemas.telemetry import AuditLogOut
from app.services import telemetry_service

# Audit entries name patrons and what they borrowed
router = APIRouter(prefix="/telemetry", tags=["DBMS Telemetry Logs"], dependencies=[Depends(require_admin)])


@router.get("/logs", response_model=List[AuditLogOut])
def get_telemetry_logs(
    limit: int = Query(50, ge=1, le=200),
    operation_type: Optional[str] = Query(None),
    db: sqlite3.Connection = Depends(get_db)
):
    return telemetry_service.list_logs(db, limit=limit, operation_type=operation_type)
