# 📚 BookBase — B.Tech CSBS Curriculum Library & Book Bank

A Smart Library Management System & Academic Book Bank tailored for the **5-Year Integrated B.Tech in Computer Science and Business Systems (CSBS)** curriculum.

Features prescribed curriculum textbooks paired with corresponding **O'Reilly Professional Editions**, real-time physical inventory tracking, automated waitlist reservations, and genuine library circulation desk workflows.

---

## 🏛️ Academic Program Overview & Curriculum Alignment
- **Program:** 5-Year Integrated B.Tech in Computer Science and Business Systems (CSBS)
- **Curriculum Framework:** Business 4.0 Academic Standard (AICTE & TCS CSBS Framework)
- **Library Hours:** Monday – Friday: 8:00 AM – 8:00 PM | Saturday – Sunday: 9:00 AM – 5:30 PM
- **Contact:** `library.desk@bookbase.in` | Tel: +91 80 2345 6789 | Digital Central Library Desk

---

## 🌟 Key Architecture Highlights

1. **Strict 3NF Normalization:**
   - Physical inventory (`book_copies`) is strictly decoupled from abstract intellectual property (`books`).
   - Dynamic Availability: Availability count is **never stored as a static column**; it is dynamically computed in real-time from `COUNT(copy_id) WHERE status = 'Available'`, preventing anomalies and race conditions.
2. **ACID Concurrency & Row-Level Locking:**
   - Every checkout, waitlist join and return first locks that book's row with `SELECT ... FROM books WHERE book_id = :id FOR UPDATE`, and a checkout also locks the student's row to protect their quota. Concurrent requests for a title run one after the other.
   - Storage-engine level uniqueness guarantee:
     ```sql
     CREATE UNIQUE INDEX idx_single_active_loan_per_copy 
     ON circulation_loans(copy_id) 
     WHERE return_date IS NULL;
     ```
3. **Student-Raised Returns & Automated Reservation Promotion:**
   - A student raises a return at the Library Kiosk, giving the code on the book's label and its condition. It reaches the admin portal only then.
   - When a librarian confirms it (`confirm_return_request`), the database function checks `waitlist_reservations` for the oldest waiting student (`ORDER BY created_at ASC, reservation_id ASC LIMIT 1`).
   - If a waiting student exists, the copy is atomically assigned to the #1 waitlisted student (`issued_via = 'Waitlist Auto-Fulfill'`).
   - The waitlist entry is marked `Fulfilled`, and the remaining queue positions auto-reindex.
4. **Unique Physical Copies:**
   - Each physical book has one unique code (`book_copies.barcode`). Borrowing asks for it, and the loan links that copy to the student's profile.
   - Each loan records the copy's condition when it left and when it came back, so damage traces to one borrower even when two identical books come back on the same day.
5. **The Database Is the API:**
   - The three websites talk to Supabase directly. Sign-in goes through Supabase Auth, and everything else calls a PostgreSQL function, which checks who is calling, applies the rules and returns JSON.
   - The browser can't read or write any table. Only those functions can, and each one decides what this caller may do.
6. **Accounts & Access:**
   - Anyone can sign up as a student. Signing up as library staff needs a staff code kept in the database, where the browser can't read it.
   - Students can only borrow and raise returns at a registered kiosk, which holds a kiosk key. Librarians can do both from anywhere.

---

## 📖 B.Tech CSBS Prescribed Textbooks & O'Reilly Counterparts

Every subject module in the 5-Year Integrated CSBS curriculum is paired with a corresponding O'Reilly industry standard reference:

