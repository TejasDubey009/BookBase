import sqlite3
from typing import List, Optional

from fastapi import APIRouter, Depends, status

from app.db.connection import get_db
from app.schemas.requests import BookRequestCreate, BookRequestOut, BookRequestUpdate
from app.services import request_service

router = APIRouter(prefix="/requests", tags=["Student Book Requests & Acquisition"])


@router.get("", response_model=List[BookRequestOut])
def get_book_requests(user_id: Optional[int] = None, db: sqlite3.Connection = Depends(get_db)):
    return request_service.list_requests(db, user_id=user_id)


@router.post("", response_model=BookRequestOut, status_code=status.HTTP_201_CREATED)
def create_book_request(payload: BookRequestCreate, db: sqlite3.Connection = Depends(get_db)):
    return request_service.create_request(db, payload)


@router.patch("/{request_id}", response_model=BookRequestOut)
def update_book_request_status(
    request_id: int,
    payload: BookRequestUpdate,
    db: sqlite3.Connection = Depends(get_db)
):
    return request_service.update_status(db, request_id, payload)
