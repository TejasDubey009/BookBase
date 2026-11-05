from typing import List, Optional

from pydantic import BaseModel

from app.schemas.circulation import LoanOut, ReturnRequestOut, WaitlistEntryOut
from app.schemas.requests import BookRequestOut


class SettleFineRequest(BaseModel):
    user_id: int
    amount_settled: Optional[float] = None


class StudentFineOut(BaseModel):
    user_id: int
    full_name: str
    enrollment_no: str
    email: str
    outstanding_fines: float


class BookBorrowerOut(BaseModel):
    loan_id: int
    copy_id: int
    barcode: str
    shelf_location: str
    user_id: int
    student_name: str
    student_enrollment_no: str
    student_email: str
    issue_date: str
    due_date: str
    return_date: Optional[str] = None
    status: str  # 'Active', 'Overdue', 'Returned'
    fine_assessed: float
    accrued_fine: float  # Active loan: what returning it now would charge. Returned loan: what was charged.
    days_remaining: int
    condition_at_issue: str
    condition_at_return: Optional[str] = None


class GroupedBookBorrowersOut(BaseModel):
    book_id: int
    isbn: str
    title: str
    author: str
    category: str
    published_year: int
    cover_url: str
    card_tint: str
    total_copies: int
    available_copies: int
    active_loans_count: int
    waitlist_count: int
    borrowers: List[BookBorrowerOut]


class AdminKPIs(BaseModel):
    total_titles: int
    physical_copies: int
    available_copies: int
    active_loans: int
    waitlist_queue_depth: int
    total_fines: float
    pending_requests_count: int = 0
    pending_returns_count: int = 0


class AdminOverviewOut(BaseModel):
    kpis: AdminKPIs
    active_loans: List[LoanOut]
    waitlist_queue: List[WaitlistEntryOut]
    return_requests: List[ReturnRequestOut] = []
    book_requests: List[BookRequestOut] = []
    grouped_books: Optional[List[GroupedBookBorrowersOut]] = None
    student_fines: List[StudentFineOut] = []
    recent_audit_logs: List[dict]
