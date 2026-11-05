"""Sign-in, account registration and profile lookups."""
import hmac
import re
from typing import List

from app.config import (
    DEMO_MODE,
    MAX_LOANS_PER_LIBRARIAN,
    MAX_LOANS_PER_USER,
    MIN_PASSWORD_LENGTH,
    STAFF_SIGNUP_CODE,
)
from app.core.clock import utc_now_iso
from app.core.errors import BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import hash_password, issue_token, needs_rehash, verify_password
from app.db.audit import log_audit
from app.db.queries import USER_PROFILE_SELECT, count_active_loans
from app.db.seed_data import USERS as SEEDED_USERS
from app.db.types import Connection
from app.schemas.auth import DemoUserOut, LoginRequest, LoginResponse, RegisterRequest, UserOut
from app.services.mappers import to_user_out


_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_ENROLLMENT_PATTERN = re.compile(r"^[A-Z0-9-]{3,30}$")


def login(db: Connection, payload: LoginRequest) -> LoginResponse:
    cursor = db.cursor()
    # Support login via enrollment_no, email, or identifier
    raw_ident = (payload.identifier or payload.enrollment_no or payload.email or "").strip()
    if not raw_ident:
        raise BadRequestError("Please provide an enrollment number or email")

    cursor.execute(
        """
        SELECT user_id, enrollment_no, full_name, email, password_hash, role, max_books_quota, outstanding_fines, created_at
        FROM users
        WHERE LOWER(enrollment_no) = LOWER(?) OR LOWER(email) = LOWER(?)
        """,
        (raw_ident, raw_ident)
    )
    user_row = cursor.fetchone()

    if not user_row or not verify_password(payload.password, user_row["password_hash"]):
        raise UnauthorizedError("Invalid enrollment number/email or password")

    # Older accounts move to the current password hash the next time they sign in
    if needs_rehash(user_row["password_hash"]):
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE user_id = ?",
            (hash_password(payload.password), user_row["user_id"])
        )
        db.commit()

    # Optional role check for role tabs
    if payload.role and payload.role.lower() != user_row["role"].lower():
        raise ForbiddenError(f"This account is registered as a {user_row['role']}, not {payload.role}")

    user_out = to_user_out(user_row, count_active_loans(cursor, user_row["user_id"]))
    return LoginResponse(token=issue_token(user_row["user_id"], user_row["created_at"]), user=user_out)


def _assert_valid_staff_code(staff_code: str) -> None:
    """Nobody can register as a librarian unless the server has a code set and they know it."""
    if not STAFF_SIGNUP_CODE or not hmac.compare_digest(staff_code.strip().encode(), STAFF_SIGNUP_CODE.encode()):
        raise ForbiddenError("That staff code isn't valid. Ask the library administrator for the current one.")


def register(db: Connection, payload: RegisterRequest) -> LoginResponse:
    cursor = db.cursor()
    enrollment = payload.enrollment_no.strip().upper()
    email = payload.email.strip().lower()
    full_name = payload.full_name.strip()
    pwd = payload.password

    if not enrollment or not email or not full_name or not pwd.strip():
        raise BadRequestError("Full name, enrollment number, email, and password are all required.")
    if not _ENROLLMENT_PATTERN.match(enrollment):
        raise BadRequestError("Enrollment number must be 3 to 30 letters, digits or hyphens.")
    if not _EMAIL_PATTERN.match(email):
        raise BadRequestError("Please enter a valid email address.")
    if len(pwd) < MIN_PASSWORD_LENGTH:
        raise BadRequestError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long.")

    is_staff = payload.staff_code is not None
    if is_staff:
        _assert_valid_staff_code(payload.staff_code)
    role = "admin" if is_staff else "member"
    quota = MAX_LOANS_PER_LIBRARIAN if is_staff else MAX_LOANS_PER_USER

    cursor.execute("SELECT user_id FROM users WHERE UPPER(enrollment_no) = ?", (enrollment,))
    if cursor.fetchone():
        raise BadRequestError(f"Enrollment number '{enrollment}' is already registered. Please sign in instead.")

    cursor.execute("SELECT user_id FROM users WHERE LOWER(email) = ?", (email,))
    if cursor.fetchone():
        raise BadRequestError(f"Email '{email}' is already registered. Please sign in instead.")

    created_at = utc_now_iso()
    cursor.execute(
        """
        INSERT INTO users (full_name, enrollment_no, email, password_hash, role, max_books_quota, outstanding_fines, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0.0, ?)
        """,
        (full_name, enrollment, email, hash_password(pwd), role, quota, created_at)
    )
    new_user_id = cursor.lastrowid

    log_audit(
        db,
        "TX_REGISTER_STAFF" if is_staff else "TX_REGISTER_STUDENT",
        f"New {'librarian' if is_staff else 'student patron'} registered: {full_name} ({enrollment})",
        f"user_id: {new_user_id}, enrollment_no: {enrollment}, email: {email}"
    )
    db.commit()

    user_out = UserOut(
        user_id=new_user_id,
        enrollment_no=enrollment,
        full_name=full_name,
        email=email,
        role=role,
        max_books_quota=quota,
        outstanding_fines=0.0,
        active_loans_count=0
    )
    return LoginResponse(token=issue_token(new_user_id, created_at), user=user_out)


def list_demo_users(db: Connection) -> List[DemoUserOut]:
    """
    The seeded student accounts for the sign-in modal's quick-select. Empty unless demo mode is on.
    Librarian accounts are never listed.
    """
    if not DEMO_MODE:
        return []

    passwords = {enrollment: password for _, enrollment, _, password, role, _, _ in SEEDED_USERS if role == "member"}
    placeholders = ", ".join("?" for _ in passwords)
    cursor = db.cursor()
    cursor.execute(
        f"SELECT enrollment_no, full_name, role FROM users WHERE enrollment_no IN ({placeholders}) ORDER BY user_id ASC",
        list(passwords)
    )
    return [
        DemoUserOut(
            enrollment_no=u["enrollment_no"],
            full_name=u["full_name"],
            role=u["role"],
            sample_password=passwords[u["enrollment_no"]]
        ) for u in cursor.fetchall()
    ]


def get_profile(db: Connection, user_id: int) -> UserOut:
    cursor = db.cursor()
    cursor.execute(f"{USER_PROFILE_SELECT} WHERE user_id = ?", (user_id,))
    user_row = cursor.fetchone()
    if not user_row:
        raise NotFoundError("User not found")
    return to_user_out(user_row, count_active_loans(cursor, user_id))
