from typing import List

from fastapi import APIRouter, Depends, status

from app.core.auth import get_current_user
from app.core.security import CurrentUser
from app.db.connection import get_db
from app.db.types import Connection
from app.schemas.auth import DemoUserOut, LoginRequest, LoginResponse, RegisterRequest, UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication & Profiles"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Connection = Depends(get_db)):
    return auth_service.login(db, payload)


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Connection = Depends(get_db)):
    return auth_service.register(db, payload)


@router.get("/demo-users", response_model=List[DemoUserOut])
def get_demo_users(db: Connection = Depends(get_db)):
    return auth_service.list_demo_users(db)


@router.get("/me", response_model=UserOut)
def get_my_profile(actor: CurrentUser = Depends(get_current_user), db: Connection = Depends(get_db)):
    return auth_service.get_profile(db, actor.user_id)
