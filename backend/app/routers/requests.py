import sqlite3
from typing import List, Optional

from fastapi import APIRouter, Depends, status

from app.core.auth import get_current_user, require_admin
from app.core.security import CurrentUser, resolve_target_user
from app.db.connection import get_db
from app.schemas.requests import BookRequestCreate, BookRequestOut, BookRequestUpdate
from app.services import request_service

router = APIRouter(prefix="/requests", tags=["Student Book Requests & Acquisition"])


@router.get("", response_model=List[BookRequestOut])
def get_book_requests(
    user_id: Optional[int] = None,
    actor: CurrentUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """Members see their own requests. Admins see everyone's unless they filter by user_id."""
    target_user_id = user_id if actor.is_admin else resolve_target_user(actor, user_id)
    return request_service.list_requests(db, user_id=target_user_id)


@router.post("", response_model=BookRequestOut, status_code=status.HTTP_201_CREATED)
def create_book_request(
    payload: BookRequestCreate,
    actor: CurrentUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    return request_service.create_request(db, payload, user_id=resolve_target_user(actor, payload.user_id))


@router.patch("/{request_id}", response_model=BookRequestOut, dependencies=[Depends(require_admin)])
def update_book_request_status(
    request_id: int,
    payload: BookRequestUpdate,
    db: sqlite3.Connection = Depends(get_db)
):
    return request_service.update_status(db, request_id, payload)
