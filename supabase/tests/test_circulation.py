"""Copy codes, the kiosk rule, the fine limit, and returns raised by students and confirmed by librarians."""
import datetime

import pytest

from conftest import KIOSK_KEY, ApiError

CLRS = 3  # One copy, overdue with Tejas, and Akash is Queue #1
DDIA = 14  # One copy, on time with Tejas
TWO_COPY_BOOK = 1
OTHER_BOOK = 2


def _copies(db, book_id):
    return db.execute(
        "SELECT copy_id, barcode, status, condition FROM book_copies WHERE book_id = %s ORDER BY copy_id", (book_id,)
    ).fetchall()


def _active_loan(db, book_id):
    return db.execute(
        """
        SELECT cl.loan_id, cl.copy_id, cl.user_id, bc.barcode FROM circulation_loans cl
        JOIN book_copies bc ON cl.copy_id = bc.copy_id
        WHERE bc.book_id = %s AND cl.return_date IS NULL
        """,
        (book_id,),
    ).fetchone()


def _user_id(db, enrollment):
    return db.execute("SELECT user_id FROM users WHERE enrollment_no = %s", (enrollment,)).fetchone()["user_id"]


def _borrow(api, person, book_id, barcode=None, kiosk_key=KIOSK_KEY):
    return api.call("checkout_book", as_=person, p_book_id=book_id, p_barcode=barcode, p_kiosk_key=kiosk_key)


def _raise_return(api, person, loan, condition="Good", kiosk_key=KIOSK_KEY):
    return api.call(
        "raise_return_request", as_=person,
        p_loan_id=loan["loan_id"], p_barcode=loan["barcode"], p_condition=condition, p_kiosk_key=kiosk_key,
    )


def _confirm(api, request_id, condition="Good", person="admin"):
    return api.call("confirm_return_request", as_=person, p_return_request_id=request_id, p_condition=condition)


def _fines(db, enrollment):
    return float(db.execute("SELECT outstanding_fines FROM users WHERE enrollment_no = %s", (enrollment,)).fetchone()["outstanding_fines"])


# ---- The seeded library

def test_the_demo_library_is_seeded(api):
    overview = api.call("admin_overview", as_="admin")
    assert overview["kpis"]["total_titles"] == 40
    assert overview["kpis"]["physical_copies"] == 78
    assert overview["kpis"]["active_loans"] == 2
    assert overview["kpis"]["waitlist_queue_depth"] == 1


def test_the_overdue_loan_shows_its_fine(api):
    shelf = api.call("user_dashboard", as_="tejas")
    clrs = next(loan for loan in shelf["active_loans"] if loan["book_id"] == CLRS)
    assert clrs["is_overdue"] and clrs["days_overdue"] == 2 and clrs["accrued_fine"] == 4.0


# ---- The kiosk rule

def test_a_student_cannot_borrow_away_from_the_kiosk(api, db):
    with pytest.raises(ApiError) as error:
        _borrow(api, "akash", TWO_COPY_BOOK, kiosk_key=None)
    assert error.value.code == "42501" and error.value.hint == "kiosk_key_required"
    with pytest.raises(ApiError):
        _borrow(api, "akash", TWO_COPY_BOOK, kiosk_key="a-guess")
    assert _active_loan(db, TWO_COPY_BOOK) is None


def test_a_librarian_can_borrow_without_the_kiosk_key(api):
    assert _borrow(api, "admin", TWO_COPY_BOOK, kiosk_key=None)["success"]


def test_no_student_can_borrow_when_no_kiosk_key_is_set(api, db):
    db.execute("DELETE FROM private.settings WHERE name = 'kiosk_key'")
    with pytest.raises(ApiError):
        _borrow(api, "akash", TWO_COPY_BOOK)


def test_a_return_request_also_needs_the_kiosk(api, db):
    with pytest.raises(ApiError) as error:
        _raise_return(api, "tejas", _active_loan(db, DDIA), kiosk_key=None)
    assert error.value.hint == "kiosk_key_required"


# ---- Unique copy codes at borrowing

def test_borrowing_by_code_links_that_exact_copy_to_the_student(api, db):
    second = _copies(db, TWO_COPY_BOOK)[1]
    result = _borrow(api, "akash", TWO_COPY_BOOK, second["barcode"])
    loan = _active_loan(db, TWO_COPY_BOOK)
    assert result["copy_id"] == second["copy_id"]
    assert (loan["copy_id"], loan["user_id"]) == (second["copy_id"], _user_id(db, "CSBS2022002"))
    assert result["message"].startswith(f"Book checked out! Copy {second['barcode']} is due back on ")


