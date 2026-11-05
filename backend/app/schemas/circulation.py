from typing import List, Optional

from pydantic import BaseModel


class LendingPolicyOut(BaseModel):
    overdue_fine_rate_per_day: float
    loan_duration_days: int
    max_loans_per_user: int  # The quota new accounts get. Checkout enforces each account's max_books_quota.
    max_fine_days: int
    copy_conditions: List[str]


class CheckoutRequest(BaseModel):
    user_id: Optional[int] = None  # Admins may act for a patron; everyone else acts as themselves
    book_id: int
    copy_id: Optional[int] = None
    barcode: Optional[str] = None  # The code on the physical copy's label


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
    user_id: Optional[int] = None  # Admins may act for a patron; everyone else acts as themselves
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


class ReturnRequestCreate(BaseModel):
    loan_id: int
    barcode: str  # Typed from the label, to prove which physical copy is being handed back
    condition: str
    notes: Optional[str] = None


class ReturnRequestConfirm(BaseModel):
    condition: str  # What the librarian sees, which may differ from what the student reported


class ReturnRequestOut(BaseModel):
    return_request_id: int
    loan_id: int
    copy_id: int
    book_id: int
    title: str
    author: str
    barcode: str
    user_id: int
    user_name: str
    user_enrollment_no: Optional[str] = None
    condition_at_issue: str
    reported_condition: str
    notes: Optional[str] = None
    status: str
    created_at: str
    due_date: str
    fine_if_confirmed: float


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
    condition_at_issue: str
    condition_at_return: Optional[str] = None
    return_request_id: Optional[int] = None  # Set while a return request waits for a librarian
    return_requested_at: Optional[str] = None
    is_overdue: bool
    days_remaining: int
    days_overdue: int
    accrued_fine: float  # Active loan: what returning it now would charge. Returned loan: what was charged.
