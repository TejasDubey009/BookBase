#!/usr/bin/env python3
"""
BookBase: Smart Relational Library Management System
Root Launcher: starts one website per portal, with auto-reload. They talk to Supabase directly,
so there is no server of our own to start. Portal ports are defined in frontend/portals.json.
"""

import json
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "frontend"
VITE = FRONTEND_DIR / "node_modules" / ".bin" / "vite"
ENV_FILE = FRONTEND_DIR / ".env"


def supabase_url_is_set() -> bool:
    if os.environ.get("VITE_SUPABASE_URL"):
        return True
    if not ENV_FILE.exists():
        return False
    for line in ENV_FILE.read_text().splitlines():
        name, _, value = line.partition("=")
        if name.strip() == "VITE_SUPABASE_URL" and value.strip():
            return True
    return False


if not VITE.exists():
    if not shutil.which("npm"):
        sys.exit("Node.js is required to run the portal websites: https://nodejs.org")
    print("Installing frontend dependencies...")
    subprocess.run(["npm", "install"], cwd=str(FRONTEND_DIR), check=True)

portals = json.loads((FRONTEND_DIR / "portals.json").read_text())

print("=" * 70)
print("📚 BOOKBASE — SMART RELATIONAL LIBRARY MANAGEMENT SYSTEM")
print("=" * 70)
for portal in portals.values():
    print(f"► {portal['title'] + ':':<20}http://localhost:{portal['port']}")
print("► Database:           Supabase (PostgreSQL), set in frontend/.env")
print("=" * 70)
if not supabase_url_is_set():
    print("Warning: frontend/.env has no VITE_SUPABASE_URL yet, so the sites can't load any data.")
    print("Copy frontend/.env.example to frontend/.env and fill it in. See the README.")

processes = [subprocess.Popen([str(VITE), "--mode", mode], cwd=str(FRONTEND_DIR)) for mode in portals]

# So that being told to stop also runs the cleanup below, instead of orphaning the servers
signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))

try:
    # If any one site stops (for example, its port is taken), stop them all rather than run partly up
    while all(process.poll() is None for process in processes):
        time.sleep(0.5)
    print("\nA BookBase site stopped. Shutting down the others.")
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
