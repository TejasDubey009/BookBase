"""Tokens, password storage, the demo account list and the CORS policy."""
import datetime
import hashlib

import jwt
import pytest

from app import config
from app.core.security import hash_password, issue_token, needs_rehash, verify_password
from app.db import seed, seed_data
from app.services import auth_service
from tests.conftest import ADMIN_ID, ADMIN_PASSWORD, STAFF_CODE, TEJAS_ID, bearer, login

API = "/api/v1"
SECRET = "test-only-signing-key-that-is-long-enough-for-hs256"


def _legacy_hash(password: str) -> str:
    return hashlib.sha256(f"bookbase_salt_{password}".encode()).hexdigest()


def _created_at(db, user_id: int) -> str:
    return db.execute("SELECT created_at FROM users WHERE user_id = ?", (user_id,)).fetchone()[0]


def _signed(db, secret: str = SECRET, algorithm: str = "HS256", user_id: int = ADMIN_ID, **overrides) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    claims = {
        "sub": str(user_id),
        "acct": _created_at(db, user_id),
        "iat": now,
        "exp": now + datetime.timedelta(hours=1),
        **overrides,
    }
    return jwt.encode({k: v for k, v in claims.items() if v is not None}, secret, algorithm=algorithm)


def _me(client, token: str):
    return client.get(f"{API}/auth/me", headers=bearer(token))


def test_login_token_opens_the_session(client):
    token = login(client, "CSBS2022001", "member123")
    response = _me(client, token)
    assert response.status_code == 200
    assert response.json()["user_id"] == TEJAS_ID


def test_register_token_opens_the_session(client):
    response = client.post(f"{API}/auth/register", json={
        "full_name": "Riya", "enrollment_no": "CSBS2023019", "email": "riya@example.com", "password": "riya-password"
    })
    assert response.status_code == 201
    assert _me(client, response.json()["token"]).json()["enrollment_no"] == "CSBS2023019"


def test_token_expires_after_the_configured_time(client, db):
    token = login(client, "CSBS2022001", "member123")
    claims = jwt.decode(token, SECRET, algorithms=["HS256"])
    assert claims["exp"] - claims["iat"] == config.TOKEN_TTL_MINUTES * 60
    assert "role" not in claims


@pytest.mark.parametrize("make_token", [
    pytest.param(lambda db: "bb_token_1_admin", id="old-guessable-format"),
    pytest.param(lambda db: "not-a-token", id="garbage"),
    pytest.param(lambda db: _signed(db, secret="a-different-signing-key-that-is-also-long-enough"), id="wrong-secret"),
    pytest.param(lambda db: _signed(db, exp=datetime.datetime(2020, 1, 1, tzinfo=datetime.timezone.utc)), id="expired"),
    pytest.param(lambda db: _signed(db, exp=None), id="no-expiry"),
    pytest.param(lambda db: _signed(db, acct=None), id="no-account-stamp"),
    pytest.param(lambda db: _signed(db, sub="not-a-number"), id="non-numeric-subject"),
    pytest.param(lambda db: _signed(db, sub="9999"), id="unknown-user"),
    pytest.param(lambda db: jwt.encode({"sub": "1"}, "", algorithm="none"), id="unsigned-alg-none"),
])
def test_bad_tokens_are_rejected_even_on_public_routes(client, db, make_token):
    token = make_token(db)
    assert client.get(f"{API}/admin/overview", headers=bearer(token)).status_code == 401
    assert client.get(f"{API}/books", headers=bearer(token)).status_code == 401


def test_tampered_token_is_rejected(client):
    header, payload, signature = login(client, "CSBS2022001", "member123").split(".")
    assert _me(client, f"{header}.{payload}x.{signature}").status_code == 401


def test_a_correctly_signed_token_still_passes(client, db):
    """Guards the rejection cases above: they fail for the reason they name, not for a broken helper."""
    assert _me(client, _signed(db)).status_code == 200


def test_role_is_read_from_the_database_not_the_token(client, admin, db):
    assert client.get(f"{API}/admin/overview", headers=admin).status_code == 200

    db.execute("UPDATE users SET role = 'member' WHERE user_id = ?", (ADMIN_ID,))
    db.commit()

    assert client.get(f"{API}/admin/overview", headers=admin).status_code == 403


def test_token_does_not_carry_over_to_a_new_account_with_the_same_id(client, tejas, db):
    """User ids get reused: the demo reset restarts them, and each Vercel instance counts its own."""
    db.execute("UPDATE users SET created_at = '2030-01-01T00:00:00+00:00' WHERE user_id = ?", (TEJAS_ID,))
    db.commit()
    assert client.get(f"{API}/auth/me", headers=tejas).status_code == 401


