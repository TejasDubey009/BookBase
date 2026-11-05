import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import CORS_ORIGINS, FRONTEND_DIST
from app.core.errors import ServiceError
from app.db.connection import get_raw_connection
from app.db.seed import seed_database
from app.routers import admin, auth, books, circulation, policy, requests, telemetry, users


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

# Sessions travel in the Authorization header rather than cookies, so credentials stay off
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(ServiceError)
async def handle_service_error(request: Request, exc: ServiceError) -> JSONResponse:
    headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=headers)


# Register API v1 routers with both /api/v1 and /v1 (for transparent Vercel function routing)
for prefix in ["/api/v1", "/v1"]:
    app.include_router(auth.router, prefix=prefix)
    app.include_router(books.router, prefix=prefix)
    app.include_router(circulation.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(admin.router, prefix=prefix)
    app.include_router(requests.router, prefix=prefix)
    app.include_router(telemetry.router, prefix=prefix)
    app.include_router(policy.router, prefix=prefix)


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
if not os.getenv("VERCEL") and FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")
else:
    @app.get("/")
    def root():
        return {
            "message": "Welcome to BookBase API. Access interactive documentation at /docs",
            "api_prefix": "/api/v1"
        }
