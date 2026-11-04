from fastapi import APIRouter, Depends, HTTPException, status
import sqlite3
import datetime
from typing import List
from app.database import get_db, log_audit
from app.seed_data import verify_password, hash_password
from app.schemas import LoginRequest, RegisterRequest, LoginResponse, UserOut, DemoUserOut

router = APIRouter(prefix="/auth", tags=["Authentication & Profiles"])

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    # Support login via enrollment_no, email, or identifier
    raw_ident = (payload.identifier or payload.enrollment_no or payload.email or "").strip()
    if not raw_ident:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide an enrollment number or email"
        )

    cursor.execute(
        """
        SELECT user_id, enrollment_no, full_name, email, password_hash, role, max_books_quota, outstanding_fines
        FROM users
        WHERE LOWER(enrollment_no) = LOWER(?) OR LOWER(email) = LOWER(?)
        """,
        (raw_ident, raw_ident)
    )
    user_row = cursor.fetchone()

    if not user_row or not verify_password(payload.password, user_row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid enrollment number/email or password"
        )

    # Optional role check for role tabs
    if payload.role and payload.role.lower() != user_row["role"].lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is registered as a {user_row['role']}, not {payload.role}"
        )

    # Count active loans
    cursor.execute(
        "SELECT COUNT(*) FROM circulation_loans WHERE user_id = ? AND return_date IS NULL",
        (user_row["user_id"],)
    )
    active_loans_count = cursor.fetchone()[0]

    user_out = UserOut(
        user_id=user_row["user_id"],
        enrollment_no=user_row["enrollment_no"] or f"STU{user_row['user_id']:05d}",
        full_name=user_row["full_name"],
        email=user_row["email"],
        role=user_row["role"],
        max_books_quota=user_row["max_books_quota"],
        outstanding_fines=float(user_row["outstanding_fines"]),
        active_loans_count=active_loans_count
    )

    token = f"bb_token_{user_row['user_id']}_{user_row['role']}"
    return LoginResponse(token=token, user=user_out)

@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    enrollment = payload.enrollment_no.strip().upper()
    email = payload.email.strip().lower()
    full_name = payload.full_name.strip()
    pwd = payload.password.strip()

    if not enrollment or not email or not full_name or not pwd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name, enrollment number, email, and password are all required."
        )

    # Check for duplicate enrollment number
    cursor.execute("SELECT user_id FROM users WHERE UPPER(enrollment_no) = ?", (enrollment,))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Enrollment number '{enrollment}' is already registered. Please sign in instead."
        )

    # Check for duplicate email
    cursor.execute("SELECT user_id FROM users WHERE LOWER(email) = ?", (email,))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{email}' is already registered. Please sign in instead."
        )

    hashed_pw = hash_password(pwd)
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    cursor.execute(
        """
        INSERT INTO users (full_name, enrollment_no, email, password_hash, role, max_books_quota, outstanding_fines, created_at)
        VALUES (?, ?, ?, ?, 'member', 4, 0.0, ?)
        """,
        (full_name, enrollment, email, hashed_pw, now_iso)
    )
    db.commit()
    new_user_id = cursor.lastrowid

    log_audit(
        db,
        "TX_REGISTER_STUDENT",
        f"New student patron registered: {full_name} ({enrollment})",
        f"user_id: {new_user_id}, enrollment_no: {enrollment}, email: {email}"
    )
    db.commit()

    user_out = UserOut(
        user_id=new_user_id,
        enrollment_no=enrollment,
        full_name=full_name,
        email=email,
        role="member",
        max_books_quota=4,
        outstanding_fines=0.0,
        active_loans_count=0
    )

    token = f"bb_token_{new_user_id}_member"
    return LoginResponse(token=token, user=user_out)

@router.get("/demo-users", response_model=List[DemoUserOut])
def get_demo_users(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT user_id, enrollment_no, full_name, email, role, max_books_quota, outstanding_fines
        FROM users
        ORDER BY user_id ASC
        """
    )
    users = cursor.fetchall()
    
    demo_profiles = []
    for u in users:
        label = "Chief Librarian" if u["role"] == "admin" else "Student Patron"
        pwd = "admin123" if u["role"] == "admin" else "member123"
        en_no = u["enrollment_no"] or f"STU{u['user_id']:05d}"
        demo_profiles.append(
            DemoUserOut(
                user_id=u["user_id"],
                enrollment_no=en_no,
                full_name=u["full_name"],
                email=u["email"],
                role=u["role"],
                label=f"{u['full_name']} ({en_no} • {label})",
                sample_password=pwd,
                max_books_quota=u["max_books_quota"],
                outstanding_fines=float(u["outstanding_fines"])
            )
        )
    return demo_profiles

@router.get("/me", response_model=UserOut)
def get_current_user(user_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT user_id, enrollment_no, full_name, email, role, max_books_quota, outstanding_fines
        FROM users
        WHERE user_id = ?
        """,
        (user_id,)
    )
    user_row = cursor.fetchone()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    cursor.execute(
        "SELECT COUNT(*) FROM circulation_loans WHERE user_id = ? AND return_date IS NULL",
        (user_id,)
    )
    active_loans_count = cursor.fetchone()[0]

    return UserOut(
        user_id=user_row["user_id"],
        enrollment_no=user_row["enrollment_no"] or f"STU{user_row['user_id']:05d}",
        full_name=user_row["full_name"],
        email=user_row["email"],
        role=user_row["role"],
        max_books_quota=user_row["max_books_quota"],
        outstanding_fines=float(user_row["outstanding_fines"]),
        active_loans_count=active_loans_count
    )

