import sqlite3
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status

from app.core.auth import get_optional_user, require_admin
from app.core.errors import UnauthorizedError
from app.core.security import CurrentUser, resolve_target_user
from app.db.connection import get_db
from app.schemas.books import BookCreateRequest, BookDetailOut, BookOut, CopyCreateRequest
from app.services import catalog_service

router = APIRouter(prefix="/books", tags=["Catalog & Inventory"])


def _user_context_id(viewer: Optional[CurrentUser], requested_user_id: Optional[int]) -> Optional[int]:
    """Whose loans and waitlist spots to annotate the catalog with. Browsing itself is public."""
    if viewer is None:
        if requested_user_id is not None:
            raise UnauthorizedError("Please sign in to continue.")
        return None
    return resolve_target_user(viewer, requested_user_id)


@router.get("", response_model=List[BookOut])
def list_books(
    search: Optional[str] = Query(None, description="Search across Title, Author, ISBN, or Shelf Location"),
    category: Optional[str] = Query(None, description="Filter by Category"),
    availability: Optional[str] = Query(None, description="'available' | 'waitlist' | 'all'"),
    user_id: Optional[int] = Query(None, description="Admins only: show this patron's loan/waitlist context instead of their own"),
    viewer: Optional[CurrentUser] = Depends(get_optional_user),
    db: sqlite3.Connection = Depends(get_db)
):
    return catalog_service.list_books(
        db,
        search=search,
        category=category,
        availability=availability,
        user_id=_user_context_id(viewer, user_id),
        show_borrowers=bool(viewer and viewer.is_admin)
    )


@router.get("/{book_id}", response_model=BookDetailOut)
def get_book_detail(
    book_id: int,
    user_id: Optional[int] = Query(None, description="Admins only: show this patron's loan/waitlist context instead of their own"),
    viewer: Optional[CurrentUser] = Depends(get_optional_user),
    db: sqlite3.Connection = Depends(get_db)
):
    return catalog_service.get_book_detail(
        db,
        book_id,
        user_id=_user_context_id(viewer, user_id),
        show_borrowers=bool(viewer and viewer.is_admin)
    )


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_book(payload: BookCreateRequest, db: sqlite3.Connection = Depends(get_db)):
    return catalog_service.create_book(db, payload)


@router.post("/{book_id}/copies", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def add_book_copy(book_id: int, payload: CopyCreateRequest, db: sqlite3.Connection = Depends(get_db)):
    return catalog_service.add_copy(db, book_id, payload)
