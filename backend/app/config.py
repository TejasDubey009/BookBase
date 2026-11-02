import os
from pathlib import Path

import os
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Detect Vercel serverless environment or read-only filesystem
is_serverless = os.getenv("VERCEL") == "1" or not os.access(BASE_DIR, os.W_OK)

if is_serverless:
    TMP_DIR = Path("/tmp")
    tmp_db = TMP_DIR / "bookbase.db"
    src_db = BASE_DIR / "bookbase.db"
    
    # If the database doesn't exist in /tmp yet, copy pre-seeded SQLite file if present
    if not tmp_db.exists() and src_db.exists():
        try:
            shutil.copyfile(src_db, tmp_db)
        except Exception as e:
            print(f"Warning: Failed to copy SQLite database to /tmp: {e}")
    
    DB_PATH = os.getenv("DB_PATH", str(tmp_db))
else:
    DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / "bookbase.db"))

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
SECRET_KEY = os.getenv("SECRET_KEY", "bookbase-super-secret-key-4921-prod-grade")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours
OVERDUE_FINE_RATE_PER_DAY = 2.00 # ₹2.00 per day
MAX_LOANS_PER_USER = 4
LOAN_DURATION_DAYS = 14

