from pydantic import BaseModel


class AuditLogOut(BaseModel):
    log_id: int
    operation_type: str
    sql_summary: str
    affected_entities: str
    created_at: str
