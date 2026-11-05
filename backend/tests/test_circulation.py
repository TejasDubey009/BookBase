"""Copy codes at borrowing, the fine limit, and returns raised by students and confirmed by librarians."""
import datetime

import pytest

from app import config
from app.services.circulation_service import calculate_overdue_fine
from tests.conftest import AKASH_ID, TEJAS_ID

API = "/api/v1"
CLRS_BOOK_ID = 3  # One copy, overdue with Tejas, and Akash is Queue #1
DDIA_BOOK_ID = 14  # One copy, on time with Tejas
TWO_COPY_BOOK_ID = 1
OTHER_BOOK_ID = 2


def _copies(db, book_id: int) -> list:
    return db.execute(
        "SELECT copy_id, barcode, status, condition FROM book_copies WHERE book_id = ? ORDER BY copy_id",
        (book_id,)
    ).fetchall()


def _active_loan(db, book_id: int):
    return db.execute(
        """
        SELECT cl.loan_id, cl.copy_id, cl.user_id, cl.due_date, bc.barcode FROM circulation_loans cl
        JOIN book_copies bc ON cl.copy_id = bc.copy_id
        WHERE bc.book_id = ? AND cl.return_date IS NULL
        """,
        (book_id,)
    ).fetchone()


def _borrow(client, headers, book_id, barcode=None):
    return client.post(f"{API}/circulation/checkout", headers=headers, json={"book_id": book_id, "barcode": barcode})


def _raise_return(client, headers, loan, condition="Good"):
    return client.post(
        f"{API}/circulation/return-requests",
        headers=headers,
        json={"loan_id": loan["loan_id"], "barcode": loan["barcode"], "condition": condition}
    )


def _confirm(client, headers, request_id, condition="Good"):
    return client.post(
        f"{API}/circulation/return-requests/{request_id}/confirm",
        headers=headers,
        json={"condition": condition}
    )


def _overview(client, admin) -> dict:
    return client.get(f"{API}/admin/overview", headers=admin).json()


def _set_due_days_ago(db, loan_id: int, days: int) -> None:
    due = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days, hours=1)
    db.execute("UPDATE circulation_loans SET due_date = ? WHERE loan_id = ?", (due.isoformat(), loan_id))
    db.commit()


# ---- Unique copy codes at borrowing

def test_borrowing_by_code_links_that_exact_copy_to_the_student(client, akash, db):
    second_copy = _copies(db, TWO_COPY_BOOK_ID)[1]

    response = _borrow(client, akash, TWO_COPY_BOOK_ID, second_copy["barcode"])

    assert response.status_code == 200
    assert response.json()["copy_id"] == second_copy["copy_id"]
    loan = _active_loan(db, TWO_COPY_BOOK_ID)
    assert (loan["copy_id"], loan["user_id"]) == (second_copy["copy_id"], AKASH_ID)


def test_the_code_is_read_without_regard_to_case_or_spaces(client, akash, db):
    code = _copies(db, TWO_COPY_BOOK_ID)[0]["barcode"]
    assert _borrow(client, akash, TWO_COPY_BOOK_ID, f"  {code.lower()} ").status_code == 200


def test_borrowing_records_the_condition_the_copy_left_in(client, akash, db):
    copy = _copies(db, TWO_COPY_BOOK_ID)[1]
    loan_id = _borrow(client, akash, TWO_COPY_BOOK_ID, copy["barcode"]).json()["loan_id"]
    recorded = db.execute("SELECT condition_at_issue FROM circulation_loans WHERE loan_id = ?", (loan_id,)).fetchone()[0]
    assert recorded == copy["condition"]


def test_an_unknown_code_is_refused(client, akash):
    response = _borrow(client, akash, TWO_COPY_BOOK_ID, "NOT-A-CODE")
    assert response.status_code == 404
    assert "NOT-A-CODE" in response.json()["detail"]


def test_a_code_from_another_book_is_refused(client, akash, db):
    other = _copies(db, OTHER_BOOK_ID)[0]["barcode"]
    assert _borrow(client, akash, TWO_COPY_BOOK_ID, other).status_code == 400


def test_a_code_for_a_copy_already_on_loan_is_refused(client, akash, db):
    issued = _active_loan(db, DDIA_BOOK_ID)["barcode"]
    assert _borrow(client, akash, DDIA_BOOK_ID, issued).status_code == 409


# ---- The fine limit