def test_the_code_is_read_without_regard_to_case_or_spaces(api, db):
    code = _copies(db, TWO_COPY_BOOK)[0]["barcode"]
    assert _borrow(api, "akash", TWO_COPY_BOOK, f"  {code.lower()} ")["success"]


def test_borrowing_records_the_condition_the_copy_left_in(api, db):
    copy = _copies(db, TWO_COPY_BOOK)[1]
    loan_id = _borrow(api, "akash", TWO_COPY_BOOK, copy["barcode"])["loan_id"]
    recorded = db.execute("SELECT condition_at_issue FROM circulation_loans WHERE loan_id = %s", (loan_id,)).fetchone()
    assert recorded["condition_at_issue"] == copy["condition"]


@pytest.mark.parametrize("code,message", [
    ("NOT-A-CODE", "No copy has the code NOT-A-CODE"),
    ("LIB-CSBS-002A", "belongs to a different book"),
])
def test_a_wrong_code_is_refused(api, code, message):
    with pytest.raises(ApiError) as error:
        _borrow(api, "akash", TWO_COPY_BOOK, code)
    assert message in error.value.message


def test_a_code_for_a_copy_already_on_loan_is_refused(api, db):
    with pytest.raises(ApiError) as error:
        _borrow(api, "akash", DDIA, _active_loan(db, DDIA)["barcode"])
    assert "isn't available" in error.value.message


def test_quota_and_fines_still_block_borrowing(api, db):
    db.execute("UPDATE users SET outstanding_fines = 30 WHERE enrollment_no = 'CSBS2022002'")
    with pytest.raises(ApiError) as error:
        _borrow(api, "akash", TWO_COPY_BOOK)
    assert "Borrowing blocked" in error.value.message

    db.execute("UPDATE users SET outstanding_fines = 0, max_books_quota = 1 WHERE enrollment_no = 'CSBS2022002'")
    _borrow(api, "akash", TWO_COPY_BOOK)
    with pytest.raises(ApiError) as error:
        _borrow(api, "akash", OTHER_BOOK)
    assert "Quota reached" in error.value.message


# ---- The fine limit

@pytest.mark.parametrize("late,fine", [
    (datetime.timedelta(0), 0.0),
    (datetime.timedelta(minutes=5), 2.0),  # any part of a first late day counts as a day
    (datetime.timedelta(days=1, hours=23), 2.0),
    (datetime.timedelta(days=4), 8.0),
    (datetime.timedelta(days=5), 8.0),
    (datetime.timedelta(days=30), 8.0),
])
def test_the_fine_is_two_rupees_a_day_for_at_most_four_days(db, late, fine):
    due = datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc)
    result = db.execute("SELECT private.overdue_fine(%s, %s) AS fine", (due, due + late)).fetchone()
    assert float(result["fine"]) == fine


def test_the_policy_publishes_the_rules(api):
    policy = api.call("lending_policy")
    assert policy["max_fine_days"] == 4 and policy["overdue_fine_rate_per_day"] == 2.0
    assert policy["copy_conditions"] == ["Pristine", "Good", "Fair", "Damaged"]


# ---- Raising a return request

def test_a_return_reaches_the_admin_portal_only_after_a_student_raises_it(api, db):
    assert api.call("admin_overview", as_="admin")["return_requests"] == []
    loan = _active_loan(db, DDIA)
    _raise_return(api, "tejas", loan, "Fair")
    overview = api.call("admin_overview", as_="admin")
    assert [r["loan_id"] for r in overview["return_requests"]] == [loan["loan_id"]]
    assert overview["return_requests"][0]["reported_condition"] == "Fair"
    assert overview["kpis"]["pending_returns_count"] == 1


def test_raising_a_return_does_not_return_the_book_yet(api, db):
    loan = _active_loan(db, DDIA)
    _raise_return(api, "tejas", loan)
    assert _active_loan(db, DDIA)["loan_id"] == loan["loan_id"]
    assert _copies(db, DDIA)[0]["status"] == "Issued"


def test_the_wrong_copy_code_cannot_raise_a_return(api, db):
    loan = dict(_active_loan(db, DDIA), barcode="LIB-CSBS-001A")
    with pytest.raises(ApiError) as error:
        _raise_return(api, "tejas", loan)
    assert "isn't the copy issued on this loan" in error.value.message


