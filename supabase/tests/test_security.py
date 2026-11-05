"""What the browser can reach. Everything goes through functions, and each one checks the caller."""
import psycopg
import pytest

from conftest import STAFF_CODE, ApiError, sign_up

TABLES = [
    "users", "books", "book_copies", "circulation_loans", "return_requests",
    "waitlist_reservations", "book_requests", "db_audit_logs",
]

# Any function not listed here must refuse the browser. A new one stays closed until it is added.
SIGNED_OUT = {"lending_policy", "demo_accounts", "registration_problem", "list_books", "get_book", "my_profile"}
SIGNED_IN = SIGNED_OUT | {
    "checkout_book", "join_waitlist", "cancel_reservation", "raise_return_request", "confirm_return_request",
    "reject_return_request", "user_dashboard", "list_book_requests", "create_book_request",
    "update_book_request_status", "create_book", "grouped_books", "admin_overview", "settle_fine", "reset_library",
}
LIBRARIAN_ONLY = [
    ("admin_overview", {}),
    ("grouped_books", {}),
    ("settle_fine", {"p_user_id": 2}),
    ("reset_library", {}),
    ("update_book_request_status", {"p_request_id": 1, "p_status": "Approved"}),
    ("confirm_return_request", {"p_return_request_id": 1, "p_condition": "Good"}),
    ("reject_return_request", {"p_return_request_id": 1}),
    ("create_book", {"p_isbn": "1", "p_title": "T", "p_author": "A", "p_category": "C", "p_published_year": 2020, "p_cover_url": "x"}),
]


def _executable(db, role: str) -> set:
    rows = db.execute(
        """
        SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname IN ('public', 'private') AND has_function_privilege(%s, p.oid, 'EXECUTE')
        """,
        (role,),
    ).fetchall()
    return {row["proname"] for row in rows}


def test_signed_out_visitors_can_run_only_the_public_functions(db):
    assert _executable(db, "anon") == SIGNED_OUT


def test_signed_in_users_can_run_only_the_listed_functions(db):
    assert _executable(db, "authenticated") == SIGNED_IN


@pytest.mark.parametrize("role", ["anon", "authenticated"])
@pytest.mark.parametrize("table", TABLES)
def test_the_browser_cannot_touch_any_table(db, role, table):
    for privilege in ("SELECT", "INSERT", "UPDATE", "DELETE"):
        assert not db.execute("SELECT has_table_privilege(%s, %s, %s)", (role, f"public.{table}", privilege)).fetchone()["has_table_privilege"]


def test_row_level_security_is_on_for_every_table(db):
    rows = db.execute("SELECT relname FROM pg_class WHERE relrowsecurity AND relnamespace = 'public'::regnamespace").fetchall()
    assert {row["relname"] for row in rows} == set(TABLES)


def test_the_private_settings_are_unreachable(api):
    with pytest.raises(ApiError) as error:
        api.call("seed_library", as_="admin")
    assert error.value.code in ("42501", "42883")


def test_signed_out_visitors_cannot_borrow(api):
    with pytest.raises(ApiError) as error:
        api.call("checkout_book", p_book_id=1)
    assert error.value.code == "42501"


@pytest.mark.parametrize("function,args", LIBRARIAN_ONLY)
def test_students_cannot_run_librarian_functions(api, function, args):
    with pytest.raises(ApiError) as error:
        api.call(function, as_="tejas", **args)
    assert error.value.code == "42501"
    assert "librarian" in error.value.message


def test_a_student_cannot_open_another_students_shelf(api, db):
    akash = db.execute("SELECT user_id FROM users WHERE enrollment_no = 'CSBS2022002'").fetchone()["user_id"]
    with pytest.raises(ApiError) as error:
        api.call("user_dashboard", as_="tejas", p_user_id=akash)
    assert error.value.code == "42501"


def test_a_librarian_can_open_any_shelf(api, db):
    akash = db.execute("SELECT user_id FROM users WHERE enrollment_no = 'CSBS2022002'").fetchone()["user_id"]
    assert api.call("user_dashboard", as_="admin", p_user_id=akash)["user"]["full_name"] == "Akash"


