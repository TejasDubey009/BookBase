import sys
import os
from pathlib import Path
from urllib.parse import parse_qs, urlencode

# Set VERCEL env var so config.py knows to use writable /tmp for SQLite
os.environ["VERCEL"] = "1"

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app.main import app as fastapi_app

class VercelPathMiddleware:
    """
    ASGI middleware that dynamically restores original request path and query string
    from Vercel's rewrite mechanism.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            query_string = scope.get("query_string", b"").decode("utf-8")
            params = parse_qs(query_string)
            if "__path__" in params:
                subpath = params["__path__"][0].lstrip("/")
                if subpath in ("docs", "openapi.json", "redoc"):
                    new_path = f"/{subpath}"
                elif subpath.startswith("api/"):
                    new_path = f"/{subpath}"
                else:
                    new_path = f"/api/{subpath}"
                
                scope["path"] = new_path
                scope["raw_path"] = new_path.encode("utf-8")
                
                # Strip internal __path__ param so application gets clean query params
                remaining = {k: v for k, v in params.items() if k != "__path__"}
                scope["query_string"] = urlencode(remaining, doseq=True).encode("utf-8")

        await self.app(scope, receive, send)

app = VercelPathMiddleware(fastapi_app)