def test_another_student_cannot_raise_your_return(api, db):
    with pytest.raises(ApiError) as error:
        _raise_return(api, "akash", _active_loan(db, DDIA))
    assert error.value.code == "42501"


def test_an_unknown_condition_is_refused(api, db):
    with pytest.raises(ApiError) as error:
        _raise_return(api, "tejas", _active_loan(db, DDIA), "Sparkly")
    assert "Condition must be one of" in error.value.message


def test_one_loan_cannot_have_two_pending_requests(api, db):
    loan = _active_loan(db, DDIA)
    _raise_return(api, "tejas", loan)
    with pytest.raises(ApiError) as error:
        _raise_return(api, "tejas", loan)
    assert "already waiting" in error.value.message


def test_the_shelf_and_catalogue_show_a_return_is_pending(api, db):
    loan = _active_loan(db, DDIA)
    _raise_return(api, "tejas", loan)
    shelf_loan = next(l for l in api.call("user_dashboard", as_="tejas")["active_loans"] if l["loan_id"] == loan["loan_id"])
    assert shelf_loan["return_request_id"] is not None
    assert api.call("get_book", as_="tejas", p_book_id=DDIA)["user_context"]["return_requested"] is True


# ---- Confirming and rejecting

def test_confirming_returns_the_copy_to_the_shelf(api, db):
    request_id = _raise_return(api, "tejas", _active_loan(db, DDIA))["return_request_id"]
    result = _confirm(api, request_id)
    assert result["status"] == "RETURNED_TO_SHELF"
    assert _active_loan(db, DDIA) is None
    assert _copies(db, DDIA)[0]["status"] == "Available"


def test_confirming_records_the_condition_the_librarian_saw(api, db):
    loan = _active_loan(db, DDIA)
    _confirm(api, _raise_return(api, "tejas", loan, "Good")["return_request_id"], "Damaged")
    row = db.execute("SELECT condition_at_issue, condition_at_return FROM circulation_loans WHERE loan_id = %s", (loan["loan_id"],)).fetchone()
    assert (row["condition_at_issue"], row["condition_at_return"]) == ("Good", "Damaged")
    assert _copies(db, DDIA)[0]["condition"] == "Damaged"


def test_two_identical_books_returned_the_same_day_keep_their_own_condition(api, db):
    first, second = _copies(db, TWO_COPY_BOOK)
    _borrow(api, "tejas", TWO_COPY_BOOK, first["barcode"])
    _borrow(api, "akash", TWO_COPY_BOOK, second["barcode"])
    for person, copy, condition in (("tejas", first, "Good"), ("akash", second, "Damaged")):
        loan = db.execute(
            "SELECT loan_id, %s AS barcode FROM circulation_loans WHERE copy_id = %s AND return_date IS NULL",
            (copy["barcode"], copy["copy_id"]),
        ).fetchone()
        _confirm(api, _raise_return(api, person, loan, condition)["return_request_id"], condition)

    history = next(b for b in api.call("grouped_books", as_="admin") if b["book_id"] == TWO_COPY_BOOK)["borrowers"]
    by_student = {b["student_name"]: (b["barcode"], b["condition_at_return"]) for b in history}
    assert by_student["Tejas"] == (first["barcode"], "Good")
    assert by_student["Akash"] == (second["barcode"], "Damaged")


def test_confirming_hands_the_copy_to_the_next_patron_in_the_queue(api, db):
    result = _confirm(api, _raise_return(api, "tejas", _active_loan(db, CLRS), "Fair")["return_request_id"], "Fair")
    assert result["status"] == "AUTO_ASSIGNED_TO_WAITLIST"
    assert result["next_user"]["full_name"] == "Akash"
    next_loan = _active_loan(db, CLRS)
    assert next_loan["user_id"] == _user_id(db, "CSBS2022002")
    issued_in = db.execute("SELECT condition_at_issue, issued_via FROM circulation_loans WHERE loan_id = %s", (next_loan["loan_id"],)).fetchone()
    assert issued_in == {"condition_at_issue": "Fair", "issued_via": "Waitlist Auto-Fulfill"}


