import sqlite3

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.core.security import CurrentUser, ensure_can_act_for
from app.db.connection import get_db
from app.schemas.dashboard import UserDashboardOut
from app.services import dashboard_service

router = APIRouter(prefix="/users", tags=["Patron Dashboards"])


@router.get("/{user_id}/dashboard", response_model=UserDashboardOut)
def get_user_dashboard(
    user_id: int,
    actor: CurrentUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    ensure_can_act_for(actor, user_id)
    return dashboard_service.get_user_dashboard(db, user_id)
