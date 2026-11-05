from typing import List

from pydantic import BaseModel

from app.schemas.auth import UserOut
from app.schemas.circulation import LoanOut
from app.schemas.requests import BookRequestOut


class UserWaitlistCard(BaseModel):
    reservation_id: int
    book_id: int
    title: str
    author: str
    isbn: str
    cover_url: str
    card_tint: str
    queue_position: int
    total_waiting: int
    created_at: str


class UserDashboardOut(BaseModel):
    user: UserOut
    active_loans: List[LoanOut]
    loan_history: List[LoanOut]
    active_waitlists: List[UserWaitlistCard]
    book_requests: List[BookRequestOut] = []
