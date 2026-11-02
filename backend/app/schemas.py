from typing import List, Optional
from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# Auth Schemas
# -----------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "member"

class UserOut(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: str
    max_books_quota: int
    outstanding_fines: float
    active_loans_count: Optional[int] = 0

class LoginResponse(BaseModel):
    token: str
    user: UserOut

class DemoUserOut(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: str
    label: str
    sample_password: str
    max_books_quota: int
    outstanding_fines: float

# -----------------------------------------------------------------------------
# Book & Inventory Schemas
# -----------------------------------------------------------------------------
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

class WaitlistEntryOut(BaseModel):
    reservation_id: int
    book_id: int
    book_title: Optional[str] = None
    user_id: int
    user_name: str
    user_email: str
    queue_position: int
    status: str
    created_at: str
    fulfilled_at: Optional[str] = None

# -----------------------------------------------------------------------------
# Circulation Schemas
# -----------------------------------------------------------------------------
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

class ReturnRequest(BaseModel):
    loan_id: Optional[int] = None
    copy_id: Optional[int] = None

class ReturnResponse(BaseModel):
    success: bool
    status: str # 'RETURNED_TO_SHELF' or 'AUTO_ASSIGNED_TO_WAITLIST'
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

# -----------------------------------------------------------------------------
# Dashboard & Telemetry Schemas
# -----------------------------------------------------------------------------
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

class AdminKPIs(BaseModel):
    total_titles: int
    physical_copies: int
    available_copies: int
    active_loans: int
    waitlist_queue_depth: int
    total_fines: float

class AdminOverviewOut(BaseModel):
    kpis: AdminKPIs
    active_loans: List[LoanOut]
    waitlist_queue: List[WaitlistEntryOut]
    recent_audit_logs: List[dict]

class AuditLogOut(BaseModel):
    log_id: int
    operation_type: str
    sql_summary: str
    affected_entities: str
    created_at: str

