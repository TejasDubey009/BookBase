from typing import Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    identifier: Optional[str] = None  # can be enrollment number or email
    email: Optional[str] = None
    enrollment_no: Optional[str] = None
    password: str
    role: Optional[str] = "member"


class RegisterRequest(BaseModel):
    full_name: str
    enrollment_no: str
    email: str
    password: str
    staff_code: Optional[str] = None  # Sent by the admin portal's sign-up form


class UserOut(BaseModel):
    user_id: int
    enrollment_no: str
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
    enrollment_no: str
    full_name: str
    role: str
    sample_password: str