def test_reset_demo_ends_other_sessions_but_keeps_the_librarian_signed_in(client, admin, tejas):
    response = client.post(f"{API}/admin/reset-demo", headers=admin)
    assert response.status_code == 200

    assert client.get(f"{API}/auth/me", headers=tejas).status_code == 401
    assert client.get(f"{API}/auth/me", headers=admin).status_code == 401
    assert client.get(f"{API}/admin/overview", headers=bearer(response.json()["token"])).status_code == 200


def test_reset_demo_restores_the_seeded_library(client, admin):
    client.post(f"{API}/circulation/checkout", headers=admin, json={"book_id": 1})

    response = client.post(f"{API}/admin/reset-demo", headers=admin)

    overview = client.get(f"{API}/admin/overview", headers=bearer(response.json()["token"])).json()
    assert overview["kpis"]["active_loans"] == 2
    assert {r["status"] for r in overview["book_requests"]}


def test_passwords_get_their_own_salt():
    first, second = hash_password("member123"), hash_password("member123")
    assert first != second
    assert verify_password("member123", first) and verify_password("member123", second)
    assert not verify_password("wrong", first)
    assert not needs_rehash(first)


def test_unreadable_stored_hash_fails_closed():
    assert not verify_password("member123", "scrypt$broken")
    assert not verify_password("member123", "")


def test_new_accounts_and_seeded_accounts_use_the_current_hash(client, db):
    client.post(f"{API}/auth/register", json={
        "full_name": "Riya", "enrollment_no": "CSBS2023019", "email": "riya@example.com", "password": "riya-password"
    })
    stored = [row[0] for row in db.execute("SELECT password_hash FROM users")]
    assert len(stored) == 8
    assert not any(needs_rehash(value) for value in stored)


def _make_legacy(db, user_id: int, password: str) -> None:
    db.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", (_legacy_hash(password), user_id))
    db.commit()


def _stored_hash(db, user_id: int) -> str:
    return db.execute("SELECT password_hash FROM users WHERE user_id = ?", (user_id,)).fetchone()[0]


def test_existing_account_logs_in_and_is_upgraded(client, db):
    _make_legacy(db, TEJAS_ID, "member123")

    token = login(client, "CSBS2022001", "member123")

    assert _me(client, token).status_code == 200
    assert not needs_rehash(_stored_hash(db, TEJAS_ID))
    assert login(client, "CSBS2022001", "member123")


def test_failed_login_does_not_upgrade_a_legacy_hash(client, db):
    _make_legacy(db, TEJAS_ID, "member123")

    response = client.post(f"{API}/auth/login", json={"identifier": "CSBS2022001", "password": "wrong"})

    assert response.status_code == 401
    assert _stored_hash(db, TEJAS_ID) == _legacy_hash("member123")


def test_session_survives_the_hash_upgrade(client, db):
    """On Vercel a function instance can start again from the old database mid-session."""
    token = issue_token(TEJAS_ID, _created_at(db, TEJAS_ID))
    _make_legacy(db, TEJAS_ID, "member123")
    assert _me(client, token).status_code == 200


def test_demo_users_are_hidden_unless_demo_mode_is_on(client):
    response = client.get(f"{API}/auth/demo-users")
    assert response.status_code == 200
    assert response.json() == []


def test_demo_users_lists_only_seeded_accounts_and_no_private_fields(client, monkeypatch):
    monkeypatch.setattr(auth_service, "DEMO_MODE", True)
    client.post(f"{API}/auth/register", json={
        "full_name": "Riya", "enrollment_no": "CSBS2023019", "email": "riya@example.com", "password": "riya-password"
    })

    accounts = client.get(f"{API}/auth/demo-users").json()

    assert [a["enrollment_no"] for a in accounts] == [
        "CSBS2022001", "CSBS2022002", "CSBS2022003", "CSBS2022004", "CSBS2022005", "CSBS2022006"
    ]
    assert {a["role"] for a in accounts} == {"member"}
    assert set(accounts[0]) == {"enrollment_no", "full_name", "role", "sample_password"}


def test_demo_users_passwords_actually_sign_in(client, monkeypatch):
    monkeypatch.setattr(auth_service, "DEMO_MODE", True)
    entry = next(a for a in client.get(f"{API}/auth/demo-users").json() if a["enrollment_no"] == "CSBS2022001")
    assert login(client, entry["enrollment_no"], entry["sample_password"], role=entry["role"])