| # | Subject Area | Prescribed Syllabus Textbook | O'Reilly Professional Alternative |
| :-: | :--- | :--- | :--- |
| 1 | **Discrete Mathematics** | *Discrete Mathematical Structures* (Tremblay & Manohar) | *Mastering Algorithms with C* (Kyle Loudon) |
| 2 | **Algorithms & Data Structures** | *Introduction to Algorithms (CLRS)* (Cormen et al.) | *Algorithms in a Nutshell* (George Heineman et al.) |
| 3 | **Object-Oriented Programming** | *Java: The Complete Reference* (Herbert Schildt) | *Head First Java: A Brain-Friendly Guide* (Kathy Sierra et al.) |
| 4 | **Computer Architecture** | *Computer Organization and Design* (Patterson & Hennessy) | *Designing Embedded Hardware* (John Catsoulis) |
| 5 | **Automata & Formal Languages** | *Introduction to Automata Theory* (Hopcroft, Motwani, Ullman) | *Mastering Regular Expressions* (Jeffrey Friedl) |
| 6 | **Operating Systems** | *Operating System Concepts* (Silberschatz, Galvin, Gagne) | *Linux System Programming* (Robert Love) |
| 7 | **Database Management Systems** | *Database System Concepts* (Silberschatz, Korth, Sudarshan) | *Designing Data-Intensive Applications* (Martin Kleppmann) |
| 8 | **Software Engineering** | *Software Engineering: A Practitioner's Approach* (Pressman) | *Software Engineering at Google* (Winters et al.) |
| 9 | **Computer Networks** | *Computer Networks* (Tanenbaum & Wetherall) | *High Performance Browser Networking* (Ilya Grigorik) |
| 10 | **Compiler Design** | *Compilers: Principles, Techniques, and Tools* (Dragon Book) | *flex & bison: Text Processing Tools* (John Levine) |
| 11 | **Principles of Management** | *Principles of Management* (P.C. Tripathi, P.N. Reddy) | *The Manager's Path* (Camille Fournier) |
| 12 | **Financial Management** | *Financial Management: Theory & Practice* (Prasanna Chandra) | *Python for Finance* (Yves Hilpisch) |
| 13 | **Business Strategy** | *Contemporary Strategy Analysis* (Robert M. Grant) | *Technology Strategy Patterns* (Eben Hewitt) |
| 14 | **Design Thinking & Innovation** | *The Design of Business* (Roger L. Martin, Harvard) | *Designing Interfaces: Patterns for Interaction* (Tidwell) |
| 15 | **Data Mining & Analytics** | *Data Mining: Concepts and Techniques* (Han, Kamber, Pei) | *Python for Data Analysis* (Wes McKinney) |
| 16 | **Machine Learning & AI** | *Pattern Recognition and Machine Learning* (Bishop) | *Hands-On Machine Learning with Scikit-Learn* (Géron) |
| 17 | **Information Security** | *Cryptography and Network Security* (William Stallings) | *Network Security Assessment* (Chris McNab) |
| 18 | **Cloud Computing** | *Cloud Computing: Principles and Paradigms* (Buyya et al.) | *Kubernetes: Up and Running* (Burns, Beda, Hightower) |
| 19 | **Banking Tech & FinTech** | *Principles and Practices of Banking* (IIBF official text) | *Mastering Bitcoin: The Open Blockchain* (Antonopoulos) |
| 20 | **Operations Research** | *Operations Research: An Introduction* (Hamdy A. Taha) | *Data Science for Business* (Provost & Fawcett) |

---

## 🗄️ 3NF Relational Database Schema

```mermaid
erDiagram
    users ||--o{ circulation_loans : "borrows"
    users ||--o{ waitlist_reservations : "reserves"
    books ||--|{ book_copies : "manifests as physical copies"
    books ||--o{ waitlist_reservations : "queued patrons"
    book_copies ||--o{ circulation_loans : "loaned out"

    users {
        int user_id PK
        string full_name
        string email UK
        uuid auth_id UK
        string role "admin | member"
        int max_books_quota
        decimal outstanding_fines
        timestamp created_at
    }

    books {
        int book_id PK
        string isbn UK
        string title
        string author
        string category
        int published_year
        text description
        string cover_url
        string card_tint
        timestamp created_at
    }

    book_copies {
        int copy_id PK
        int book_id FK
        string barcode UK
        string shelf_location
        string status "Available | Issued | Maintenance | Lost"
        string condition
        timestamp created_at
    }

    circulation_loans {
        int loan_id PK
        int copy_id FK
        int user_id FK
        timestamp issue_date
        timestamp due_date
        timestamp return_date "NULL if active"
        decimal fine_assessed
        string issued_via "Direct Checkout | Waitlist Auto-Fulfill"
    }

    waitlist_reservations {
        int reservation_id PK
        int book_id FK
        int user_id FK
        string status "Waiting | Fulfilled | Cancelled"
        timestamp created_at
        timestamp fulfilled_at
    }

    db_audit_logs {
        int log_id PK
        string operation_type
        text sql_summary
        string affected_entities
        timestamp created_at
    }
```

