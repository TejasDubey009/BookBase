from fastapi import APIRouter

from app.schemas.circulation import LendingPolicyOut
from app.services import circulation_service

router = APIRouter(prefix="/policy", tags=["Lending Policy"])


@router.get("", response_model=LendingPolicyOut)
def get_lending_policy():
    """Public, because the footer shows these rules on every page, including before sign-in."""
    return circulation_service.get_lending_policy()
