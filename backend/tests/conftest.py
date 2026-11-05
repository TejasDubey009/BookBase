"""
Every test gets its own copy of a freshly seeded database. Hashing the seeded passwords is
deliberately slow, so seeding happens once and the result is copied.
"""
import os
import shutil
import sqlite3
import tempfile
from pathlib import Path

_TEST_DIR = Path(tempfile.mkdtemp(prefix="bookbase-tests-"))
_DB_PATH = _TEST_DIR / "test.db"
_TEMPLATE_PATH = _TEST_DIR / "template.db"

# config.py reads these on import, so they must be set before anything imports the app
os.environ["DB_PATH"] = str(_DB_PATH)
os.environ["BOOKBASE_SECRET_KEY"] = "test-only-signing-key-that-is-long-enough-for-hs256"
os.environ.pop("BOOKBASE_DEMO_MODE", None)
os.environ.pop("BOOKBASE_CORS_ORIGINS", None)
os.environ.pop("VERCEL", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db.connection import get_raw_connection  # noqa: E402
from app.db.seed import seed_database  # noqa: E402
from app.main import app  # noqa: E402

ADMIN_ID = 1
TEJAS_ID = 2  # Holds overdue CLRS (book 3) and DDIA (book 14)
AKASH_ID = 3  # Queue #1 for CLRS


@pytest.fixture(scope="session", autouse=True)
def _seed_template():
    conn = get_raw_connection()
    seed_database(conn)
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    conn.close()
    shutil.copyfile(_DB_PATH, _TEMPLATE_PATH)
    yield
    shutil.rmtree(_TEST_DIR, ignore_errors=True)


@pytest.fixture(autouse=True)
def _fresh_database(_seed_template):
    for suffix in ("-wal", "-shm"):
        Path(f"{_DB_PATH}{suffix}").unlink(missing_ok=True)
    shutil.copyfile(_TEMPLATE_PATH, _DB_PATH)


@pytest.fixture
def client():
    # Not used as a context manager: the lifespan would only re-check the seed
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def db():
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    yield conn
    conn.close()


def login(client: TestClient, identifier: str, password: str, role: str = "member") -> str:
    response = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password, "role": role})
    assert response.status_code == 200, response.text
    return response.json()["token"]


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin(client) -> dict:
    return bearer(login(client, "ADMIN001", "admin123", role="admin"))


@pytest.fixture
def tejas(client) -> dict:
    return bearer(login(client, "CSBS2022001", "member123"))


@pytest.fixture
def akash(client) -> dict:
    return bearer(login(client, "CSBS2022002", "member123"))
