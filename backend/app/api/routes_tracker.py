import sqlite3
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import ActionLog, EmailReply, User
from app.core.auth import get_current_user_optional

router = APIRouter(prefix="/tracker", tags=["Tracker & Stage Timeline"])

TRACKER_COLUMNS = [
    "DRAFTED",
    "APPROVED",
    "SENT",
    "BOUNCED",
    "REPLIED",
    "INTERESTED",
    "MEETING",
    "WON_LOST"
]

class StageUpdateRequest(BaseModel):
    lead_id: int
    stage: str

class ReplyFeedbackRequest(BaseModel):
    feedback: str # "CORRECT" or "WRONG"

@router.get("/kanban")
async def get_tracker_kanban(owner_filter: Optional[str] = None):
    """
    Returns leads partitioned into the 8-stage Tracker timeline:
    Drafted > Approved > Sent > Bounced > Replied > Interested > Meeting > Won / Lost
    """
    db_path = "radar.db" if os.path.exists("radar.db") else "backend/radar.db"
    if not os.path.exists(db_path):
        return {col: [] for col in TRACKER_COLUMNS}

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    query = """
        SELECT id, name, area, sector, stage, assigned_user_name, assigned_user_id,
               next_due_date, last_contacted_at, email, phone
        FROM chennai_b2b_leads
    """
    params = []
    if owner_filter == "unassigned":
        query += " WHERE assigned_user_id IS NULL"
    elif owner_filter:
        query += " WHERE assigned_user_id = ?"
        params.append(owner_filter)

    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()

    grouped = {col: [] for col in TRACKER_COLUMNS}
    for r in rows:
        st = (r["stage"] or "DRAFTED").upper()
        if st in ["WON", "LOST"]:
            target_col = "WON_LOST"
        elif st in ["NEW", "REVIEWED"]:
            target_col = "DRAFTED"
        elif st in ["CONTACTED"]:
            target_col = "SENT"
        elif st in grouped:
            target_col = st
        else:
            target_col = "DRAFTED"

        grouped[target_col].append({
            "id": r["id"],
            "name": r["name"],
            "area": r["area"],
            "sector": r["sector"],
            "stage": st,
            "owner": r["assigned_user_name"] or "Unassigned",
            "owner_id": r["assigned_user_id"],
            "next_due_date": r["next_due_date"],
            "last_contacted_at": r["last_contacted_at"],
            "email": r["email"],
            "phone": r["phone"]
        })

    return grouped

@router.patch("/stage")
@router.post("/stage")
async def update_lead_stage(payload: StageUpdateRequest, current_user: Optional[User] = Depends(get_current_user_optional), db: AsyncSession = Depends(get_db)):
    """Updates a lead's stage and records the event in the audit trail action_log."""
    db_path = "radar.db" if os.path.exists("radar.db") else "backend/radar.db"
    if not os.path.exists(db_path):
        raise HTTPException(status_code=500, detail="Database file missing.")

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name, stage FROM chennai_b2b_leads WHERE id = ?", (payload.lead_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Lead not found.")

    lead_name, old_stage = row
    cur.execute("UPDATE chennai_b2b_leads SET stage = ? WHERE id = ?", (payload.stage.upper(), payload.lead_id))
    conn.commit()
    conn.close()

    # Log in action log
    user_id = current_user.id if current_user else "sys"
    user_name = current_user.full_name if current_user else "Operator"
    log = ActionLog(
        lead_id=payload.lead_id,
        user_id=user_id,
        user_name=user_name,
        action_type="STAGE_CHANGED",
        details=f"Stage for '{lead_name}' changed from {old_stage} to {payload.stage.upper()}"
    )
    db.add(log)
    await db.commit()

    return {"status": "success", "lead_id": payload.lead_id, "new_stage": payload.stage.upper()}

@router.get("/metrics")
async def get_tracker_metrics():
    """
    Weekly numbers: sent, bounced, replies, interested, unsubscribed.
    Reply rate is displayed ONLY after 30 sends; otherwise 'Not enough data'.
    """
    db_path = "radar.db" if os.path.exists("radar.db") else "backend/radar.db"
    sent_count = 0
    bounced_count = 0
    replies_count = 0
    interested_count = 0
    unsub_count = 0

    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM daily_email_dispatches WHERE status IN ('SENT', 'DISPATCHED')")
        sent_count = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM email_replies WHERE classification = 'BOUNCED'")
        bounced_count = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM email_replies WHERE classification IN ('REPLIED', 'INTERESTED')")
        replies_count = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM email_replies WHERE classification = 'INTERESTED'")
        interested_count = cur.fetchone()[0] or 0

        cur.execute("SELECT COUNT(*) FROM email_replies WHERE classification = 'UNSUBSCRIBED'")
        unsub_count = cur.fetchone()[0] or 0
        conn.close()

    # Reply rate condition: shown only after 30 sends
    if sent_count >= 30 and sent_count > 0:
        reply_rate_str = f"{round((replies_count / sent_count) * 100, 1)}%"
    else:
        reply_rate_str = "Not enough data"

    return {
        "sent": sent_count,
        "bounced": bounced_count,
        "replies": replies_count,
        "interested": interested_count,
        "unsubscribed": unsub_count,
        "reply_rate": reply_rate_str,
        "sends_required_for_rate": 30,
        "has_enough_data": sent_count >= 30
    }

@router.get("/replies")
async def get_replies_list(db: AsyncSession = Depends(get_db)):
    """Returns authentic incoming replies from database."""
    stmt = select(EmailReply).order_by(EmailReply.received_at.desc()).limit(50)
    res = await db.execute(stmt)
    replies = res.scalars().all()

    if not replies:
        return []

    return [
        {
            "id": r.id,
            "lead_id": r.lead_id,
            "from_email": r.from_email,
            "subject": r.subject,
            "snippet_300": r.snippet_300,
            "classification": r.classification,
            "user_feedback": r.user_feedback,
            "received_at": r.received_at.isoformat()
        }
        for r in replies
    ]

@router.post("/replies/{reply_id}/feedback")
async def submit_reply_feedback(reply_id: str, payload: ReplyFeedbackRequest, db: AsyncSession = Depends(get_db)):
    """Records operator Correct / Wrong feedback on inbound classification rules."""
    stmt = select(EmailReply).where(EmailReply.id == reply_id)
    res = await db.execute(stmt)
    reply = res.scalars().first()
    if reply:
        reply.user_feedback = payload.feedback.upper()
        await db.commit()
    return {"status": "success", "reply_id": reply_id, "feedback": payload.feedback.upper()}