---

## 🚀 Quick Start

There is no server of our own. The three websites talk to a Supabase project, which holds the PostgreSQL database, the sign-ins and the rules.

### 1. Set up Supabase (once)

1. Create a project at [supabase.com](https://supabase.com). Choose a region near you, such as Mumbai.
2. In **Authentication → Sign In / Providers → Email**, turn off **Confirm email**. The demo accounts use made-up addresses that can't receive mail.
3. In the **SQL Editor**, run these three files in order, each as its own query:
   1. `supabase/schema.sql`: the tables and indexes, closed to the browser.
   2. `supabase/functions.sql`: the functions the websites call, and who may call each one.
   3. `supabase/seed.sql`: the function that fills the library with demo data.
4. Still in the SQL Editor, save your settings. Choose your own values:
   ```sql
   INSERT INTO private.settings (name, value) VALUES
       ('staff_signup_code', 'choose-a-staff-code'),
       ('kiosk_key', 'choose-a-long-random-kiosk-key'),
       ('demo_mode', 'on')
   ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;
   ```

### 2. Connect the websites

Copy `frontend/.env.example` to `frontend/.env`. In Supabase, press **Connect**, choose **App Frameworks**, and copy the project URL and the **anon** key into it. Then:

```bash
cd frontend
npm install
```

### 3. Create the demo accounts and fill the library

From the `frontend` folder, with the librarian password you want and the staff code from step 1:

```bash
BOOKBASE_ADMIN_PASSWORD=choose-a-password BOOKBASE_STAFF_SIGNUP_CODE=choose-a-staff-code node scripts/create-demo-accounts.mjs
```

Then run `SELECT private.seed_library();` in the SQL Editor. The Table Editor now shows 7 accounts, 40 books, 78 copies and 2 loans.

### 4. Start the three websites

```bash
python3 run.py
```

The three portals are separate websites, each with its own address and its own sign-in. They share one database, so a book borrowed at the kiosk shows up in the admin portal the next time that page loads its data.

| Site | Address | For | Signs in |
| :--- | :--- | :--- | :--- |
| **Library Kiosk** | [http://localhost:3001](http://localhost:3001) | Borrowing, and raising return requests, at the library | Students |
| **Student Portal** | [http://localhost:3002](http://localhost:3002) | Browsing, due dates and requests from anywhere | Students |
| **Admin Portal** | [http://localhost:3003](http://localhost:3003) | Confirming returns, fines and catalog management | Library staff |

Everyone signs in with their email. Ports are set in `frontend/portals.json`. To work on one site, run `npm run dev:kiosk`, `dev:student` or `dev:admin` in `frontend/`.

**Registering the kiosk:** the first time a student borrows in a browser, BookBase asks for the kiosk key. A librarian enters it once, and that browser is the Library Kiosk from then on. Without a key, only librarians can lend.

### Deploying to Vercel

One Vercel project serves all three sites. `npm run build` produces `frontend/dist/kiosk`, `student` and `admin`.

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the project's environment variables. They are built into the sites.
2. In the project's **Settings → Domains**, add one domain per portal with `kiosk`, `student` or `admin` in its name, such as `bookbase-kiosk.vercel.app`. Each of those addresses then opens its own site.

Without those domains, the same sites are at `/kiosk/`, `/student/` and `/admin/` on the project's main address, which opens the kiosk.

### Settings

| Where | Name | What it does |
| :--- | :--- | :--- |
| `frontend/.env` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Which Supabase project the sites use. The anon key is meant to be public. Never use the service_role key here |
| `private.settings` | `staff_signup_code` | Whoever knows it can sign up as library staff. If it isn't set, nobody can |
| `private.settings` | `kiosk_key` | Registers a browser as the Library Kiosk. If it isn't set, no student can borrow |
| `private.settings` | `demo_mode` | `on` lists the seeded student accounts and their password on the sign-in form. Librarians are never listed. Delete the row to turn it off |

The lending rules (₹2.00 a day for at most 4 days, 14-day loans, a quota of 4, borrowing blocked above ₹25) are small functions at the top of `supabase/functions.sql`.

### Running the Tests

The tests run the SQL on a local PostgreSQL, with a stand-in for what every Supabase project has: its `anon` and `authenticated` roles, `auth.users` and `auth.uid()`. Each call switches role and sets the signed-in user the way Supabase does. Point `TEST_DATABASE_URL` at a server where they may create and drop databases, using a database name containing `test`:

```bash
pip install pytest "psycopg[binary]"
```

```bash
TEST_DATABASE_URL=postgresql://postgres@localhost:5432/bookbase_test python -m pytest supabase/tests
```

---

## 🗂️ Project Structure

```text
BookBase/
├── supabase/
│   ├── schema.sql             # Part 1: tables, indexes, and closing the tables to the browser
│   ├── functions.sql          # Part 2: every rule, as functions the websites call, and who may call them
│   ├── seed.sql               # Part 3: the demo library, as private.seed_library()
│   └── tests/                 # Security, sign-up, circulation and concurrency tests on local PostgreSQL
├── frontend/
│   ├── .env.example           # The Supabase project to use: copy to .env
│   ├── portals.json           # The three sites: each one's port, title and app
│   ├── vite.config.js         # Serves or builds one site, chosen with --mode kiosk|student|admin
│   ├── scripts/create-demo-accounts.mjs   # Signs up the demo accounts through Supabase Auth
│   └── src/
│       ├── portals/           # KioskApp, StudentApp, AdminApp, and the PortalShell they share
│       ├── api/               # The Supabase client, BookBase's data calls, and OpenLibrary lookup
│       ├── hooks/             # Shared state: session, catalog, circulation actions, toasts
│       ├── constants/         # Book categories and portal metadata
│       ├── components/        # Shared UI: layout (navbar, footer), ui (tabs, toast), books (cover)
│       └── features/          # One folder per area: admin, auth, catalog, circulation, requests, shelf
├── database/
│   ├── ER_DIAGRAM.md          # The ER diagram and the rules the database enforces
│   └── demo_queries.sql       # Queries to run in the Supabase SQL Editor during a presentation
└── run.py                     # Starts the three websites
```

### Where new code goes

| To add or change... | Look in |
| :--- | :--- |
| Something the websites can do | A function in `supabase/functions.sql`, granted at the bottom of that file, and a method in `frontend/src/api/bookbase.js`. A test fails if a function is reachable from the browser without being listed in `supabase/tests/test_security.py` |
| Who may do it | `private.require_member()`, `private.require_librarian()` or `private.require_self_or_librarian()` at the top of the function |
| A lending rule (fine rate, quota, loan length) | The small functions at the top of `supabase/functions.sql` |
| A table or column | `supabase/schema.sql`, then whichever functions read or write it |
| A screen on one portal | Build it in `features/`, then add it to that portal's app in `frontend/src/portals/`. Only screens a portal's app imports end up in that site's build |
| A tab in the librarian or student view | `features/admin/tabs/` or `features/shelf/tabs/`, registered in that area's view |

A change to the SQL reaches Supabase only when you run that file again in the SQL Editor. Every file is safe to run again.

Tabs unmount when you switch away from them, so state that must survive a tab switch (such as the matrix search) belongs in the parent view or its hook, not in the tab. Avoid naming a folder `lib/`, `build/` or `dist/`: `.gitignore` excludes them at any depth.

---

## 👥 Seeded User Accounts (`@bookbase.in`)

The student passwords below are public demo credentials. The librarian's is whatever you gave the account script.

| Persona | Role | Email | Password | Pre-Seeded State |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Admin | `admin@bookbase.in` | Your choice | Full circulation desk & inventory management |
| **Tejas** | Member | `tejas@bookbase.in` | `member123` | Borrowed DDIA & CLRS (CLRS overdue) |
| **Akash** | Member | `akash@bookbase.in` | `member123` | Queue #1 on CLRS |
| **Sai Kartikeya** | Member | `saikartikeya@bookbase.in` | `member123` | Clean account ready to borrow / reserve |
| **Biba** | Member | `biba@bookbase.in` | `member123` | Clean account ready to borrow / reserve |
| **Jaidanya** | Member | `jaidanya@bookbase.in` | `member123` | Clean account ready to borrow / reserve |
| **Shashini** | Member | `shashini@bookbase.in` | `member123` | Clean account ready to borrow / reserve |

**Reset Database** in the admin portal puts the library back to this state. It keeps every account, because accounts live in Supabase Auth.

---

## 📡 Database Functions

The websites call these with `supabase.rpc(name, arguments)`. Each runs as one transaction and returns JSON.

| Access | Who can call it |
| :--- | :--- |
| **Anyone** | Signed in or not |
| **Signed in** | Acts on the caller's own account |
| **Owner or librarian** | A student acting on their own data, or a librarian acting on anyone's |
| **Kiosk or librarian** | A student whose browser sends the kiosk key, or a librarian |
| **Librarian** | Librarian accounts only |

| Function | Access | Purpose |
| :--- | :--- | :--- |
| `lending_policy()` | Anyone | The lending rules: fine rate, day limit, loan length, quota, copy conditions |
| `list_books(p_search, p_category, p_availability)` | Anyone | Catalog search with live availability. A signed-in caller also gets their loan and queue place per book. Only librarians see who holds a copy |
| `get_book(p_book_id)` | Anyone | A title with its copies and FIFO queue. Others' names in the queue are hidden |
| `demo_accounts()` | Anyone | Seeded student accounts for the sign-in form, when `demo_mode` is on |
| `registration_problem(...)` | Anyone | Why a sign-up would be refused, checked before calling Supabase Auth |
| `my_profile()` | Anyone | The caller's account, quota and fines, or null when signed out |
| `checkout_book(p_book_id, p_barcode, p_kiosk_key)` | Kiosk or librarian | Lends the copy with that code, with row-level locking |
| `join_waitlist(p_book_id)`, `cancel_reservation(p_reservation_id)` | Owner or librarian | FIFO queue |
| `raise_return_request(p_loan_id, p_barcode, p_condition, p_notes, p_kiosk_key)` | Kiosk or librarian | Asks for a return, giving the code on the book's label |
| `confirm_return_request(p_return_request_id, p_condition)` | Librarian | Completes the return: fine, condition, and the FIFO handoff |
| `reject_return_request(p_return_request_id)` | Librarian | Refuses a request. The loan stays active |
| `user_dashboard(p_user_id)` | Owner or librarian | Active loans, history, queue places and book requests |
| `list_book_requests()`, `create_book_request(...)` | Signed in | A student's own requests. Librarians see everyone's |
| `update_book_request_status(p_request_id, p_status)` | Librarian | Approve, procure or reject a request |
| `admin_overview()`, `grouped_books(p_search)` | Librarian | The circulation desk |
| `create_book(...)` | Librarian | A new title and its copies, each with its own code |
| `settle_fine(p_user_id, p_amount)` | Librarian | Records a fine payment |
| `reset_library()` | Librarian | Puts the library back to the demo state, keeping accounts |

Sign-up goes through Supabase Auth: the trigger `on_auth_user_created` gives every new login its library account, as a librarian only with the right staff code.
