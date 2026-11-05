"""FastAPI dependencies that establish who is calling the API."""
import sqlite3
from typing import Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import SESSION_INVALID_MESSAGE, CurrentUser, decode_token
from app.db.connection import get_db

_bearer_scheme = HTTPBearer(auto_error=False)


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: sqlite3.Connection = Depends(get_db),
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