@pytest.mark.parametrize("days,fine", [(0, 0.0), (1, 2.0), (4, 8.0), (5, 8.0), (30, 8.0)])
def test_the_fine_is_two_rupees_a_day_for_at_most_four_days(days, fine):
    due = datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc)
    assert calculate_overdue_fine(due, due + datetime.timedelta(days=days)) == fine


def test_the_policy_publishes_the_fine_limit(client):
    policy = client.get(f"{API}/policy").json()
    assert policy["max_fine_days"] == config.MAX_FINE_DAYS
    assert policy["copy_conditions"] == list(config.COPY_CONDITIONS)


# ---- Raising a return request

def test_a_return_reaches_the_admin_portal_only_after_a_student_raises_it(client, tejas, admin, db):
    assert _overview(client, admin)["return_requests"] == []

    loan = _active_loan(db, DDIA_BOOK_ID)
    assert _raise_return(client, tejas, loan, "Fair").status_code == 201

    requests = _overview(client, admin)["return_requests"]
    assert [r["loan_id"] for r in requests] == [loan["loan_id"]]
    assert requests[0]["barcode"] == loan["barcode"]
    assert requests[0]["reported_condition"] == "Fair"
    assert _overview(client, admin)["kpis"]["pending_returns_count"] == 1


def test_raising_a_return_does_not_return_the_book_yet(client, tejas, db):
    loan = _active_loan(db, DDIA_BOOK_ID)
    _raise_return(client, tejas, loan)
    assert _active_loan(db, DDIA_BOOK_ID)["loan_id"] == loan["loan_id"]
    assert _copies(db, DDIA_BOOK_ID)[0]["status"] == "Issued"


def test_the_wrong_copy_code_cannot_raise_a_return(client, tejas, db):
    loan = _active_loan(db, DDIA_BOOK_ID)
    response = client.post(
        f"{API}/circulation/return-requests",
        headers=tejas,
        json={"loan_id": loan["loan_id"], "barcode": "LIB-CSBS-001A", "condition": "Good"}
    )
    assert response.status_code == 400


def test_an_unknown_condition_is_refused(client, tejas, db):
    assert _raise_return(client, tejas, _active_loan(db, DDIA_BOOK_ID), "Sparkly").status_code == 400


def test_one_loan_cannot_have_two_pending_requests(client, tejas, db):
    loan = _active_loan(db, DDIA_BOOK_ID)
    assert _raise_return(client, tejas, loan).status_code == 201
    assert _raise_return(client, tejas, loan).status_code == 400


def test_the_shelf_and_catalog_show_a_return_is_pending(client, tejas, db):
    loan = _active_loan(db, DDIA_BOOK_ID)
    _raise_return(client, tejas, loan)

    dashboard = client.get(f"{API}/users/{TEJAS_ID}/dashboard", headers=tejas).json()
    shelf_loan = next(l for l in dashboard["active_loans"] if l["loan_id"] == loan["loan_id"])
    assert shelf_loan["return_request_id"] is not None

    book = client.get(f"{API}/books/{DDIA_BOOK_ID}", headers=tejas).json()
    assert book["user_context"]["return_requested"] is True


def test_the_old_direct_return_route_is_gone(client, tejas, db):
    response = client.post(f"{API}/circulation/return", headers=tejas, json={"loan_id": _active_loan(db, DDIA_BOOK_ID)["loan_id"]})
    assert response.status_code in (404, 405)


# ---- Confirming and rejecting

def test_confirming_returns_the_copy_to_the_shelf(client, tejas, admin, db):
    loan = _active_loan(db, DDIA_BOOK_ID)
    request_id = _raise_return(client, tejas, loan).json()["return_request_id"]

    response = _confirm(client, admin, request_id)

    assert response.status_code == 200
    assert response.json()["status"] == "RETURNED_TO_SHELF"
    assert _active_loan(db, DDIA_BOOK_ID) is None
    assert _copies(db, DDIA_BOOK_ID)[0]["status"] == "Available"
    assert _overview(client, admin)["return_requests"] == []


