"""
Tests for the BookBase database, run on a local PostgreSQL with a stand-in for Supabase's roles and
auth schema. Each test gets a fresh copy of a seeded database.

Point TEST_DATABASE_URL at a server where the tests may create and drop databases, using a database
name that contains "test":
    TEST_DATABASE_URL=postgresql://postgres@localhost:5432/bookbase_test python -m pytest supabase/tests

Calls go through `api.call`, which does what Supabase's API does for each request: switch to the
caller's role, set the signed-in user's claims, call the function, and commit.
"""
import json
import os
from pathlib import Path

import psycopg
import pytest
from psycopg import conninfo

SUPABASE_DIR = Path(__file__).resolve().parent.parent
SETUP_FILES = ["tests/supabase_stand_in.sql", "schema.sql", "functions.sql", "seed.sql"]

KIOSK_KEY = "test-only-kiosk-key"
STAFF_CODE = "test-only-staff-code"

# The demo accounts, as the account script creates them. The librarian signs up with the staff code.
PEOPLE = {
    "admin": ("admin@bookbase.in", {"full_name": "Admin", "enrollment_no": "ADMIN001", "staff_code": STAFF_CODE}),
    "tejas": ("tejas@bookbase.in", {"full_name": "Tejas", "enrollment_no": "CSBS2022001"}),
    "akash": ("akash@bookbase.in", {"full_name": "Akash", "enrollment_no": "CSBS2022002"}),
    "sai": ("saikartikeya@bookbase.in", {"full_name": "Sai Kartikeya", "enrollment_no": "CSBS2022003"}),
    "biba": ("biba@bookbase.in", {"full_name": "Biba", "enrollment_no": "CSBS2022004"}),
    "jaidanya": ("jaidanya@bookbase.in", {"full_name": "Jaidanya", "enrollment_no": "CSBS2022005"}),
    "shashini": ("shashini@bookbase.in", {"full_name": "Shashini", "enrollment_no": "CSBS2022006"}),
}

_URL = os.environ.get("TEST_DATABASE_URL", "").strip()


def _settings(dbname: str) -> str:
    settings = conninfo.conninfo_to_dict(_URL)
    settings["dbname"] = dbname
    return conninfo.make_conninfo(**settings)


def _test_dbname() -> str:
    name = conninfo.conninfo_to_dict(_URL)["dbname"]
    assert "test" in name, "TEST_DATABASE_URL must name a database containing 'test'"
    return name


def _recreate(name: str, template: str = None) -> None:
    with psycopg.connect(_settings("postgres"), autocommit=True) as server:
        server.execute(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)')
        server.execute(f'CREATE DATABASE "{name}"' + (f' TEMPLATE "{template}"' if template else ""))


def sign_up(db, email: str, metadata: dict) -> None:
    """What Supabase Auth does on sign-up: add the login, which fires the BookBase trigger."""
    db.execute(
        "INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data) VALUES (%s, crypt('member123', gen_salt('bf')), %s)",
        (email, json.dumps(metadata)),
    )


@pytest.fixture(scope="session")
def _template():
    if not _URL:
        pytest.skip("TEST_DATABASE_URL is not set")
    template = f"{_test_dbname()}_template"
    _recreate(template)
    with psycopg.connect(_settings(template), autocommit=True) as db:
        for name in SETUP_FILES:
            db.execute((SUPABASE_DIR / name).read_text())
        db.execute(
            "INSERT INTO private.settings (name, value) VALUES ('kiosk_key', %s), ('staff_signup_code', %s), ('demo_mode', 'on')",
            (KIOSK_KEY, STAFF_CODE),
        )
        for email, metadata in PEOPLE.values():
            sign_up(db, email, metadata)
        db.execute("SELECT private.seed_library()")
    return template


@pytest.fixture(autouse=True)
def _fresh_database(_template):
    _recreate(_test_dbname(), template=_template)


@pytest.fixture
def db():
    """A superuser connection, for setting up and checking state directly."""
    conn = psycopg.connect(_settings(_test_dbname()), autocommit=True, row_factory=psycopg.rows.dict_row)
    yield conn
    conn.close()


class ApiError(Exception):
    def __init__(self, error: psycopg.Error):
        super().__init__(error.diag.message_primary)
        self.message = error.diag.message_primary
        self.code = error.sqlstate
        self.hint = error.diag.message_hint


class Api:
    """Calls a function the way Supabase's API does, as a signed-out visitor or a named person."""

    def __init__(self):
        self._auth_ids = {}

    def auth_id(self, person: str) -> str:
        if person not in self._auth_ids:
            with psycopg.connect(_settings(_test_dbname())) as conn:
                self._auth_ids[person] = str(
                    conn.execute("SELECT id FROM auth.users WHERE email = %s", (PEOPLE[person][0],)).fetchone()[0]
                )
        return self._auth_ids[person]

    def call(self, function: str, as_: str = None, before=None, **args):
        claims = {"role": "anon"} if as_ is None else {"role": "authenticated", "sub": self.auth_id(as_)}
        arguments = ", ".join(f"{name} => %s" for name in args)
        with psycopg.connect(_settings(_test_dbname())) as conn:
            try:
                conn.execute(f"SET LOCAL ROLE {claims['role']}")
                conn.execute("SELECT set_config('request.jwt.claims', %s, true)", (json.dumps(claims),))
                if before:
                    before()
                result = conn.execute(f"SELECT public.{function}({arguments})", list(args.values())).fetchone()[0]
                conn.commit()
                return result
            except psycopg.Error as error:
                conn.rollback()
                raise ApiError(error) from error


@pytest.fixture
def api():
    return Api()
