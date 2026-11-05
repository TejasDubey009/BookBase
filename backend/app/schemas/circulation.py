from typing import Optional

from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    user_id: int
    book_id: int
    copy_id: Optional[int] = None


class CheckoutResponse(BaseModel):
    success: bool
    loan_id: int
    book_id: int
    copy_id: int
    barcode: str
    due_date: str
    issued_via: str
    message: str


class WaitlistRequest(BaseModel):
    user_id: int
    book_id: int


class WaitlistResponse(BaseModel):
    success: bool
    reservation_id: int
    book_id: int
    user_id: int
    queue_position: int
    status: str
    message: str


class WaitlistEntryOut(BaseModel):
    reservation_id: int
    book_id: int
    book_title: Optional[str] = None
    user_id: int
    user_name: str
    user_email: str
    user_enrollment_no: Optional[str] = None
    queue_position: int
    status: str
    created_at: str
    fulfilled_at: Optional[str] = None


class ReturnRequest(BaseModel):
    loan_id: Optional[int] = None
    copy_id: Optional[int] = None


class ReturnResponse(BaseModel):
    success: bool
    status: str  # 'RETURNED_TO_SHELF' or 'AUTO_ASSIGNED_TO_WAITLIST'
    message: str
    fine_assessed: float
    loan_id: int
    copy_id: int
    book_id: int
    next_user: Optional[dict] = None
    new_loan_id: Optional[int] = None


class LoanOut(BaseModel):
    loan_id: int
    copy_id: int
    user_id: int
    user_name: str
    user_email: str
    user_enrollment_no: Optional[str] = None
    book_id: int
    title: str
    author: str
    isbn: str
    cover_url: str
    card_tint: str
    barcode: str
    shelf_location: str
    issue_date: str
    due_date: str
    return_date: Optional[str] = None
    fine_assessed: float
    issued_via: str
    is_overdue: bool
    days_remaining: int
    days_overdue: int
    accrued_fine: float  # Active loan: what returning it now would charge. Returned loan: what was charged.
