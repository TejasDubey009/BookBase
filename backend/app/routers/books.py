import sqlite3
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status

from app.db.connection import get_db
from app.schemas.books import BookCreateRequest, BookOut, CopyCreateRequest
from app.services import catalog_service

router = APIRouter(prefix="/books", tags=["Catalog & Inventory"])


@router.get("", response_model=List[BookOut])
def list_books(
    search: Optional[str] = Query(None, description="Search across Title, Author, ISBN, or Shelf Location"),
    category: Optional[str] = Query(None, description="Filter by Category"),
    availability: Optional[str] = Query(None, description="'available' | 'waitlist' | 'all'"),
    user_id: Optional[int] = Query(None, description="Compute active loan/waitlist context for this patron"),
    db: sqlite3.Connection = Depends(get_db)
):
    return catalog_service.list_books(db, search=search, category=category, availability=availability, user_id=user_id)


@router.get("/{book_id}", response_model=BookOut)
def get_book_detail(
    book_id: int,
    user_id: Optional[int] = Query(None),
    db: sqlite3.Connection = Depends(get_db)
):
    return catalog_service.get_book_detail(db, book_id, user_id=user_id)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_book(payload: BookCreateRequest, db: sqlite3.Connection = Depends(get_db)):
    return catalog_service.create_book(db, payload)


@router.post("/{book_id}/copies", status_code=status.HTTP_201_CREATED)
def add_book_copy(book_id: int, payload: CopyCreateRequest, db: sqlite3.Connection = Depends(get_db)):
    return catalog_service.add_copy(db, book_id, payload)
