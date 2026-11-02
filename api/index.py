import sys
import os
from pathlib import Path

# Set VERCEL env var so config.py knows to use writable /tmp for SQLite
os.environ["VERCEL"] = "1"

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app.main import app
