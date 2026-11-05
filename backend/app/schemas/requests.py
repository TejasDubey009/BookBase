from typing import Optional

from pydantic import BaseModel


class BookRequestCreate(BaseModel):
    user_id: Optional[int] = None  # Admins may act for a patron; everyone else acts as themselves
    title: str
    author: Optional[str] = None
    category: Optional[str] = "Core Computer Science"
    notes: Optional[str] = None
    book_id: Optional[int] = None


class BookRequestUpdate(BaseModel):
    status: str  # 'Pending', 'Approved', 'Procured', 'Rejected'


class BookRequestOut(BaseModel):
    request_id: int
    user_id: int
    user_name: str
    user_enrollment_no: str
    user_email: str
    book_id: Optional[int] = None
    title: str
    author: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: str
    updated_at: str