def _register(client, **overrides):
    fields = {"full_name": "Riya", "enrollment_no": "CSBS2023019", "email": "riya@example.com", "password": "riya-password"}
    return client.post(f"{API}/auth/register", json={**fields, **overrides})


def test_the_old_librarian_password_no_longer_signs_in(client):
    response = client.post(f"{API}/auth/login", json={"identifier": "ADMIN001", "password": "admin123", "role": "admin"})
    assert response.status_code == 401


def test_the_librarians_password_is_not_in_the_seed_data():
    assert next(user for user in seed_data.USERS if user[1] == "ADMIN001")[3] is None


def test_a_new_database_generates_and_prints_the_librarians_password(monkeypatch, capsys):
    monkeypatch.setattr(seed, "SEED_ADMIN_PASSWORD", "")
    stored = seed._librarian_password_hash(current_hash=None)
    printed = [line.strip() for line in capsys.readouterr().out.splitlines() if line.startswith("    ")]
    assert len(printed) == 1 and verify_password(printed[0], stored)


def test_reset_keeps_the_librarians_password_when_none_is_configured(client, admin, monkeypatch):
    monkeypatch.setattr(seed, "SEED_ADMIN_PASSWORD", "")
    assert client.post(f"{API}/admin/reset-demo", headers=admin).status_code == 200
    assert login(client, "ADMIN001", ADMIN_PASSWORD, role="admin")


@pytest.mark.parametrize("overrides,message", [
    ({"email": "not-an-email"}, "valid email"),
    ({"password": "short"}, "at least 8"),
    ({"enrollment_no": "A"}, "Enrollment number"),
    ({"full_name": "  "}, "required"),
])
def test_sign_up_validates_its_fields(client, overrides, message):
    response = _register(client, **overrides)
    assert response.status_code == 400
    assert message in response.json()["detail"]


def test_sign_up_without_a_staff_code_creates_a_student(client):
    response = _register(client)
    assert response.status_code == 201
    assert response.json()["user"]["role"] == "member"


def test_a_role_in_the_sign_up_request_is_ignored(client):
    assert _register(client, role="admin").json()["user"]["role"] == "member"


def test_sign_up_with_the_staff_code_creates_a_librarian(client):
    response = _register(client, staff_code=STAFF_CODE)
    assert response.status_code == 201
    assert response.json()["user"]["role"] == "admin"
    assert client.get(f"{API}/admin/overview", headers=bearer(response.json()["token"])).status_code == 200


@pytest.mark.parametrize("wrong_code", ["wrong-code", "", "  ", "código"])
def test_sign_up_with_a_wrong_staff_code_is_refused(client, db, wrong_code):
    assert _register(client, staff_code=wrong_code).status_code == 403
    assert db.execute("SELECT COUNT(*) FROM users WHERE enrollment_no = 'CSBS2023019'").fetchone()[0] == 0


def test_no_librarian_can_sign_up_when_no_staff_code_is_configured(client, monkeypatch):
    monkeypatch.setattr(auth_service, "STAFF_SIGNUP_CODE", "")
    assert _register(client, staff_code="").status_code == 403
    assert _register(client, staff_code=STAFF_CODE).status_code == 403


def test_cors_only_answers_configured_origins(client):
    allowed = client.get(f"{API}/health", headers={"Origin": "http://localhost:3001"})
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3001"
    assert "access-control-allow-credentials" not in allowed.headers

    other = client.get(f"{API}/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in other.headers


def test_cors_preflight_rejects_other_origins(client):
    preflight = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization"}
    assert client.options(f"{API}/auth/login", headers={"Origin": "https://evil.example", **preflight}).status_code == 400
    assert client.options(f"{API}/auth/login", headers={"Origin": "http://localhost:3001", **preflight}).status_code == 200


def test_vercel_refuses_to_start_without_a_signing_key(monkeypatch):
    monkeypatch.delenv("BOOKBASE_SECRET_KEY")
    monkeypatch.setenv("VERCEL", "1")
    with pytest.raises(RuntimeError, match="BOOKBASE_SECRET_KEY"):
        config._resolve_secret_key()


def test_local_run_without_a_signing_key_gets_a_random_one(monkeypatch):
    monkeypatch.delenv("BOOKBASE_SECRET_KEY")
    monkeypatch.delenv("VERCEL", raising=False)
    assert config._resolve_secret_key() != config._resolve_secret_key()


def test_short_signing_key_is_refused(monkeypatch):
    monkeypatch.setenv("BOOKBASE_SECRET_KEY", "too-short")
    with pytest.raises(RuntimeError, match="32 characters"):
        config._resolve_secret_key()
