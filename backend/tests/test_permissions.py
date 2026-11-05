"""Who may call what. Every protected route must answer 401 or 403 before doing any work."""
import pytest

from app.main import app
from tests.conftest import ADMIN_ID, AKASH_ID, TEJAS_ID, bearer, login

API = "/api/v1"
CLRS_BOOK_ID = 3
DDIA_BOOK_ID = 14
UNBORROWED_BOOK_ID = 1

# Anything not listed here must reject anonymous callers. A new route is protected until it is
# deliberately added to this list.
PUBLIC_ROUTES = {
    ("POST", "/auth/login"),
    ("POST", "/auth/register"),
    ("GET", "/auth/demo-users"),
    ("GET", "/books"),
    ("GET", "/books/{book_id}"),
    ("GET", "/health"),
}

ADMIN_ROUTES = [
    ("GET", "/admin/overview"),
    ("GET", "/admin/grouped-books"),
    ("POST", "/admin/settle-fine"),
    ("POST", "/admin/reset-demo"),
    ("POST", "/books"),
    ("POST", "/books/1/copies"),
    ("PATCH", "/requests/1"),
    ("GET", "/telemetry/logs"),
]


def _api_routes():
    """Every method and path the API serves, under both of its prefixes."""
    for path, operations in app.openapi()["paths"].items():
        for prefix in (API, "/v1"):
            if path.startswith(prefix + "/"):
                for method in operations:
                    yield method.upper(), prefix, path[len(prefix):]


def _protected_routes():
    return sorted(route for route in _api_routes() if (route[0], route[2]) not in PUBLIC_ROUTES)


@pytest.mark.parametrize("method,prefix,template", _protected_routes())
def test_every_protected_route_rejects_anonymous_callers(client, method, prefix, template):
    path = template.replace("{", "").replace("}", "")
    for name in ("user_id", "book_id", "request_id", "reservation_id"):
        path = path.replace(name, "1")

    response = client.request(method, f"{prefix}{path}", json={})

    assert response.status_code == 401, f"{method} {prefix}{path} answered {response.status_code}"
    assert response.headers["www-authenticate"] == "Bearer"


def test_the_route_walk_actually_finds_the_protected_routes():
    found = set(_protected_routes())
    for prefix in (API, "/v1"):
        assert ("POST", prefix, "/admin/reset-demo") in found
        assert ("POST", prefix, "/circulation/return") in found
        assert ("GET", prefix, "/users/{user_id}/dashboard") in found
        assert ("GET", prefix, "/telemetry/logs") in found


@pytest.mark.parametrize("method,path", ADMIN_ROUTES)
def test_members_are_forbidden_from_librarian_routes(client, tejas, method, path):
    for prefix in (API, "/v1"):
        response = client.request(method, f"{prefix}{path}", headers=tejas, json={})
        assert response.status_code == 403, f"{method} {prefix}{path} answered {response.status_code}"


def test_reset_demo_by_a_member_changes_nothing(client, tejas, db):
    before = db.execute("SELECT COUNT(*) FROM circulation_loans").fetchone()[0]
    client.post(f"{API}/admin/reset-demo", headers=tejas)
    assert db.execute("SELECT COUNT(*) FROM circulation_loans").fetchone()[0] == before


@pytest.mark.parametrize("path", ["/admin/overview", "/admin/grouped-books", "/telemetry/logs"])
def test_admins_can_use_librarian_routes(client, admin, path):
    assert client.get(f"{API}{path}", headers=admin).status_code == 200


def test_admin_can_settle_a_fine(client, admin, db):
    db.execute("UPDATE users SET outstanding_fines = 10 WHERE user_id = ?", (TEJAS_ID,))
    db.commit()
    response = client.post(f"{API}/admin/settle-fine", headers=admin, json={"user_id": TEJAS_ID})
    assert response.status_code == 200
    assert db.execute("SELECT outstanding_fines FROM users WHERE user_id = ?", (TEJAS_ID,)).fetchone()[0] == 0


def test_member_cannot_read_another_members_dashboard(client, tejas, akash):
    assert client.get(f"{API}/users/{TEJAS_ID}/dashboard", headers=tejas).status_code == 200
    assert client.get(f"{API}/users/{TEJAS_ID}/dashboard", headers=akash).status_code == 403