def test_confirming_records_the_condition_the_librarian_saw(client, tejas, admin, db):
    loan = _active_loan(db, DDIA_BOOK_ID)
    request_id = _raise_return(client, tejas, loan, "Good").json()["return_request_id"]

    _confirm(client, admin, request_id, "Damaged")

    row = db.execute("SELECT condition_at_issue, condition_at_return FROM circulation_loans WHERE loan_id = ?", (loan["loan_id"],)).fetchone()
    assert (row["condition_at_issue"], row["condition_at_return"]) == ("Good", "Damaged")
    assert _copies(db, DDIA_BOOK_ID)[0]["condition"] == "Damaged"


def test_two_identical_books_returned_the_same_day_keep_their_own_condition(client, tejas, akash, admin, db):
    first, second = _copies(db, TWO_COPY_BOOK_ID)
    _borrow(client, tejas, TWO_COPY_BOOK_ID, first["barcode"])
    _borrow(client, akash, TWO_COPY_BOOK_ID, second["barcode"])

    borrowers = [
        (tejas, first["barcode"], "Good"),
        (akash, second["barcode"], "Damaged"),
    ]
    for headers, barcode, condition in borrowers:
        loan = db.execute(
            """
            SELECT cl.loan_id, bc.barcode FROM circulation_loans cl JOIN book_copies bc ON cl.copy_id = bc.copy_id
            WHERE bc.barcode = ? AND cl.return_date IS NULL
            """,
            (barcode,)
        ).fetchone()
        request_id = _raise_return(client, headers, loan, condition).json()["return_request_id"]
        assert _confirm(client, admin, request_id, condition).status_code == 200

    grouped = client.get(f"{API}/admin/grouped-books", headers=admin).json()
    history = next(book for book in grouped if book["book_id"] == TWO_COPY_BOOK_ID)["borrowers"]
    by_student = {b["user_id"]: (b["barcode"], b["condition_at_return"]) for b in history}
    assert by_student[TEJAS_ID] == (first["barcode"], "Good")
    assert by_student[AKASH_ID] == (second["barcode"], "Damaged")


def test_confirming_hands_the_copy_to_the_next_patron_in_the_queue(client, tejas, admin, db):
    loan = _active_loan(db, CLRS_BOOK_ID)
    request_id = _raise_return(client, tejas, loan, "Fair").json()["return_request_id"]

    response = _confirm(client, admin, request_id, "Fair")

    assert response.json()["status"] == "AUTO_ASSIGNED_TO_WAITLIST"
    next_loan = _active_loan(db, CLRS_BOOK_ID)
    assert next_loan["user_id"] == AKASH_ID
    issued_in = db.execute("SELECT condition_at_issue FROM circulation_loans WHERE loan_id = ?", (next_loan["loan_id"],)).fetchone()[0]
    assert issued_in == "Fair"


def test_the_fine_stops_when_the_student_raises_the_request(client, tejas, admin, db):
    loan = _active_loan(db, DDIA_BOOK_ID)
    _set_due_days_ago(db, loan["loan_id"], 2)
    request_id = _raise_return(client, tejas, loan).json()["return_request_id"]

    # The librarian gets to it much later, by which time the loan would be further overdue
    raised_long_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
    db.execute("UPDATE return_requests SET created_at = ? WHERE return_request_id = ?", (raised_long_ago.isoformat(), request_id))
    db.commit()

    assert _confirm(client, admin, request_id).json()["fine_assessed"] == 2.0
    assert db.execute("SELECT outstanding_fines FROM users WHERE user_id = ?", (TEJAS_ID,)).fetchone()[0] == 2.0


def test_a_request_cannot_be_confirmed_twice(client, tejas, admin, db):
    request_id = _raise_return(client, tejas, _active_loan(db, CLRS_BOOK_ID)).json()["return_request_id"]
    assert _confirm(client, admin, request_id).status_code == 200
    assert _confirm(client, admin, request_id).status_code == 404
    assert db.execute("SELECT outstanding_fines FROM users WHERE user_id = ?", (TEJAS_ID,)).fetchone()[0] == 4.0


def test_rejecting_leaves_the_loan_active_and_it_can_be_raised_again(client, tejas, admin, db):
    loan = _active_loan(db, DDIA_BOOK_ID)
    request_id = _raise_return(client, tejas, loan).json()["return_request_id"]

    response = client.post(f"{API}/circulation/return-requests/{request_id}/reject", headers=admin)

    assert response.status_code == 200
    assert _active_loan(db, DDIA_BOOK_ID)["loan_id"] == loan["loan_id"]
    assert _overview(client, admin)["return_requests"] == []
    assert _raise_return(client, tejas, loan).status_code == 201
