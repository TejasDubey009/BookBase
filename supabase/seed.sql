-- ============================================================================
-- BOOKBASE, PART 3 OF 3: DEMO DATA
-- Run this after functions.sql. It only creates the function: to fill the library, create the
-- demo accounts first (see the README), then run:
--     SELECT private.seed_library();
-- The admin portal's Reset Database button runs the same function.
-- ============================================================================

-- Empties the library tables and fills them with the 5-year B.Tech CSBS collection. Accounts are
-- kept, because they live in Supabase Auth. Loans and requests are only added for demo students
-- whose accounts exist.
CREATE OR REPLACE FUNCTION private.seed_library() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_tejas INT := (SELECT user_id FROM users WHERE enrollment_no = 'CSBS2022001');
    v_akash INT := (SELECT user_id FROM users WHERE enrollment_no = 'CSBS2022002');
    v_clrs_copy INT;
    v_ddia_copy INT;
    v_clrs_loan INT;
    v_ddia_loan INT;
    v_reservation INT;
BEGIN
    TRUNCATE books, book_copies, circulation_loans, return_requests, waitlist_reservations,
             book_requests, db_audit_logs RESTART IDENTITY;
    UPDATE users SET outstanding_fines = 0 WHERE outstanding_fines <> 0;

    INSERT INTO books (isbn, title, author, category, published_year, description, cover_url, card_tint)
    VALUES
        ('9780074631133', 'Discrete Mathematical Structures with Applications to Computer Science', 'J.P. Tremblay, R. Manohar', 'Core Computer Science', 1988, 'Prescribed curriculum textbook for CSBS covering mathematical logic, set theory, algebraic structures, lattices, Boolean algebra, and graph theory.', 'https://covers.openlibrary.org/b/isbn/9780074631133-L.jpg', 'indigo'),
        ('9781565924536', 'Mastering Algorithms with C: Useful Techniques from Sorting to Encryption', 'Kyle Loudon', 'Core Computer Science', 1999, 'O''Reilly practical counterpart for discrete computational foundations, graph traversals, sets, recurrence relations, and algorithmic structures in C.', 'https://covers.openlibrary.org/b/isbn/9781565924536-L.jpg', 'indigo'),
        ('9780262033848', 'Introduction to Algorithms (CLRS)', 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein', 'Core Computer Science', 2009, 'Prescribed comprehensive textbook for CSBS algorithms covering asymptotic notation, divide-and-conquer, greedy techniques, dynamic programming, and graph algorithms.', 'https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg', 'emerald'),
        ('9780596516246', 'Algorithms in a Nutshell: A Practical Guide', 'George T. Heineman, Gary Pollice, Stanley Selkow', 'Core Computer Science', 2016, 'O''Reilly engineering guide presenting robust algorithm implementations, performance profiling, and complexity trade-offs for real-world software systems.', 'https://covers.openlibrary.org/b/isbn/9780596516246-L.jpg', 'emerald'),
        ('9781260440232', 'Java: The Complete Reference', 'Herbert Schildt', 'Core Computer Science', 2019, 'Comprehensive textbook for CSBS object-oriented programming covering core Java syntax, class hierarchies, exception handling, multithreading, and collections.', 'https://covers.openlibrary.org/b/isbn/9781260440232-L.jpg', 'amber'),
        ('9780596009205', 'Head First Java: A Brain-Friendly Guide', 'Kathy Sierra, Bert Bates, Trisha Gee', 'Core Computer Science', 2022, 'O''Reilly visual reference for mastering OOP paradigms, Java concurrency, modern streams, lambda expressions, and memory management.', 'https://covers.openlibrary.org/b/isbn/9780596009205-L.jpg', 'amber'),
        ('9780128017333', 'Computer Organization and Design: The Hardware/Software Interface', 'David A. Patterson, John L. Hennessy', 'Systems & Security', 2017, 'Prescribed CSBS architecture textbook exploring RISC architectures, pipeline stages, branch prediction, memory hierarchies, and multi-core systems.', 'https://covers.openlibrary.org/b/isbn/9780128017333-L.jpg', 'cyan'),
        ('9780596007553', 'Designing Embedded Hardware', 'John Catsoulis', 'Systems & Security', 2005, 'O''Reilly hardware architecture handbook detailing microprocessor architectures, bus timing, peripheral interfacing, logic components, and embedded systems.', 'https://covers.openlibrary.org/b/isbn/9780596007553-L.jpg', 'cyan'),
        ('9780321455369', 'Introduction to Automata Theory, Languages, and Computation', 'John E. Hopcroft, Rajeev Motwani, Jeffrey D. Ullman', 'Core Computer Science', 2006, 'Authoritative textbook for theoretical computer science in CSBS covering regular languages, context-free grammars, pushdown automata, and Turing machines.', 'https://covers.openlibrary.org/b/isbn/9780321455369-L.jpg', 'purple'),
        ('9780596528126', 'Mastering Regular Expressions', 'Jeffrey E.F. Friedl', 'Core Computer Science', 2006, 'O''Reilly definitive guide to finite automata engines, deterministic vs non-deterministic state machines, regex optimization, and formal language parsing.', 'https://covers.openlibrary.org/b/isbn/9780596528126-L.jpg', 'purple'),
        ('9781118063330', 'Operating System Concepts', 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne', 'Systems & Security', 2018, 'Prescribed CSBS textbook covering thread scheduling, concurrency primitives, mutual exclusion, virtual memory paging, file system drivers, and kernel security.', 'https://covers.openlibrary.org/b/isbn/9781118063330-L.jpg', 'rose'),
        ('9781449339531', 'Linux System Programming: Talking Directly to the Kernel and C Library', 'Robert Love', 'Systems & Security', 2013, 'O''Reilly systems reference detailing Linux system calls, memory allocation, POSIX asynchronous I/O, epoll, process lifecycle, and kernel performance.', 'https://covers.openlibrary.org/b/isbn/9781449339531-L.jpg', 'rose'),
        ('9780072958867', 'Database System Concepts', 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan', 'Core Computer Science', 2010, 'Prescribed database systems textbook covering relational algebra, SQL optimization, B+ trees, normalization, transaction processing, and concurrency control.', 'https://covers.openlibrary.org/b/isbn/9780072958867-L.jpg', 'blue'),
        ('9781449373320', 'Designing Data-Intensive Applications', 'Martin Kleppmann', 'Core Computer Science', 2017, 'O''Reilly industry masterwork examining transactional databases, distributed consensus, write-ahead logging, data modeling, replication, and streaming systems.', 'https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg', 'blue'),
        ('9780078022128', 'Software Engineering: A Practitioner''s Approach', 'Roger S. Pressman, Bruce R. Maxim', 'Core Computer Science', 2014, 'Standard CSBS curriculum textbook detailing agile software development, requirement analysis, architectural design, software testing, and quality assurance.', 'https://covers.openlibrary.org/b/isbn/9780078022128-L.jpg', 'slate'),
        ('9781492082798', 'Software Engineering at Google: Lessons Learned from Programming Over Time', 'Titus Winters, Tom Manshreck, Hyrum Wright', 'Core Computer Science', 2020, 'O''Reilly industry volume on sustainable code health, dependency management, code reviews, automated testing, and scale across software lifecycles.', 'https://covers.openlibrary.org/b/isbn/9781492082798-L.jpg', 'slate'),
        ('9780132126953', 'Computer Networks', 'Andrew S. Tanenbaum, David J. Wetherall', 'Systems & Security', 2010, 'Prescribed networking textbook covering the OSI 7-layer stack, TCP/IP protocol suite, sliding window algorithms, routing protocols, and socket programming.', 'https://covers.openlibrary.org/b/isbn/9780132126953-L.jpg', 'indigo'),
        ('9781449344764', 'High Performance Browser Networking', 'Ilya Grigorik', 'Systems & Security', 2013, 'O''Reilly performance guide analyzing TCP socket tuning, TLS cryptographic handshake latency, HTTP/2, HTTP/3, and real-time network protocol optimization.', 'https://covers.openlibrary.org/b/isbn/9781449344764-L.jpg', 'indigo'),
        ('9780321486813', 'Compilers: Principles, Techniques, and Tools (Dragon Book)', 'Alfred V. Aho, Monica S. Lam, Ravi Sethi, Jeffrey D. Ullman', 'Core Computer Science', 2006, 'The classic dragon book for compiler engineering: lexical analysis, LL/LR parsing tables, syntax-directed translation, type checking, and code optimization.', 'https://covers.openlibrary.org/b/isbn/9780321486813-L.jpg', 'emerald'),
        ('9780596155971', 'flex & bison: Text Processing Tools', 'John Levine', 'Core Computer Science', 2009, 'O''Reilly hands-on implementation guide for lexical scanner generation and LALR parser construction for building domain-specific languages and interpreters.', 'https://covers.openlibrary.org/b/isbn/9780596155971-L.jpg', 'emerald'),
        ('9780071077835', 'Principles of Management', 'P.C. Tripathi, P.N. Reddy', 'Business & Management', 2012, 'Curriculum prescribed textbook covering management theories, organizational behavior, managerial decision-making, planning, and corporate leadership.', 'https://covers.openlibrary.org/b/isbn/9780071077835-L.jpg', 'amber'),
        ('9781491973899', 'The Manager''s Path: A Guide for Tech Leaders Navigating Growth and Change', 'Camille Fournier', 'Business & Management', 2017, 'O''Reilly definitive guide for engineering management, handling technical teams, strategic execution, team alignment, and executive leadership.', 'https://covers.openlibrary.org/b/isbn/9781491973899-L.jpg', 'amber'),
        ('9789353166526', 'Financial Management: Theory and Practice', 'Prasanna Chandra', 'Business & Management', 2019, 'Premier textbook for CSBS finance modules covering financial statements, discounted cash flows, capital budgeting, working capital, and portfolio theory.', 'https://covers.openlibrary.org/b/isbn/9789353166526-L.jpg', 'purple'),
        ('9781491945285', 'Python for Finance: Mastering Data-Driven Finance', 'Yves Hilpisch', 'Business & Management', 2018, 'O''Reilly quantitative finance reference applying Python programming to capital asset pricing, options valuation, portfolio optimization, and risk modeling.', 'https://covers.openlibrary.org/b/isbn/9781491945285-L.jpg', 'purple'),
        ('9781119120834', 'Contemporary Strategy Analysis', 'Robert M. Grant', 'Business & Management', 2016, 'Prescribed textbook for business systems strategy covering industry competitiveness, competitive advantage, diversification, and digital business models.', 'https://covers.openlibrary.org/b/isbn/9781119120834-L.jpg', 'cyan'),
        ('9781492040521', 'Technology Strategy Patterns: Architecture as Strategy', 'Eben Hewitt', 'Business & Management', 2018, 'O''Reilly strategic architecture manual for technology leaders aligning IT roadmaps with enterprise value creation and competitive differentiation.', 'https://covers.openlibrary.org/b/isbn/9781492040521-L.jpg', 'cyan'),
        ('9781422177808', 'The Design of Business: Why Design Thinking is the Next Competitive Advantage', 'Roger L. Martin', 'Business & Management', 2009, 'Harvard Business School Press text on integrating analytical mastery with intuitive design thinking to achieve sustainable commercial innovation.', 'https://covers.openlibrary.org/b/isbn/9781422177808-L.jpg', 'rose'),
        ('9781492051961', 'Designing Interfaces: Patterns for Effective Interaction Design', 'Jenifer Tidwell, Charles Brewer, Aynne Valencia', 'Business & Management', 2020, 'O''Reilly comprehensive UI/UX design patterns catalog covering user navigation, mobile interaction paradigms, dashboard layout, and design system creation.', 'https://covers.openlibrary.org/b/isbn/9781492051961-L.jpg', 'rose'),
        ('9780123814791', 'Data Mining: Concepts and Techniques', 'Jiawei Han, Micheline Kamber, Jian Pei', 'Data Science & AI', 2011, 'Authoritative textbook on data warehousing, multidimensional data modeling, OLAP, association rule mining, decision tree classification, and cluster analysis.', 'https://covers.openlibrary.org/b/isbn/9780123814791-L.jpg', 'blue'),
        ('9781098104030', 'Python for Data Analysis: Data Wrangling with pandas, NumPy, and Jupyter', 'Wes McKinney', 'Data Science & AI', 2022, 'Written by the creator of pandas, the essential O''Reilly guide for data wrangling, time series manipulation, and high-performance business analytics.', 'https://covers.openlibrary.org/b/isbn/9781098104030-L.jpg', 'blue'),
        ('9780387310732', 'Pattern Recognition and Machine Learning', 'Christopher M. Bishop', 'Data Science & AI', 2006, 'Prescribed graduate-level textbook on Bayesian statistics, regression, neural networks, kernel machines, and probabilistic graphical models.', 'https://covers.openlibrary.org/b/isbn/9780387310732-L.jpg', 'emerald'),
        ('9781098125974', 'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow', 'Aurélien Géron', 'Data Science & AI', 2022, 'O''Reilly production guide covering automated ML pipelines, deep neural architectures, transformers, computer vision, and model deployment.', 'https://covers.openlibrary.org/b/isbn/9781098125974-L.jpg', 'emerald'),
        ('9780134444284', 'Cryptography and Network Security: Principles and Practice', 'William Stallings', 'Systems & Security', 2016, 'Prescribed CSBS textbook covering symmetric ciphers (AES), asymmetric key cryptography (RSA, ECC), SHA hashing, digital signatures, and firewalls.', 'https://covers.openlibrary.org/b/isbn/9780134444284-L.jpg', 'purple'),
        ('9781491910955', 'Network Security Assessment: Know Your Network', 'Chris McNab', 'Systems & Security', 2016, 'O''Reilly security assessment guide covering vulnerability scanning, penetration testing techniques, cryptographic auditing, and network hardening.', 'https://covers.openlibrary.org/b/isbn/9781491910955-L.jpg', 'purple'),
        ('9780470887998', 'Cloud Computing: Principles and Paradigms', 'Rajkumar Buyya, Christian Vecchiola, S. Thamarai Selvi', 'Systems & Security', 2011, 'Prescribed textbook on virtualized hypervisors, cloud utility computing architectures, SLA governance, distributed resource management, and enterprise clouds.', 'https://covers.openlibrary.org/b/isbn/9780470887998-L.jpg', 'cyan'),
        ('9781492046530', 'Kubernetes: Up and Running: Dive into the Future of Infrastructure', 'Brendan Burns, Joe Beda, Kelsey Hightower, Lachlan Evenson', 'Systems & Security', 2022, 'Written by Kubernetes creators, this O''Reilly volume provides the definitive blueprint for cloud container orchestration, microservice pods, and ingress routing.', 'https://covers.openlibrary.org/b/isbn/9781492046530-L.jpg', 'cyan'),
        ('9789354060878', 'Principles and Practices of Banking', 'Indian Institute of Banking and Finance (IIBF)', 'Banking Tech & FinTech', 2021, 'Official curriculum textbook covering core banking software (CBS), RTGS, NEFT, clearing houses, Basel III, and AML compliance.', 'https://covers.openlibrary.org/b/isbn/9789354060878-L.jpg', 'amber'),
        ('9781491954386', 'Mastering Bitcoin: Programming the Open Blockchain', 'Andreas M. Antonopoulos', 'Banking Tech & FinTech', 2017, 'O''Reilly foundational authority on decentralized ledger architectures, cryptographic keys, transaction validation, and peer-to-peer financial networks.', 'https://covers.openlibrary.org/b/isbn/9781491954386-L.jpg', 'amber'),
        ('9780134444017', 'Operations Research: An Introduction', 'Hamdy A. Taha', 'Business & Management', 2017, 'Prescribed quantitative textbook covering linear programming, simplex algorithms, transportation networks, queuing theory, and inventory optimization.', 'https://covers.openlibrary.org/b/isbn/9780134444017-L.jpg', 'slate'),
        ('9781449361327', 'Data Science for Business: What You Need to Know about Data Mining', 'Foster Provost, Tom Fawcett', 'Business & Management', 2013, 'O''Reilly renowned text linking mathematical decision models and data mining algorithms to strategic business profitability and operational efficiency.', 'https://covers.openlibrary.org/b/isbn/9781449361327-L.jpg', 'slate');

    -- Two copies of every book, except CLRS (3) and DDIA (14), which have one copy each, already
    -- issued, so the waitlist and overdue flows can be shown straight away
    INSERT INTO book_copies (book_id, barcode, shelf_location, status, condition)
    SELECT b.book_id, format('LIB-CSBS-%s%s', lpad(b.book_id::text, 3, '0'), c.suffix),
           CASE b.book_id
               WHEN 3 THEN 'Central Library • Stack Floor 2, Rack A-04'
               WHEN 14 THEN 'Central Library • Stack Floor 2, Rack B-11'
               ELSE format('Central Library • Stack Floor %s, Rack C-%s', (b.book_id % 3) + 1, lpad(b.book_id::text, 2, '0'))
           END,
           CASE WHEN b.book_id IN (3, 14) THEN 'Issued' ELSE 'Available' END,
           CASE WHEN c.suffix = 'A' AND b.book_id <> 14 THEN 'Pristine' ELSE 'Good' END
    FROM books b
    CROSS JOIN (VALUES ('A'), ('B')) AS c(suffix)
    WHERE c.suffix = 'A' OR b.book_id NOT IN (3, 14)
    ORDER BY b.book_id, c.suffix;

    IF v_tejas IS NOT NULL THEN
        -- Tejas holds an overdue CLRS and an on-time DDIA
        SELECT copy_id INTO v_clrs_copy FROM book_copies WHERE book_id = 3;
        SELECT copy_id INTO v_ddia_copy FROM book_copies WHERE book_id = 14;
        INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, issued_via, condition_at_issue)
        VALUES (v_clrs_copy, v_tejas, now() - interval '16 days', now() - interval '2 days', 'Direct Checkout', 'Pristine')
        RETURNING loan_id INTO v_clrs_loan;
        INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, issued_via, condition_at_issue)
        VALUES (v_ddia_copy, v_tejas, now() - interval '3 days', now() + interval '11 days', 'Direct Checkout', 'Good')
        RETURNING loan_id INTO v_ddia_loan;
        PERFORM private.log_audit('TX_CHECKOUT', format('Borrow copy %s issued to patron Tejas (user_id=%s)', v_clrs_copy, v_tejas),
            format('user_id: %s, book_id: 3, copy_id: %s, loan_id: %s', v_tejas, v_clrs_copy, v_clrs_loan));
        PERFORM private.log_audit('TX_CHECKOUT', format('Borrow copy %s issued to patron Tejas (user_id=%s)', v_ddia_copy, v_tejas),
            format('user_id: %s, book_id: 14, copy_id: %s, loan_id: %s', v_tejas, v_ddia_copy, v_ddia_loan));
    ELSE
        -- Without Tejas there is no loan, so the two single copies go on the shelf
        UPDATE book_copies SET status = 'Available' WHERE book_id IN (3, 14);
    END IF;

    IF v_akash IS NOT NULL AND v_tejas IS NOT NULL THEN
        -- Akash is first in the queue for CLRS
        INSERT INTO waitlist_reservations (book_id, user_id, status, created_at)
        VALUES (3, v_akash, 'Waiting', now() - interval '1 day')
        RETURNING reservation_id INTO v_reservation;
        PERFORM private.log_audit('TX_WAITLIST_JOIN', format('Patron Akash (user_id=%s) joined reservation queue for book_id=3', v_akash),
            format('user_id: %s, book_id: 3, reservation_id: %s, queue_position: 1', v_akash, v_reservation));
    END IF;

    INSERT INTO book_requests (user_id, book_id, title, author, category, notes, status)
    SELECT u.user_id, r.book_id, r.title, r.author, r.category, r.notes, r.status
    FROM (VALUES
        ('CSBS2022003', NULL, 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 'Core Computer Science', 'Prescribed reference for clean architecture and software engineering lab.', 'Pending'),
        ('CSBS2022004', NULL, 'Site Reliability Engineering: How Google Runs Production Systems', 'Betsy Beyer, Chris Jones, Niall Richard Murphy', 'Systems & Security', 'Advanced reference for distributed systems and DevOps elective.', 'Approved'),
        ('CSBS2022001', 3, 'Introduction to Algorithms (CLRS) - Extra Physical Copies', 'Thomas H. Cormen', 'Core Computer Science', 'All copies currently on loan, request to procure 2 more copies for Semester 3 book bank.', 'Procured')
    ) AS r(enrollment_no, book_id, title, author, category, notes, status)
    JOIN users u ON u.enrollment_no = r.enrollment_no;
END $$;

REVOKE ALL ON FUNCTION private.seed_library() FROM PUBLIC, anon, authenticated;
