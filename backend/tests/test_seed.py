"""Seeding only fills an empty database, so changes to the demo accounts must reach existing ones."""
from app.core.clock import utc_now_iso
from app.db.connection import get_raw_connection
from app.db.seed import seed_database
from tests.conftest import bearer, login

API = "/api/v1"
SHASHINI = "CSBS2022006"
KAVYA = ("Kavya Sharma", "CSBS2022099", "kavya@bookbase.in")


def _start_app_on_existing_database() -> None:
    conn = get_raw_connection()
    try:
        seed_database(conn, force_reset=False)
    finally:
        conn.close()


def _add_kavya(db, enrollment: str = KAVYA[1], email: str = KAVYA[2]) -> int:
    db.execute(
        """
        INSERT INTO users (full_name, enrollment_no, email, password_hash, role, max_books_quota, outstanding_fines, created_at)
        VALUES (?, ?, ?, 'unused', 'member', 4, 0.0, ?)
        """,
        (KAVYA[0], enrollment, email, utc_now_iso())
    )
    db.commit()
    return db.execute("SELECT user_id FROM users WHERE enrollment_no = ?", (enrollment,)).fetchone()[0]


def _add_audit_entry(db, summary: str, entities: str) -> None:
    db.execute(
        "INSERT INTO db_audit_logs (operation_type, sql_summary, affected_entities, created_at) VALUES ('TX_TEST', ?, ?, ?)",
        (summary, entities, utc_now_iso())
    )
    db.commit()


def _count(db, sql: str, *params) -> int:
    return db.execute(sql, params).fetchone()[0]


def _remove_shashini(db) -> None:
    db.execute("DELETE FROM users WHERE enrollment_no = ?", (SHASHINI,))
    db.commit()


def test_new_database_has_shashini_and_no_kavya(client, db):
    token = login(client, SHASHINI, "member123")

    profile = client.get(f"{API}/auth/me", headers=bearer(token)).json()

    assert profile["full_name"] == "Shashini"
    assert profile["role"] == "member"
    assert profile["active_loans_count"] == 0
    assert _count(db, "SELECT COUNT(*) FROM users WHERE enrollment_no = ?", KAVYA[1]) == 0


def test_existing_database_gains_shashini_and_loses_kavya(client, db):
    _remove_shashini(db)
    kavya_id = _add_kavya(db)
    db.execute(
        "INSERT INTO book_requests (user_id, title, status, created_at, updated_at) VALUES (?, 'Database Internals', 'Approved', ?, ?)",
        (kavya_id, utc_now_iso(), utc_now_iso())
    )
    db.commit()
    _add_audit_entry(db, "New student patron registered: Kavya Sharma (CSBS2022099)", "email: kavya@bookbase.in")
    _add_audit_entry(db, "Student Kavya Sharma submitted procurement request", f"user_id: {kavya_id}")
    _add_audit_entry(db, "Unrelated entry", "user_id: 2")

    before = {
        "loans": _count(db, "SELECT COUNT(*) FROM circulation_loans"),
        "books": _count(db, "SELECT COUNT(*) FROM books"),
        "other_requests": _count(db, "SELECT COUNT(*) FROM book_requests WHERE user_id <> ?", kavya_id),
        "audit": _count(db, "SELECT COUNT(*) FROM db_audit_logs"),
    }
    tejas_joined = db.execute("SELECT created_at FROM users WHERE user_id = 2").fetchone()[0]

    _start_app_on_existing_database()

    assert _count(db, "SELECT COUNT(*) FROM users WHERE enrollment_no = ?", KAVYA[1]) == 0
    assert _count(db, "SELECT COUNT(*) FROM book_requests WHERE user_id = ?", kavya_id) == 0
    assert _count(db, "SELECT COUNT(*) FROM db_audit_logs WHERE sql_summary LIKE '%Kavya%'") == 0
    assert login(client, SHASHINI, "member123")

    assert _count(db, "SELECT COUNT(*) FROM circulation_loans") == before["loans"]
    assert _count(db, "SELECT COUNT(*) FROM books") == before["books"]
    assert _count(db, "SELECT COUNT(*) FROM book_requests") == before["other_requests"]
    assert _count(db, "SELECT COUNT(*) FROM db_audit_logs") == before["audit"] - 2
    # Other accounts aren't recreated, so their signed-in sessions stay valid
    assert db.execute("SELECT created_at FROM users WHERE user_id = 2").fetchone()[0] == tejas_joined


def test_repeated_startups_change_nothing_further(db):
    _remove_shashini(db)
    _add_kavya(db)

    _start_app_on_existing_database()
    password_hash = db.execute("SELECT password_hash FROM users WHERE enrollment_no = ?", (SHASHINI,)).fetchone()[0]
    users = _count(db, "SELECT COUNT(*) FROM users")
    _start_app_on_existing_database()

    assert _count(db, "SELECT COUNT(*) FROM users") == users
    assert db.execute("SELECT password_hash FROM users WHERE enrollment_no = ?", (SHASHINI,)).fetchone()[0] == password_hash


def test_retired_account_with_loan_records_is_kept_and_startup_still_works(db):
    kavya_id = _add_kavya(db)
    copy_id = db.execute("SELECT copy_id FROM book_copies WHERE status = 'Available' LIMIT 1").fetchone()[0]
    now = utc_now_iso()
    db.execute(
        """
        INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, return_date, fine_assessed, issued_via)
        VALUES (?, ?, ?, ?, ?, 0.0, 'Direct Checkout')
        """,
        (copy_id, kavya_id, now, now, now)
    )
    db.commit()

    _start_app_on_existing_database()

    assert _count(db, "SELECT COUNT(*) FROM users WHERE user_id = ?", kavya_id) == 1


def test_a_different_person_with_one_matching_detail_is_not_removed(db):
    _add_kavya(db, enrollment=KAVYA[1], email="someone.else@example.com")

    _start_app_on_existing_database()

    assert _count(db, "SELECT COUNT(*) FROM users WHERE enrollment_no = ?", KAVYA[1]) == 1


def test_someone_who_signed_up_with_shashinis_details_blocks_nothing(client, db):
    _remove_shashini(db)
    response = client.post(f"{API}/auth/register", json={
        "full_name": "Another Student", "enrollment_no": SHASHINI, "email": "another@example.com", "password": "their-own-password"
    })
    assert response.status_code == 201

    _start_app_on_existing_database()

    assert db.execute("SELECT full_name FROM users WHERE enrollment_no = ?", (SHASHINI,)).fetchone()[0] == "Another Student"
    assert login(client, SHASHINI, "their-own-password")