def test_the_fine_stops_when_the_student_raises_the_request(api, db):
    loan = _active_loan(db, CLRS)
    request_id = _raise_return(api, "tejas", loan)["return_request_id"]
    # Raised 1.5 days late, but the librarian confirms it 3.5 days late, which would cost ₹6.00
    db.execute("UPDATE circulation_loans SET due_date = now() - interval '3 days 12 hours' WHERE loan_id = %s", (loan["loan_id"],))
    db.execute("UPDATE return_requests SET created_at = now() - interval '2 days' WHERE return_request_id = %s", (request_id,))
    assert _confirm(api, request_id)["fine_assessed"] == 2.0
    assert _fines(db, "CSBS2022001") == 2.0


def test_a_request_cannot_be_confirmed_twice(api, db):
    request_id = _raise_return(api, "tejas", _active_loan(db, CLRS))["return_request_id"]
    _confirm(api, request_id)
    with pytest.raises(ApiError) as error:
        _confirm(api, request_id)
    assert "no longer waiting" in error.value.message
    assert _fines(db, "CSBS2022001") == 4.0


def test_rejecting_leaves_the_loan_active_and_it_can_be_raised_again(api, db):
    loan = _active_loan(db, DDIA)
    request_id = _raise_return(api, "tejas", loan)["return_request_id"]
    assert api.call("reject_return_request", as_="admin", p_return_request_id=request_id)["success"]
    assert _active_loan(db, DDIA)["loan_id"] == loan["loan_id"]
    assert api.call("admin_overview", as_="admin")["return_requests"] == []
    assert _raise_return(api, "tejas", loan)["success"]


# ---- The rest of the lending engine

def test_joining_and_leaving_the_waitlist(api, db):
    joined = api.call("join_waitlist", as_="biba", p_book_id=CLRS)
    assert joined["queue_position"] == 2
    with pytest.raises(ApiError):
        api.call("cancel_reservation", as_="akash", p_reservation_id=joined["reservation_id"])
    assert api.call("cancel_reservation", as_="biba", p_reservation_id=joined["reservation_id"])["success"]


def test_a_title_with_copies_on_the_shelf_has_no_waitlist(api):
    with pytest.raises(ApiError) as error:
        api.call("join_waitlist", as_="biba", p_book_id=TWO_COPY_BOOK)
    assert "available right now" in error.value.message


def test_marking_a_fine_paid(api, db):
    request_id = _raise_return(api, "tejas", _active_loan(db, CLRS))["return_request_id"]
    _confirm(api, request_id)
    assert api.call("settle_fine", as_="admin", p_user_id=_user_id(db, "CSBS2022001"))["outstanding_fines"] == 0
    assert _fines(db, "CSBS2022001") == 0.0


def test_book_requests(api):
    created = api.call("create_book_request", as_="biba", p_title="Clean Architecture")
    assert created["status"] == "Pending" and created["user_name"] == "Biba"
    assert [r["title"] for r in api.call("list_book_requests", as_="biba")][0] == "Clean Architecture"
    assert len(api.call("list_book_requests", as_="admin")) == 4
    assert api.call("update_book_request_status", as_="admin", p_request_id=created["request_id"], p_status="Approved")["status"] == "Approved"


def test_adding_a_book_gives_each_copy_its_own_code(api, db):
    result = api.call(
        "create_book", as_="admin", p_isbn="9780134494166", p_title="Clean Architecture", p_author="Robert C. Martin",
        p_category="Core Computer Science", p_published_year=2017, p_cover_url="https://example.com/c.jpg",
        p_initial_copies_count=2,
    )
    codes = [c["barcode"] for c in _copies(db, result["book_id"])]
    assert codes == [f"BB-COR-{result['book_id']:03d}A", f"BB-COR-{result['book_id']:03d}B"]


def test_the_catalogue_search_and_filters(api):
    assert [b["title"] for b in api.call("list_books", p_search="cormen")] == ["Introduction to Algorithms (CLRS)"]
    assert all(b["available_copies"] == 0 for b in api.call("list_books", p_availability="waitlist"))
    assert len(api.call("list_books")) == 40


def test_reset_restores_the_library_and_keeps_accounts(api, db):
    _borrow(api, "akash", TWO_COPY_BOOK)
    api.call("create_book_request", as_="biba", p_title="Clean Architecture")
    assert api.call("reset_library", as_="admin")["success"]
    assert _active_loan(db, TWO_COPY_BOOK) is None
    assert db.execute("SELECT COUNT(*) FROM book_requests").fetchone()["count"] == 3
    assert db.execute("SELECT COUNT(*) FROM users").fetchone()["count"] == 7
    assert api.call("my_profile", as_="akash")["full_name"] == "Akash"
