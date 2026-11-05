-- ============================================================================
-- BOOKBASE, PART 2 OF 3: FUNCTIONS
-- Run this after schema.sql. Every statement is safe to run again.
--
-- These functions are the only way into the data. The websites call the ones in the public
-- schema through Supabase (supabase.rpc). Each runs as one transaction, checks who is calling,
-- applies the library's rules, and returns JSON. The helpers in the private schema can't be
-- called from outside.
--
-- SECURITY DEFINER means a function runs with its owner's rights, so it can read the tables the
-- caller can't. That makes every check inside it matter: it is the only thing between the
-- browser and the data.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- The lending policy, in one place
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.fine_rate() RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$ SELECT 2.00::numeric $$;
CREATE OR REPLACE FUNCTION private.max_fine_days() RETURNS INT LANGUAGE sql IMMUTABLE AS $$ SELECT 4 $$;
CREATE OR REPLACE FUNCTION private.loan_days() RETURNS INT LANGUAGE sql IMMUTABLE AS $$ SELECT 14 $$;
CREATE OR REPLACE FUNCTION private.member_quota() RETURNS INT LANGUAGE sql IMMUTABLE AS $$ SELECT 4 $$;
CREATE OR REPLACE FUNCTION private.librarian_quota() RETURNS INT LANGUAGE sql IMMUTABLE AS $$ SELECT 10 $$;
CREATE OR REPLACE FUNCTION private.fine_block_limit() RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$ SELECT 25.00::numeric $$;
CREATE OR REPLACE FUNCTION private.copy_conditions() RETURNS TEXT[] LANGUAGE sql IMMUTABLE AS $$
    SELECT ARRAY['Pristine', 'Good', 'Fair', 'Damaged']
$$;

-- The seeded student accounts, listed on the sign-in form when demo mode is on
CREATE OR REPLACE FUNCTION private.demo_enrollments() RETURNS TEXT[] LANGUAGE sql IMMUTABLE AS $$
    SELECT ARRAY['CSBS2022001', 'CSBS2022002', 'CSBS2022003', 'CSBS2022004', 'CSBS2022005', 'CSBS2022006']
$$;


-- ---------------------------------------------------------------------------
-- Small helpers
-- ---------------------------------------------------------------------------

