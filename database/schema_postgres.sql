-- ============================================================================
-- BOOKBASE: SMART RELATIONAL LIBRARY MANAGEMENT SYSTEM
-- Relational Database Schema (3NF) & Procedural SQL Engine
-- Target DBMS: PostgreSQL 14+ / 15+ / 16+
-- ============================================================================
-- Academic Note on Normalization & ACID Properties:
-- 1. First Normal Form (1NF): All attributes are atomic. No multi-valued attributes.
-- 2. Second Normal Form (2NF): In 1NF and all non-key attributes are fully
--    functionally dependent on the primary key (no partial dependencies).
-- 3. Third Normal Form (3NF): In 2NF and no transitive functional dependencies exist.
--    Crucially, 'available_copies' is NOT stored as a static column on 'books';
--    it is dynamically derived from COUNT(copy_id) WHERE status = 'Available'.
-- 4. ACID Concurrency: Strict row-level locking (SELECT ... FOR UPDATE) prevents
--    double-booking during concurrent checkouts. Returns automatically promote the
--    oldest FIFO waitlisted member (#1) to an active loan within the same transaction.
-- ============================================================================

-- Drop existing tables if re-initializing
DROP TRIGGER IF EXISTS trg_prevent_excessive_loans ON circulation_loans;
DROP FUNCTION IF EXISTS fn_check_user_quota();
DROP PROCEDURE IF EXISTS sp_checkout_book(INTEGER, INTEGER, INTEGER, OUT INTEGER, OUT INTEGER, OUT VARCHAR);
DROP PROCEDURE IF EXISTS sp_return_book_with_waitlist(INTEGER, OUT VARCHAR, OUT INTEGER, OUT INTEGER, OUT NUMERIC);
DROP TABLE IF EXISTS db_audit_logs CASCADE;
DROP TABLE IF EXISTS book_requests CASCADE;
DROP TABLE IF EXISTS waitlist_reservations CASCADE;
DROP TABLE IF EXISTS circulation_loans CASCADE;
DROP TABLE IF EXISTS book_copies CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ----------------------------------------------------------------------------
-- TABLE 1: users
-- Represents patrons (students/faculty) and librarians/administrators.
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    enrollment_no VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member')),
    max_books_quota INTEGER DEFAULT 4 NOT NULL CHECK (max_books_quota > 0),
    outstanding_fines DECIMAL(10,2) DEFAULT 0.00 NOT NULL CHECK (outstanding_fines >= 0.00),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------------
-- TABLE 2: books
-- Abstract Intellectual Property (Metadata independent of physical inventory).
-- 3NF: No physical copy counts or shelf locations are stored here.
-- ----------------------------------------------------------------------------
CREATE TABLE books (
    book_id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    published_year INTEGER NOT NULL CHECK (published_year BETWEEN 1400 AND 2100),
    description TEXT,
    cover_url TEXT NOT NULL,
    card_tint VARCHAR(30) DEFAULT 'indigo' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------------
-- TABLE 3: book_copies
-- Physical Barcoded Inventory instances of books.
-- 3NF: Each physical book has its own barcode, shelf location, and physical state.
-- ----------------------------------------------------------------------------
CREATE TABLE book_copies (
    copy_id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    shelf_location VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Available', 'Issued', 'Maintenance', 'Lost')),
    condition VARCHAR(30) DEFAULT 'Good' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------------
-- TABLE 4: circulation_loans
-- Active and historical borrowing records connecting users with physical copies.
-- ----------------------------------------------------------------------------
CREATE TABLE circulation_loans (
    loan_id SERIAL PRIMARY KEY,
    copy_id INTEGER NOT NULL REFERENCES book_copies(copy_id) ON DELETE RESTRICT,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    due_date TIMESTAMP NOT NULL,
    return_date TIMESTAMP NULL,
    fine_assessed DECIMAL(10,2) DEFAULT 0.00 NOT NULL CHECK (fine_assessed >= 0.00),
    issued_via VARCHAR(30) DEFAULT 'Direct Checkout' NOT NULL CHECK (issued_via IN ('Direct Checkout', 'Waitlist Auto-Fulfill'))
);

-- ----------------------------------------------------------------------------
-- TABLE 5: waitlist_reservations
-- Strict FIFO waitlist queue when zero copies of a book are available.
-- ----------------------------------------------------------------------------
CREATE TABLE waitlist_reservations (
    reservation_id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Waiting', 'Fulfilled', 'Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fulfilled_at TIMESTAMP NULL
);

-- ----------------------------------------------------------------------------
-- TABLE 6: book_requests
-- Student book procurement and curriculum acquisition requests.
-- ----------------------------------------------------------------------------
CREATE TABLE book_requests (
    request_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(book_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(150),
    category VARCHAR(80),
    notes TEXT,
    status VARCHAR(30) DEFAULT 'Pending' NOT NULL CHECK (status IN ('Pending', 'Approved', 'Procured', 'Rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------------
-- TABLE 7: db_audit_logs
-- Live DBMS Telemetry recording operations, locks, and triggers for academic demonstration.
-- ----------------------------------------------------------------------------
CREATE TABLE db_audit_logs (
    log_id SERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    sql_summary TEXT NOT NULL,
    affected_entities VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING & INTEGRITY ENFORCEMENT
-- ============================================================================

-- 1. Guarantee at the storage-engine level that NO copy can be concurrently loaned out more than once:
CREATE UNIQUE INDEX idx_single_active_loan_per_copy 
    ON circulation_loans(copy_id) 
    WHERE return_date IS NULL;

-- 2. Index-only scans for dynamic real-time copy availability:
CREATE INDEX idx_copies_book_status 
    ON book_copies(book_id, status);

-- 3. Strict FIFO queue order for instant O(1) waitlist lookup:
CREATE INDEX idx_waitlist_fifo 
    ON waitlist_reservations(book_id, created_at ASC, reservation_id ASC) 
    WHERE status = 'Waiting';

-- 4. Constraint: A user cannot hold more than one active 'Waiting' spot for the same book:
CREATE UNIQUE INDEX idx_unique_active_waitlist_per_user 
    ON waitlist_reservations(book_id, user_id) 
    WHERE status = 'Waiting';

-- 5. Quick query optimization for user dashboard active loans:
CREATE INDEX idx_active_loans_user 
    ON circulation_loans(user_id) 
    WHERE return_date IS NULL;

-- ============================================================================
-- PL/PGSQL TRIGGERS: QUOTA ENFORCEMENT & INTEGRITY
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_check_user_quota()
RETURNS TRIGGER AS $$
DECLARE
    v_active_loans_count INTEGER;
    v_max_quota INTEGER;
    v_fines DECIMAL(10,2);
BEGIN
    -- Check user quota
    SELECT max_books_quota, outstanding_fines INTO v_max_quota, v_fines
    FROM users
    WHERE user_id = NEW.user_id;

    IF v_fines > 25.00 THEN
        RAISE EXCEPTION 'Borrowing blocked: User % has outstanding fines of $%', NEW.user_id, v_fines;
    END IF;

    SELECT COUNT(*) INTO v_active_loans_count
    FROM circulation_loans
    WHERE user_id = NEW.user_id AND return_date IS NULL;

    IF v_active_loans_count >= v_max_quota THEN
        RAISE EXCEPTION 'Borrowing blocked: User % has reached max quota of % active loans', NEW.user_id, v_max_quota;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_excessive_loans
BEFORE INSERT ON circulation_loans
FOR EACH ROW
EXECUTE FUNCTION fn_check_user_quota();

-- ============================================================================
-- PL/PGSQL STORED PROCEDURES (ACID TRANSACTIONS)
-- ============================================================================

-- Stored Procedure 1: Atomic Book Checkout with Row-Level Lock
CREATE OR REPLACE PROCEDURE sp_checkout_book(
    IN p_user_id INTEGER,
    IN p_book_id INTEGER,
    IN p_copy_id INTEGER DEFAULT NULL,
    OUT p_loan_id INTEGER,
    OUT p_assigned_copy_id INTEGER,
    OUT p_message VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_selected_copy_id INTEGER;
    v_due_date TIMESTAMP;
BEGIN
    v_due_date := CURRENT_TIMESTAMP + INTERVAL '14 days';

    -- Row-level lock on the first available physical copy to prevent race conditions
    IF p_copy_id IS NOT NULL THEN
        SELECT copy_id INTO v_selected_copy_id
        FROM book_copies
        WHERE copy_id = p_copy_id AND book_id = p_book_id AND status = 'Available'
        FOR UPDATE;
    ELSE
        SELECT copy_id INTO v_selected_copy_id
        FROM book_copies
        WHERE book_id = p_book_id AND status = 'Available'
        ORDER BY copy_id ASC
        LIMIT 1
        FOR UPDATE;
    END IF;

    IF v_selected_copy_id IS NULL THEN
        RAISE EXCEPTION 'No physical copies available for book_id %', p_book_id;
    END IF;

    -- Insert active loan record
    INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, return_date, issued_via)
    VALUES (v_selected_copy_id, p_user_id, CURRENT_TIMESTAMP, v_due_date, NULL, 'Direct Checkout')
    RETURNING loan_id INTO p_loan_id;

    -- Update inventory status
    UPDATE book_copies
    SET status = 'Issued'
    WHERE copy_id = v_selected_copy_id;

    -- Write to audit telemetry log
    INSERT INTO db_audit_logs (operation_type, sql_summary, affected_entities, created_at)
    VALUES (
        'TX_CHECKOUT',
        FORMAT('SELECT copy_id FROM book_copies WHERE copy_id=%s FOR UPDATE; INSERT INTO circulation_loans (loan_id=%s); UPDATE book_copies SET status=''Issued'';', v_selected_copy_id, p_loan_id),
        FORMAT('user_id: %s, book_id: %s, copy_id: %s, loan_id: %s', p_user_id, p_book_id, v_selected_copy_id, p_loan_id),
        CURRENT_TIMESTAMP
    );

    p_assigned_copy_id := v_selected_copy_id;
    p_message := 'Book successfully checked out.';
END;
$$;

-- Stored Procedure 2: Atomic Book Return with FIFO Waitlist Promotion
CREATE OR REPLACE PROCEDURE sp_return_book_with_waitlist(
    IN p_loan_id INTEGER,
    OUT p_status VARCHAR,
    OUT p_next_user_id INTEGER,
    OUT p_new_loan_id INTEGER,
    OUT p_fine_assessed NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_copy_id INTEGER;
    v_book_id INTEGER;
    v_user_id INTEGER;
    v_due_date TIMESTAMP;
    v_days_overdue INTEGER;
    v_reservation_id INTEGER;
    v_waitlist_user_id INTEGER;
    v_fine NUMERIC := 0.00;
BEGIN
    -- 1. Retrieve and lock the loan record
    SELECT cl.copy_id, bc.book_id, cl.user_id, cl.due_date
    INTO v_copy_id, v_book_id, v_user_id, v_due_date
    FROM circulation_loans cl
    JOIN book_copies bc ON cl.copy_id = bc.copy_id
    WHERE cl.loan_id = p_loan_id AND cl.return_date IS NULL
    FOR UPDATE;

    IF v_copy_id IS NULL THEN
        RAISE EXCEPTION 'Active loan ID % not found or book already returned', p_loan_id;
    END IF;

    -- 2. Calculate overdue fine ($2.00 per day after due date)
    IF CURRENT_TIMESTAMP > v_due_date THEN
        v_days_overdue := CEIL(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_due_date)) / 86400);
        IF v_days_overdue > 0 THEN
            v_fine := v_days_overdue * 2.00;
        END IF;
    END IF;

    -- 3. Close the active loan
    UPDATE circulation_loans
    SET return_date = CURRENT_TIMESTAMP,
        fine_assessed = v_fine
    WHERE loan_id = p_loan_id;

    IF v_fine > 0.00 THEN
        UPDATE users
        SET outstanding_fines = outstanding_fines + v_fine
        WHERE user_id = v_user_id;
    END IF;

    p_fine_assessed := v_fine;

    -- 4. Check FIFO Waitlist for this book_id
    SELECT reservation_id, user_id
    INTO v_reservation_id, v_waitlist_user_id
    FROM waitlist_reservations
    WHERE book_id = v_book_id AND status = 'Waiting'
    ORDER BY created_at ASC, reservation_id ASC
    LIMIT 1
    FOR UPDATE;

    -- 5. Branch: Auto-assign to Waitlist #1 OR Return to Shelf
    IF v_reservation_id IS NOT NULL THEN
        -- Mark waitlist entry fulfilled
        UPDATE waitlist_reservations
        SET status = 'Fulfilled',
            fulfilled_at = CURRENT_TIMESTAMP
        WHERE reservation_id = v_reservation_id;

        -- Auto-issue copy to #1 waitlist user immediately
        INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, return_date, issued_via)
        VALUES (v_copy_id, v_waitlist_user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days', NULL, 'Waitlist Auto-Fulfill')
        RETURNING loan_id INTO p_new_loan_id;

        -- Copy remains 'Issued'
        UPDATE book_copies
        SET status = 'Issued'
        WHERE copy_id = v_copy_id;

        -- Audit log
        INSERT INTO db_audit_logs (operation_type, sql_summary, affected_entities, created_at)
        VALUES (
            'TRIGGER_WAITLIST_AUTO_CHECKOUT',
            FORMAT('UPDATE waitlist_reservations SET status=''Fulfilled'' WHERE reservation_id=%s; INSERT INTO circulation_loans(loan_id=%s, user_id=%s, issued_via=''Waitlist Auto-Fulfill'');', v_reservation_id, p_new_loan_id, v_waitlist_user_id),
            FORMAT('returned_loan_id: %s, copy_id: %s, fulfilled_user_id: %s, new_loan_id: %s', p_loan_id, v_copy_id, v_waitlist_user_id, p_new_loan_id),
            CURRENT_TIMESTAMP
        );

        p_status := 'AUTO_ASSIGNED_TO_WAITLIST';
        p_next_user_id := v_waitlist_user_id;
    ELSE
        -- Return to shelf as 'Available'
        UPDATE book_copies
        SET status = 'Available'
        WHERE copy_id = v_copy_id;

        -- Audit log
        INSERT INTO db_audit_logs (operation_type, sql_summary, affected_entities, created_at)
        VALUES (
            'TX_RETURN_TO_SHELF',
            FORMAT('UPDATE circulation_loans SET return_date=NOW() WHERE loan_id=%s; UPDATE book_copies SET status=''Available'' WHERE copy_id=%s;', p_loan_id, v_copy_id),
            FORMAT('loan_id: %s, copy_id: %s, user_id: %s, fine: $%s', p_loan_id, v_copy_id, v_user_id, v_fine),
            CURRENT_TIMESTAMP
        );

        p_status := 'RETURNED_TO_SHELF';
        p_next_user_id := NULL;
        p_new_loan_id := NULL;
    END IF;
END;
$$;


-- ============================================================================
-- SEED DATA: 5-YEAR B.TECH (CSBS) CURRICULUM COLLECTION
-- Prescribed Textbooks + Corresponding O'Reilly Professional Editions
-- ============================================================================

INSERT INTO users (full_name, email, password_hash, role, max_books_quota, outstanding_fines)
VALUES
    ('Admin', 'admin@bookbase.in', 'bookbase_admin_hash', 'admin', 10, 0.00),
    ('Tejas', 'tejas@bookbase.in', 'bookbase_member_hash', 'member', 4, 0.00),
    ('Akash', 'akash@bookbase.in', 'bookbase_member_hash', 'member', 4, 0.00),
    ('Sai Kartikeya', 'saikartikeya@bookbase.in', 'bookbase_member_hash', 'member', 4, 0.00),
    ('Biba', 'biba@bookbase.in', 'bookbase_member_hash', 'member', 4, 0.00),
    ('Jaidanya', 'jaidanya@bookbase.in', 'bookbase_member_hash', 'member', 4, 0.00);

INSERT INTO books (isbn, title, author, category, published_year, description, cover_url, card_tint)
VALUES
    ('9780074631133', 'Discrete Mathematical Structures with Applications to Computer Science', 'J.P. Tremblay, R. Manohar', 'Core Computer Science', 1988, 'Prescribed textbook for CSBS covering mathematical logic, set theory, and graph theory.', 'https://covers.openlibrary.org/b/isbn/9780074631133-L.jpg', 'indigo'),
    ('9781565924536', 'Mastering Algorithms with C: Useful Techniques from Sorting to Encryption', 'Kyle Loudon', 'Core Computer Science', 1999, 'O''Reilly practical counterpart for discrete computational foundations and graph structures.', 'https://covers.openlibrary.org/b/isbn/9781565924536-L.jpg', 'indigo'),
    ('9780262033848', 'Introduction to Algorithms (CLRS)', 'Thomas H. Cormen et al.', 'Core Computer Science', 2009, 'Prescribed comprehensive algorithms reference covering asymptotic analysis, dynamic programming, and greedy heuristics.', 'https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg', 'emerald'),
    ('9780596516246', 'Algorithms in a Nutshell: A Practical Guide', 'George T. Heineman et al.', 'Core Computer Science', 2016, 'O''Reilly engineering guide presenting robust algorithm implementations and complexity tradeoffs.', 'https://covers.openlibrary.org/b/isbn/9780596516246-L.jpg', 'emerald'),
    ('9781260440232', 'Java: The Complete Reference', 'Herbert Schildt', 'Core Computer Science', 2019, 'Comprehensive textbook for CSBS object-oriented programming, concurrency, and collections.', 'https://covers.openlibrary.org/b/isbn/9781260440232-L.jpg', 'amber'),
    ('9780596009205', 'Head First Java: A Brain-Friendly Guide', 'Kathy Sierra et al.', 'Core Computer Science', 2022, 'O''Reilly visual reference for mastering OOP paradigms, Java concurrency, and modern streams.', 'https://covers.openlibrary.org/b/isbn/9780596009205-L.jpg', 'amber'),
    ('9780128017333', 'Computer Organization and Design: The Hardware/Software Interface', 'David A. Patterson et al.', 'Systems & Security', 2017, 'Prescribed CSBS architecture textbook exploring RISC pipelines and memory hierarchies.', 'https://covers.openlibrary.org/b/isbn/9780128017333-L.jpg', 'cyan'),
    ('9780596007553', 'Designing Embedded Hardware', 'John Catsoulis', 'Systems & Security', 2005, 'O''Reilly hardware handbook detailing microprocessor architectures, bus timing, and embedded logic.', 'https://covers.openlibrary.org/b/isbn/9780596007553-L.jpg', 'cyan'),
    ('9780321455369', 'Introduction to Automata Theory, Languages, and Computation', 'John E. Hopcroft et al.', 'Core Computer Science', 2006, 'Authoritative textbook on automata, formal grammars, pushdown machines, and Turing decidability.', 'https://covers.openlibrary.org/b/isbn/9780321455369-L.jpg', 'purple'),
    ('9780596528126', 'Mastering Regular Expressions', 'Jeffrey E.F. Friedl', 'Core Computer Science', 2006, 'O''Reilly guide to finite automata engines, regex mechanics, and formal parsing.', 'https://covers.openlibrary.org/b/isbn/9780596528126-L.jpg', 'purple'),
    ('9781118063330', 'Operating System Concepts', 'Abraham Silberschatz et al.', 'Systems & Security', 2018, 'Prescribed CSBS textbook covering processes, mutual exclusion, virtual memory, and file systems.', 'https://covers.openlibrary.org/b/isbn/9781118063330-L.jpg', 'rose'),
    ('9781449339531', 'Linux System Programming', 'Robert Love', 'Systems & Security', 2013, 'O''Reilly systems reference detailing Linux system calls, POSIX asynchronous I/O, and kernel primitives.', 'https://covers.openlibrary.org/b/isbn/9781449339531-L.jpg', 'rose'),
    ('9780072958867', 'Database System Concepts', 'Abraham Silberschatz et al.', 'Core Computer Science', 2010, 'Prescribed database textbook covering relational algebra, SQL optimization, and transaction processing.', 'https://covers.openlibrary.org/b/isbn/9780072958867-L.jpg', 'blue'),
    ('9781449373320', 'Designing Data-Intensive Applications', 'Martin Kleppmann', 'Core Computer Science', 2017, 'O''Reilly masterwork on distributed storage systems, consensus, replication, and stream processing.', 'https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg', 'blue'),
    ('9780078022128', 'Software Engineering: A Practitioner''s Approach', 'Roger S. Pressman et al.', 'Core Computer Science', 2014, 'Standard CSBS engineering textbook detailing agile frameworks, software architecture, and QA metrics.', 'https://covers.openlibrary.org/b/isbn/9780078022128-L.jpg', 'slate'),
    ('9781492082798', 'Software Engineering at Google', 'Titus Winters et al.', 'Core Computer Science', 2020, 'O''Reilly industry volume on sustainable code health, CI/CD, and large-scale reviews.', 'https://covers.openlibrary.org/b/isbn/9781492082798-L.jpg', 'slate'),
    ('9780132126953', 'Computer Networks', 'Andrew S. Tanenbaum et al.', 'Systems & Security', 2010, 'Prescribed networking textbook covering OSI, TCP/IP, routing protocols, and socket programming.', 'https://covers.openlibrary.org/b/isbn/9780132126953-L.jpg', 'indigo'),
    ('9781449344764', 'High Performance Browser Networking', 'Ilya Grigorik', 'Systems & Security', 2013, 'O''Reilly guide analyzing TCP/UDP transport tuning, TLS latency, HTTP/2, and HTTP/3.', 'https://covers.openlibrary.org/b/isbn/9781449344764-L.jpg', 'indigo'),
    ('9780321486813', 'Compilers: Principles, Techniques, and Tools', 'Alfred V. Aho et al.', 'Core Computer Science', 2006, 'The dragon book on lexical analysis, parsing tables, syntax-directed translation, and optimization.', 'https://covers.openlibrary.org/b/isbn/9780321486813-L.jpg', 'emerald'),
    ('9780596155971', 'flex & bison: Text Processing Tools', 'John Levine', 'Core Computer Science', 2009, 'O''Reilly guide for scanner generation and parser construction for building domain languages.', 'https://covers.openlibrary.org/b/isbn/9780596155971-L.jpg', 'emerald'),
    ('9780071077835', 'Principles of Management', 'P.C. Tripathi, P.N. Reddy', 'Business & Management', 2012, 'Curriculum prescribed textbook covering management principles, leadership, and organization.', 'https://covers.openlibrary.org/b/isbn/9780071077835-L.jpg', 'amber'),
    ('9781491973899', 'The Manager''s Path', 'Camille Fournier', 'Business & Management', 2017, 'O''Reilly guide for tech leads and engineering managers navigating growth and organizational alignment.', 'https://covers.openlibrary.org/b/isbn/9781491973899-L.jpg', 'amber'),
    ('9789353166526', 'Financial Management: Theory and Practice', 'Prasanna Chandra', 'Business & Management', 2019, 'Premier textbook for CSBS finance modules covering financial ratios, DCF, and capital budgeting.', 'https://covers.openlibrary.org/b/isbn/9789353166526-L.jpg', 'purple'),
    ('9781491945285', 'Python for Finance: Mastering Data-Driven Finance', 'Yves Hilpisch', 'Business & Management', 2018, 'O''Reilly quantitative finance reference applying Python to capital asset pricing and risk modeling.', 'https://covers.openlibrary.org/b/isbn/9781491945285-L.jpg', 'purple'),
    ('9781119120834', 'Contemporary Strategy Analysis', 'Robert M. Grant', 'Business & Management', 2016, 'Prescribed textbook for business systems strategy covering competitive advantage and digital models.', 'https://covers.openlibrary.org/b/isbn/9781119120834-L.jpg', 'cyan'),
    ('9781492040521', 'Technology Strategy Patterns', 'Eben Hewitt', 'Business & Management', 2018, 'O''Reilly strategic architecture manual for technology leaders connecting architecture to enterprise value.', 'https://covers.openlibrary.org/b/isbn/9781492040521-L.jpg', 'cyan'),
    ('9781422177808', 'The Design of Business: Why Design Thinking is the Next Competitive Advantage', 'Roger L. Martin', 'Business & Management', 2009, 'Harvard Business text exploring intuitive design thinking for sustained enterprise innovation.', 'https://covers.openlibrary.org/b/isbn/9781422177808-L.jpg', 'rose'),
    ('9781492051961', 'Designing Interfaces: Patterns for Effective Interaction Design', 'Jenifer Tidwell et al.', 'Business & Management', 2020, 'O''Reilly pattern catalog for interaction design, user navigation, and responsive layouts.', 'https://covers.openlibrary.org/b/isbn/9781492051961-L.jpg', 'rose'),
    ('9780123814791', 'Data Mining: Concepts and Techniques', 'Jiawei Han et al.', 'Data Science & AI', 2011, 'Authoritative textbook on data warehousing, OLAP, association rule mining, and clustering.', 'https://covers.openlibrary.org/b/isbn/9780123814791-L.jpg', 'blue'),
    ('9781098104030', 'Python for Data Analysis', 'Wes McKinney', 'Data Science & AI', 2022, 'Written by the creator of pandas, the essential O''Reilly guide for data wrangling and business analytics.', 'https://covers.openlibrary.org/b/isbn/9781098104030-L.jpg', 'blue'),
    ('9780387310732', 'Pattern Recognition and Machine Learning', 'Christopher M. Bishop', 'Data Science & AI', 2006, 'Prescribed textbook on Bayesian statistics, regression, neural networks, and graphical models.', 'https://covers.openlibrary.org/b/isbn/9780387310732-L.jpg', 'emerald'),
    ('9781098125974', 'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow', 'Aurélien Géron', 'Data Science & AI', 2022, 'O''Reilly bestseller covering modern ML workflows, neural architectures, and model deployment.', 'https://covers.openlibrary.org/b/isbn/9781098125974-L.jpg', 'emerald'),
    ('9780134444284', 'Cryptography and Network Security: Principles and Practice', 'William Stallings', 'Systems & Security', 2016, 'Prescribed CSBS textbook covering symmetric ciphers, RSA, elliptic curve crypto, and digital signatures.', 'https://covers.openlibrary.org/b/isbn/9780134444284-L.jpg', 'purple'),
    ('9781491910955', 'Network Security Assessment', 'Chris McNab', 'Systems & Security', 2016, 'O''Reilly assessment guide covering vulnerability scanning, cryptographic audits, and system defense.', 'https://covers.openlibrary.org/b/isbn/9781491910955-L.jpg', 'purple'),
    ('9780470887998', 'Cloud Computing: Principles and Paradigms', 'Rajkumar Buyya et al.', 'Systems & Security', 2011, 'Prescribed textbook on virtualization, cloud service architectures, SLA governance, and cloud grids.', 'https://covers.openlibrary.org/b/isbn/9780470887998-L.jpg', 'cyan'),
    ('9781492046530', 'Kubernetes: Up and Running', 'Brendan Burns et al.', 'Systems & Security', 2022, 'O''Reilly guide by Kubernetes co-founders on container orchestration and cloud infrastructure.', 'https://covers.openlibrary.org/b/isbn/9781492046530-L.jpg', 'cyan'),
    ('9789354060878', 'Principles and Practices of Banking', 'Indian Institute of Banking and Finance (IIBF)', 'Banking Tech & FinTech', 2021, 'Official textbook covering CBS, RTGS, clearing, and Basel norms.', 'https://covers.openlibrary.org/b/isbn/9789354060878-L.jpg', 'amber'),
    ('9781491954386', 'Mastering Bitcoin: Programming the Open Blockchain', 'Andreas M. Antonopoulos', 'Banking Tech & FinTech', 2017, 'O''Reilly authority on decentralized ledger architectures, cryptographic keys, and digital transaction flows.', 'https://covers.openlibrary.org/b/isbn/9781491954386-L.jpg', 'amber'),
    ('9780134444017', 'Operations Research: An Introduction', 'Hamdy A. Taha', 'Business & Management', 2017, 'Prescribed textbook covering linear programming, simplex methods, network routing, and queuing theory.', 'https://covers.openlibrary.org/b/isbn/9780134444017-L.jpg', 'slate'),
    ('9781449361327', 'Data Science for Business', 'Foster Provost, Tom Fawcett', 'Business & Management', 2013, 'O''Reilly text linking data mining and predictive modeling to business operations and profitability.', 'https://covers.openlibrary.org/b/isbn/9781449361327-L.jpg', 'slate');