def test_admin_can_read_any_dashboard(client, admin):
    assert client.get(f"{API}/users/{TEJAS_ID}/dashboard", headers=admin).status_code == 200


def test_auth_me_follows_the_token_and_ignores_any_user_id(client, tejas):
    response = client.get(f"{API}/auth/me", params={"user_id": AKASH_ID}, headers=tejas)
    assert response.status_code == 200
    assert response.json()["user_id"] == TEJAS_ID


def test_member_only_sees_their_own_book_requests(client, tejas, db):
    db.execute(
        "INSERT INTO book_requests (user_id, title, status) VALUES (?, 'Someone else', 'Pending')",
        (AKASH_ID,)
    )
    db.commit()
    assert client.post(f"{API}/requests", headers=tejas, json={"title": "Mine"}).status_code == 201

    requests = client.get(f"{API}/requests", headers=tejas).json()

    assert "Mine" in [r["title"] for r in requests]
    assert {r["user_id"] for r in requests} == {TEJAS_ID}
    assert client.get(f"{API}/requests", params={"user_id": AKASH_ID}, headers=tejas).status_code == 403


def test_admin_sees_all_book_requests_and_can_filter(client, admin):
    everyone = client.get(f"{API}/requests", headers=admin).json()
    assert len({r["user_id"] for r in everyone}) > 1

    one_patron = client.get(f"{API}/requests", params={"user_id": everyone[0]["user_id"]}, headers=admin).json()
    assert {r["user_id"] for r in one_patron} == {everyone[0]["user_id"]}


def test_book_request_belongs_to_the_caller(client, tejas, akash):
    created = client.post(f"{API}/requests", headers=tejas, json={"title": "Mine"})
    assert created.json()["user_id"] == TEJAS_ID

    forged = client.post(f"{API}/requests", headers=akash, json={"title": "Forged", "user_id": TEJAS_ID})
    assert forged.status_code == 403


def test_checkout_acts_as_the_caller(client, akash):
    response = client.post(f"{API}/circulation/checkout", headers=akash, json={"book_id": UNBORROWED_BOOK_ID})
    assert response.status_code == 200

    dashboard = client.get(f"{API}/users/{AKASH_ID}/dashboard", headers=akash).json()
    assert [loan["book_id"] for loan in dashboard["active_loans"]] == [UNBORROWED_BOOK_ID]


def test_member_cannot_check_out_for_someone_else(client, akash, db):
    response = client.post(
        f"{API}/circulation/checkout", headers=akash, json={"user_id": TEJAS_ID, "book_id": UNBORROWED_BOOK_ID}
    )
    assert response.status_code == 403
    copies_issued = db.execute(
        "SELECT COUNT(*) FROM book_copies WHERE book_id = ? AND status = 'Issued'", (UNBORROWED_BOOK_ID,)
    ).fetchone()[0]
    assert copies_issued == 0


def test_admin_can_check_out_for_a_patron(client, admin, akash):
    response = client.post(
        f"{API}/circulation/checkout", headers=admin, json={"user_id": AKASH_ID, "book_id": UNBORROWED_BOOK_ID}
    )
    assert response.status_code == 200
    dashboard = client.get(f"{API}/users/{AKASH_ID}/dashboard", headers=akash).json()
    assert [loan["book_id"] for loan in dashboard["active_loans"]] == [UNBORROWED_BOOK_ID]


def test_waitlist_acts_as_the_caller(client, db):
    biba = bearer(login(client, "CSBS2022004", "member123"))
    response = client.post(f"{API}/circulation/waitlist", headers=biba, json={"book_id": CLRS_BOOK_ID})
    assert response.status_code == 200
    assert response.json()["user_id"] == 5

    forged = client.post(
        f"{API}/circulation/waitlist", headers=biba, json={"user_id": ADMIN_ID, "book_id": DDIA_BOOK_ID}
    )
    assert forged.status_code == 403


def _active_loan(db, book_id: int):
    return db.execute(
        """
        SELECT cl.loan_id, cl.copy_id FROM circulation_loans cl
        JOIN book_copies bc ON cl.copy_id = bc.copy_id
        WHERE bc.book_id = ? AND cl.return_date IS NULL
        """,
        (book_id,)
    ).fetchone()


