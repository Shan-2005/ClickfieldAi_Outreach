from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from pydantic import BaseModel
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.db.models import User, UserSession, ActionLog
from app.core.auth import (
    hash_password, verify_password, create_user_session,
    get_current_user, get_current_user_optional, require_admin,
    SESSION_COOKIE_NAME
)

router = APIRouter(prefix="/auth", tags=["Authentication & Team"])

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreateRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "SALES"
    mailbox_username: Optional[str] = None
    daily_send_cap: int = 15

class UserRoleUpdate(BaseModel):
    role: str

class ResetPasswordRequest(BaseModel):
    new_password: str

class SenderProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    sender_signature: Optional[str] = None
    sender_address: Optional[str] = None
    mailbox_username: Optional[str] = None
    daily_send_cap: Optional[int] = None

@router.post("/login")
async def login(payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == payload.email.lower().strip())
    res = await db.execute(stmt)
    user = res.scalars().first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account has been deactivated."
        )

    session = await create_user_session(db, user.id)

    # Set 8-hour HttpOnly session cookie
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session.session_id,
        httponly=True,
        max_age=8 * 3600,
        samesite="lax",
        secure=False # allows HTTP in local dev/office LAN, works over HTTPS when configured
    )

    return {
        "status": "success",
        "token": session.session_id,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "ics_token": user.ics_token,
            "daily_send_cap": user.daily_send_cap,
            "daily_sends_today": user.daily_sends_today
        }
    }

@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        stmt = select(UserSession).where(UserSession.session_id == token)
        res = await db.execute(stmt)
        sess = res.scalars().first()
        if sess:
            await db.delete(sess)
            await db.commit()

    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"status": "success", "message": "Logged out successfully."}

@router.get("/me")
async def get_me(request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    if not user:
        # Check if any user exists in DB to return primary default if in single-user mode
        res = await db.execute(select(User).where(User.is_active == True).limit(1))
        default_user = res.scalars().first()
        if default_user:
            return {
                "authenticated": False,
                "can_auto_login": True,
                "suggested_user": {
                    "email": default_user.email,
                    "full_name": default_user.full_name,
                    "role": default_user.role
                }
            }
        return {"authenticated": False, "user": None}

    return {
        "authenticated": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "ics_token": user.ics_token,
            "sender_signature": user.sender_signature,
            "sender_address": user.sender_address,
            "mailbox_username": user.mailbox_username,
            "daily_send_cap": user.daily_send_cap,
            "daily_sends_today": user.daily_sends_today
        }
    }

@router.patch("/me/profile")
async def update_my_profile(payload: SenderProfileUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.sender_signature is not None:
        current_user.sender_signature = payload.sender_signature
    if payload.sender_address is not None:
        current_user.sender_address = payload.sender_address
    if payload.mailbox_username is not None:
        current_user.mailbox_username = payload.mailbox_username
    if payload.daily_send_cap is not None:
        current_user.daily_send_cap = payload.daily_send_cap

    await db.commit()
    await db.refresh(current_user)
    return {"status": "success", "message": "Sender profile updated."}

# --- ADMIN USER MANAGEMENT (Admin only) ---

@router.get("/users")
async def list_team_users(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(User).order_by(User.created_at.asc())
    res = await db.execute(stmt)
    users = res.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "daily_send_cap": u.daily_send_cap,
            "daily_sends_today": u.daily_sends_today,
            "mailbox_username": u.mailbox_username,
            "created_at": u.created_at.isoformat()
        }
        for u in users
    ]

@router.post("/users/invite")
async def invite_user(payload: UserCreateRequest, current_user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == payload.email.lower().strip())
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")

    new_user = User(
        email=payload.email.lower().strip(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role.upper(),
        mailbox_username=payload.mailbox_username or payload.email.lower().strip(),
        daily_send_cap=payload.daily_send_cap
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Log in action log
    log = ActionLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        action_type="USER_INVITED",
        details=f"Admin {current_user.full_name} invited {new_user.full_name} ({new_user.email}) as {new_user.role}"
    )
    db.add(log)
    await db.commit()

    return {"status": "success", "user_id": new_user.id, "email": new_user.email}

@router.patch("/users/{user_id}/role")
async def change_user_role(user_id: str, payload: UserRoleUpdate, current_user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    old_role = user.role
    user.role = payload.role.upper()
    await db.commit()

    log = ActionLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        action_type="ROLE_CHANGED",
        details=f"Admin {current_user.full_name} changed {user.full_name} role from {old_role} to {user.role}"
    )
    db.add(log)
    await db.commit()

    return {"status": "success", "user_id": user.id, "role": user.role}

@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, current_user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.is_active = not user.is_active
    await db.commit()

    log = ActionLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        action_type="USER_STATUS_TOGGLED",
        details=f"Admin {current_user.full_name} toggled active state of {user.full_name} to {user.is_active}"
    )
    db.add(log)
    await db.commit()

    return {"status": "success", "user_id": user.id, "is_active": user.is_active}

@router.post("/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, payload: ResetPasswordRequest, current_user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = hash_password(payload.new_password)
    await db.commit()

    log = ActionLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        action_type="PASSWORD_RESET",
        details=f"Admin {current_user.full_name} reset password for {user.full_name}"
    )
    db.add(log)
    await db.commit()

    return {"status": "success", "message": f"Password reset for {user.full_name}."}
