import sqlite3

from fastapi import APIRouter, Depends

from app.db.connection import get_db
from app.schemas.circulation import (
    CheckoutRequest,
    CheckoutResponse,
    ReturnRequest,
    ReturnResponse,
    WaitlistRequest,
    WaitlistResponse,
)
from app.services import circulation_service

router = APIRouter(prefix="/circulation", tags=["Circulation & FIFO Waitlist Engine"])


@router.post("/checkout", response_model=CheckoutResponse)
def checkout_book(payload: CheckoutRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Atomic Checkout Transaction:
    1. Validates user's loan quota and outstanding fines.
    2. Validates user does not already hold this title.
    3. Locks first available physical copy (status = 'Available').
    4. Creates active circulation loan and updates copy status to 'Issued'.
    5. Fulfills any active waitlist reservation for this user on this book.
    6. Logs TX_CHECKOUT to db_audit_logs.
    """
    return circulation_service.checkout(db, payload)


@router.post("/waitlist", response_model=WaitlistResponse)
def join_waitlist(payload: WaitlistRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    FIFO Waitlist Registration:
    1. Validates that 0 copies are currently available.
    2. Validates patron doesn't already hold an active loan or reservation.
    3. Inserts into waitlist_reservations.
    4. Computes patron's 1-based FIFO position.
    5. Logs TX_WAITLIST_JOIN to db_audit_logs.
    """
    return circulation_service.join_waitlist(db, payload)


@router.delete("/waitlist/{reservation_id}")
def cancel_waitlist(reservation_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Cancels an active waitlist reservation.
    """
    return circulation_service.cancel_reservation(db, reservation_id)


@router.post("/return", response_model=ReturnResponse)
def return_book(payload: ReturnRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    CRITICAL WAITLIST HANDOFF & AUTO-ASSIGNMENT ENGINE:
    1. Verify loan is active (return_date IS NULL).
    2. Mark return_date = NOW(), assess fines ($2.00/day if overdue).
    3. Query waitlist_reservations for oldest 'Waiting' entry (ORDER BY created_at ASC, reservation_id ASC LIMIT 1).
    4. IF waitlisted user found (#1 in line):
       - Mark waitlist row as 'Fulfilled' (fulfilled_at = NOW()).
       - Auto-insert new row into circulation_loans for this copy_id and waitlisted_user_id (issued_via = 'Waitlist Auto-Fulfill').
       - Keep copy status as 'Issued'.
       - Log TRIGGER_WAITLIST_AUTO_CHECKOUT in db_audit_logs.
    5. ELSE (no waitlist):
       - Set copy status = 'Available'.
       - Log TX_RETURN_TO_SHELF in db_audit_logs.
    """
    return circulation_service.return_book(db, payload)
