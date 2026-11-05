"""Turns database rows into API response models. Shared by the services."""
import sqlite3
from typing import Optional

from app.schemas.auth import UserOut
from app.schemas.circulation import LoanOut
from app.schemas.requests import BookRequestOut


def enrollment_or_fallback(enrollment_no: Optional[str], user_id: int) -> str:
    return enrollment_no or f"STU{user_id:05d}"


def to_user_out(row: sqlite3.Row, active_loans_count: int) -> UserOut:
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


def to_loan_out(row: sqlite3.Row, is_overdue: bool, days_remaining: int) -> LoanOut:
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
        is_overdue=is_overdue,
        days_remaining=days_remaining
    )


def to_book_request_out(row: sqlite3.Row) -> BookRequestOut:
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