-- Timestamps leave the database as ISO-8601 UTC text, whatever the session's time zone
CREATE OR REPLACE FUNCTION private.iso(p_at TIMESTAMPTZ) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    SELECT to_char(p_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"+00:00"')
$$;

CREATE OR REPLACE FUNCTION private.setting(p_name TEXT) RETURNS TEXT LANGUAGE sql STABLE AS $$
    SELECT value FROM private.settings WHERE name = p_name
$$;

-- Whole days late. Any part of a first late day counts as one day.
CREATE OR REPLACE FUNCTION private.overdue_days(p_due TIMESTAMPTZ, p_at TIMESTAMPTZ) RETURNS INT LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN p_at <= p_due THEN 0
        ELSE GREATEST(1, floor(extract(epoch FROM (p_at - p_due)) / 86400)::int)
    END
$$;

-- ₹2.00 a day, for at most 4 days
CREATE OR REPLACE FUNCTION private.overdue_fine(p_due TIMESTAMPTZ, p_at TIMESTAMPTZ) RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
    SELECT (LEAST(private.overdue_days(p_due, p_at), private.max_fine_days()) * private.fine_rate())::numeric(10, 2)
$$;

CREATE OR REPLACE FUNCTION private.days_until(p_due TIMESTAMPTZ) RETURNS INT LANGUAGE sql STABLE AS $$
    SELECT floor(extract(epoch FROM (p_due - now())) / 86400)::int
$$;

CREATE OR REPLACE FUNCTION private.money(p_amount NUMERIC) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    SELECT to_char(p_amount, 'FM999999990.00')
$$;

CREATE OR REPLACE FUNCTION private.log_audit(p_operation TEXT, p_summary TEXT, p_entities TEXT) RETURNS VOID LANGUAGE sql AS $$
    INSERT INTO public.db_audit_logs (operation_type, sql_summary, affected_entities)
    VALUES (p_operation, p_summary, p_entities)
$$;

CREATE OR REPLACE FUNCTION private.valid_condition(p_condition TEXT) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF p_condition IS NULL OR NOT (p_condition = ANY (private.copy_conditions())) THEN
        RAISE EXCEPTION 'Condition must be one of: %', array_to_string(private.copy_conditions(), ', ');
    END IF;
    RETURN p_condition;
END $$;

-- Held until the transaction ends: no two checkouts, waitlist joins or returns of a title overlap
CREATE OR REPLACE FUNCTION private.lock_book(p_book_id INT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    PERFORM 1 FROM public.books WHERE book_id = p_book_id FOR UPDATE;
END $$;

-- 1-based place in the queue: waiting reservations for the same title, created no later
CREATE OR REPLACE FUNCTION private.queue_position(p_reservation_id INT) RETURNS INT LANGUAGE sql STABLE AS $$
    SELECT COUNT(*)::int
    FROM public.waitlist_reservations wr
    JOIN public.waitlist_reservations mine ON mine.reservation_id = p_reservation_id
    WHERE wr.book_id = mine.book_id
      AND wr.status = 'Waiting'
      AND (wr.created_at < mine.created_at OR (wr.created_at = mine.created_at AND wr.reservation_id <= mine.reservation_id))
$$;


-- ---------------------------------------------------------------------------
-- Who is calling. auth.uid() is the signed-in Supabase Auth user, set by Supabase from the
-- caller's session token, so it can't be forged from the browser.
-- ---------------------------------------------------------------------------

-- The caller's library account, or NULL when signed out
CREATE OR REPLACE FUNCTION private.caller() RETURNS public.users LANGUAGE sql STABLE AS $$
    SELECT * FROM public.users WHERE auth_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION private.require_member() RETURNS public.users LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_caller public.users := private.caller();
BEGIN
    IF v_caller.user_id IS NULL THEN
        RAISE EXCEPTION 'Please sign in first.' USING ERRCODE = '42501', HINT = 'not_signed_in';
    END IF;
    RETURN v_caller;
END $$;

CREATE OR REPLACE FUNCTION private.require_librarian() RETURNS public.users LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_caller public.users := private.require_member();
BEGIN
    IF v_caller.role <> 'admin' THEN
        RAISE EXCEPTION 'This action requires a librarian (admin) account.' USING ERRCODE = '42501';
    END IF;
    RETURN v_caller;
END $$;

CREATE OR REPLACE FUNCTION private.require_self_or_librarian(p_caller public.users, p_user_id INT) RETURNS VOID LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF p_caller.role <> 'admin' AND p_caller.user_id IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'You can only act on your own account.' USING ERRCODE = '42501';
    END IF;
END $$;

-- Students may borrow and raise returns only at a registered kiosk, which holds the kiosk key.
-- Librarians can do both from anywhere. With no key set, no student can: the rule fails shut.
CREATE OR REPLACE FUNCTION private.require_kiosk(p_caller public.users, p_kiosk_key TEXT) RETURNS VOID LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_key TEXT := private.setting('kiosk_key');
BEGIN
    IF p_caller.role = 'admin' THEN
        RETURN;
    END IF;
    IF COALESCE(v_key, '') = '' OR p_kiosk_key IS DISTINCT FROM v_key THEN
        RAISE EXCEPTION 'Borrowing and returns are only available at a registered Library Kiosk.'
            USING ERRCODE = '42501', HINT = 'kiosk_key_required';
    END IF;
END $$;


-- ---------------------------------------------------------------------------
-- How rows leave the database. These shapes are what the websites expect.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.user_json(p_user_id INT) RETURNS JSON LANGUAGE sql STABLE AS $$
    SELECT json_build_object(
        'user_id', u.user_id,
        'enrollment_no', u.enrollment_no,
        'full_name', u.full_name,
        'email', u.email,
        'role', u.role,
        'max_books_quota', u.max_books_quota,
        'outstanding_fines', u.outstanding_fines,
        'active_loans_count', (
            SELECT COUNT(*) FROM public.circulation_loans cl WHERE cl.user_id = u.user_id AND cl.return_date IS NULL
        )
    )
    FROM public.users u
    WHERE u.user_id = p_user_id
$$;

-- A loan, with the fine it would charge. An active loan's fine is counted up to now, or up to the
-- moment the student raised a return request, however long the librarian then takes.
CREATE OR REPLACE FUNCTION private.loan_json(p_loan_id INT) RETURNS JSON LANGUAGE sql STABLE AS $$
    SELECT json_build_object(
        'loan_id', cl.loan_id,
        'copy_id', cl.copy_id,
        'user_id', cl.user_id,
        'user_name', u.full_name,
        'user_email', u.email,
        'user_enrollment_no', u.enrollment_no,
        'book_id', b.book_id,
        'title', b.title,
        'author', b.author,
        'isbn', b.isbn,
        'cover_url', b.cover_url,
        'card_tint', b.card_tint,
        'barcode', bc.barcode,
        'shelf_location', bc.shelf_location,
        'issue_date', private.iso(cl.issue_date),
        'due_date', private.iso(cl.due_date),
        'return_date', private.iso(cl.return_date),
        'fine_assessed', cl.fine_assessed,
        'issued_via', cl.issued_via,
        'condition_at_issue', cl.condition_at_issue,
        'condition_at_return', cl.condition_at_return,
        'return_request_id', rr.return_request_id,
        'return_requested_at', private.iso(rr.created_at),
        'is_overdue', COALESCE(cl.return_date, rr.created_at, now()) > cl.due_date,
        'days_remaining', CASE WHEN cl.return_date IS NULL THEN private.days_until(cl.due_date) ELSE 0 END,
        'days_overdue', private.overdue_days(cl.due_date, COALESCE(cl.return_date, rr.created_at, now())),
        'accrued_fine', CASE
            WHEN cl.return_date IS NULL THEN private.overdue_fine(cl.due_date, COALESCE(rr.created_at, now()))
            ELSE cl.fine_assessed
        END
    )
    FROM public.circulation_loans cl
    JOIN public.book_copies bc ON cl.copy_id = bc.copy_id
    JOIN public.books b ON bc.book_id = b.book_id
    JOIN public.users u ON cl.user_id = u.user_id
    LEFT JOIN public.return_requests rr ON rr.loan_id = cl.loan_id AND rr.status = 'Pending'
    WHERE cl.loan_id = p_loan_id
$$;

CREATE OR REPLACE FUNCTION private.return_request_json(p_return_request_id INT) RETURNS JSON LANGUAGE sql STABLE AS $$
    SELECT json_build_object(
        'return_request_id', rr.return_request_id,
        'loan_id', rr.loan_id,
        'copy_id', cl.copy_id,
        'book_id', bc.book_id,
        'title', b.title,
        'author', b.author,
        'barcode', bc.barcode,
        'user_id', u.user_id,
        'user_name', u.full_name,
        'user_enrollment_no', u.enrollment_no,
        'condition_at_issue', cl.condition_at_issue,
        'reported_condition', rr.reported_condition,
        'notes', rr.notes,
        'status', rr.status,
        'created_at', private.iso(rr.created_at),
        'due_date', private.iso(cl.due_date),
        'fine_if_confirmed', private.overdue_fine(cl.due_date, rr.created_at)
    )
    FROM public.return_requests rr
    JOIN public.circulation_loans cl ON rr.loan_id = cl.loan_id
    JOIN public.book_copies bc ON cl.copy_id = bc.copy_id
    JOIN public.books b ON bc.book_id = b.book_id
    JOIN public.users u ON cl.user_id = u.user_id
    WHERE rr.return_request_id = p_return_request_id
$$;

CREATE OR REPLACE FUNCTION private.book_request_json(p_request_id INT) RETURNS JSON LANGUAGE sql STABLE AS $$
    SELECT json_build_object(
        'request_id', br.request_id,
        'user_id', br.user_id,
        'user_name', u.full_name,
        'user_enrollment_no', u.enrollment_no,
        'user_email', u.email,
        'book_id', br.book_id,
        'title', br.title,
        'author', br.author,
        'category', br.category,
        'notes', br.notes,
        'status', br.status,
        'created_at', private.iso(br.created_at),
        'updated_at', private.iso(br.updated_at)
    )
    FROM public.book_requests br
    JOIN public.users u ON br.user_id = u.user_id
    WHERE br.request_id = p_request_id
$$;

-- What the signed-in student has to do with one title: their loan, return request and queue place
CREATE OR REPLACE FUNCTION private.user_context_json(p_book_id INT, p_user_id INT) RETURNS JSON LANGUAGE sql STABLE AS $$
    WITH loan AS (
        SELECT cl.loan_id, bc.barcode, rr.return_request_id
        FROM public.circulation_loans cl
        JOIN public.book_copies bc ON cl.copy_id = bc.copy_id
        LEFT JOIN public.return_requests rr ON rr.loan_id = cl.loan_id AND rr.status = 'Pending'
        WHERE cl.user_id = p_user_id AND bc.book_id = p_book_id AND cl.return_date IS NULL
        LIMIT 1
    ), spot AS (
        SELECT wr.reservation_id, private.queue_position(wr.reservation_id) AS queue_pos
        FROM public.waitlist_reservations wr
        WHERE wr.user_id = p_user_id AND wr.book_id = p_book_id AND wr.status = 'Waiting'
        LIMIT 1
    )
    SELECT json_build_object(
        'has_active_loan', EXISTS (SELECT 1 FROM loan),
        'active_loan_id', (SELECT loan_id FROM loan),
        'active_copy_barcode', (SELECT barcode FROM loan),
        'return_requested', COALESCE((SELECT return_request_id IS NOT NULL FROM loan), false),
        'waitlist_position', (SELECT queue_pos FROM spot),
        'waitlist_reservation_id', (SELECT reservation_id FROM spot)
    )
$$;

-- A title with its counts and copies. Who holds a copy is private: only librarians see it.
CREATE OR REPLACE FUNCTION private.book_json(p_book_id INT, p_viewer_id INT, p_show_borrowers BOOLEAN) RETURNS JSON LANGUAGE sql STABLE AS $$
    SELECT json_build_object(
        'book_id', b.book_id,
        'isbn', b.isbn,
        'title', b.title,
        'author', b.author,
        'category', b.category,
        'published_year', b.published_year,
        'description', b.description,
        'cover_url', b.cover_url,
        'card_tint', b.card_tint,
        'total_copies', (SELECT COUNT(*) FROM public.book_copies bc WHERE bc.book_id = b.book_id),
        'available_copies', (
            SELECT COUNT(*) FROM public.book_copies bc WHERE bc.book_id = b.book_id AND bc.status = 'Available'
        ),
        'waitlist_count', (
            SELECT COUNT(*) FROM public.waitlist_reservations wr WHERE wr.book_id = b.book_id AND wr.status = 'Waiting'
        ),
        'copies', COALESCE((
            SELECT json_agg(json_build_object(
                'copy_id', bc.copy_id,
                'book_id', bc.book_id,
                'barcode', bc.barcode,
                'shelf_location', bc.shelf_location,
                'status', bc.status,
                'condition', bc.condition,
                'current_borrower_name', CASE WHEN p_show_borrowers THEN u.full_name END,
                'current_due_date', private.iso(cl.due_date)
            ) ORDER BY bc.copy_id)
            FROM public.book_copies bc
            LEFT JOIN public.circulation_loans cl ON cl.copy_id = bc.copy_id AND cl.return_date IS NULL
            LEFT JOIN public.users u ON cl.user_id = u.user_id
            WHERE bc.book_id = b.book_id
        ), '[]'::json),
        'user_context', CASE WHEN p_viewer_id IS NULL THEN NULL ELSE private.user_context_json(b.book_id, p_viewer_id) END
    )
    FROM public.books b
    WHERE b.book_id = p_book_id
$$;

-- Each title beside everyone who has borrowed it: active loans first, then past ones
CREATE OR REPLACE FUNCTION private.grouped_books_json(p_search TEXT) RETURNS JSON LANGUAGE sql STABLE AS $$
    WITH pattern AS (
        SELECT '%' || lower(trim(p_search)) || '%' AS p
        WHERE NULLIF(trim(p_search), '') IS NOT NULL
    ), matching AS (
        SELECT b.*
        FROM public.books b
        WHERE NOT EXISTS (SELECT 1 FROM pattern)
           OR EXISTS (
                SELECT 1 FROM pattern
                WHERE lower(b.title) LIKE pattern.p OR lower(b.author) LIKE pattern.p
                   OR lower(b.isbn) LIKE pattern.p OR lower(b.category) LIKE pattern.p
                   OR b.book_id IN (
                        SELECT bc.book_id
                        FROM public.circulation_loans cl
                        JOIN public.book_copies bc ON cl.copy_id = bc.copy_id
                        JOIN public.users u ON cl.user_id = u.user_id
                        WHERE lower(u.full_name) LIKE pattern.p OR lower(u.enrollment_no) LIKE pattern.p
                           OR lower(u.email) LIKE pattern.p OR lower(bc.barcode) LIKE pattern.p
                   )
           )
    )
    SELECT COALESCE(json_agg(json_build_object(
        'book_id', b.book_id,
        'isbn', b.isbn,
        'title', b.title,
        'author', b.author,
        'category', b.category,
        'published_year', b.published_year,
        'cover_url', b.cover_url,
        'card_tint', b.card_tint,
        'total_copies', (SELECT COUNT(*) FROM public.book_copies bc WHERE bc.book_id = b.book_id),
        'available_copies', (SELECT COUNT(*) FROM public.book_copies bc WHERE bc.book_id = b.book_id AND bc.status = 'Available'),
        'active_loans_count', (SELECT COUNT(*) FROM public.book_copies bc WHERE bc.book_id = b.book_id AND bc.status = 'Issued'),
        'waitlist_count', (SELECT COUNT(*) FROM public.waitlist_reservations wr WHERE wr.book_id = b.book_id AND wr.status = 'Waiting'),
        'borrowers', COALESCE((
            SELECT json_agg(json_build_object(
                'loan_id', cl.loan_id,
                'copy_id', cl.copy_id,
                'barcode', bc.barcode,
                'shelf_location', bc.shelf_location,
                'user_id', u.user_id,
                'student_name', u.full_name,
                'student_enrollment_no', u.enrollment_no,
                'student_email', u.email,
                'issue_date', private.iso(cl.issue_date),
                'due_date', private.iso(cl.due_date),
                'return_date', private.iso(cl.return_date),
                'status', CASE WHEN cl.return_date IS NOT NULL THEN 'Returned' WHEN now() > cl.due_date THEN 'Overdue' ELSE 'Active' END,
                'fine_assessed', cl.fine_assessed,
                'accrued_fine', CASE WHEN cl.return_date IS NOT NULL THEN cl.fine_assessed ELSE private.overdue_fine(cl.due_date, now()) END,
                'days_remaining', private.days_until(cl.due_date),
                'condition_at_issue', cl.condition_at_issue,
                'condition_at_return', cl.condition_at_return
            ) ORDER BY (cl.return_date IS NULL) DESC, cl.due_date ASC, cl.issue_date DESC)
            FROM public.circulation_loans cl
            JOIN public.book_copies bc ON cl.copy_id = bc.copy_id
            JOIN public.users u ON cl.user_id = u.user_id
            WHERE bc.book_id = b.book_id
        ), '[]'::json)
    ) ORDER BY b.book_id), '[]'::json)
    FROM matching b
$$;


-- ===========================================================================
-- What the websites can call
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lending_policy() RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT json_build_object(
        'overdue_fine_rate_per_day', private.fine_rate(),
        'loan_duration_days', private.loan_days(),
        'max_loans_per_user', private.member_quota(),
        'max_fine_days', private.max_fine_days(),
        'copy_conditions', to_json(private.copy_conditions())
    )
$$;

-- The signed-in person's library account, or null
CREATE OR REPLACE FUNCTION public.my_profile() RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT private.user_json((private.caller()).user_id)
$$;

-- The seeded student accounts for the sign-in form's quick-select, when demo mode is on.
-- Librarian accounts are never listed.
CREATE OR REPLACE FUNCTION public.demo_accounts() RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT COALESCE(json_agg(json_build_object(
        'enrollment_no', u.enrollment_no,
        'full_name', u.full_name,
        'email', u.email,
        'role', u.role,
        'sample_password', 'member123'
    ) ORDER BY u.enrollment_no), '[]'::json)
    FROM public.users u
    WHERE private.setting('demo_mode') = 'on'
      AND u.role = 'member'
      AND u.enrollment_no = ANY (private.demo_enrollments())
$$;

-- Why a sign-up would be refused, or null if it would be accepted. The sign-up form asks before
-- creating the account, because Supabase Auth would only report a generic error.
CREATE OR REPLACE FUNCTION public.registration_problem(
    p_full_name TEXT,
    p_enrollment_no TEXT,
    p_email TEXT,
    p_staff_code TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_enrollment TEXT := upper(trim(COALESCE(p_enrollment_no, '')));
    v_email TEXT := lower(trim(COALESCE(p_email, '')));
    v_staff_code TEXT := private.setting('staff_signup_code');
BEGIN
    IF trim(COALESCE(p_full_name, '')) = '' OR v_enrollment = '' OR v_email = '' THEN
        RETURN 'Full name, enrollment number, email, and password are all required.';
    END IF;
    IF v_enrollment !~ '^[A-Z0-9-]{3,30}$' THEN
        RETURN 'Enrollment number must be 3 to 30 letters, digits or hyphens.';
    END IF;
    IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
        RETURN 'Please enter a valid email address.';
    END IF;
    -- Nobody can register as a librarian unless a code is set and they know it
    IF p_staff_code IS NOT NULL AND (COALESCE(v_staff_code, '') = '' OR trim(p_staff_code) IS DISTINCT FROM v_staff_code) THEN
        RETURN 'That staff code isn''t valid. Ask the library administrator for the current one.';
    END IF;
    IF EXISTS (SELECT 1 FROM users WHERE upper(enrollment_no) = v_enrollment) THEN
        RETURN format('Enrollment number ''%s'' is already registered. Please sign in instead.', v_enrollment);
    END IF;
    IF EXISTS (SELECT 1 FROM users WHERE lower(email) = v_email) THEN
        RETURN format('Email ''%s'' is already registered. Please sign in instead.', v_email);
    END IF;
    RETURN NULL;
END $$;

-- Runs inside Supabase Auth's sign-up: every new login gets its library account, from the
-- details the sign-up form sent. A refused sign-up creates neither.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    v_enrollment TEXT := upper(trim(COALESCE(v_meta ->> 'enrollment_no', '')));
    v_full_name TEXT := trim(COALESCE(v_meta ->> 'full_name', ''));
    v_staff_code TEXT := v_meta ->> 'staff_code';
    v_problem TEXT := public.registration_problem(v_full_name, v_enrollment, NEW.email, v_staff_code);
    v_is_staff BOOLEAN := v_staff_code IS NOT NULL;
    v_user_id INT;
BEGIN
    IF v_problem IS NOT NULL THEN
        RAISE EXCEPTION '%', v_problem;
    END IF;

    INSERT INTO users (auth_id, enrollment_no, full_name, email, role, max_books_quota)
    VALUES (
        NEW.id, v_enrollment, v_full_name, lower(NEW.email),
        CASE WHEN v_is_staff THEN 'admin' ELSE 'member' END,
        CASE WHEN v_is_staff THEN private.librarian_quota() ELSE private.member_quota() END
    )
    RETURNING user_id INTO v_user_id;

    PERFORM private.log_audit(
        CASE WHEN v_is_staff THEN 'TX_REGISTER_STAFF' ELSE 'TX_REGISTER_STUDENT' END,
        format('New %s registered: %s (%s)', CASE WHEN v_is_staff THEN 'librarian' ELSE 'student patron' END, v_full_name, v_enrollment),
        format('user_id: %s, enrollment_no: %s, email: %s', v_user_id, v_enrollment, lower(NEW.email))
    );
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ---------------------------------------------------------------------------
-- The catalogue. Anyone can browse it, signed in or not.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_books(
    p_search TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_availability TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    WITH viewer AS (
        SELECT user_id, role FROM private.caller()
    ), pattern AS (
        SELECT '%' || lower(trim(p_search)) || '%' AS p
        WHERE NULLIF(trim(p_search), '') IS NOT NULL
    ), matching AS (
        SELECT
            b.book_id,
            (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.book_id AND bc.status = 'Available') AS available
        FROM books b
        WHERE (NULLIF(trim(p_category), '') IS NULL OR lower(p_category) = 'all' OR lower(b.category) = lower(p_category))
          AND (
                NOT EXISTS (SELECT 1 FROM pattern)
                OR EXISTS (
                    SELECT 1 FROM pattern
                    WHERE lower(b.title) LIKE pattern.p OR lower(b.author) LIKE pattern.p OR lower(b.isbn) LIKE pattern.p
                       OR b.book_id IN (
                            SELECT bc.book_id FROM book_copies bc
                            WHERE lower(bc.shelf_location) LIKE pattern.p OR lower(bc.barcode) LIKE pattern.p
                       )
                )
          )
    )
    SELECT COALESCE(json_agg(
        private.book_json(m.book_id, (SELECT user_id FROM viewer), COALESCE((SELECT role = 'admin' FROM viewer), false))
        ORDER BY m.book_id
    ), '[]'::json)
    FROM matching m
    WHERE NOT (lower(COALESCE(p_availability, '')) = 'available' AND m.available = 0)
      AND NOT (lower(COALESCE(p_availability, '')) = 'waitlist' AND m.available > 0)
$$;

-- A title in full, with its copies and its queue. Who is waiting is private: others see only
-- the positions.
CREATE OR REPLACE FUNCTION public.get_book(p_book_id INT) RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_viewer users := private.caller();
    v_is_admin BOOLEAN := COALESCE(v_viewer.role = 'admin', false);
    v_book JSON := private.book_json(p_book_id, v_viewer.user_id, v_is_admin);
BEGIN
    IF v_book IS NULL THEN
        RAISE EXCEPTION 'Book not found';
    END IF;

    RETURN (v_book::jsonb || jsonb_build_object('waitlist_entries', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
            'reservation_id', wr.reservation_id,
            'user_id', CASE WHEN v_is_admin OR wr.user_id = v_viewer.user_id THEN wr.user_id END,
            'user_name', CASE WHEN v_is_admin OR wr.user_id = v_viewer.user_id THEN u.full_name END,
            'queue_position', private.queue_position(wr.reservation_id),
            'created_at', private.iso(wr.created_at)
        ) ORDER BY wr.created_at, wr.reservation_id)
        FROM waitlist_reservations wr
        JOIN users u ON u.user_id = wr.user_id
        WHERE wr.book_id = p_book_id AND wr.status = 'Waiting'
    ), '[]'::jsonb)))::json;
