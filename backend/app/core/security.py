"""Password hashing and session token issuing."""
import hashlib


def hash_password(password: str) -> str:
    return hashlib.sha256(f"bookbase_salt_{password}".encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password


def issue_token(user_id: int, role: str) -> str:
    return f"bb_token_{user_id}_{role}"
