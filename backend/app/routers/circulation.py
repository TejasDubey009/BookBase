
from fastapi import APIRouter, Depends, status

from app.core.auth import get_current_user, require_admin
from app.core.security import CurrentUser, resolve_target_user
from app.db.connection import get_db
from app.db.types import Connection
from app.schemas.circulation import (
    CheckoutRequest,
    CheckoutResponse,
    ReturnRequestConfirm,
    ReturnRequestCreate,
    ReturnResponse,
    WaitlistRequest,
    WaitlistResponse,
)
from app.services import circulation_service

router = APIRouter(prefix="/circulation", tags=["Circulation & FIFO Waitlist Engine"])


@router.post("/checkout", response_model=CheckoutResponse)
def checkout_book(
    payload: CheckoutRequest,
    actor: CurrentUser = Depends(get_current_user),
    db: Connection = Depends(get_db)
):
    """
    Atomic Checkout Transaction:
    1. Validates user's loan quota and outstanding fines.
    2. Validates user does not already hold this title.
    3. Locks first available physical copy (status = 'Available').
    4. Creates active circulation loan and updates copy status to 'Issued'.
    5. Fulfills any active waitlist reservation for this user on this book.
    6. Logs TX_CHECKOUT to db_audit_logs.
    """
    return circulation_service.checkout(db, payload, user_id=resolve_target_user(actor, payload.user_id))


@router.post("/waitlist", response_model=WaitlistResponse)
def join_waitlist(
    payload: WaitlistRequest,
    actor: CurrentUser = Depends(get_current_user),
    db: Connection = Depends(get_db)
):
    """
    FIFO Waitlist Registration:
    1. Validates that 0 copies are currently available.
    2. Validates patron doesn't already hold an active loan or reservation.
    3. Inserts into waitlist_reservations.
    4. Computes patron's 1-based FIFO position.
    5. Logs TX_WAITLIST_JOIN to db_audit_logs.
    """
    return circulation_service.join_waitlist(db, payload, user_id=resolve_target_user(actor, payload.user_id))


@router.delete("/waitlist/{reservation_id}")
def cancel_waitlist(
    reservation_id: int,
    actor: CurrentUser = Depends(get_current_user),
    db: Connection = Depends(get_db)
):
    """
    Cancels an active waitlist reservation.
    """
    return circulation_service.cancel_reservation(db, reservation_id, actor)


@router.post("/return-requests", status_code=status.HTTP_201_CREATED)
def raise_return_request(
    payload: ReturnRequestCreate,
    actor: CurrentUser = Depends(get_current_user),
    db: Connection = Depends(get_db)
):
    """
    A student asks to return a loan, giving the code on the book's label and its condition.
    The request then appears in the admin portal, where a librarian confirms or rejects it.
    """
    return circulation_service.raise_return_request(db, payload, actor)


@router.post("/return-requests/{return_request_id}/confirm", response_model=ReturnResponse)
def confirm_return_request(
    return_request_id: int,
    payload: ReturnRequestConfirm,
    actor: CurrentUser = Depends(require_admin),
    db: Connection = Depends(get_db)
):
    """
    CRITICAL WAITLIST HANDOFF & AUTO-ASSIGNMENT ENGINE:
    1. Verify the request is still pending.
    2. Mark return_date = when the student raised it, assess fines (rate and day limit in config.py) if overdue.
    3. Record the condition the librarian saw on the loan and the copy.
    4. Query waitlist_reservations for oldest 'Waiting' entry (ORDER BY created_at ASC, reservation_id ASC LIMIT 1).
    5. IF waitlisted user found (#1 in line):
       - Mark waitlist row as 'Fulfilled' (fulfilled_at = NOW()).
       - Auto-insert new row into circulation_loans for this copy_id and waitlisted_user_id (issued_via = 'Waitlist Auto-Fulfill').
       - Keep copy status as 'Issued'.
       - Log TRIGGER_WAITLIST_AUTO_CHECKOUT in db_audit_logs.
    6. ELSE (no waitlist):
       - Set copy status = 'Available'.
       - Log TX_RETURN_TO_SHELF in db_audit_logs.
    """
    return circulation_service.confirm_return_request(db, return_request_id, payload, actor)


@router.post("/return-requests/{return_request_id}/reject")
def reject_return_request(
    return_request_id: int,
    actor: CurrentUser = Depends(require_admin),
    db: Connection = Depends(get_db)
):
    """Rejects a request raised without the book being handed in. The loan stays active."""
    return circulation_service.reject_return_request(db, return_request_id, actor)
