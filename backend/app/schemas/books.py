from typing import List, Optional

from pydantic import BaseModel


class CopyOut(BaseModel):
    copy_id: int
    book_id: int
    barcode: str
    shelf_location: str
    status: str
    condition: str
    current_borrower_name: Optional[str] = None
    current_due_date: Optional[str] = None


class UserContext(BaseModel):
    has_active_loan: bool = False
    active_loan_id: Optional[int] = None
    active_copy_barcode: Optional[str] = None
    return_requested: bool = False
    waitlist_position: Optional[int] = None
    waitlist_reservation_id: Optional[int] = None


class BookOut(BaseModel):
    book_id: int
    isbn: str
    title: str
    author: str
    category: str
    published_year: int
    description: Optional[str] = None
    cover_url: str
    card_tint: str
    total_copies: int
    available_copies: int
    waitlist_count: int
    copies: List[CopyOut] = []
    user_context: Optional[UserContext] = None


class BookWaitlistEntryOut(BaseModel):
    reservation_id: int
    # Set only for admins and for the caller's own entry
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    queue_position: int
    created_at: str


class BookDetailOut(BookOut):
    # Book detail is public, so this carries no email or enrollment number
    waitlist_entries: List[BookWaitlistEntryOut] = []


class BookCreateRequest(BaseModel):
    isbn: str
    title: str
    author: str
    category: str
    published_year: int
    description: Optional[str] = ""
    cover_url: str
    card_tint: Optional[str] = "indigo"
    initial_copies_count: Optional[int] = 1
    shelf_location: Optional[str] = "Floor 2 • Aisle 4A"


class CopyCreateRequest(BaseModel):
    barcode: str
    shelf_location: str
    condition: Optional[str] = "Good"