END $$;

CREATE OR REPLACE FUNCTION public.create_book(
    p_isbn TEXT,
    p_title TEXT,
    p_author TEXT,
    p_category TEXT,
    p_published_year INT,
    p_cover_url TEXT,
    p_description TEXT DEFAULT '',
    p_card_tint TEXT DEFAULT 'indigo',
    p_initial_copies_count INT DEFAULT 1,
    p_shelf_location TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_caller users := private.require_librarian();
    v_book_id INT;
    v_count INT := GREATEST(1, COALESCE(p_initial_copies_count, 1));
    v_shelf TEXT := COALESCE(NULLIF(trim(p_shelf_location), ''), 'Floor 2 • Aisle 4A');
BEGIN
    IF EXISTS (SELECT 1 FROM books WHERE isbn = trim(p_isbn)) THEN
        RAISE EXCEPTION 'Book with ISBN % already exists', trim(p_isbn);
    END IF;

    INSERT INTO books (isbn, title, author, category, published_year, description, cover_url, card_tint)
    VALUES (trim(p_isbn), trim(p_title), trim(p_author), trim(p_category), p_published_year,
            COALESCE(trim(p_description), ''), trim(p_cover_url), COALESCE(p_card_tint, 'indigo'))
    RETURNING book_id INTO v_book_id;

    -- Each copy gets its own code: BB-, the category's first three letters, the book, then A, B, C...
    INSERT INTO book_copies (book_id, barcode, shelf_location, status, condition)
    SELECT v_book_id,
           format('BB-%s-%s%s', upper(left(p_category, 3)), lpad(v_book_id::text, 3, '0'), chr(65 + i)),
           v_shelf, 'Available', 'Good'
    FROM generate_series(0, v_count - 1) AS i;

    PERFORM private.log_audit(
        'TX_ADD_BOOK',
        format('INSERT INTO books (book_id=%s, title=''%s''); INSERT INTO book_copies (%s physical copies);', v_book_id, p_title, v_count),
        format('book_id: %s, isbn: %s, copies_added: %s', v_book_id, p_isbn, v_count)
    );
    RETURN json_build_object('message', 'Book and copies successfully created', 'book_id', v_book_id);
END $$;


-- ---------------------------------------------------------------------------
-- Circulation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.checkout_book(
    p_book_id INT,
    p_barcode TEXT DEFAULT NULL,
    p_kiosk_key TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_caller users := private.require_member();
    v_user users;
    v_active INT;
    v_copy book_copies;
    v_code TEXT := upper(trim(COALESCE(p_barcode, '')));
    v_loan_id INT;
    v_due TIMESTAMPTZ := now() + make_interval(days => private.loan_days());
BEGIN
    PERFORM private.require_kiosk(v_caller, p_kiosk_key);
    PERFORM private.lock_book(p_book_id);

    -- Locked so two checkouts of different titles can't both pass the quota check
    SELECT * INTO v_user FROM users WHERE user_id = v_caller.user_id FOR NO KEY UPDATE;
    IF v_user.outstanding_fines > private.fine_block_limit() THEN
        RAISE EXCEPTION 'Borrowing blocked: Outstanding fines of ₹% exceed ₹% limit.',
            private.money(v_user.outstanding_fines), private.money(private.fine_block_limit());
    END IF;

    SELECT COUNT(*) INTO v_active FROM circulation_loans WHERE user_id = v_user.user_id AND return_date IS NULL;
    IF v_active >= v_user.max_books_quota THEN
        RAISE EXCEPTION 'Quota reached: You already have % of % allowed loans.', v_active, v_user.max_books_quota;
    END IF;

    IF EXISTS (
        SELECT 1 FROM circulation_loans cl JOIN book_copies bc ON cl.copy_id = bc.copy_id
        WHERE cl.user_id = v_user.user_id AND bc.book_id = p_book_id AND cl.return_date IS NULL
    ) THEN
        RAISE EXCEPTION 'You already have an active borrowed copy of this book.';
    END IF;

    -- The physical copy the student is holding, by the code on its label
    IF v_code <> '' THEN
        SELECT * INTO v_copy FROM book_copies WHERE upper(barcode) = v_code;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'No copy has the code %. Check the label on the book.', v_code;
        END IF;
        IF v_copy.book_id <> p_book_id THEN
            RAISE EXCEPTION 'Code % belongs to a different book. Check the label on the book.', v_code;
        END IF;
        IF v_copy.status <> 'Available' THEN
            RAISE EXCEPTION 'Copy % isn''t available to borrow. Its status is %.', v_copy.barcode, v_copy.status;
        END IF;
    ELSE
        SELECT * INTO v_copy FROM book_copies WHERE book_id = p_book_id AND status = 'Available' ORDER BY copy_id LIMIT 1;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'No physical copies available right now. Please join the FIFO Waitlist queue.';
        END IF;
    END IF;

    INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, issued_via, condition_at_issue)
    VALUES (v_copy.copy_id, v_user.user_id, now(), v_due, 'Direct Checkout', v_copy.condition)
    RETURNING loan_id INTO v_loan_id;

    UPDATE book_copies SET status = 'Issued' WHERE copy_id = v_copy.copy_id;

    -- Clean up any waiting reservation this student had for this book
    UPDATE waitlist_reservations SET status = 'Fulfilled', fulfilled_at = now()
    WHERE book_id = p_book_id AND user_id = v_user.user_id AND status = 'Waiting';

    PERFORM private.log_audit(
        'TX_CHECKOUT',
        format('SELECT book_id FROM books WHERE book_id=%s FOR UPDATE; INSERT INTO circulation_loans (loan_id=%s, user_id=%s, copy_id=%s, due=''%s''); UPDATE book_copies SET status=''Issued'' WHERE copy_id=%s;',
               p_book_id, v_loan_id, v_user.user_id, v_copy.copy_id, left(private.iso(v_due), 10), v_copy.copy_id),
        format('user_id: %s, book_id: %s, copy_id: %s, barcode: %s, condition: %s, loan_id: %s',
               v_user.user_id, p_book_id, v_copy.copy_id, v_copy.barcode, v_copy.condition, v_loan_id)
    );

    RETURN json_build_object(
        'success', true,
        'loan_id', v_loan_id,
        'book_id', p_book_id,
        'copy_id', v_copy.copy_id,
        'barcode', v_copy.barcode,
        'due_date', private.iso(v_due),
        'issued_via', 'Direct Checkout',
        'message', format('Book checked out! Copy %s is due back on %s.', v_copy.barcode, left(private.iso(v_due), 10))
    );
END $$;

CREATE OR REPLACE FUNCTION public.join_waitlist(p_book_id INT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_caller users := private.require_member();
    v_available INT;
    v_reservation_id INT;
    v_position INT;
BEGIN
    PERFORM private.lock_book(p_book_id);
    IF NOT EXISTS (SELECT 1 FROM books WHERE book_id = p_book_id) THEN
        RAISE EXCEPTION 'Book not found';
    END IF;

    SELECT COUNT(*) INTO v_available FROM book_copies WHERE book_id = p_book_id AND status = 'Available';
    IF v_available > 0 THEN
        RAISE EXCEPTION 'There are % physical copies available right now! You can borrow directly instead of joining the waitlist.', v_available;
    END IF;

    IF EXISTS (
        SELECT 1 FROM circulation_loans cl JOIN book_copies bc ON cl.copy_id = bc.copy_id
        WHERE cl.user_id = v_caller.user_id AND bc.book_id = p_book_id AND cl.return_date IS NULL
    ) THEN
        RAISE EXCEPTION 'You already have an active loan for this book.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM waitlist_reservations WHERE book_id = p_book_id AND user_id = v_caller.user_id AND status = 'Waiting'
    ) THEN
        RAISE EXCEPTION 'You are already in the waitlist queue for this book.';
    END IF;

    INSERT INTO waitlist_reservations (book_id, user_id, status)
    VALUES (p_book_id, v_caller.user_id, 'Waiting')
    RETURNING reservation_id INTO v_reservation_id;
    v_position := private.queue_position(v_reservation_id);

    PERFORM private.log_audit(
        'TX_WAITLIST_JOIN',
        format('INSERT INTO waitlist_reservations (reservation_id=%s, book_id=%s, user_id=%s, status=''Waiting''); SELECT COUNT(*) as queue_position FROM waitlist_reservations WHERE book_id=%s AND status=''Waiting'';',
               v_reservation_id, p_book_id, v_caller.user_id, p_book_id),
        format('user_id: %s, book_id: %s, reservation_id: %s, queue_position: #%s', v_caller.user_id, p_book_id, v_reservation_id, v_position)
    );

    RETURN json_build_object(
        'success', true,
        'reservation_id', v_reservation_id,
        'book_id', p_book_id,
        'user_id', v_caller.user_id,
        'queue_position', v_position,
        'status', 'Waiting',
        'message', format('Joined waitlist! You are Queue #%s. The next returned copy will be automatically assigned to you when you reach #1.', v_position)
    );
END $$;

CREATE OR REPLACE FUNCTION public.cancel_reservation(p_reservation_id INT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_caller users := private.require_member();
    v_reservation waitlist_reservations;
BEGIN
    SELECT * INTO v_reservation FROM waitlist_reservations WHERE reservation_id = p_reservation_id;
    IF FOUND THEN
        -- Read again under the lock: a return may have just handed this patron the copy
        PERFORM private.lock_book(v_reservation.book_id);
        SELECT * INTO v_reservation FROM waitlist_reservations WHERE reservation_id = p_reservation_id;
    END IF;
    IF v_reservation.reservation_id IS NULL OR v_reservation.status <> 'Waiting' THEN
        RAISE EXCEPTION 'Active reservation not found';
    END IF;
    PERFORM private.require_self_or_librarian(v_caller, v_reservation.user_id);

    UPDATE waitlist_reservations SET status = 'Cancelled' WHERE reservation_id = p_reservation_id;

    PERFORM private.log_audit(
        'TX_WAITLIST_CANCEL',
        format('UPDATE waitlist_reservations SET status=''Cancelled'' WHERE reservation_id=%s;', p_reservation_id),
        format('reservation_id: %s, book_id: %s, user_id: %s', p_reservation_id, v_reservation.book_id, v_reservation.user_id)
    );
    RETURN json_build_object('success', true, 'message', 'Reservation cancelled successfully');
END $$;

-- A student asks to return a loan at the kiosk, typing the code from the book's label so the
-- right physical copy is on record. Nothing is returned yet: a librarian reviews the request.
CREATE OR REPLACE FUNCTION public.raise_return_request(
    p_loan_id INT,
    p_barcode TEXT,
    p_condition TEXT,
    p_notes TEXT DEFAULT NULL,
    p_kiosk_key TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_caller users := private.require_member();
    v_condition TEXT;
    v_loan RECORD;
    v_code TEXT := upper(trim(COALESCE(p_barcode, '')));
    v_return_request_id INT;
BEGIN
    PERFORM private.require_kiosk(v_caller, p_kiosk_key);
    v_condition := private.valid_condition(p_condition);

    -- Locking the loan stops two requests for it being raised at once
    SELECT cl.loan_id, cl.user_id, cl.copy_id, bc.barcode, b.title, rr.return_request_id
    INTO v_loan
    FROM circulation_loans cl
    JOIN book_copies bc ON cl.copy_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id
    LEFT JOIN return_requests rr ON rr.loan_id = cl.loan_id AND rr.status = 'Pending'
    WHERE cl.loan_id = p_loan_id AND cl.return_date IS NULL
    FOR UPDATE OF cl;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active loan record not found for this book copy.';
    END IF;
    PERFORM private.require_self_or_librarian(v_caller, v_loan.user_id);

    IF v_code IS DISTINCT FROM upper(v_loan.barcode) THEN
        RAISE EXCEPTION 'Code % isn''t the copy issued on this loan. Check the label on the book you''re returning.', v_code;
    END IF;
    IF v_loan.return_request_id IS NOT NULL THEN
        RAISE EXCEPTION 'A return request for this book is already waiting for a librarian.';
    END IF;

    INSERT INTO return_requests (loan_id, reported_condition, notes, status)
    VALUES (p_loan_id, v_condition, NULLIF(trim(COALESCE(p_notes, '')), ''), 'Pending')
    RETURNING return_request_id INTO v_return_request_id;

    PERFORM private.log_audit(
        'TX_RETURN_REQUEST',
        format('INSERT INTO return_requests (return_request_id=%s, loan_id=%s, reported_condition=''%s'', status=''Pending'');',
               v_return_request_id, p_loan_id, v_condition),
        format('user_id: %s, loan_id: %s, copy_id: %s, barcode: %s, reported_condition: %s',
               v_loan.user_id, p_loan_id, v_loan.copy_id, v_loan.barcode, v_condition)
    );

    RETURN json_build_object(
        'success', true,
        'return_request_id', v_return_request_id,
        'message', format('Return requested for ''%s'' (Copy %s). A librarian will confirm it.', v_loan.title, v_loan.barcode)
    );
END $$;

-- A return request still waiting for a librarian, with what confirming it needs
CREATE OR REPLACE FUNCTION private.pending_return(p_return_request_id INT)
RETURNS TABLE (
    return_request_id INT, loan_id INT, created_at TIMESTAMPTZ, copy_id INT, user_id INT,
    due_date TIMESTAMPTZ, book_id INT, barcode TEXT, title TEXT, user_name TEXT
) LANGUAGE sql STABLE AS $$
    SELECT rr.return_request_id, rr.loan_id, rr.created_at, cl.copy_id, cl.user_id,
           cl.due_date, bc.book_id, bc.barcode, b.title, u.full_name
    FROM public.return_requests rr
    JOIN public.circulation_loans cl ON rr.loan_id = cl.loan_id
    JOIN public.book_copies bc ON cl.copy_id = bc.copy_id
    JOIN public.books b ON bc.book_id = b.book_id
    JOIN public.users u ON cl.user_id = u.user_id
    WHERE rr.return_request_id = p_return_request_id AND rr.status = 'Pending'
$$;

-- CRITICAL WAITLIST HANDOFF & AUTO-ASSIGNMENT ENGINE. The fine stops at the moment the student
-- raised the request. If a patron is waiting, the copy goes straight to them. Otherwise it goes
-- back on the shelf.
CREATE OR REPLACE FUNCTION public.confirm_return_request(p_return_request_id INT, p_condition TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_caller users := private.require_librarian();
    v_condition TEXT := private.valid_condition(p_condition);
    v_request RECORD;
    v_fine NUMERIC;
    v_next RECORD;
    v_new_loan_id INT;
    v_new_due TIMESTAMPTZ;
BEGIN
    -- Read before and again after locking the book: another librarian may have just resolved it
    SELECT * INTO v_request FROM private.pending_return(p_return_request_id);
    IF NOT FOUND THEN
        RAISE EXCEPTION 'This return request is no longer waiting for a librarian.';
    END IF;
    PERFORM private.lock_book(v_request.book_id);
    SELECT * INTO v_request FROM private.pending_return(p_return_request_id);
    IF NOT FOUND THEN
        RAISE EXCEPTION 'This return request is no longer waiting for a librarian.';
    END IF;

    v_fine := private.overdue_fine(v_request.due_date, v_request.created_at);

    UPDATE circulation_loans
    SET return_date = v_request.created_at, fine_assessed = v_fine, condition_at_return = v_condition
    WHERE loan_id = v_request.loan_id;
    UPDATE return_requests
    SET status = 'Completed', resolved_at = now(), resolved_by = v_caller.user_id
    WHERE return_request_id = p_return_request_id;
    UPDATE book_copies SET condition = v_condition WHERE copy_id = v_request.copy_id;
    IF v_fine > 0 THEN
        UPDATE users SET outstanding_fines = outstanding_fines + v_fine WHERE user_id = v_request.user_id;
    END IF;

    -- Strict FIFO: the oldest waiting reservation for this book
    SELECT wr.reservation_id, wr.user_id, u.full_name, u.email
    INTO v_next
    FROM waitlist_reservations wr
    JOIN users u ON wr.user_id = u.user_id
    WHERE wr.book_id = v_request.book_id AND wr.status = 'Waiting'
    ORDER BY wr.created_at ASC, wr.reservation_id ASC
    LIMIT 1;

    IF FOUND THEN
        -- The copy never touches the shelf: it goes straight to the #1 waiting patron
        UPDATE waitlist_reservations SET status = 'Fulfilled', fulfilled_at = now()
        WHERE reservation_id = v_next.reservation_id;
        v_new_due := now() + make_interval(days => private.loan_days());
        INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, issued_via, condition_at_issue)
        VALUES (v_request.copy_id, v_next.user_id, now(), v_new_due, 'Waitlist Auto-Fulfill', v_condition)
        RETURNING loan_id INTO v_new_loan_id;

        PERFORM private.log_audit(
            'TRIGGER_WAITLIST_AUTO_CHECKOUT',
            format(E'-- [FIFO Promotion Trigger Fired]\nUPDATE circulation_loans SET return_date=''%s'' WHERE loan_id=%s;\nUPDATE waitlist_reservations SET status=''Fulfilled'', fulfilled_at=''%s'' WHERE reservation_id=%s;\nINSERT INTO circulation_loans (loan_id=%s, copy_id=%s, user_id=%s, issued_via=''Waitlist Auto-Fulfill'', due=''%s'');\n-- Copy %s bypassed shelf and auto-assigned to Queue #1 (%s)',
                   private.iso(v_request.created_at), v_request.loan_id, private.iso(now()), v_next.reservation_id,
                   v_new_loan_id, v_request.copy_id, v_next.user_id, left(private.iso(v_new_due), 10), v_request.barcode, v_next.full_name),
            format('returned_by: %s (uid:%s), auto_assigned_to: %s (uid:%s), book: ''%s'', barcode: %s, new_loan_id: %s, fine: ₹%s',
                   v_request.user_name, v_request.user_id, v_next.full_name, v_next.user_id, v_request.title,
                   v_request.barcode, v_new_loan_id, private.money(v_fine))
        );

        RETURN json_build_object(
            'success', true,
            'status', 'AUTO_ASSIGNED_TO_WAITLIST',
            'message', format('''%s'' (Copy %s) returned by %s. ⚡ FIFO AUTO-ASSIGNED to #1 waitlisted patron: %s (%s)! Copy remains issued and loan #%s is active.',
                              v_request.title, v_request.barcode, v_request.user_name, v_next.full_name, v_next.email, v_new_loan_id),
            'fine_assessed', v_fine,
            'loan_id', v_request.loan_id,
            'copy_id', v_request.copy_id,
            'book_id', v_request.book_id,
            'new_loan_id', v_new_loan_id,
            'next_user', json_build_object('user_id', v_next.user_id, 'full_name', v_next.full_name, 'email', v_next.email)
        );
    END IF;

    UPDATE book_copies SET status = 'Available' WHERE copy_id = v_request.copy_id;

    PERFORM private.log_audit(
        'TX_RETURN_TO_SHELF',
        format(E'UPDATE circulation_loans SET return_date=''%s'', fine_assessed=%s WHERE loan_id=%s;\nUPDATE book_copies SET status=''Available'' WHERE copy_id=%s;',
               private.iso(v_request.created_at), v_fine, v_request.loan_id, v_request.copy_id),
        format('returned_by: %s (uid:%s), copy_id: %s, barcode: %s, fine: ₹%s, status: Available on shelf',
               v_request.user_name, v_request.user_id, v_request.copy_id, v_request.barcode, private.money(v_fine))
    );

    RETURN json_build_object(
        'success', true,
        'status', 'RETURNED_TO_SHELF',
        'message', format('''%s'' (Copy %s) successfully returned to shelf by %s. Status updated to Available.',
                          v_request.title, v_request.barcode, v_request.user_name),
        'fine_assessed', v_fine,
        'loan_id', v_request.loan_id,
        'copy_id', v_request.copy_id,
        'book_id', v_request.book_id,
        'new_loan_id', NULL,
        'next_user', NULL
    );
END $$;

-- For a request raised without the book being handed in. The loan stays active.
CREATE OR REPLACE FUNCTION public.reject_return_request(p_return_request_id INT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_caller users := private.require_librarian();
    v_request RECORD;
BEGIN
    SELECT rr.return_request_id, rr.loan_id, bc.book_id, bc.barcode, b.title, u.full_name AS user_name
    INTO v_request
    FROM return_requests rr
    JOIN circulation_loans cl ON rr.loan_id = cl.loan_id
    JOIN book_copies bc ON cl.copy_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id
    JOIN users u ON cl.user_id = u.user_id
    WHERE rr.return_request_id = p_return_request_id AND rr.status = 'Pending';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'This return request is no longer waiting for a librarian.';
    END IF;

    PERFORM private.lock_book(v_request.book_id);
    UPDATE return_requests
    SET status = 'Rejected', resolved_at = now(), resolved_by = v_caller.user_id
    WHERE return_request_id = p_return_request_id AND status = 'Pending';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'This return request is no longer waiting for a librarian.';
    END IF;

    PERFORM private.log_audit(
        'TX_RETURN_REQUEST_REJECTED',
        format('UPDATE return_requests SET status=''Rejected'' WHERE return_request_id=%s;', p_return_request_id),
        format('return_request_id: %s, loan_id: %s, barcode: %s, resolved_by: %s',
               p_return_request_id, v_request.loan_id, v_request.barcode, v_caller.user_id)
    );
    RETURN json_build_object(
        'success', true,
        'message', format('Return request for ''%s'' rejected. The loan stays with %s.', v_request.title, v_request.user_name)
    );
END $$;


-- ---------------------------------------------------------------------------
-- A student's shelf
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_dashboard(p_user_id INT DEFAULT NULL) RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_caller users := private.require_member();
    v_user_id INT := COALESCE(p_user_id, v_caller.user_id);
BEGIN
    PERFORM private.require_self_or_librarian(v_caller, v_user_id);
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = v_user_id) THEN
        RAISE EXCEPTION 'Patron not found';
    END IF;

    RETURN json_build_object(
        'user', private.user_json(v_user_id),
        'active_loans', COALESCE((
            SELECT json_agg(private.loan_json(cl.loan_id) ORDER BY cl.due_date)
            FROM circulation_loans cl
            WHERE cl.user_id = v_user_id AND cl.return_date IS NULL
        ), '[]'::json),
        'loan_history', COALESCE((
            SELECT json_agg(private.loan_json(h.loan_id) ORDER BY h.return_date DESC)
            FROM (
                SELECT loan_id, return_date FROM circulation_loans
                WHERE user_id = v_user_id AND return_date IS NOT NULL
                ORDER BY return_date DESC
                LIMIT 20
            ) h
        ), '[]'::json),
        'active_waitlists', COALESCE((
            SELECT json_agg(json_build_object(
                'reservation_id', wr.reservation_id,
                'book_id', wr.book_id,
                'title', b.title,
                'author', b.author,
                'isbn', b.isbn,
                'cover_url', b.cover_url,
                'card_tint', b.card_tint,
                'queue_position', private.queue_position(wr.reservation_id),
                'total_waiting', (
                    SELECT COUNT(*) FROM waitlist_reservations w3 WHERE w3.book_id = wr.book_id AND w3.status = 'Waiting'
                ),
                'created_at', private.iso(wr.created_at)
            ) ORDER BY wr.created_at)
            FROM waitlist_reservations wr
            JOIN books b ON wr.book_id = b.book_id
            WHERE wr.user_id = v_user_id AND wr.status = 'Waiting'
        ), '[]'::json),
        'book_requests', COALESCE((
            SELECT json_agg(private.book_request_json(br.request_id) ORDER BY br.created_at DESC)
            FROM book_requests br
            WHERE br.user_id = v_user_id
        ), '[]'::json)
    );
END $$;


-- ---------------------------------------------------------------------------
-- Book requests
-- ---------------------------------------------------------------------------

-- Students see their own requests. Librarians see everyone's.
CREATE OR REPLACE FUNCTION public.list_book_requests() RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_caller users := private.require_member();
BEGIN
    RETURN COALESCE((
        SELECT json_agg(private.book_request_json(br.request_id) ORDER BY br.created_at DESC)
        FROM book_requests br
        WHERE v_caller.role = 'admin' OR br.user_id = v_caller.user_id
    ), '[]'::json);
END $$;

CREATE OR REPLACE FUNCTION public.create_book_request(
    p_title TEXT,
    p_author TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_book_id INT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_caller users := private.require_member();
    v_request_id INT;
BEGIN
    IF trim(COALESCE(p_title, '')) = '' THEN
        RAISE EXCEPTION 'Please give the title of the book you want.';
    END IF;

    INSERT INTO book_requests (user_id, book_id, title, author, category, notes, status)
    VALUES (
        v_caller.user_id, p_book_id, trim(p_title),
        NULLIF(trim(COALESCE(p_author, '')), ''),
        COALESCE(NULLIF(trim(COALESCE(p_category, '')), ''), 'Core Computer Science'),
        NULLIF(trim(COALESCE(p_notes, '')), ''),
        'Pending'
    )
    RETURNING request_id INTO v_request_id;

    PERFORM private.log_audit(
        'TX_BOOK_REQUEST',
        format('Student %s submitted procurement request for ''%s''', v_caller.full_name, trim(p_title)),
        format('request_id: %s, user_id: %s, title: %s', v_request_id, v_caller.user_id, trim(p_title))
    );
    RETURN private.book_request_json(v_request_id);
END $$;

CREATE OR REPLACE FUNCTION public.update_book_request_status(p_request_id INT, p_status TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_caller users := private.require_librarian();
BEGIN
    IF p_status IS NULL OR p_status NOT IN ('Pending', 'Approved', 'Procured', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid status ''%''. Must be one of: Pending, Approved, Procured, Rejected', p_status;
    END IF;

    UPDATE book_requests SET status = p_status, updated_at = now() WHERE request_id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book request not found';
    END IF;

    PERFORM private.log_audit(
        'TX_UPDATE_REQUEST',
        format('Librarian updated book request #%s to ''%s''', p_request_id, p_status),
        format('request_id: %s, status: %s', p_request_id, p_status)
    );
    RETURN private.book_request_json(p_request_id);
END $$;


-- ---------------------------------------------------------------------------
-- The librarian console
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.grouped_books(p_search TEXT DEFAULT NULL) RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    PERFORM private.require_librarian();
    RETURN private.grouped_books_json(p_search);
END $$;

CREATE OR REPLACE FUNCTION public.admin_overview() RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    PERFORM private.require_librarian();

    RETURN json_build_object(
        'kpis', json_build_object(
            'total_titles', (SELECT COUNT(*) FROM books),
            'physical_copies', (SELECT COUNT(*) FROM book_copies),
            'available_copies', (SELECT COUNT(*) FROM book_copies WHERE status = 'Available'),
            'active_loans', (SELECT COUNT(*) FROM circulation_loans WHERE return_date IS NULL),
            'waitlist_queue_depth', (SELECT COUNT(*) FROM waitlist_reservations WHERE status = 'Waiting'),
            'total_fines', (SELECT COALESCE(SUM(outstanding_fines), 0) FROM users),
            'pending_requests_count', (SELECT COUNT(*) FROM book_requests WHERE status = 'Pending'),
            'pending_returns_count', (SELECT COUNT(*) FROM return_requests WHERE status = 'Pending')
        ),
        'active_loans', COALESCE((
            SELECT json_agg(private.loan_json(cl.loan_id) ORDER BY cl.due_date)
            FROM circulation_loans cl WHERE cl.return_date IS NULL
        ), '[]'::json),
        'waitlist_queue', COALESCE((
            SELECT json_agg(json_build_object(
                'reservation_id', wr.reservation_id,
                'book_id', wr.book_id,
                'book_title', b.title,
                'user_id', wr.user_id,
                'user_name', u.full_name,
                'user_email', u.email,
                'user_enrollment_no', u.enrollment_no,
                'queue_position', private.queue_position(wr.reservation_id),
                'status', wr.status,
                'created_at', private.iso(wr.created_at),
                'fulfilled_at', private.iso(wr.fulfilled_at)
            ) ORDER BY wr.book_id, wr.created_at)
            FROM waitlist_reservations wr
            JOIN books b ON wr.book_id = b.book_id
            JOIN users u ON wr.user_id = u.user_id
            WHERE wr.status = 'Waiting'
        ), '[]'::json),
        -- Only what students have actively raised and nobody has resolved yet
        'return_requests', COALESCE((
            SELECT json_agg(private.return_request_json(rr.return_request_id) ORDER BY rr.created_at)
            FROM return_requests rr WHERE rr.status = 'Pending'
        ), '[]'::json),
        'book_requests', COALESCE((
            SELECT json_agg(private.book_request_json(br.request_id) ORDER BY br.created_at DESC)
            FROM book_requests br
        ), '[]'::json),
        'grouped_books', private.grouped_books_json(NULL),
        -- Every student, plus anyone else with a balance, so the ledger adds up to total_fines
        'student_fines', COALESCE((
            SELECT json_agg(json_build_object(
                'user_id', u.user_id,
                'full_name', u.full_name,
                'enrollment_no', u.enrollment_no,
                'email', u.email,
                'outstanding_fines', u.outstanding_fines
            ) ORDER BY u.outstanding_fines DESC, u.full_name ASC)
            FROM users u WHERE u.role = 'member' OR u.outstanding_fines > 0
        ), '[]'::json),
        'recent_audit_logs', COALESCE((
            SELECT json_agg(json_build_object(
                'log_id', l.log_id,
                'operation_type', l.operation_type,
                'sql_summary', l.sql_summary,
                'affected_entities', l.affected_entities,
                'created_at', private.iso(l.created_at)
            ) ORDER BY l.log_id DESC)
            FROM (SELECT * FROM db_audit_logs ORDER BY log_id DESC LIMIT 30) l
        ), '[]'::json)
    );
END $$;

-- Records a fine payment. Without an amount, clears the whole balance.
CREATE OR REPLACE FUNCTION public.settle_fine(p_user_id INT, p_amount NUMERIC DEFAULT NULL) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_caller users := private.require_librarian();
    v_user users;
    v_settled NUMERIC;
    v_remaining NUMERIC;
BEGIN
    IF p_amount IS NOT NULL AND (p_amount = 'NaN'::numeric OR p_amount <= 0) THEN
        RAISE EXCEPTION 'Settlement amount must be greater than zero.';
    END IF;

    -- Locked so a fine charged at the same moment isn't overwritten
    SELECT * INTO v_user FROM users WHERE user_id = p_user_id FOR NO KEY UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student patron not found';
    END IF;

    v_settled := CASE WHEN p_amount IS NOT NULL AND p_amount <= v_user.outstanding_fines THEN p_amount ELSE v_user.outstanding_fines END;
    v_remaining := GREATEST(0, round(v_user.outstanding_fines - v_settled, 2));
    UPDATE users SET outstanding_fines = v_remaining WHERE user_id = p_user_id;

    PERFORM private.log_audit(
        'TX_SETTLE_FINE',
        format('Librarian collected/settled fine of ₹%s for %s (%s)', private.money(v_settled), v_user.full_name, v_user.enrollment_no),
        format('user_id: %s, amount_settled: %s, remaining_fine: %s', p_user_id, v_settled, v_remaining)
    );
    RETURN json_build_object(
        'success', true,
        'message', format('Successfully settled ₹%s for %s (%s). Remaining fine: ₹%s',
                          private.money(v_settled), v_user.full_name, v_user.enrollment_no, private.money(v_remaining)),
        'user_id', p_user_id,
        'outstanding_fines', v_remaining
    );
END $$;

-- Puts the library back to the demo state. Accounts are kept: they belong to Supabase Auth.
CREATE OR REPLACE FUNCTION public.reset_library() RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    PERFORM private.require_librarian();
    PERFORM private.seed_library();
    RETURN json_build_object('success', true, 'message', 'BookBase library data reset to the demo state. Accounts were kept.');
END $$;


-- ---------------------------------------------------------------------------
-- Who may call what. Postgres lets everyone run a new function, and Supabase also grants its
-- browser roles every function, so take all of that back, then allow only these.
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;

-- Signed in or not
GRANT EXECUTE ON FUNCTION
    public.lending_policy(),
    public.demo_accounts(),
    public.registration_problem(TEXT, TEXT, TEXT, TEXT),
    public.list_books(TEXT, TEXT, TEXT),
    public.get_book(INT),
    public.my_profile()
TO anon, authenticated;

-- Signed in. Each function checks the caller's role and ownership itself.
GRANT EXECUTE ON FUNCTION
    public.checkout_book(INT, TEXT, TEXT),
    public.join_waitlist(INT),
    public.cancel_reservation(INT),
    public.raise_return_request(INT, TEXT, TEXT, TEXT, TEXT),
    public.confirm_return_request(INT, TEXT),
    public.reject_return_request(INT),
    public.user_dashboard(INT),
    public.list_book_requests(),
    public.create_book_request(TEXT, TEXT, TEXT, TEXT, INT),
    public.update_book_request_status(INT, TEXT),
    public.create_book(TEXT, TEXT, TEXT, TEXT, INT, TEXT, TEXT, TEXT, INT, TEXT),
    public.grouped_books(TEXT),
    public.admin_overview(),
    public.settle_fine(INT, NUMERIC),
    public.reset_library()
TO authenticated;
