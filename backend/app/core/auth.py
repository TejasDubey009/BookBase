"""FastAPI dependencies that establish who is calling the API."""
import hmac
from typing import Optional

from fastapi import Depends
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

from app.config import KIOSK_KEY
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import SESSION_INVALID_MESSAGE, CurrentUser, decode_token
from app.db.connection import get_db
from app.db.types import Connection

KIOSK_KEY_HEADER = "X-BookBase-Kiosk-Key"

_bearer_scheme = HTTPBearer(auto_error=False)
_kiosk_key_scheme = APIKeyHeader(name=KIOSK_KEY_HEADER, auto_error=False)


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Connection = Depends(get_db),
) -> Optional[CurrentUser]:
    """For public routes. No token means anonymous, but a token that is sent must be valid."""
    if credentials is None:
        return None

    user_id, account_created_at = decode_token(credentials.credentials)
    cursor = db.cursor()
    cursor.execute("SELECT user_id, role, created_at FROM users WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    if row is None or row["created_at"] != account_created_at:
        raise UnauthorizedError(SESSION_INVALID_MESSAGE)
    return CurrentUser(user_id=row["user_id"], role=row["role"])


def get_current_user(user: Optional[CurrentUser] = Depends(get_optional_user)) -> CurrentUser:
    if user is None:
        raise UnauthorizedError("Please sign in to continue.")
    return user


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.is_admin:
        raise ForbiddenError("This action requires a librarian (admin) account.")
    return user


def require_kiosk_or_admin(
    user: CurrentUser = Depends(get_current_user),
    kiosk_key: Optional[str] = Depends(_kiosk_key_scheme),
) -> CurrentUser:
    """For what a student may only do at the library. Librarians can act from anywhere."""
    if user.is_admin:
        return user
    # With no key configured nothing matches, rather than a missing key matching an empty one
    if not (KIOSK_KEY and kiosk_key and hmac.compare_digest(kiosk_key.encode(), KIOSK_KEY.encode())):
        raise ForbiddenError("Borrowing and returns are only available at a registered Library Kiosk.")
    return user
