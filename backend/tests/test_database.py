"""Both databases stay in step, and concurrent requests can't corrupt circulation on either."""
import re
import threading

import pytest

from app.core.errors import ServiceError
from app.core.security import CurrentUser
from app.db.connection import IS_POSTGRES, get_raw_connection
from app.db.postgres import _ssl_options
from app.db.schema import POSTGRES_SCHEMA_PATH, SQLITE_SCHEMA_SQL
from app.schemas.circulation import CheckoutRequest, ReturnRequestConfirm
from app.services import circulation_service
from tests.conftest import ADMIN_ID, AKASH_ID, TEJAS_ID

MEMBER_IDS = [2, 3, 4, 5, 6]
TWO_COPY_BOOK_ID = 1

postgres_only = pytest.mark.skipif(not IS_POSTGRES, reason="needs TEST_DATABASE_URL")


def _tables(schema_sql: str) -> dict:
    tables = {}
    for name, body in re.findall(r"CREATE TABLE IF NOT EXISTS (\w+) \((.*?)\n\);", schema_sql, re.DOTALL):
        tables[name] = [line.split()[0] for line in body.splitlines() if line.strip()]
    return tables


def _indexes(schema_sql: str) -> set:
    return set(re.findall(r"CREATE (?:UNIQUE )?INDEX IF NOT EXISTS (\w+)", schema_sql))


def test_the_sqlite_and_postgres_schemas_define_the_same_columns():
    postgres_sql = POSTGRES_SCHEMA_PATH.read_text()
    assert len(_tables(postgres_sql)) == 8
    assert _tables(SQLITE_SCHEMA_SQL) == _tables(postgres_sql)


def test_the_sqlite_and_postgres_schemas_define_the_same_indexes():
    postgres_sql = POSTGRES_SCHEMA_PATH.read_text()
    assert _indexes(SQLITE_SCHEMA_SQL) == _indexes(postgres_sql)


def test_every_table_has_row_level_security_in_the_postgres_schema():
    postgres_sql = POSTGRES_SCHEMA_PATH.read_text()
    assert set(re.findall(r"ALTER TABLE (\w+) ENABLE ROW LEVEL SECURITY", postgres_sql)) == set(_tables(postgres_sql))


def _race(calls: list) -> list:
    """Runs every call at the same moment, each on its own connection. Returns results or ServiceErrors."""
    barrier = threading.Barrier(len(calls))
    results = [None] * len(calls)

    def run(index, call):
        conn = get_raw_connection()
        try:
            barrier.wait()
            results[index] = call(conn)
        except ServiceError as error:
            results[index] = error
        finally:
            conn.close()

    threads = [threading.Thread(target=run, args=(i, call)) for i, call in enumerate(calls)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=60)
    return results


def _successes(results: list) -> list:
    assert all(result is not None for result in results), "a call did not finish"
    return [result for result in results if not isinstance(result, ServiceError)]


def _unexpected_errors(results: list) -> list:
    return [r.detail for r in results if isinstance(r, ServiceError) and r.status_code >= 500]


def test_five_students_racing_for_two_copies_get_one_each_and_the_rest_are_told_why(db):
    results = _race([
        lambda conn, user_id=user_id: circulation_service.checkout(conn, CheckoutRequest(book_id=TWO_COPY_BOOK_ID), user_id)
        for user_id in MEMBER_IDS
    ])

    winners = _successes(results)
    assert len(winners) == 2
    assert len({winner.copy_id for winner in winners}) == 2
    assert _unexpected_errors(results) == []
    active = db.execute(
        """
        SELECT COUNT(*) FROM circulation_loans cl JOIN book_copies bc ON cl.copy_id = bc.copy_id
        WHERE bc.book_id = ? AND cl.return_date IS NULL
        """,
        (TWO_COPY_BOOK_ID,)
    ).fetchone()[0]
    assert active == 2


def test_one_student_racing_for_several_titles_cannot_exceed_their_quota(db):
    db.execute("UPDATE users SET max_books_quota = 1 WHERE user_id = ?", (AKASH_ID,))
    db.commit()

    results = _race([
        lambda conn, book_id=book_id: circulation_service.checkout(conn, CheckoutRequest(book_id=book_id), AKASH_ID)
        for book_id in (1, 2, 4, 5)
    ])

    assert len(_successes(results)) == 1
    assert _unexpected_errors(results) == []


def test_two_librarians_confirming_one_return_charge_the_fine_once(client, tejas, db):
    loan = db.execute(
        """
        SELECT cl.loan_id, bc.barcode FROM circulation_loans cl JOIN book_copies bc ON cl.copy_id = bc.copy_id
        WHERE cl.user_id = ? AND bc.book_id = 3 AND cl.return_date IS NULL
        """,
        (TEJAS_ID,)
    ).fetchone()
    raised = client.post(
        "/api/v1/circulation/return-requests",
        headers=tejas,
        json={"loan_id": loan["loan_id"], "barcode": loan["barcode"], "condition": "Good"}
    ).json()
    librarian = CurrentUser(user_id=ADMIN_ID, role="admin")
    payload = ReturnRequestConfirm(condition="Good")

    results = _race([
        lambda conn: circulation_service.confirm_return_request(conn, raised["return_request_id"], payload, librarian)
        for _ in range(3)
    ])

    assert len(_successes(results)) == 1
    assert _unexpected_errors(results) == []
    assert db.execute("SELECT outstanding_fines FROM users WHERE user_id = ?", (TEJAS_ID,)).fetchone()[0] == 4.0
    assert db.execute("SELECT COUNT(*) FROM circulation_loans WHERE issued_via = 'Waitlist Auto-Fulfill'").fetchone()[0] == 1


@postgres_only
def test_supabases_public_api_role_can_read_nothing(db):
    """With RLS on and no policies, a role that has been granted SELECT still sees no rows."""
    db.execute("CREATE ROLE anon NOLOGIN")
    db.execute("GRANT SELECT ON users TO anon")
    db.execute("SET ROLE anon")
    try:
        assert db.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0
    finally:
        db.execute("RESET ROLE")
        db.execute("REVOKE ALL ON users FROM anon")
        db.execute("DROP ROLE anon")
    assert db.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 6


@postgres_only
def test_money_and_time_columns_use_real_postgres_types(db):
    types = dict(
        (row["column_name"], row["data_type"]) for row in db.execute(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'circulation_loans'"
        ).fetchall()
    )
    assert types["fine_assessed"] == "numeric"
    assert types["due_date"] == "timestamp with time zone"


@pytest.mark.parametrize("url,expected", [
    ("postgresql://postgres.abc:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres", {"sslmode": "require"}),
    ("postgresql://postgres.abc:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=verify-full", {}),
    ("postgresql://postgres@localhost:5432/bookbase", {}),
    ("postgresql://postgres@127.0.0.1:5432/bookbase", {}),
])
def test_connections_leaving_this_machine_must_be_encrypted(url, expected):
    assert _ssl_options(url) == expected
