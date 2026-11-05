"""Password hashing, signed session tokens and the identity of the caller."""
import datetime
import hashlib
import hmac
import os
from dataclasses import dataclass
from typing import Optional, Tuple

import jwt

from app.config import SECRET_KEY, TOKEN_TTL_MINUTES
from app.core.clock import utc_now
from app.core.errors import ForbiddenError, UnauthorizedError

# scrypt cost from the OWASP password storage guidance, using its lowest-memory setting
# (16 MiB per hash) because this runs in small serverless functions.
_SCRYPT_N = 2 ** 14
_SCRYPT_R = 8
_SCRYPT_P = 5
_SCRYPT_MAXMEM = 64 * 1024 * 1024
_SCRYPT_SCHEME = "scrypt"
_CURRENT_HASH_PREFIX = f"{_SCRYPT_SCHEME}${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}$"

_TOKEN_ALGORITHM = "HS256"
_TOKEN_CLOCK_SKEW_SECONDS = 10

SESSION_INVALID_MESSAGE = "Your session is invalid or has expired. Please sign in again."


def _scrypt(password: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(password.encode(), salt=salt, n=n, r=r, p=p, maxmem=_SCRYPT_MAXMEM, dklen=32)


def _legacy_sha256(password: str) -> str:
    """The original scheme: SHA-256 with one fixed salt. Only ever used to verify old rows."""
    return hashlib.sha256(f"bookbase_salt_{password}".encode()).hexdigest()


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = _scrypt(password, salt, _SCRYPT_N, _SCRYPT_R, _SCRYPT_P)
    return f"{_CURRENT_HASH_PREFIX}{salt.hex()}${digest.hex()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    if not stored_hash.startswith(f"{_SCRYPT_SCHEME}$"):
        return hmac.compare_digest(_legacy_sha256(plain_password).encode(), stored_hash.encode())

    try:
        _, n, r, p, salt, digest = stored_hash.split("$")
        actual = _scrypt(plain_password, bytes.fromhex(salt), int(n), int(r), int(p))
        return hmac.compare_digest(actual, bytes.fromhex(digest))
    except ValueError:
        return False


def needs_rehash(stored_hash: str) -> bool:
    """True for legacy hashes and older scrypt costs. Login upgrades these once it knows the password."""
    return not stored_hash.startswith(_CURRENT_HASH_PREFIX)


def issue_token(user_id: int, account_created_at: str) -> str:
    """
    The role is deliberately not in the token: it is read from the database on every request.
    `acct` ties the token to this one account, because user ids get reused. Resetting the demo
    restarts them, and on Vercel each function instance has its own copy of the database.
    """
    now = utc_now()
    claims = {
        "sub": str(user_id),
        "acct": account_created_at,
        "iat": now,
        "exp": now + datetime.timedelta(minutes=TOKEN_TTL_MINUTES),
    }
    return jwt.encode(claims, SECRET_KEY, algorithm=_TOKEN_ALGORITHM)


def decode_token(token: str) -> Tuple[int, str]:
    """Returns (user_id, account_created_at), or raises UnauthorizedError."""
    try:
        claims = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[_TOKEN_ALGORITHM],
            leeway=_TOKEN_CLOCK_SKEW_SECONDS,
            options={"require": ["sub", "acct", "iat", "exp"]},
        )
        return int(claims["sub"]), claims["acct"]
    except (jwt.InvalidTokenError, ValueError) as e:
        raise UnauthorizedError(SESSION_INVALID_MESSAGE) from e


@dataclass(frozen=True)
class CurrentUser:
    user_id: int
    role: str

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def ensure_can_act_for(actor: CurrentUser, user_id: int) -> None:
    """Members may act only on their own data. Admins may act on anyone's."""
    if not actor.is_admin and actor.user_id != user_id:
        raise ForbiddenError("You can only access your own library account.")


def resolve_target_user(actor: CurrentUser, requested_user_id: Optional[int]) -> int:
    """Whose data a request is about: the caller, unless they asked for someone else and may do that."""
    if requested_user_id is None:
        return actor.user_id
    ensure_can_act_for(actor, requested_user_id)
    return requested_user_id
