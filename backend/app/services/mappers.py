"""Turns database rows into API response models. Shared by the services."""
import datetime
from typing import Optional

from app.db.types import Row
from app.schemas.auth import UserOut
from app.schemas.circulation import LoanOut, ReturnRequestOut
from app.schemas.requests import BookRequestOut
from app.services.circulation_service import calculate_overdue_fine, overdue_days


def enrollment_or_fallback(enrollment_no: Optional[str], user_id: int) -> str:
    return enrollment_no or f"STU{user_id:05d}"


def to_user_out(row: Row, active_loans_count: int) -> UserOut:
    return UserOut(
        user_id=row["user_id"],
        enrollment_no=enrollment_or_fallback(row["enrollment_no"], row["user_id"]),
        full_name=row["full_name"],
        email=row["email"],
        role=row["role"],
        max_books_quota=row["max_books_quota"],
        outstanding_fines=float(row["outstanding_fines"]),
        active_loans_count=active_loans_count
    )


def to_loan_out(
    row: Row,
    is_overdue: bool,
    days_remaining: int,
    days_overdue: int,
    accrued_fine: float,
) -> LoanOut:
    """Expects a row selected with queries.LOAN_DETAILS_SELECT."""
    return LoanOut(
        loan_id=row["loan_id"],
        copy_id=row["copy_id"],
        user_id=row["user_id"],
        user_name=row["user_name"],
        user_email=row["user_email"],
        user_enrollment_no=enrollment_or_fallback(row["user_enrollment_no"], row["user_id"]),
        book_id=row["book_id"],
        title=row["title"],
        author=row["author"],
        isbn=row["isbn"],
        cover_url=row["cover_url"],
        card_tint=row["card_tint"],
        barcode=row["barcode"],
        shelf_location=row["shelf_location"],
        issue_date=row["issue_date"],
        due_date=row["due_date"],
        return_date=row["return_date"],
        fine_assessed=float(row["fine_assessed"]),
        issued_via=row["issued_via"],
        condition_at_issue=row["condition_at_issue"],
        condition_at_return=row["condition_at_return"],
        return_request_id=row["return_request_id"],
        return_requested_at=row["return_requested_at"],
        is_overdue=is_overdue,
        days_remaining=days_remaining,
        days_overdue=days_overdue,
        accrued_fine=accrued_fine
    )


def to_active_loan_out(row: Row, now: datetime.datetime) -> LoanOut:
    """
    A loan still out, with the fine returning it would charge. That is counted up to now, or up to
    the moment the student raised a return request, however long the librarian then takes.
    """
    due_dt = datetime.datetime.fromisoformat(row["due_date"])
    fine_until = datetime.datetime.fromisoformat(row["return_requested_at"]) if row["return_requested_at"] else now
    return to_loan_out(
        row,
        is_overdue=fine_until > due_dt,
        days_remaining=(due_dt - now).days,
        days_overdue=overdue_days(due_dt, fine_until),
        accrued_fine=calculate_overdue_fine(due_dt, fine_until)
    )


def to_return_request_out(row: Row) -> ReturnRequestOut:
    """Expects a row selected with queries.RETURN_REQUEST_DETAILS_SELECT."""
    return ReturnRequestOut(
        return_request_id=row["return_request_id"],
        loan_id=row["loan_id"],
        copy_id=row["copy_id"],
        book_id=row["book_id"],
        title=row["title"],
        author=row["author"],
        barcode=row["barcode"],
        user_id=row["user_id"],
        user_name=row["user_name"],
        user_enrollment_no=enrollment_or_fallback(row["user_enrollment_no"], row["user_id"]),
        condition_at_issue=row["condition_at_issue"],
        reported_condition=row["reported_condition"],
        notes=row["notes"],
        status=row["status"],
        created_at=row["created_at"],
        due_date=row["due_date"],
        fine_if_confirmed=calculate_overdue_fine(
            datetime.datetime.fromisoformat(row["due_date"]),
            datetime.datetime.fromisoformat(row["created_at"])
        )
    )


def to_book_request_out(row: Row) -> BookRequestOut:
    """Expects a row selected with queries.BOOK_REQUEST_DETAILS_SELECT."""
    return BookRequestOut(
        request_id=row["request_id"],
        user_id=row["user_id"],
        user_name=row["user_name"],
        user_enrollment_no=enrollment_or_fallback(row["user_enrollment_no"], row["user_id"]),
        user_email=row["user_email"],
        book_id=row["book_id"],
        title=row["title"],
        author=row["author"],
        category=row["category"],
        notes=row["notes"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"]
    )
