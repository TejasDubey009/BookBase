"""Application settings: secrets, where the database lives and the library's lending policy."""
import os
import secrets
import shutil
from pathlib import Path
from typing import List

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"


def _resolve_db_path() -> str:
    """
    Picks the SQLite file location. Vercel's filesystem is read-only apart from /tmp,
    so there the pre-seeded database is copied to /tmp on first use.
    """
    is_serverless = os.getenv("VERCEL") == "1" or not os.access(BASE_DIR, os.W_OK)
    if not is_serverless:
        return os.getenv("DB_PATH", str(BASE_DIR / "bookbase.db"))

    tmp_db = Path("/tmp") / "bookbase.db"
    src_db = BASE_DIR / "bookbase.db"
    if not tmp_db.exists() and src_db.exists():
        try:
            shutil.copyfile(src_db, tmp_db)
        except Exception as e:
            print(f"Warning: Failed to copy SQLite database to /tmp: {e}")
    return os.getenv("DB_PATH", str(tmp_db))


def _resolve_secret_key() -> str:
    """
    The key that signs session tokens. No default is committed. Without one, Vercel refuses to
    start, because each function instance would otherwise invent its own key. Elsewhere a random
    key is safe: it only means sessions end when the process stops.
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
    """The frontend is served from the API's own origin, so only the Vite dev server needs CORS."""
    configured = [origin.strip() for origin in os.getenv("BOOKBASE_CORS_ORIGINS", "").split(",")]
    return [origin for origin in configured if origin] or ["http://localhost:5173", "http://127.0.0.1:5173"]


DB_PATH = _resolve_db_path()

# Authentication
SECRET_KEY = _resolve_secret_key()
TOKEN_TTL_MINUTES = int(os.getenv("BOOKBASE_TOKEN_TTL_MINUTES", "480"))
CORS_ORIGINS = _resolve_cors_origins()
# Lists the seeded accounts and their passwords in the sign-in modal. Off unless asked for.
DEMO_MODE = os.getenv("BOOKBASE_DEMO_MODE", "").strip().lower() in {"1", "true", "yes", "on"}

# Lending policy
OVERDUE_FINE_RATE_PER_DAY = 2.00  # ₹2.00 per day
MAX_LOANS_PER_USER = 4
LOAN_DURATION_DAYS = 14
MAX_OUTSTANDING_FINES_FOR_BORROWING = 25.0
