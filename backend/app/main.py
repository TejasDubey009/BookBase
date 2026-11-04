from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_raw_connection
from app.seed_data import seed_database
from app.routers import auth, books, circulation, users, admin, telemetry, requests

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize and seed database if empty
    conn = get_raw_connection()
    try:
        seed_database(conn, force_reset=False)
    finally:
        conn.close()
    yield

app = FastAPI(
    title="BookBase API — Smart Relational LMS",
    description="3NF Normalized Library Management System with strict FIFO waitlist auto-assignment, ACID row-level locking, and live DBMS telemetry.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Vite dev server and preview environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routers with both /api/v1 and /v1 (for transparent Vercel function routing)
for prefix in ["/api/v1", "/v1"]:
    app.include_router(auth.router, prefix=prefix)
    app.include_router(books.router, prefix=prefix)
    app.include_router(circulation.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(admin.router, prefix=prefix)
    app.include_router(requests.router, prefix=prefix)
    app.include_router(telemetry.router, prefix=prefix)

@app.get("/api/v1/health")
@app.get("/v1/health")
@app.get("/health")
def healthcheck():
    return {
        "status": "healthy",
        "system": "BookBase DBMS",
        "3NF_compliant": True,
        "fifo_engine": "Active"
    }

# Mount Frontend static files if built (only when running locally; Vercel Edge CDN serves frontend/dist directly)
import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if not os.getenv("VERCEL") and FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")
else:
    @app.get("/")
    def root():
        return {
            "message": "Welcome to BookBase API. Access interactive documentation at /docs",
            "api_prefix": "/api/v1"
        }
