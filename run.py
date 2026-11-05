#!/usr/bin/env python3
"""
BookBase: Smart Relational Library Management System
Root Launcher: Starts FastAPI Backend on port 8001 (or $PORT) with auto-reload.
Serves full React UI and REST API at http://127.0.0.1:8001
"""

import os
import sys
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
VENV_PYTHON = BACKEND_DIR / "venv" / "bin" / "python"

if not VENV_PYTHON.exists():
    print(f"Virtualenv python not found at {VENV_PYTHON}. Using system python: {sys.executable}")
    python_cmd = sys.executable
else:
    python_cmd = str(VENV_PYTHON)

port = os.getenv("PORT", "8001")

print("=" * 70)
print("📚 BOOKBASE — SMART RELATIONAL LIBRARY MANAGEMENT SYSTEM")
print("=" * 70)
print(f"► Web Application UI:   http://127.0.0.1:{port}")
print(f"► REST API Docs:        http://127.0.0.1:{port}/docs")
print("► Telemetry Console:    Live at bottom drawer of UI")
print("► Database Engine:      3NF Normalized SQLite (PostgreSQL compatible)")
print("=" * 70)

os.environ["PYTHONPATH"] = str(BACKEND_DIR)
cmd = [python_cmd, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(port), "--reload"]

try:
    subprocess.run(cmd, cwd=str(BACKEND_DIR))
except KeyboardInterrupt:
    print("\nShutting down BookBase server. Goodbye!")
