from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import CORS_ORIGINS
from app.core.errors import ServiceError
from app.db.connection import INTEGRITY_ERRORS, IS_POSTGRES, get_raw_connection
from app.db.seed import seed_database
from app.routers import admin, auth, books, circulation, policy, requests, telemetry, users


DATABASE_ENGINE = "PostgreSQL" if IS_POSTGRES else "SQLite"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize and seed database if empty
    print(f"Database: {DATABASE_ENGINE}")
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


# Two requests raced to create the same thing, and the database's constraint stopped the second
async def handle_integrity_error(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": "That record already exists."})


for integrity_error in INTEGRITY_ERRORS:
    app.add_exception_handler(integrity_error, handle_integrity_error)


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
        "database": DATABASE_ENGINE,
        "3NF_compliant": True,
        "fifo_engine": "Active"
    }


# The three portal sites are built and served separately (see frontend/portals.json)
@app.get("/")
def root():
    return {
        "message": "Welcome to BookBase API. Access interactive documentation at /docs",
        "api_prefix": "/api/v1"
    }