@pytest.mark.parametrize("field", ["loan_id", "copy_id"])
def test_member_cannot_return_someone_elses_loan(client, akash, db, field):
    loan = _active_loan(db, DDIA_BOOK_ID)

    response = client.post(f"{API}/circulation/return", headers=akash, json={field: loan[field]})

    assert response.status_code == 403
    assert _active_loan(db, DDIA_BOOK_ID)["loan_id"] == loan["loan_id"]


def test_member_can_return_their_own_loan(client, tejas, db):
    loan = _active_loan(db, DDIA_BOOK_ID)
    assert client.post(f"{API}/circulation/return", headers=tejas, json={"loan_id": loan["loan_id"]}).status_code == 200
    assert _active_loan(db, DDIA_BOOK_ID) is None


def test_admin_can_return_anyones_loan(client, admin, db):
    loan = _active_loan(db, DDIA_BOOK_ID)
    assert client.post(f"{API}/circulation/return", headers=admin, json={"loan_id": loan["loan_id"]}).status_code == 200


def _akash_reservation(db) -> int:
    return db.execute(
        "SELECT reservation_id FROM waitlist_reservations WHERE user_id = ? AND status = 'Waiting'", (AKASH_ID,)
    ).fetchone()[0]


def test_member_cannot_cancel_someone_elses_reservation(client, tejas, db):
    reservation_id = _akash_reservation(db)

    response = client.delete(f"{API}/circulation/waitlist/{reservation_id}", headers=tejas)

    assert response.status_code == 403
    assert _akash_reservation(db) == reservation_id


def test_member_can_cancel_their_own_reservation(client, akash, db):
    assert client.delete(f"{API}/circulation/waitlist/{_akash_reservation(db)}", headers=akash).status_code == 200


def test_admin_can_cancel_anyones_reservation(client, admin, db):
    assert client.delete(f"{API}/circulation/waitlist/{_akash_reservation(db)}", headers=admin).status_code == 200


def test_catalog_stays_public_and_anonymous_callers_get_no_patron_context(client):
    books = client.get(f"{API}/books")
    assert books.status_code == 200
    assert all(book["user_context"] is None for book in books.json())
    assert client.get(f"{API}/books/{CLRS_BOOK_ID}").status_code == 200


def test_catalog_context_comes_from_the_token(client, tejas):
    book = client.get(f"{API}/books/{CLRS_BOOK_ID}", headers=tejas).json()
    assert book["user_context"]["has_active_loan"] is True

    books = client.get(f"{API}/books", headers=tejas).json()
    assert sum(1 for b in books if b["user_context"]["has_active_loan"]) == 2


@pytest.mark.parametrize("path", ["/books", f"/books/{CLRS_BOOK_ID}"])
def test_catalog_cannot_reveal_another_patrons_loans(client, akash, path):
    assert client.get(f"{API}{path}", params={"user_id": TEJAS_ID}).status_code == 401
    assert client.get(f"{API}{path}", params={"user_id": TEJAS_ID}, headers=akash).status_code == 403


def test_admin_can_view_the_catalog_as_a_patron(client, admin):
    book = client.get(f"{API}/books/{CLRS_BOOK_ID}", params={"user_id": TEJAS_ID}, headers=admin).json()
    assert book["user_context"]["has_active_loan"] is True


@pytest.mark.parametrize("path", ["/books", f"/books/{CLRS_BOOK_ID}"])
def test_catalog_does_not_name_borrowers_or_people_waiting(client, tejas, akash, path):
    """CLRS is on loan to Tejas, with Akash waiting. Neither name may reach anyone but an admin."""
    for headers in ({}, akash):
        body = client.get(f"{API}{path}", headers=headers).text
        assert "Tejas" not in body
    assert "Akash" not in client.get(f"{API}{path}", headers=tejas).text
    assert "Akash" not in client.get(f"{API}{path}").text


def test_admin_sees_who_holds_each_copy(client, admin):
    book = client.get(f"{API}/books/{CLRS_BOOK_ID}", headers=admin).json()
    assert book["copies"][0]["current_borrower_name"] == "Tejas"
