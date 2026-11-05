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
   - On PostgreSQL, every checkout, waitlist join and return first locks that book's row with `SELECT book_id FROM books WHERE book_id = :id FOR UPDATE`, and a checkout also locks the student's row to protect their quota. Concurrent requests for a title run one after the other.
   - On the local SQLite fallback, `BEGIN IMMEDIATE` holds the whole database instead.
   - Storage-engine level uniqueness guarantee:
     ```sql
     CREATE UNIQUE INDEX idx_single_active_loan_per_copy 
     ON circulation_loans(copy_id) 
     WHERE return_date IS NULL;
     ```
3. **Student-Raised Returns & Automated Reservation Promotion:**
   - A student raises a return at the Library Kiosk, giving the code on the book's label and its condition. It reaches the admin portal only then.
   - When a librarian confirms it (`POST /api/v1/circulation/return-requests/{id}/confirm`), the backend transaction checks `waitlist_reservations` for the oldest waiting student (`ORDER BY created_at ASC, reservation_id ASC LIMIT 1`).
   - If a waiting student exists, the copy is atomically assigned to the #1 waitlisted student (`issued_via = 'Waitlist Auto-Fulfill'`).
   - The waitlist entry is marked `Fulfilled`, and the remaining queue positions auto-reindex.
4. **Unique Physical Copies:**
   - Each physical book has one unique code (`book_copies.barcode`). Borrowing asks for it, and the loan links that copy to the student's profile.
   - Each loan records the copy's condition when it left and when it came back, so damage traces to one borrower even when two identical books come back on the same day.
5. **Accounts & Access:**
   - Anyone can sign up as a student. Signing up as library staff needs a staff code that only the server knows.
   - The seeded librarian's password is never in this repository. See [Seeded User Accounts](#-seeded-user-accounts-bookbasein).

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
        string password_hash
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

## 🚀 Quick Start (Runs in 1 Minute)

### Local Launch

Install the backend's dependencies once, then start everything. This needs Python and Node.js.

```bash
pip install -r backend/requirements.txt
```

```bash
python3 run.py
```

With no further setup this uses a local SQLite file, seeded on first run. **The terminal prints the librarian's generated password once**, on that first run. To use Supabase instead, see below.

The three portals are separate websites, each with its own address and its own sign-in. They share one API and one database, so a book borrowed at the kiosk shows up in the admin portal the next time that page loads its data.

