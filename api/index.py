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
from fastapi import Request

@app.get("/api/debug-routes")
@app.get("/debug-routes")
def debug_routes(request: Request):
    return {
        "received_path": request.url.path,
        "scope_path": request.scope.get("path"),
        "root_path": request.scope.get("root_path"),
        "routes": [getattr(r, "path", str(r)) for r in request.app.routes]
    }

@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
def catch_all(full_path: str, request: Request):
    return {
        "catch_all": True,
        "full_path": full_path,
        "path": request.url.path,
        "headers": dict(request.headers)
    }

