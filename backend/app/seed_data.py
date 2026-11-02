import sqlite3
import hashlib
import datetime
from app.database import log_audit, init_db_schema

def hash_password(password: str) -> str:
    return hashlib.sha256(f"bookbase_salt_{password}".encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def seed_database(conn: sqlite3.Connection, force_reset: bool = False):
    """
    Seeds the Central Library database with the complete
    curriculum collection for the 5-Year Integrated B.Tech (CSBS) program,
    along with corresponding O'Reilly Professional Editions.
    """
    init_db_schema(conn)
    cursor = conn.cursor()

    if force_reset:
        cursor.execute("DELETE FROM db_audit_logs;")
        cursor.execute("DELETE FROM waitlist_reservations;")
        cursor.execute("DELETE FROM circulation_loans;")
        cursor.execute("DELETE FROM book_copies;")
        cursor.execute("DELETE FROM books;")
        cursor.execute("DELETE FROM users;")
        # Reset AUTOINCREMENT sequences
        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('users', 'books', 'book_copies', 'circulation_loans', 'waitlist_reservations', 'db_audit_logs');")
        conn.commit()

    # Check if users already exist
    cursor.execute("SELECT COUNT(*) FROM users;")
    if cursor.fetchone()[0] > 0 and not force_reset:
        return

    now = datetime.datetime.now(datetime.timezone.utc)
    now_iso = now.isoformat()

    # 1. Seed Users (Librarian Staff + B.Tech CSBS Patrons)
    users_data = [
        ("Admin", "admin@bookbase.in", hash_password("admin123"), "admin", 10, 0.0),
        ("Tejas", "tejas@bookbase.in", hash_password("member123"), "member", 4, 0.0),
        ("Akash", "akash@bookbase.in", hash_password("member123"), "member", 4, 0.0),
        ("Sai Kartikeya", "saikartikeya@bookbase.in", hash_password("member123"), "member", 4, 0.0),
        ("Biba", "biba@bookbase.in", hash_password("member123"), "member", 4, 0.0),
        ("Jaidanya", "jaidanya@bookbase.in", hash_password("member123"), "member", 4, 0.0),
    ]

    cursor.executemany(
        """
        INSERT INTO users (full_name, email, password_hash, role, max_books_quota, outstanding_fines, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        [(u[0], u[1], u[2], u[3], u[4], u[5], now_iso) for u in users_data]
    )
    conn.commit()

    # 2. Seed B.Tech CSBS Prescribed Books + O'Reilly Alternatives
    # Category list: 'Core Computer Science', 'Business & Management', 'Data Science & AI', 'Banking Tech & FinTech', 'Systems & Security'
    books_data = [
        # Pair 1: Discrete Mathematics
        (
            "9780074631133",
            "Discrete Mathematical Structures with Applications to Computer Science",
            "J.P. Tremblay, R. Manohar",
            "Core Computer Science",
            1988,
            "Prescribed curriculum textbook for CSBS covering mathematical logic, set theory, algebraic structures, lattices, Boolean algebra, and graph theory.",
            "https://covers.openlibrary.org/b/isbn/9780074631133-L.jpg",
            "indigo"
        ),
        (
            "9781565924536",
            "Mastering Algorithms with C: Useful Techniques from Sorting to Encryption",
            "Kyle Loudon",
            "Core Computer Science",
            1999,
            "O'Reilly practical counterpart for discrete computational foundations, graph traversals, sets, recurrence relations, and algorithmic structures in C.",
            "https://covers.openlibrary.org/b/isbn/9781565924536-L.jpg",
            "indigo"
        ),

        # Pair 2: Data Structures & Algorithms
        (
            "9780262033848",
            "Introduction to Algorithms (CLRS)",
            "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
            "Core Computer Science",
            2009,
            "Prescribed comprehensive textbook for CSBS algorithms covering asymptotic notation, divide-and-conquer, greedy techniques, dynamic programming, and graph algorithms.",
            "https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg",
            "emerald"
        ),
        (
            "9780596516246",
            "Algorithms in a Nutshell: A Practical Guide",
            "George T. Heineman, Gary Pollice, Stanley Selkow",
            "Core Computer Science",
            2016,
            "O'Reilly engineering guide presenting robust algorithm implementations, performance profiling, and complexity trade-offs for real-world software systems.",
            "https://covers.openlibrary.org/b/isbn/9780596516246-L.jpg",
            "emerald"
        ),

        # Pair 3: Object-Oriented Programming (Java)
        (
            "9781260440232",
            "Java: The Complete Reference",
            "Herbert Schildt",
            "Core Computer Science",
            2019,
            "Comprehensive textbook for CSBS object-oriented programming covering core Java syntax, class hierarchies, exception handling, multithreading, and collections.",
            "https://covers.openlibrary.org/b/isbn/9781260440232-L.jpg",
            "amber"
        ),
        (
            "9780596009205",
            "Head First Java: A Brain-Friendly Guide",
            "Kathy Sierra, Bert Bates, Trisha Gee",
            "Core Computer Science",
            2022,
            "O'Reilly visual reference for mastering OOP paradigms, Java concurrency, modern streams, lambda expressions, and memory management.",
            "https://covers.openlibrary.org/b/isbn/9780596009205-L.jpg",
            "amber"
        ),

        # Pair 4: Computer Organization & Architecture
        (
            "9780128017333",
            "Computer Organization and Design: The Hardware/Software Interface",
            "David A. Patterson, John L. Hennessy",
            "Systems & Security",
            2017,
            "Prescribed CSBS architecture textbook exploring RISC architectures, pipeline stages, branch prediction, memory hierarchies, and multi-core systems.",
            "https://covers.openlibrary.org/b/isbn/9780128017333-L.jpg",
            "cyan"
        ),
        (
            "9780596007553",
            "Designing Embedded Hardware",
            "John Catsoulis",
            "Systems & Security",
            2005,
            "O'Reilly hardware architecture handbook detailing microprocessor architectures, bus timing, peripheral interfacing, logic components, and embedded systems.",
            "https://covers.openlibrary.org/b/isbn/9780596007553-L.jpg",
            "cyan"
        ),

        # Pair 5: Formal Languages & Automata
        (
            "9780321455369",
            "Introduction to Automata Theory, Languages, and Computation",
            "John E. Hopcroft, Rajeev Motwani, Jeffrey D. Ullman",
            "Core Computer Science",
            2006,
            "Authoritative textbook for theoretical computer science in CSBS covering regular languages, context-free grammars, pushdown automata, and Turing machines.",
            "https://covers.openlibrary.org/b/isbn/9780321455369-L.jpg",
            "purple"
        ),
        (
            "9780596528126",
            "Mastering Regular Expressions",
            "Jeffrey E.F. Friedl",
            "Core Computer Science",
            2006,
            "O'Reilly definitive guide to finite automata engines, deterministic vs non-deterministic state machines, regex optimization, and formal language parsing.",
            "https://covers.openlibrary.org/b/isbn/9780596528126-L.jpg",
            "purple"
        ),

        # Pair 6: Operating Systems
        (
            "9781118063330",
            "Operating System Concepts",
            "Abraham Silberschatz, Peter B. Galvin, Greg Gagne",
            "Systems & Security",
            2018,
            "Prescribed CSBS textbook covering thread scheduling, concurrency primitives, mutual exclusion, virtual memory paging, file system drivers, and kernel security.",
            "https://covers.openlibrary.org/b/isbn/9781118063330-L.jpg",
            "rose"
        ),
        (
            "9781449339531",
            "Linux System Programming: Talking Directly to the Kernel and C Library",
            "Robert Love",
            "Systems & Security",
            2013,
            "O'Reilly systems reference detailing Linux system calls, memory allocation, POSIX asynchronous I/O, epoll, process lifecycle, and kernel performance.",
            "https://covers.openlibrary.org/b/isbn/9781449339531-L.jpg",
            "rose"
        ),

        # Pair 7: Database Management Systems
        (
            "9780072958867",
            "Database System Concepts",
            "Abraham Silberschatz, Henry F. Korth, S. Sudarshan",
            "Core Computer Science",
            2010,
            "Prescribed database systems textbook covering relational algebra, SQL optimization, B+ trees, normalization, transaction processing, and concurrency control.",
            "https://covers.openlibrary.org/b/isbn/9780072958867-L.jpg",
            "blue"
        ),
        (
            "9781449373320",
            "Designing Data-Intensive Applications",
            "Martin Kleppmann",
            "Core Computer Science",
            2017,
            "O'Reilly industry masterwork examining transactional databases, distributed consensus, write-ahead logging, data modeling, replication, and streaming systems.",
            "https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg",
            "blue"
        ),

        # Pair 8: Software Engineering
        (
            "9780078022128",
            "Software Engineering: A Practitioner's Approach",
            "Roger S. Pressman, Bruce R. Maxim",
            "Core Computer Science",
            2014,
            "Standard CSBS curriculum textbook detailing agile software development, requirement analysis, architectural design, software testing, and quality assurance.",
            "https://covers.openlibrary.org/b/isbn/9780078022128-L.jpg",
            "slate"
        ),
        (
            "9781492082798",
            "Software Engineering at Google: Lessons Learned from Programming Over Time",
            "Titus Winters, Tom Manshreck, Hyrum Wright",
            "Core Computer Science",
            2020,
            "O'Reilly industry volume on sustainable code health, dependency management, code reviews, automated testing, and scale across software lifecycles.",
            "https://covers.openlibrary.org/b/isbn/9781492082798-L.jpg",
            "slate"
        ),

        # Pair 9: Computer Networks
        (
            "9780132126953",
            "Computer Networks",
            "Andrew S. Tanenbaum, David J. Wetherall",
            "Systems & Security",
            2010,
            "Prescribed networking textbook covering the OSI 7-layer stack, TCP/IP protocol suite, sliding window algorithms, routing protocols, and socket programming.",
            "https://covers.openlibrary.org/b/isbn/9780132126953-L.jpg",
            "indigo"
        ),
        (
            "9781449344764",
            "High Performance Browser Networking",
            "Ilya Grigorik",
            "Systems & Security",
            2013,
            "O'Reilly performance guide analyzing TCP socket tuning, TLS cryptographic handshake latency, HTTP/2, HTTP/3, and real-time network protocol optimization.",
            "https://covers.openlibrary.org/b/isbn/9781449344764-L.jpg",
            "indigo"
        ),

        # Pair 10: Compiler Design
        (
            "9780321486813",
            "Compilers: Principles, Techniques, and Tools (Dragon Book)",
            "Alfred V. Aho, Monica S. Lam, Ravi Sethi, Jeffrey D. Ullman",
            "Core Computer Science",
            2006,
            "The classic dragon book for compiler engineering: lexical analysis, LL/LR parsing tables, syntax-directed translation, type checking, and code optimization.",
            "https://covers.openlibrary.org/b/isbn/9780321486813-L.jpg",
            "emerald"
        ),
        (
            "9780596155971",
            "flex & bison: Text Processing Tools",
            "John Levine",
            "Core Computer Science",
            2009,
            "O'Reilly hands-on implementation guide for lexical scanner generation and LALR parser construction for building domain-specific languages and interpreters.",
            "https://covers.openlibrary.org/b/isbn/9780596155971-L.jpg",
            "emerald"
        ),

        # Pair 11: Fundamentals of Management
        (
            "9780071077835",
            "Principles of Management",
            "P.C. Tripathi, P.N. Reddy",
            "Business & Management",
            2012,
            "Curriculum prescribed textbook covering management theories, organizational behavior, managerial decision-making, planning, and corporate leadership.",
            "https://covers.openlibrary.org/b/isbn/9780071077835-L.jpg",
            "amber"
        ),
        (
            "9781491973899",
            "The Manager's Path: A Guide for Tech Leaders Navigating Growth and Change",
            "Camille Fournier",
            "Business & Management",
            2017,
            "O'Reilly definitive guide for engineering management, handling technical teams, strategic execution, team alignment, and executive leadership.",
            "https://covers.openlibrary.org/b/isbn/9781491973899-L.jpg",
            "amber"
        ),

        # Pair 12: Financial Management & Accounting
        (
            "9789353166526",
            "Financial Management: Theory and Practice",
            "Prasanna Chandra",
            "Business & Management",
            2019,
            "Premier textbook for CSBS finance modules covering financial statements, discounted cash flows, capital budgeting, working capital, and portfolio theory.",
            "https://covers.openlibrary.org/b/isbn/9789353166526-L.jpg",
            "purple"
        ),
        (
            "9781491945285",
            "Python for Finance: Mastering Data-Driven Finance",
            "Yves Hilpisch",
            "Business & Management",
            2018,
            "O'Reilly quantitative finance reference applying Python programming to capital asset pricing, options valuation, portfolio optimization, and risk modeling.",
            "https://covers.openlibrary.org/b/isbn/9781491945285-L.jpg",
            "purple"
        ),

        # Pair 13: Business Strategy
        (
            "9781119120834",
            "Contemporary Strategy Analysis",
            "Robert M. Grant",
            "Business & Management",
            2016,
            "Prescribed textbook for business systems strategy covering industry competitiveness, competitive advantage, diversification, and digital business models.",
            "https://covers.openlibrary.org/b/isbn/9781119120834-L.jpg",
            "cyan"
        ),
        (
            "9781492040521",
            "Technology Strategy Patterns: Architecture as Strategy",
            "Eben Hewitt",
            "Business & Management",
            2018,
            "O'Reilly strategic architecture manual for technology leaders aligning IT roadmaps with enterprise value creation and competitive differentiation.",
            "https://covers.openlibrary.org/b/isbn/9781492040521-L.jpg",
            "cyan"
        ),

        # Pair 14: Design Thinking & Product Innovation
        (
            "9781422177808",
            "The Design of Business: Why Design Thinking is the Next Competitive Advantage",
            "Roger L. Martin",
            "Business & Management",
            2009,
            "Harvard Business School Press text on integrating analytical mastery with intuitive design thinking to achieve sustainable commercial innovation.",
            "https://covers.openlibrary.org/b/isbn/9781422177808-L.jpg",
            "rose"
        ),
        (
            "9781492051961",
            "Designing Interfaces: Patterns for Effective Interaction Design",
            "Jenifer Tidwell, Charles Brewer, Aynne Valencia",
            "Business & Management",
            2020,
            "O'Reilly comprehensive UI/UX design patterns catalog covering user navigation, mobile interaction paradigms, dashboard layout, and design system creation.",
            "https://covers.openlibrary.org/b/isbn/9781492051961-L.jpg",
            "rose"
        ),

        # Pair 15: Data Mining & Business Analytics
        (
            "9780123814791",
            "Data Mining: Concepts and Techniques",
            "Jiawei Han, Micheline Kamber, Jian Pei",
            "Data Science & AI",
            2011,
            "Authoritative textbook on data warehousing, multidimensional data modeling, OLAP, association rule mining, decision tree classification, and cluster analysis.",
            "https://covers.openlibrary.org/b/isbn/9780123814791-L.jpg",
            "blue"
        ),
        (
            "9781098104030",
            "Python for Data Analysis: Data Wrangling with pandas, NumPy, and Jupyter",
            "Wes McKinney",
            "Data Science & AI",
            2022,
            "Written by the creator of pandas, the essential O'Reilly guide for data wrangling, time series manipulation, and high-performance business analytics.",
            "https://covers.openlibrary.org/b/isbn/9781098104030-L.jpg",
            "blue"
        ),

        # Pair 16: Machine Learning & Deep Learning
        (
            "9780387310732",
            "Pattern Recognition and Machine Learning",
            "Christopher M. Bishop",
            "Data Science & AI",
            2006,
            "Prescribed graduate-level textbook on Bayesian statistics, regression, neural networks, kernel machines, and probabilistic graphical models.",
            "https://covers.openlibrary.org/b/isbn/9780387310732-L.jpg",
            "emerald"
        ),
        (
            "9781098125974",
            "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow",
            "Aurélien Géron",
            "Data Science & AI",
            2022,
            "O'Reilly production guide covering automated ML pipelines, deep neural architectures, transformers, computer vision, and model deployment.",
            "https://covers.openlibrary.org/b/isbn/9781098125974-L.jpg",
            "emerald"
        ),

        # Pair 17: Information Security & Cryptography
        (
            "9780134444284",
            "Cryptography and Network Security: Principles and Practice",
            "William Stallings",
            "Systems & Security",
            2016,
            "Prescribed CSBS textbook covering symmetric ciphers (AES), asymmetric key cryptography (RSA, ECC), SHA hashing, digital signatures, and firewalls.",
            "https://covers.openlibrary.org/b/isbn/9780134444284-L.jpg",
            "purple"
        ),
        (
            "9781491910955",
            "Network Security Assessment: Know Your Network",
            "Chris McNab",
            "Systems & Security",
            2016,
            "O'Reilly security assessment guide covering vulnerability scanning, penetration testing techniques, cryptographic auditing, and network hardening.",
            "https://covers.openlibrary.org/b/isbn/9781491910955-L.jpg",
            "purple"
        ),

        # Pair 18: Cloud Computing
        (
            "9780470887998",
            "Cloud Computing: Principles and Paradigms",
            "Rajkumar Buyya, Christian Vecchiola, S. Thamarai Selvi",
            "Systems & Security",
            2011,
            "Prescribed textbook on virtualized hypervisors, cloud utility computing architectures, SLA governance, distributed resource management, and enterprise clouds.",
            "https://covers.openlibrary.org/b/isbn/9780470887998-L.jpg",
            "cyan"
        ),
        (
            "9781492046530",
            "Kubernetes: Up and Running: Dive into the Future of Infrastructure",
            "Brendan Burns, Joe Beda, Kelsey Hightower, Lachlan Evenson",
            "Systems & Security",
            2022,
            "Written by Kubernetes creators, this O'Reilly volume provides the definitive blueprint for cloud container orchestration, microservice pods, and ingress routing.",
            "https://covers.openlibrary.org/b/isbn/9781492046530-L.jpg",
            "cyan"
        ),

        # Pair 19: Banking Technology & Digital Financial Systems
        (
            "9789354060878",
            "Principles and Practices of Banking",
            "Indian Institute of Banking and Finance (IIBF)",
            "Banking Tech & FinTech",
            2021,
            "Official curriculum textbook covering core banking software (CBS), RTGS, NEFT, clearing houses, Basel III, and AML compliance.",
            "https://covers.openlibrary.org/b/isbn/9789354060878-L.jpg",
            "amber"
        ),
        (
            "9781491954386",
            "Mastering Bitcoin: Programming the Open Blockchain",
            "Andreas M. Antonopoulos",
            "Banking Tech & FinTech",
            2017,
            "O'Reilly foundational authority on decentralized ledger architectures, cryptographic keys, transaction validation, and peer-to-peer financial networks.",
            "https://covers.openlibrary.org/b/isbn/9781491954386-L.jpg",
            "amber"
        ),

        # Pair 20: Operations Research & Business Decision Modelling
        (
            "9780134444017",
            "Operations Research: An Introduction",
            "Hamdy A. Taha",
            "Business & Management",
            2017,
            "Prescribed quantitative textbook covering linear programming, simplex algorithms, transportation networks, queuing theory, and inventory optimization.",
            "https://covers.openlibrary.org/b/isbn/9780134444017-L.jpg",
            "slate"
        ),
        (
            "9781449361327",
            "Data Science for Business: What You Need to Know about Data Mining",
            "Foster Provost, Tom Fawcett",
            "Business & Management",
            2013,
            "O'Reilly renowned text linking mathematical decision models and data mining algorithms to strategic business profitability and operational efficiency.",
            "https://covers.openlibrary.org/b/isbn/9781449361327-L.jpg",
            "slate"
        )
    ]

    cursor.executemany(
        """
        INSERT INTO books (isbn, title, author, category, published_year, description, cover_url, card_tint, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [(b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], now_iso) for b in books_data]
    )
    conn.commit()

    # 3. Seed Physical Copies (book_copies)
    # Generate realistic barcodes and shelf locations in Central Library
    # Let book 3 (CLRS) and book 14 (DDIA) have special initial loan setups for immediate testing
    copies_data = []
    
    for book_idx in range(1, len(books_data) + 1):
        # Book 3: Introduction to Algorithms (CLRS) - 1 copy (currently issued)
        if book_idx == 3:
            copies_data.append((book_idx, f"LIB-CSBS-{book_idx:03d}A", "Central Library • Stack Floor 2, Rack A-04", "Issued", "Pristine"))
        # Book 14: Designing Data-Intensive Applications - 1 copy (currently issued)
        elif book_idx == 14:
            copies_data.append((book_idx, f"LIB-CSBS-{book_idx:03d}A", "Central Library • Stack Floor 2, Rack B-11", "Issued", "Good"))
        else:
            # 2 copies per book
            shelf = f"Central Library • Stack Floor {(book_idx % 3) + 1}, Rack C-{book_idx:02d}"
            copies_data.append((book_idx, f"LIB-CSBS-{book_idx:03d}A", shelf, "Available", "Pristine"))
            copies_data.append((book_idx, f"LIB-CSBS-{book_idx:03d}B", shelf, "Available", "Good"))

    cursor.executemany(
        """
        INSERT INTO book_copies (book_id, barcode, shelf_location, status, condition, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        [(c[0], c[1], c[2], c[3], c[4], now_iso) for c in copies_data]
    )
    conn.commit()

    # 4. Seed Active Circulation Loans
    # Loan 1: Tejas (user_id=2) borrowed CLRS (copy_id=1 in book 3) 16 days ago (OVERDUE by 2 days, ₹4 fine)
    # Finding copy_id for book 3:
    cursor.execute("SELECT copy_id FROM book_copies WHERE book_id = 3 LIMIT 1;")
    clrs_copy_id = cursor.fetchone()[0]

    # Finding copy_id for book 14 (DDIA):
    cursor.execute("SELECT copy_id FROM book_copies WHERE book_id = 14 LIMIT 1;")
    ddia_copy_id = cursor.fetchone()[0]

    issue_date_clrs = (now - datetime.timedelta(days=16)).isoformat()
    due_date_clrs = (now - datetime.timedelta(days=2)).isoformat()

    issue_date_ddia = (now - datetime.timedelta(days=3)).isoformat()
    due_date_ddia = (now + datetime.timedelta(days=11)).isoformat()

    cursor.execute(
        """
        INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, return_date, fine_assessed, issued_via)
        VALUES (?, ?, ?, ?, NULL, 0.0, 'Direct Checkout')
        """,
        (clrs_copy_id, 2, issue_date_clrs, due_date_clrs)
    )
    loan_id_1 = cursor.lastrowid

    cursor.execute(
        """
        INSERT INTO circulation_loans (copy_id, user_id, issue_date, due_date, return_date, fine_assessed, issued_via)
        VALUES (?, ?, ?, ?, NULL, 0.0, 'Direct Checkout')
        """,
        (ddia_copy_id, 2, issue_date_ddia, due_date_ddia)
    )
    loan_id_2 = cursor.lastrowid
    conn.commit()

    # 5. Seed FIFO Waitlist
    # Akash (user_id=3) is waiting for CLRS (book_id=3) as Queue #1
    waitlist_time = (now - datetime.timedelta(days=1)).isoformat()
    cursor.execute(
        """
        INSERT INTO waitlist_reservations (book_id, user_id, status, created_at)
        VALUES (?, ?, 'Waiting', ?)
        """,
        (3, 3, waitlist_time)
    )
    res_id_1 = cursor.lastrowid
    conn.commit()

    # 6. Audit Logging
    log_audit(
        conn,
        "TX_CHECKOUT",
        f"Borrow copy {clrs_copy_id} issued to patron Tejas (user_id=2)",
        f"user_id: 2, book_id: 3, copy_id: {clrs_copy_id}, loan_id: {loan_id_1}"
    )
    log_audit(
        conn,
        "TX_CHECKOUT",
        f"Borrow copy {ddia_copy_id} issued to patron Tejas (user_id=2)",
        f"user_id: 2, book_id: 14, copy_id: {ddia_copy_id}, loan_id: {loan_id_2}"
    )
    log_audit(
        conn,
        "TX_WAITLIST_JOIN",
        f"Patron Akash (user_id=3) joined reservation queue for book_id=3",
        f"user_id: 3, book_id: 3, reservation_id: {res_id_1}, queue_position: 1"
    )
    conn.commit()
    print("Database successfully seeded with 5-Year B.Tech CSBS curriculum collection!")