| Site | Address | For | Signs in |
| :--- | :--- | :--- | :--- |
| **Library Kiosk** | [http://localhost:3001](http://localhost:3001) | Borrowing, and raising return requests, at the library | Students |
| **Student Portal** | [http://localhost:3002](http://localhost:3002) | Browsing, due dates and requests from anywhere | Students |
| **Admin Portal** | [http://localhost:3003](http://localhost:3003) | Confirming returns, fines and catalog management | Library staff |
| **REST API docs** | [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs) | Interactive API reference | Not applicable |

Ports are set in `frontend/portals.json`. To work on one site, run the API and then `npm run dev:kiosk`, `dev:student` or `dev:admin` in `frontend/`. For students to borrow that way, set the same `BOOKBASE_KIOSK_KEY` for the API and for `dev:kiosk`.

### Using Supabase

Supabase runs the database, and its dashboard shows the tables, rows and queries in a browser.

1. Create a project at [supabase.com](https://supabase.com). Choose a region near you, such as Mumbai, because each request has to reach it.
2. Press **Connect** and copy the **Transaction pooler** connection string.
3. Copy `backend/.env.example` to `backend/.env`. Set `DATABASE_URL` to that string, with your database password in place of `[YOUR-PASSWORD]`. If the password contains symbols such as `@` or `/`, URL-encode them.
4. Set `BOOKBASE_ADMIN_PASSWORD` in the same file, then run `python3 run.py`.

The first run creates the tables and fills them. `/api/v1/health` then reports `"database": "PostgreSQL"`, and the tables appear in the dashboard's **Table Editor**. `database/demo_queries.sql` has queries to paste into its **SQL Editor**, and **Database → Schema Visualizer** draws the ER diagram.

Row Level Security is on for every table, with no policies. That closes Supabase's automatic public REST API, and the app and the dashboard still see everything.

To fall back to SQLite, for example if the network fails during a demo, comment out `DATABASE_URL` in `backend/.env` and restart.

### Deploying to Vercel

One Vercel project serves all three sites and the API. `npm run build` produces `frontend/dist/kiosk`, `student` and `admin`.

1. Set up Supabase first, and run the app once locally against it so the tables exist.
2. Set `DATABASE_URL` and `BOOKBASE_SECRET_KEY` in the project's environment variables (see Configuration below). The API refuses to start on Vercel without them.
3. Set `BOOKBASE_KIOSK_KEY` there too, then register each kiosk (see below). Until then, students can't borrow or raise returns.
4. In the project's **Settings → Domains**, add one domain per portal with `kiosk`, `student` or `admin` in its name, such as `bookbase-kiosk.vercel.app` or `admin.yourcollege.edu`. Each of those addresses then opens its own site.

Without those domains, the same sites are at `/kiosk/`, `/student/` and `/admin/` on the project's main address, which opens the kiosk.

### Registering a kiosk

The server only takes a student's borrow or return request if it carries the kiosk key, so the Student Portal, or a direct call to the API, gets a 403. Return requests are included because raising one stops the fine. Librarians can do both from anywhere.

- **Locally**, `run.py` makes a key for each run and gives it to the kiosk's dev server, which adds it to every API request. The browser never sees it, so there is nothing to set up. Anyone who can open `localhost:3001` can borrow and return.
- **On Vercel**, nothing can add the key on the kiosk's behalf, so each device has to be registered. Open the kiosk site on that device, sign in and try to borrow or return a book. The dialog then asks for the kiosk key, and once a librarian has entered it, that browser remembers it. A student opening the kiosk's address from anywhere else can't borrow or return.

The registered browser stores the key, so anyone with access to its developer tools can copy it. Lock the kiosk device down, and change `BOOKBASE_KIOSK_KEY` if the key leaks, which means registering every kiosk again.

### Configuration

| Environment variable | When | What it does |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Required on Vercel** | The PostgreSQL connection string, such as Supabase's. Without it, local runs use a SQLite file. |
| `BOOKBASE_SECRET_KEY` | **Required on Vercel** | Signs session tokens, and must be at least 32 characters. The API refuses to start on Vercel without it. `run.py` generates one for each run, so local sessions end when you restart it. |
| `BOOKBASE_KIOSK_KEY` | **Needed on Vercel for students to borrow** | Students can only borrow, or raise returns, through a kiosk holding this key, and it must be at least 16 characters. Without it, only librarians can do either. `run.py` generates one for each run. Generate one yourself with `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`. |
| `BOOKBASE_ADMIN_PASSWORD` | Recommended | The seeded librarian's password. It also changes the password on an existing database when the API starts. If unset, one is generated when the database is first seeded and printed once. |
| `BOOKBASE_STAFF_SIGNUP_CODE` | Optional | Whoever knows this code can sign up as library staff on the admin portal. If unset, nobody can. |
| `BOOKBASE_DEMO_MODE` | Optional | `1` lists the seeded student accounts and their passwords in the sign-in modal, never a librarian's. `run.py` turns this on. Everywhere else it is off unless you set it, and it should stay off on a public deployment. |
| `BOOKBASE_TOKEN_TTL_MINUTES` | Optional | How long a session lasts. Defaults to 480 (8 hours). |
| `BOOKBASE_CORS_ORIGINS` | Optional | Comma-separated origins allowed to call the API directly from another site. Defaults to the three local portal addresses. Each portal reaches the API through its own address, locally and on Vercel, so it needs nothing here. |

Generate a signing key with:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Locally these can all live in `backend/.env`, which is never committed. `backend/.env.example` lists them.

### Running the Tests

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest
```

The tests use a throwaway SQLite file and never read `backend/.env`. To run them on PostgreSQL, point `TEST_DATABASE_URL` at a server where they may create and drop databases, using a database name that contains `test`:

```bash
TEST_DATABASE_URL=postgresql://postgres@localhost:5432/bookbase_test python -m pytest
```

---

## 🗂️ Project Structure

```text
BookBase/
├── api/index.py               # Vercel serverless entry point (wraps the FastAPI app)
├── backend/
│   ├── .env.example           # Local settings to copy to .env, including the Supabase connection string
│   ├── tests/                 # Permissions, sign-up, circulation and concurrency tests
│   └── app/
│       ├── main.py            # FastAPI app: middleware, error handling, router registration
│       ├── config.py          # Database location and lending policy (loan length, fines, quotas)
│       ├── routers/           # HTTP layer only: each route validates input and calls one service
│       ├── services/          # Business logic: checkout, FIFO waitlist, fines, dashboards
│       ├── schemas/           # Pydantic request/response models, one file per domain
│       ├── db/                # Connections (PostgreSQL or SQLite), transactions, schema, shared SQL, audit log, seed data
│       └── core/              # Cross-cutting helpers: errors, clock, password hashing, session tokens, auth dependencies
├── frontend/
│   ├── portals.json           # The three sites: each one's port, title and app
│   ├── vite.config.js         # Serves or builds one site, chosen with --mode kiosk|student|admin
│   └── src/
│       ├── portals/           # KioskApp, StudentApp, AdminApp, and the PortalShell they share
│       ├── api/               # BookBase REST client and OpenLibrary lookup
│       ├── hooks/             # Shared state: session, catalog, circulation actions, toasts
│       ├── constants/         # Book categories and portal metadata
│       ├── components/        # Shared UI: layout (navbar, footer), ui (tabs, toast), books (cover)
│       └── features/          # One folder per area: admin, auth, catalog, circulation, requests, shelf
└── database/
    ├── ER_DIAGRAM.md          # The ER diagram and the rules the database enforces
    └── demo_queries.sql       # Queries to run in the Supabase SQL Editor during a presentation
```

### Where new code goes

| To add or change... | Look in |
| :--- | :--- |
| An API endpoint | Route in `routers/`, logic in `services/`, models in `schemas/` |
| Who may call an endpoint | `get_current_user` or `require_admin` from `core/auth.py`. A test fails for any route that accepts anonymous callers unless it is listed in `PUBLIC_ROUTES` in `tests/test_permissions.py` |
| A lending rule (fine rate, quota, loan length) | `config.py`, then `services/circulation_service.py` |
| An API error | Raise a class from `core/errors.py` in a service; `main.py` turns it into the HTTP response |
| SQL used by more than one service | `db/queries.py` (SQL used once stays in its service) |
| A table or column | Both `db/schema_postgres.sql` and `SQLITE_SCHEMA_SQL` in `db/schema.py`. A test fails if they differ |
| A screen on one portal | Build it in `features/`, then add it to that portal's app in `frontend/src/portals/`. Only screens a portal's app imports end up in that site's build |
| A tab in the librarian or student view | `features/admin/tabs/` or `features/shelf/tabs/`, registered in that area's view |

Tabs unmount when you switch away from them, so state that must survive a tab switch (such as the matrix search) belongs in the parent view or its hook, not in the tab. Avoid naming a folder `lib/`, `build/` or `dist/`: `.gitignore` excludes them at any depth.

---

## 👥 Seeded User Accounts (`@bookbase.in`)

The student passwords below are public demo credentials, on any database seeded from this repository. The librarian's password isn't in the repository: it is `BOOKBASE_ADMIN_PASSWORD` if you set it, and otherwise is generated and printed once when the database is first seeded.

| Persona | Role | Email | Password | Pre-Seeded State |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Admin | `admin@bookbase.in` | See above | Full circulation desk & inventory management |
| **Tejas** | Member | `tejas@bookbase.in` | `member123` | Borrowed DDIA & CLRS (CLRS overdue) |
| **Akash** | Member | `akash@bookbase.in` | `member123` | Queue #1 on CLRS |
| **Sai Kartikeya** | Member | `saikartikeya@bookbase.in` | `member123` | Clean account ready to borrow / reserve |
| **Biba** | Member | `biba@bookbase.in` | `member123` | Clean account ready to borrow / reserve |
| **Jaidanya** | Member | `jaidanya@bookbase.in` | `member123` | Clean account ready to borrow / reserve |
| **Shashini** | Member | `shashini@bookbase.in` | `member123` | Clean account ready to borrow / reserve |

---

## 📡 REST API Reference

All frontend operations strictly communicate through these endpoints. Each one is also served under `/v1`, with the same rules.

Sign in with `POST /api/v1/auth/login`, then send the token it returns as `Authorization: Bearer <token>`. Tokens are signed and expire after 8 hours by default.

| Access | Who can call it |
| :--- | :--- |
| **Public** | Anyone, with no token |
| **Signed in** | Any valid token. The route acts on the caller's own account |
| **Owner or admin** | A member acting on their own data, or an admin acting on anyone's |
| **Kiosk or admin** | The same, except that a member must also send the kiosk key as `X-BookBase-Kiosk-Key` |
| **Admin** | Librarian accounts only |

- **401** means there is no token, or the token is invalid or expired. A token that is sent must be valid, even on a public route.
- **403** means the token is fine, but the caller's role or account doesn't allow this action.
- Where a body or query takes an optional `user_id`, leaving it out means the caller. A member who passes someone else's id gets 403. An admin can use it to act for a patron.

### Authentication & Profiles

| Route | Access | Purpose |
| :--- | :--- | :--- |
| `POST /api/v1/auth/login` | Public | Authenticate and receive a session token |
| `POST /api/v1/auth/register` | Public | Create a student account and receive a session token. With a valid `staff_code`, creates a librarian account |
| `GET /api/v1/auth/demo-users` | Public | Seeded student accounts for the sign-in modal. Empty unless `BOOKBASE_DEMO_MODE` is on |
| `GET /api/v1/auth/me` | Signed in | The caller's profile, quota and fine status |

### Catalog & 3NF Inventory

| Route | Access | Purpose |
| :--- | :--- | :--- |
| `GET /api/v1/books?search=&category=&availability=&user_id=` | Public | Multi-table aggregated search & availability. A signed-in caller also gets their own loan and waitlist context. Only admins see who holds each copy, or can pass `user_id` |
| `GET /api/v1/books/{book_id}?user_id=` | Public | Full book specifications, copies table and FIFO queue lineup, with the same rules |
| `POST /api/v1/books` | Admin | Register title + initial barcoded copies |
| `POST /api/v1/books/{book_id}/copies` | Admin | Add individual barcoded physical copy |

`waitlist_entries[]` on book detail lists `reservation_id`, `queue_position`, `created_at`, `user_id` and `user_name` in queue order. `user_id` and `user_name` are only set for admins and for the caller's own entry, and email and enrollment number are never included. `GET /books` does not include it.

### Circulation & Waitlist Mechanics

| Route | Access | Purpose |
| :--- | :--- | :--- |
| `POST /api/v1/circulation/checkout` | Kiosk or admin | Atomic loan checkout with row-level locking. `barcode` names the physical copy |
| `POST /api/v1/circulation/waitlist` | Owner or admin | Atomic FIFO queue registration |
| `DELETE /api/v1/circulation/waitlist/{id}` | Owner or admin | Cancel waiting reservation |
| `POST /api/v1/circulation/return-requests` | Kiosk or admin | Raise a return, with `loan_id`, the `barcode` on the book's label, its `condition` and optional `notes` |
| `POST /api/v1/circulation/return-requests/{id}/confirm` | Admin | Complete the return with the `condition` the librarian saw: fine calculation & automated FIFO waitlist handoff |
| `POST /api/v1/circulation/return-requests/{id}/reject` | Admin | Refuse a request. The loan stays active and the student can raise it again |
| `GET /api/v1/policy` | Public | The lending rules from `config.py`: `overdue_fine_rate_per_day`, `max_fine_days`, `loan_duration_days`, `max_loans_per_user` and `copy_conditions`. The footer shows them before sign-in. `max_loans_per_user` is the quota new accounts get; checkout enforces each account's stored `max_books_quota`, so changing it does not affect existing accounts |

### Student Book Requests

| Route | Access | Purpose |
| :--- | :--- | :--- |
| `GET /api/v1/requests?user_id=` | Signed in | Members get their own requests. Admins get everyone's, or one patron's with `user_id` |
| `POST /api/v1/requests` | Owner or admin | Submit a book acquisition request |
| `PATCH /api/v1/requests/{request_id}` | Admin | Approve, procure or reject a request |

### Dashboards & Admin

| Route | Access | Purpose |
| :--- | :--- | :--- |
| `GET /api/v1/users/{user_id}/dashboard` | Owner or admin | Active loans, countdowns, waitlist cards, borrowing history |
| `GET /api/v1/admin/overview` | Admin | Library KPIs, pending return requests, circulation desk table, global waitlist lineup, student fines ledger |
| `GET /api/v1/admin/grouped-books?search=` | Admin | Curriculum titles with their borrower history |
| `POST /api/v1/admin/settle-fine` | Admin | Record a fine payment. Send `user_id` and optionally `amount_settled`; leaving it out settles the full balance. An amount above the balance is capped at the balance. Returns `400` if the amount is zero or negative |
| `POST /api/v1/admin/reset-demo` | Admin | 1-click database reset to initial demo state. Ends every other session and returns a new token for the caller |
| `GET /api/v1/telemetry/logs` | Admin | DBMS audit log, which names patrons and what they borrowed |
| `GET /api/v1/health` | Public | Health check |

- `student_fines[]` in the overview: `user_id`, `full_name`, `enrollment_no`, `email`, `outstanding_fines`, highest balance first. Lists every student, plus any other account with a balance, so it adds up to `kpis.total_fines`.
- `waitlist_queue[].user_enrollment_no` in the overview: the waiting patron's enrollment number.
- `waitlist_count` on grouped books, and on `grouped_books[]` in the overview: patrons waiting for the title.

### Fine fields on loans
Loans in the dashboard and overview, and `borrowers[]` in the grouped books, carry `accrued_fine`. On a loan still out it is what returning the copy now would charge, using the daily rate in `config.py`; on a returned loan it is what was charged. Loans also carry `days_overdue`, the days that fine is based on. A fine only adds to `outstanding_fines` when the copy is returned, so an overdue loan still out does not appear in `student_fines`.
