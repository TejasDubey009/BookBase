import sqlite3
from typing import List, Optional

from fastapi import APIRouter, Depends

from app.db.connection import get_db
from app.schemas.admin import AdminOverviewOut, GroupedBookBorrowersOut, SettleFineRequest
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["Admin Operations & Inventory Management"])


@router.get("/overview", response_model=AdminOverviewOut)
def get_admin_overview(db: sqlite3.Connection = Depends(get_db)):
    return admin_service.get_overview(db)


@router.get("/grouped-books", response_model=List[GroupedBookBorrowersOut])
def get_admin_grouped_books(search: Optional[str] = None, db: sqlite3.Connection = Depends(get_db)):
    """
    Dedicated endpoint returning curriculum books and their full borrower history/active loans.
    """
    return admin_service.build_grouped_books(db, search=search)


@router.post("/settle-fine")
def settle_user_fine(payload: SettleFineRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Librarian action to record fine payment / waive fine for a student patron.
    """
    return admin_service.settle_fine(db, payload)


@router.post("/reset-demo")
def reset_demo(db: sqlite3.Connection = Depends(get_db)):
    """
    Resets the database back to clean seeded state at any time for repeat viva demonstrations.
    """
    return admin_service.reset_demo(db)
