import uuid
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from database import get_db
import models
from auth_utils import hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    timezone: str = "Asia/Kolkata"

class LoginRequest(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    theme: Optional[str] = None
    avatar_color: Optional[str] = None
    notification_prefs: Optional[dict] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class AuthResponse(BaseModel):
    token: str
    user_id: str
    email: str
    name: str
    theme: str
    avatar_color: str
    timezone: str


def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> models.User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization header missing")
    token = authorization.split(" ", 1)[1]
    u = db.query(models.User).filter(models.User.auth_token == token).first()
    if not u:
        raise HTTPException(401, "Invalid or expired token")
    return u


def _user_response(user: models.User, token: str) -> AuthResponse:
    return AuthResponse(
        token=token, user_id=user.id, email=user.email, name=user.name,
        theme=user.theme, avatar_color=user.avatar_color, timezone=user.timezone,
    )


@router.post("/register", response_model=AuthResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    token = str(uuid.uuid4())
    user = models.User(
        id=str(uuid.uuid4()), email=data.email,
        password_hash=hash_password(data.password),
        name=data.name, auth_token=token, timezone=data.timezone,
    )
    db.add(user)
    # Create default labels
    for name, color in [("Work", "#3B82F6"), ("Personal", "#10B981"), ("Health", "#EF4444"), ("Learning", "#F59E0B")]:
        db.add(models.Label(id=str(uuid.uuid4()), user_id=user.id, name=name, color=color))
    db.commit()
    return _user_response(user, token)


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    user.auth_token = str(uuid.uuid4())
    db.commit()
    return _user_response(user, user.auth_token)


@router.post("/logout")
def logout(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.auth_token = None
    db.commit()
    return {"message": "Logged out"}


@router.get("/me", response_model=AuthResponse)
def me(user: models.User = Depends(get_current_user)):
    return _user_response(user, user.auth_token or "")


@router.put("/profile", response_model=AuthResponse)
def update_profile(data: ProfileUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.name is not None: user.name = data.name
    if data.timezone is not None: user.timezone = data.timezone
    if data.theme is not None: user.theme = data.theme
    if data.avatar_color is not None: user.avatar_color = data.avatar_color
    if data.notification_prefs is not None: user.notification_prefs = data.notification_prefs
    db.commit()
    return _user_response(user, user.auth_token or "")


@router.post("/change-password")
def change_password(data: PasswordChange, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    user.password_hash = hash_password(data.new_password)
    user.auth_token = str(uuid.uuid4())  # invalidate other sessions
    db.commit()
    return {"message": "Password changed", "token": user.auth_token}