def test_only_librarians_see_who_holds_a_copy(api):
    student_view = api.call("get_book", as_="akash", p_book_id=3)
    librarian_view = api.call("get_book", as_="admin", p_book_id=3)
    assert student_view["copies"][0]["current_borrower_name"] is None
    assert librarian_view["copies"][0]["current_borrower_name"] == "Tejas"


def test_others_see_only_queue_positions(api):
    entry = api.call("get_book", p_book_id=3)["waitlist_entries"][0]
    assert entry["user_id"] is None and entry["user_name"] is None
    assert api.call("get_book", as_="akash", p_book_id=3)["waitlist_entries"][0]["user_name"] == "Akash"


def test_signed_out_my_profile_is_null(api):
    assert api.call("my_profile") is None


def test_demo_accounts_list_only_seeded_students(api):
    accounts = api.call("demo_accounts")
    assert [a["enrollment_no"] for a in accounts] == [
        "CSBS2022001", "CSBS2022002", "CSBS2022003", "CSBS2022004", "CSBS2022005", "CSBS2022006"
    ]
    assert {a["role"] for a in accounts} == {"member"}


def test_demo_accounts_are_hidden_unless_demo_mode_is_on(api, db):
    db.execute("DELETE FROM private.settings WHERE name = 'demo_mode'")
    assert api.call("demo_accounts") == []


# ---- Sign-up, through Supabase Auth and the BookBase trigger

def test_signing_up_creates_a_student_account(api, db):
    sign_up(db, "riya@example.com", {"full_name": "Riya", "enrollment_no": "csbs2023019"})
    user = db.execute("SELECT enrollment_no, role, max_books_quota FROM users WHERE email = 'riya@example.com'").fetchone()
    assert user == {"enrollment_no": "CSBS2023019", "role": "member", "max_books_quota": 4}


def test_a_role_sent_with_the_sign_up_is_ignored(db):
    sign_up(db, "riya@example.com", {"full_name": "Riya", "enrollment_no": "CSBS2023019", "role": "admin"})
    assert db.execute("SELECT role FROM users WHERE email = 'riya@example.com'").fetchone()["role"] == "member"


def test_signing_up_with_the_staff_code_creates_a_librarian(db):
    sign_up(db, "staff@example.com", {"full_name": "Staff", "enrollment_no": "STAFF001", "staff_code": STAFF_CODE})
    assert db.execute("SELECT role FROM users WHERE email = 'staff@example.com'").fetchone()["role"] == "admin"


@pytest.mark.parametrize("code", ["wrong-code", "", " "])
def test_a_wrong_staff_code_refuses_the_whole_sign_up(db, code):
    with pytest.raises(psycopg.errors.RaiseException):
        sign_up(db, "staff@example.com", {"full_name": "Staff", "enrollment_no": "STAFF001", "staff_code": code})
    assert db.execute("SELECT COUNT(*) FROM auth.users WHERE email = 'staff@example.com'").fetchone()["count"] == 0


def test_no_librarian_can_sign_up_without_a_configured_code(db):
    db.execute("DELETE FROM private.settings WHERE name = 'staff_signup_code'")
    with pytest.raises(psycopg.errors.RaiseException):
        sign_up(db, "staff@example.com", {"full_name": "Staff", "enrollment_no": "STAFF001", "staff_code": STAFF_CODE})


@pytest.mark.parametrize("metadata,message", [
    ({"full_name": "Riya", "enrollment_no": "A"}, "Enrollment number must be"),
    ({"full_name": "", "enrollment_no": "CSBS2023019"}, "required"),
    ({"full_name": "Riya", "enrollment_no": "CSBS2022001"}, "already registered"),
])
def test_an_invalid_sign_up_is_refused_with_a_reason(api, db, metadata, message):
    problem = api.call(
        "registration_problem",
        p_full_name=metadata["full_name"], p_enrollment_no=metadata["enrollment_no"], p_email="riya@example.com",
    )
    assert message in problem
    with pytest.raises(psycopg.errors.RaiseException):
        sign_up(db, "riya@example.com", metadata)


def test_a_valid_sign_up_has_no_problem(api):
    assert api.call(
        "registration_problem", p_full_name="Riya", p_enrollment_no="CSBS2023019", p_email="riya@example.com"
    ) is None
