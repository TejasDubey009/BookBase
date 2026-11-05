# BookBase ER diagram

This matches `supabase/schema.sql`. GitHub draws the diagram below. On Supabase, **Database → Schema Visualizer** draws the same relationships from the live tables.

```mermaid
erDiagram
    auth_users ||--|| users : "signs in as"
    users ||--o{ circulation_loans : "borrows"
    users ||--o{ waitlist_reservations : "queues for"
    users ||--o{ book_requests : "asks for"
    users |o--o{ return_requests : "resolves"
    books ||--|{ book_copies : "has physical"
    books ||--o{ waitlist_reservations : "is queued for"
    books |o--o{ book_requests : "is asked for in"
    book_copies ||--o{ circulation_loans : "is lent in"
    circulation_loans ||--o{ return_requests : "is returned through"

    auth_users {
        uuid id PK
        text email
        text encrypted_password
    }

    users {
        int user_id PK
        uuid auth_id FK
        text enrollment_no UK
        text full_name
        text email UK
        text role "admin or member"
        int max_books_quota
        numeric outstanding_fines
        timestamptz created_at
    }

    books {
        int book_id PK
        text isbn UK
        text title
        text author
        text category
        int published_year
        text description
        text cover_url
        text card_tint
        timestamptz created_at
    }

    book_copies {
        int copy_id PK
        int book_id FK
        text barcode UK "the unique code on the label"
        text shelf_location
        text status "Available, Issued, Maintenance or Lost"
        text condition
        timestamptz created_at
    }

    circulation_loans {
        int loan_id PK
        int copy_id FK
        int user_id FK
        timestamptz issue_date
        timestamptz due_date
        timestamptz return_date "null while on loan"
        numeric fine_assessed
        text issued_via
        text condition_at_issue
        text condition_at_return
    }

    return_requests {
        int return_request_id PK
        int loan_id FK
        text reported_condition
        text notes
        text status "Pending, Completed or Rejected"
        timestamptz created_at
        timestamptz resolved_at
        int resolved_by FK
    }

    waitlist_reservations {
        int reservation_id PK
        int book_id FK
        int user_id FK
        text status "Waiting, Fulfilled or Cancelled"
        timestamptz created_at
        timestamptz fulfilled_at
    }

    book_requests {
        int request_id PK
        int user_id FK
        int book_id FK "null for a title not in the catalogue"
        text title
        text author
        text category
        text notes
        text status "Pending, Approved, Procured or Rejected"
        timestamptz created_at
        timestamptz updated_at
    }

    db_audit_logs {
        int log_id PK
        text operation_type
        text sql_summary
        text affected_entities
        timestamptz created_at
    }
```

`auth_users` is Supabase Auth's own `auth.users` table, which keeps every email and password. Each `users` row is one login's library account, linked by `auth_id`, so BookBase never stores a password itself.

`db_audit_logs` has no foreign keys on purpose: it is an append-only history, and it must outlive whatever it describes.

## Rules the database enforces

| Rule | How |
| :--- | :--- |
| A copy can be on only one active loan | Partial unique index `idx_single_active_loan_per_copy` on `copy_id` where `return_date IS NULL` |
| A loan can have only one pending return request | Partial unique index `idx_single_pending_return_per_loan` on `loan_id` where `status = 'Pending'` |
| A student can hold only one waiting spot per title | Partial unique index `idx_unique_active_waitlist_per_user` on `(book_id, user_id)` where `status = 'Waiting'` |
| Each copy has one unique code | `UNIQUE` on `book_copies.barcode` |
| Each login has exactly one library account | `UNIQUE` on `users.auth_id` |
| A copy with loan history can't be deleted, and nor can a student with one | `ON DELETE RESTRICT` on `circulation_loans.copy_id` and `user_id` |
| Fines and quotas stay sensible | `CHECK (outstanding_fines >= 0)`, `CHECK (max_books_quota > 0)`, `CHECK (fine_assessed >= 0)` |
| Status and role columns hold only known values | `CHECK (status IN (...))`, `CHECK (role IN ('admin', 'member'))` |

## Normalisation

- **3NF:** a book's available count isn't stored. It is derived from `book_copies`. A return request stores its loan and not the borrower, because the borrower follows from the loan.
- **Known exception to 1NF:** `books.author` holds co-authors as one comma-separated string.
