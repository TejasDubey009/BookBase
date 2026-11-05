"""Application settings: where the database lives and the library's lending policy."""
import os
import shutil
from pathlib import Path

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


DB_PATH = _resolve_db_path()

# Lending policy
OVERDUE_FINE_RATE_PER_DAY = 2.00  # ₹2.00 per day
MAX_LOANS_PER_USER = 4
LOAN_DURATION_DAYS = 14
MAX_OUTSTANDING_FINES_FOR_BORROWING = 25.0
