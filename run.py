#!/usr/bin/env python3
"""
BookBase: Smart Relational Library Management System
Root Launcher: Starts the shared API on port 8001 (or $PORT) and one website per portal,
all with auto-reload. Portal ports are defined in frontend/portals.json.
"""

import json
import os
import secrets
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
VENV_PYTHON = BACKEND_DIR / "venv" / "bin" / "python"
VITE = FRONTEND_DIR / "node_modules" / ".bin" / "vite"

if not VENV_PYTHON.exists():
    print(f"Virtualenv python not found at {VENV_PYTHON}. Using system python: {sys.executable}")
    python_cmd = sys.executable
else:
    python_cmd = str(VENV_PYTHON)

if not VITE.exists():
    if not shutil.which("npm"):
        sys.exit("Node.js is required to run the portal websites: https://nodejs.org")
    print("Installing frontend dependencies...")
    subprocess.run(["npm", "install"], cwd=str(FRONTEND_DIR), check=True)


def resolve_kiosk_key() -> str:
    """The key the API will end up with, since backend/.env wins there, or a new one for this run."""
    env_file = BACKEND_DIR / ".env"
    if env_file.exists() and not os.getenv("BOOKBASE_SKIP_DOTENV"):
        for line in env_file.read_text().splitlines():
            name, _, value = line.partition("=")
            if name.strip() == "BOOKBASE_KIOSK_KEY" and value.strip():
                return value.strip().strip("\"'")
    return os.getenv("BOOKBASE_KIOSK_KEY") or secrets.token_urlsafe(32)


api_port = os.getenv("PORT", "8001")
portals = json.loads((FRONTEND_DIR / "portals.json").read_text())

print("=" * 70)
print("📚 BOOKBASE — SMART RELATIONAL LIBRARY MANAGEMENT SYSTEM")
print("=" * 70)
for portal in portals.values():
    print(f"► {portal['title'] + ':':<20}http://localhost:{portal['port']}")
print(f"► {'REST API Docs:':<20}http://127.0.0.1:{api_port}/docs")
print("► Database:           DATABASE_URL in backend/.env (Supabase), or a local SQLite file if unset")
print("=" * 70)

api_env = dict(os.environ, PYTHONPATH=str(BACKEND_DIR))
# Local defaults, which backend/.env overrides: the seeded student accounts show in the sign-in
# modal, and sessions survive auto-reloads
api_env.setdefault("BOOKBASE_DEMO_MODE", "1")
api_env.setdefault("BOOKBASE_SECRET_KEY", secrets.token_urlsafe(48))
# Only the kiosk's site uses this (see vite.config.js), so students can borrow there with no setup
kiosk_key = resolve_kiosk_key()
api_env["BOOKBASE_KIOSK_KEY"] = kiosk_key
vite_env = dict(os.environ, BOOKBASE_API_URL=f"http://127.0.0.1:{api_port}", BOOKBASE_KIOSK_KEY=kiosk_key)

processes = [
    subprocess.Popen(
        [python_cmd, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", api_port, "--reload"],
        cwd=str(BACKEND_DIR),
        env=api_env,
    )
]
for mode in portals:
    processes.append(subprocess.Popen([str(VITE), "--mode", mode], cwd=str(FRONTEND_DIR), env=vite_env))

# So that being told to stop also runs the cleanup below, instead of orphaning the servers
signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))

try:
    # If any one site stops (for example, its port is taken), stop them all rather than run partly up
    while all(process.poll() is None for process in processes):
        time.sleep(0.5)
    print("\nA BookBase server stopped. Shutting down the others.")
except KeyboardInterrupt:
    print("\nShutting down BookBase. Goodbye!")
finally:
    for process in processes:
        if process.poll() is None:
            process.terminate()
    for process in processes:
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
