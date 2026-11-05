"""Requests arriving at the same moment, each on its own connection, as they would through Supabase."""
import threading

from conftest import KIOSK_KEY, ApiError

TWO_COPY_BOOK = 1
CLRS = 3
STUDENTS = ["tejas", "akash", "sai", "biba", "jaidanya"]


def _race(calls):
    """Starts every call at once. Returns each result, or the ApiError it raised."""
    barrier = threading.Barrier(len(calls))
    results = [None] * len(calls)

    def run(i, call):
        try:
            results[i] = call(barrier.wait)
        except ApiError as error:
            results[i] = error

    threads = [threading.Thread(target=run, args=(i, call)) for i, call in enumerate(calls)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=60)
    assert all(result is not None for result in results), "a call did not finish"
    return results


def _successes(results):
    return [r for r in results if not isinstance(r, ApiError)]


def _unexpected(results):
    """Errors other than the rules saying no, such as a deadlock or a broken constraint."""
    return [r.message for r in results if isinstance(r, ApiError) and r.code != "P0001"]


def test_five_students_racing_for_two_copies_get_one_each(api, db):
    results = _race([
        lambda before, person=person: api.call(
            "checkout_book", as_=person, before=before, p_book_id=TWO_COPY_BOOK, p_kiosk_key=KIOSK_KEY
        )
        for person in STUDENTS
    ])
    winners = _successes(results)
    assert len(winners) == 2
    assert len({w["copy_id"] for w in winners}) == 2
    assert _unexpected(results) == []


def test_one_student_racing_for_several_titles_cannot_exceed_their_quota(api, db):
    db.execute("UPDATE users SET max_books_quota = 1 WHERE enrollment_no = 'CSBS2022002'")
    results = _race([
        lambda before, book_id=book_id: api.call(
            "checkout_book", as_="akash", before=before, p_book_id=book_id, p_kiosk_key=KIOSK_KEY
        )
        for book_id in (1, 2, 4, 5)
    ])
    assert len(_successes(results)) == 1
    assert _unexpected(results) == []


def test_two_librarians_confirming_one_return_charge_the_fine_once(api, db):
    loan = db.execute(
        """
        SELECT cl.loan_id, bc.barcode FROM circulation_loans cl JOIN book_copies bc ON cl.copy_id = bc.copy_id
        WHERE bc.book_id = %s AND cl.return_date IS NULL
        """,
        (CLRS,),
    ).fetchone()
    raised = api.call(
        "raise_return_request", as_="tejas", p_loan_id=loan["loan_id"], p_barcode=loan["barcode"],
        p_condition="Good", p_kiosk_key=KIOSK_KEY,
    )
    results = _race([
        lambda before: api.call(
            "confirm_return_request", as_="admin", before=before,
            p_return_request_id=raised["return_request_id"], p_condition="Good",
        )
        for _ in range(3)
    ])
    assert len(_successes(results)) == 1
    assert _unexpected(results) == []
    assert float(db.execute("SELECT outstanding_fines FROM users WHERE enrollment_no = 'CSBS2022001'").fetchone()["outstanding_fines"]) == 4.0
    assert db.execute("SELECT COUNT(*) FROM circulation_loans WHERE issued_via = 'Waitlist Auto-Fulfill'").fetchone()["count"] == 1


def test_two_students_racing_to_join_one_queue_get_positions_one_after_the_other(api, db):
    db.execute("UPDATE waitlist_reservations SET status = 'Cancelled'")
    results = _race([
        lambda before, person=person: api.call("join_waitlist", as_=person, before=before, p_book_id=CLRS)
        for person in ("biba", "sai")
    ])
    assert sorted(r["queue_position"] for r in results) == [1, 2]
