import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.config import settings
from app.services.smtp_service import test_mailbox_connection
from app.services.scheduler import last_backup_info, scheduler

router = APIRouter(prefix="/mailbox", tags=["Mailbox Settings & Diagnostics"])

class MailboxSettingsUpdate(BaseModel):
    smtp_host: str
    smtp_port: int
    imap_host: str
    imap_port: int
    username: str
    send_mode: str # "smtp" | "manual"
    auto_send_approved_followups: bool

class ConnectionTestRequest(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    imap_host: Optional[str] = None
    imap_port: Optional[int] = None
    username: Optional[str] = None

@router.get("/settings")
async def get_mailbox_settings():
    """
    Returns public mailbox settings.
    Strictly: MAIL_PASSWORD is NEVER returned or stored in DB.
    """
    return {
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "imap_host": settings.IMAP_HOST,
        "imap_port": settings.IMAP_PORT,
        "username": settings.MAIL_USERNAME,
        "send_mode": settings.SEND_MODE,
        "auto_send_approved_followups": settings.AUTO_SEND_APPROVED_FOLLOWUPS,
        "has_password_configured": bool(settings.MAIL_PASSWORD)
    }

@router.post("/settings")
async def update_mailbox_settings(payload: MailboxSettingsUpdate):
    """Updates runtime mailbox parameters (password remains strictly in .env)."""
    settings.SMTP_HOST = payload.smtp_host
    settings.SMTP_PORT = payload.smtp_port
    settings.IMAP_HOST = payload.imap_host
    settings.IMAP_PORT = payload.imap_port
    settings.MAIL_USERNAME = payload.username
    settings.SEND_MODE = payload.send_mode
    settings.AUTO_SEND_APPROVED_FOLLOWUPS = payload.auto_send_approved_followups
    return {"status": "success", "message": "Mailbox settings updated."}

@router.post("/test-connection")
async def test_connection(payload: ConnectionTestRequest):
    """
    Step-by-step diagnostic test:
    1. SMTP handshake
    2. SMTP authentication
    3. Self-test email dispatch to username
    4. IMAP handshake
    5. IMAP authentication
    6. Read 1 INBOX message header
    """
    smtp_h = payload.smtp_host or settings.SMTP_HOST
    smtp_p = payload.smtp_port or settings.SMTP_PORT
    imap_h = payload.imap_host or settings.IMAP_HOST
    imap_p = payload.imap_port or settings.IMAP_PORT
    user_name = payload.username or settings.MAIL_USERNAME

    res = test_mailbox_connection(
        smtp_host=smtp_h,
        smtp_port=smtp_p,
        imap_host=imap_h,
        imap_port=imap_p,
        username=user_name
    )
    return res

@router.get("/system-status")
async def get_system_health():
    """
    Comprehensive system health for Insights & Health Dashboard:
    - backend status
    - database connection
    - scheduler status
    - mailbox connection status
    - last backup line
    """
    import sqlite3
    db_ok = True
    db_msg = "Connected"
    try:
        source_db = "radar.db" if os.path.exists("radar.db") else "backend/radar.db"
        conn = sqlite3.connect(source_db)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        conn.close()
    except Exception as e:
        db_ok = False
        db_msg = str(e)

    scheduler_ok = scheduler.running

    return {
        "backend": {"status": "HEALTHY", "version": "2.0.0", "env": settings.APP_ENV},
        "database": {"status": "HEALTHY" if db_ok else "ERROR", "detail": db_msg, "url": settings.DATABASE_URL.split("@")[-1]},
        "scheduler": {"status": "HEALTHY" if scheduler_ok else "STOPPED", "running": scheduler_ok},
        "mailbox": {
            "status": "CONFIGURED" if settings.MAIL_PASSWORD else "MANUAL_ONLY",
            "send_mode": settings.SEND_MODE,
            "username": settings.MAIL_USERNAME
        },
        "last_backup": last_backup_info
    }
