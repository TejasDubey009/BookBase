"""Application settings: secrets, where the database lives and the library's lending policy."""
import os
import secrets
from pathlib import Path
from typing import List

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# backend/.env is never committed, and wins over the launcher's defaults. Tests opt out, because
# they wipe whichever database they are pointed at.
if not os.getenv("BOOKBASE_SKIP_DOTENV"):
    load_dotenv(BASE_DIR / ".env", override=True)


def _resolve_database_url() -> str:
    """
    The PostgreSQL connection string, such as Supabase's. Without one the app uses a local SQLite
    file, which can't work on Vercel because nothing on its filesystem survives between requests.
    """
    url = os.getenv("DATABASE_URL", "").strip()
    if not url and os.getenv("VERCEL") == "1":
        raise RuntimeError("DATABASE_URL must be set in the Vercel project's environment variables.")
    return url


def _resolve_secret_key() -> str:
    """
    The key that signs session tokens. No default is committed, since anyone who knows the key can
    sign in as anyone. Without one, Vercel refuses to start, because each function instance would
    otherwise invent its own key. Elsewhere a random key is safe: sessions end when the process stops.
    """
    secret = os.getenv("BOOKBASE_SECRET_KEY", "").strip()
    if secret:
        if len(secret) < 32:
            raise RuntimeError("BOOKBASE_SECRET_KEY must be at least 32 characters long.")
        return secret
    if os.getenv("VERCEL") == "1":
        raise RuntimeError("BOOKBASE_SECRET_KEY must be set in the Vercel project's environment variables.")
    print("Warning: BOOKBASE_SECRET_KEY is not set. Using a random key, so sessions end when this process stops.")
    return secrets.token_urlsafe(48)


def _resolve_cors_origins() -> List[str]:
    """Portal sites reach the API through their own address, so only direct calls to it use this."""
    configured = [origin.strip() for origin in os.getenv("BOOKBASE_CORS_ORIGINS", "").split(",")]
    return [origin for origin in configured if origin] or [f"http://localhost:{port}" for port in (3001, 3002, 3003)]


# Database
DATABASE_URL = _resolve_database_url()
DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / "bookbase.db"))

# Authentication
SECRET_KEY = _resolve_secret_key()
TOKEN_TTL_MINUTES = int(os.getenv("BOOKBASE_TOKEN_TTL_MINUTES", "480"))
CORS_ORIGINS = _resolve_cors_origins()
MIN_PASSWORD_LENGTH = 8
# Lists the seeded student accounts and their passwords in the sign-in modal. Off unless asked for.
# Librarian accounts are never listed.
DEMO_MODE = os.getenv("BOOKBASE_DEMO_MODE", "").strip().lower() in {"1", "true", "yes", "on"}
# The seeded librarian's password. If unset, one is generated at first seed and printed once.
SEED_ADMIN_PASSWORD = os.getenv("BOOKBASE_ADMIN_PASSWORD", "").strip()
# Whoever knows this code can register as a librarian. If unset, nobody can.
STAFF_SIGNUP_CODE = os.getenv("BOOKBASE_STAFF_SIGNUP_CODE", "").strip()

# Lending policy
OVERDUE_FINE_RATE_PER_DAY = 2.00  # ₹2.00 per day
MAX_FINE_DAYS = 4  # A late return is charged for at most this many days, so at most ₹8.00
MAX_LOANS_PER_USER = 4
MAX_LOANS_PER_LIBRARIAN = 10
LOAN_DURATION_DAYS = 14
MAX_OUTSTANDING_FINES_FOR_BORROWING = 25.0

# A physical copy's condition, recorded when it is issued and when it comes back
COPY_CONDITIONS = ("Pristine", "Good", "Fair", "Damaged")
