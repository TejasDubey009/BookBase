"""
SQL shared by more than one service. Queries used in only one place live with that
service. Fragments ending in a FROM/JOIN clause are completed by the caller with
WHERE / ORDER BY.
"""
import sqlite3

# A patron's position is COUNT(*) of 'Waiting' entries for that book created <= their
# reservation. The outer query must alias waitlist_reservations as `wr`.
QUEUE_POSITION_SUBQUERY = """
    (
        SELECT COUNT(*)
        FROM waitlist_reservations wr2
        WHERE wr2.book_id = wr.book_id
          AND wr2.status = 'Waiting'
          AND (wr2.created_at < wr.created_at OR (wr2.created_at = wr.created_at AND wr2.reservation_id <= wr.reservation_id))
    )
"""

LOAN_DETAILS_SELECT = """
    SELECT
        cl.loan_id, cl.copy_id, cl.user_id, cl.issue_date, cl.due_date, cl.return_date,
        cl.fine_assessed, cl.issued_via,
        bc.barcode, bc.shelf_location,
        b.book_id, b.title, b.author, b.isbn, b.cover_url, b.card_tint,
        u.full_name as user_name, u.email as user_email, u.enrollment_no as user_enrollment_no
    FROM circulation_loans cl
    JOIN book_copies bc ON cl.copy_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id
    JOIN users u ON cl.user_id = u.user_id
"""

BOOK_REQUEST_DETAILS_SELECT = """
    SELECT
        br.request_id, br.user_id, br.book_id, br.title, br.author, br.category,
        br.notes, br.status, br.created_at, br.updated_at,
        u.full_name as user_name, u.enrollment_no as user_enrollment_no, u.email as user_email
    FROM book_requests br
    JOIN users u ON br.user_id = u.user_id
"""

USER_PROFILE_SELECT = """
    SELECT user_id, enrollment_no, full_name, email, role, max_books_quota, outstanding_fines
    FROM users
"""


def count_active_loans(cursor: sqlite3.Cursor, user_id: int) -> int:
    cursor.execute(
        "SELECT COUNT(*) FROM circulation_loans WHERE user_id = ? AND return_date IS NULL",
        (user_id,)
    )
    return cursor.fetchone()[0]
