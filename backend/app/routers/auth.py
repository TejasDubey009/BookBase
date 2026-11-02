from fastapi import APIRouter, Depends, HTTPException, status
import sqlite3
from typing import List
from app.database import get_db
from app.seed_data import verify_password
from app.schemas import LoginRequest, LoginResponse, UserOut, DemoUserOut

router = APIRouter(prefix="/auth", tags=["Authentication & Profiles"])

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT user_id, full_name, email, password_hash, role, max_books_quota, outstanding_fines
        FROM users
        WHERE LOWER(email) = LOWER(?)
        """,
        (payload.email.strip(),)
    )
    user_row = cursor.fetchone()

    if not user_row or not verify_password(payload.password, user_row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
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
        full_name=user_row["full_name"],
        email=user_row["email"],
        role=user_row["role"],
        max_books_quota=user_row["max_books_quota"],
        outstanding_fines=float(user_row["outstanding_fines"]),
        active_loans_count=active_loans_count
    )

    token = f"bb_token_{user_row['user_id']}_{user_row['role']}"
    return LoginResponse(token=token, user=user_out)

@router.get("/demo-users", response_model=List[DemoUserOut])
def get_demo_users(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT user_id, full_name, email, role, max_books_quota, outstanding_fines
        FROM users
        ORDER BY user_id ASC
        """
    )
    users = cursor.fetchall()
    
    demo_profiles = []
    for u in users:
        label = "Chief Librarian" if u["role"] == "admin" else "Student Patron"
        pwd = "admin123" if u["role"] == "admin" else "member123"
        demo_profiles.append(
            DemoUserOut(
                user_id=u["user_id"],
                full_name=u["full_name"],
                email=u["email"],
                role=u["role"],
                label=f"{u['full_name']} ({label})",
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
        SELECT user_id, full_name, email, role, max_books_quota, outstanding_fines
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
        full_name=user_row["full_name"],
        email=user_row["email"],
        role=user_row["role"],
        max_books_quota=user_row["max_books_quota"],
        outstanding_fines=float(user_row["outstanding_fines"]),
        active_loans_count=active_loans_count
    )

