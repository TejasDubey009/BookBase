-- ============================================================================
-- BOOKBASE: queries for the presentation.
-- Paste any one of these into the Supabase SQL Editor and run it.
-- Every query reads the live tables that the three portals write to.
-- ============================================================================


-- 1. Every table, with how many rows it holds right now.
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'books', COUNT(*) FROM books
UNION ALL SELECT 'book_copies', COUNT(*) FROM book_copies
UNION ALL SELECT 'circulation_loans', COUNT(*) FROM circulation_loans
UNION ALL SELECT 'return_requests', COUNT(*) FROM return_requests
UNION ALL SELECT 'waitlist_reservations', COUNT(*) FROM waitlist_reservations
UNION ALL SELECT 'book_requests', COUNT(*) FROM book_requests
UNION ALL SELECT 'db_audit_logs', COUNT(*) FROM db_audit_logs;


-- 2. Every foreign key: the relationships in the ER diagram, read from the database itself.
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;


-- 3. 3NF in action: availability is never stored. It is worked out from the physical copies.
SELECT
    b.book_id,
    b.title,
    COUNT(bc.copy_id) AS total_copies,
    COUNT(bc.copy_id) FILTER (WHERE bc.status = 'Available') AS available_copies
FROM books b
LEFT JOIN book_copies bc ON b.book_id = bc.book_id
GROUP BY b.book_id
ORDER BY b.book_id
LIMIT 10;


-- 4. Each physical copy on loan, linked by its unique code to the student's profile.
SELECT
    bc.barcode AS copy_code,
    b.title,
    u.enrollment_no,
    u.full_name,
    cl.issue_date::date AS issued_on,
    cl.due_date::date AS due_on,
    cl.condition_at_issue
FROM circulation_loans cl
JOIN book_copies bc ON cl.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
JOIN users u ON cl.user_id = u.user_id
WHERE cl.return_date IS NULL
ORDER BY cl.due_date;


-- 5. Who had a copy when it was damaged? Two identical books can come back on the same day,
--    and each still traces to its own borrower through its unique code.
SELECT
    bc.barcode AS copy_code,
    b.title,
    u.full_name AS borrower,
    cl.condition_at_issue,
    cl.condition_at_return,
    cl.return_date::date AS returned_on
FROM circulation_loans cl
JOIN book_copies bc ON cl.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
JOIN users u ON cl.user_id = u.user_id
WHERE cl.condition_at_return IS NOT NULL
  AND cl.condition_at_return <> cl.condition_at_issue
ORDER BY cl.return_date DESC;


-- 6. Return requests waiting for a librarian: only ones a student has actively raised.
SELECT
    rr.return_request_id,
    bc.barcode AS copy_code,
    b.title,
    u.full_name AS student,
    rr.reported_condition,
    rr.created_at::date AS raised_on
FROM return_requests rr
JOIN circulation_loans cl ON rr.loan_id = cl.loan_id
JOIN book_copies bc ON cl.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
JOIN users u ON cl.user_id = u.user_id
WHERE rr.status = 'Pending'
ORDER BY rr.created_at;


-- 7. The fine rule: ₹2 a day, for at most 4 days. This matches calculate_overdue_fine in the API,
--    where any part of a first late day counts as a whole day.
SELECT
    u.full_name AS borrower,
    bc.barcode AS copy_code,
    cl.due_date::date AS due_on,
    GREATEST(
        EXTRACT(DAY FROM NOW() - cl.due_date)::int,
        CASE WHEN NOW() > cl.due_date THEN 1 ELSE 0 END
    ) AS days_overdue,
    LEAST(
        GREATEST(
            EXTRACT(DAY FROM NOW() - cl.due_date)::int,
            CASE WHEN NOW() > cl.due_date THEN 1 ELSE 0 END
        ),
        4
    ) * 2.00 AS fine_if_returned_now
FROM circulation_loans cl
JOIN book_copies bc ON cl.copy_id = bc.copy_id
JOIN users u ON cl.user_id = u.user_id
WHERE cl.return_date IS NULL
ORDER BY cl.due_date;


-- 8. The FIFO waitlist, oldest first, with each student's position in the queue.
SELECT
    b.title,
    u.full_name AS student,
    ROW_NUMBER() OVER (PARTITION BY wr.book_id ORDER BY wr.created_at, wr.reservation_id) AS queue_position,
    wr.created_at::date AS joined_on
FROM waitlist_reservations wr
JOIN books b ON wr.book_id = b.book_id
JOIN users u ON wr.user_id = u.user_id
WHERE wr.status = 'Waiting'
ORDER BY b.title, queue_position;


-- 9. The live audit log: every change made through any of the three portals.
SELECT log_id, operation_type, sql_summary, affected_entities, created_at
FROM db_audit_logs
ORDER BY log_id DESC
LIMIT 15;


-- 10. The partial unique index that makes a double booking impossible.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND indexname = 'idx_single_active_loan_per_copy';


-- 11. Watch the database refuse a double booking. This FAILS on purpose, with
--     "duplicate key value violates unique constraint", and changes nothing.
--     Run it only while at least one loan is active.
INSERT INTO circulation_loans (copy_id, user_id, due_date)
SELECT copy_id, user_id, due_date
FROM circulation_loans
WHERE return_date IS NULL
LIMIT 1;


-- 12. Watch the database refuse a negative fine. This also FAILS on purpose, with
--     "violates check constraint", and changes nothing.
UPDATE circulation_loans SET fine_assessed = -5 WHERE return_date IS NULL;
