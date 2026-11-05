"""
Every test gets its own copy of a freshly seeded database. Hashing the seeded passwords is
deliberately slow, so seeding happens once and the result is copied.

By default the tests run on SQLite. To run them on PostgreSQL, point TEST_DATABASE_URL at a server
where they may create and drop databases, using a database name containing "test":
    TEST_DATABASE_URL=postgresql://postgres@localhost:5432/bookbase_test pytest
"""
import os
import shutil
import tempfile
from pathlib import Path

_TEST_DIR = Path(tempfile.mkdtemp(prefix="bookbase-tests-"))
_DB_PATH = _TEST_DIR / "test.db"
_TEMPLATE_PATH = _TEST_DIR / "template.db"
_POSTGRES_URL = os.environ.get("TEST_DATABASE_URL", "").strip()

ADMIN_PASSWORD = "test-only-librarian-password"
STAFF_CODE = "test-only-staff-code"
KIOSK_KEY = "test-only-kiosk-key"

# config.py reads these on import, so they must be set before anything imports the app.
# DATABASE_URL is always overwritten and backend/.env skipped: these tests wipe their database.
os.environ["BOOKBASE_SKIP_DOTENV"] = "1"
os.environ["DATABASE_URL"] = _POSTGRES_URL
os.environ["DB_PATH"] = str(_DB_PATH)
os.environ["BOOKBASE_SECRET_KEY"] = "test-only-signing-key-that-is-long-enough-for-hs256"
os.environ["BOOKBASE_ADMIN_PASSWORD"] = ADMIN_PASSWORD
os.environ["BOOKBASE_STAFF_SIGNUP_CODE"] = STAFF_CODE
os.environ["BOOKBASE_KIOSK_KEY"] = KIOSK_KEY
os.environ.pop("BOOKBASE_DEMO_MODE", None)
os.environ.pop("BOOKBASE_CORS_ORIGINS", None)
os.environ.pop("VERCEL", None)

import psycopg  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from psycopg import conninfo  # noqa: E402

from app.core.auth import KIOSK_KEY_HEADER  # noqa: E402
from app.db.connection import IS_POSTGRES, get_raw_connection  # noqa: E402
from app.db.seed import seed_database  # noqa: E402
from app.main import app  # noqa: E402

ADMIN_ID = 1
TEJAS_ID = 2  # Holds overdue CLRS (book 3) and DDIA (book 14)
AKASH_ID = 3  # Queue #1 for CLRS


def _recreate_postgres_database(template: str = None, name: str = None) -> None:
    """Replaces the test database, or `name` if given, optionally as a copy of a template."""
    settings = conninfo.conninfo_to_dict(_POSTGRES_URL)
    test_database = settings["dbname"]
    assert "test" in test_database, "TEST_DATABASE_URL must name a database containing 'test'"
    settings["dbname"] = "postgres"
    target = name or test_database
    with psycopg.connect(conninfo.make_conninfo(**settings), autocommit=True) as server:
        server.execute(f'DROP DATABASE IF EXISTS "{target}" WITH (FORCE)')
        server.execute(f'CREATE DATABASE "{target}"' + (f' TEMPLATE "{template}"' if template else ""))


def _postgres_template_name() -> str:
    return f'{conninfo.conninfo_to_dict(_POSTGRES_URL)["dbname"]}_template'


@pytest.fixture(scope="session", autouse=True)
def _seed_template():
    if IS_POSTGRES:
        _recreate_postgres_database()

    conn = get_raw_connection()
    seed_database(conn)
    if not IS_POSTGRES:
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    conn.close()

    if IS_POSTGRES:
        settings = conninfo.conninfo_to_dict(_POSTGRES_URL)
        _recreate_postgres_database(template=settings["dbname"], name=_postgres_template_name())
    else:
        shutil.copyfile(_DB_PATH, _TEMPLATE_PATH)
    yield
    shutil.rmtree(_TEST_DIR, ignore_errors=True)


@pytest.fixture(autouse=True)
def _fresh_database(_seed_template):
    if IS_POSTGRES:
        _recreate_postgres_database(template=_postgres_template_name())
        return
    for suffix in ("-wal", "-shm"):
        Path(f"{_DB_PATH}{suffix}").unlink(missing_ok=True)
    shutil.copyfile(_TEMPLATE_PATH, _DB_PATH)


@pytest.fixture
def client():
    # Not used as a context manager: the lifespan would only re-check the seed
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def db():
    conn = get_raw_connection()
    if IS_POSTGRES:
        # So a read here doesn't hold a transaction open and block the request under test
        conn._connection.autocommit = True
    yield conn
    conn.close()


def login(client: TestClient, identifier: str, password: str, role: str = "member") -> str:
    response = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password, "role": role})
    assert response.status_code == 200, response.text
    return response.json()["token"]


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def at_kiosk(headers: dict) -> dict:
    """The same caller, coming through a registered kiosk."""
    return {**headers, KIOSK_KEY_HEADER: KIOSK_KEY}


@pytest.fixture
def admin(client) -> dict:
    return bearer(login(client, "ADMIN001", ADMIN_PASSWORD, role="admin"))


@pytest.fixture
def tejas(client) -> dict:
    return bearer(login(client, "CSBS2022001", "member123"))


@pytest.fixture
def akash(client) -> dict:
    return bearer(login(client, "CSBS2022002", "member123"))
