import json
import os
import sqlite3
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.agents.daily_email_agent import daily_email_agent

router = APIRouter(prefix="/daily-emails", tags=["daily-emails"])

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BACKEND_DIR, "radar.db")

class UpdateDraftRequest(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    recipient_email: Optional[str] = None
    followup_day2: Optional[str] = None
    followup_day3: Optional[str] = None
    followup_day5: Optional[str] = None

class GenerateBatchRequest(BaseModel):
    force_refresh: bool = False
    target_count: int = 15
    offset: Optional[int] = 0

@router.get("/today")
def get_todays_batch(offset: int = 0):
    """
    Returns today's 15 personalized B2B outreach emails, including
    Day 0, Day 2, Day 3, and Day 5 sequences and real-time stats.
    """
    batch = daily_email_agent.get_or_generate_todays_batch(force_refresh=False, target_count=15, offset=offset)
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent_count,
            SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) as ready_count
        FROM daily_email_dispatches
        WHERE batch_date = ?
    """, (today_str,))
    stats_row = cur.fetchone()
    conn.close()

    stats = {
        "batch_date": today_str,
        "total": stats_row[0] if stats_row else len(batch),
        "sent_count": stats_row[1] if stats_row and stats_row[1] else 0,
        "ready_count": stats_row[2] if stats_row and stats_row[2] else 0,
        "cta_protocol": "Strict Binary 'Reply with Yes'"
    }

    return {
        "stats": stats,
        "items": batch
    }

@router.post("/generate-batch")
def regenerate_batch(payload: Optional[GenerateBatchRequest] = None):
    """
    Forces generation of a fresh 15-email batch for today, with optional offset for advancing leads.
    """
    force = payload.force_refresh if payload else True
    target = payload.target_count if payload else 15
    offset = payload.offset if (payload and payload.offset is not None) else 0
    batch = daily_email_agent.get_or_generate_todays_batch(
        force_refresh=force,
        target_count=target,
        offset=offset
    )
    return {
        "success": True,
        "message": f"Generated {len(batch)} personalized outreach emails for today (Offset: {offset})",
        "items": batch
    }

@router.post("/reset-queue")
def reset_queue():
    """
    Resets the dispatched/sent status of today's emails back to READY, allowing testing and re-dispatch.
    """
    count = daily_email_agent.reset_todays_batch()
    batch = daily_email_agent.get_or_generate_todays_batch(force_refresh=False)
    return {
        "success": True,
        "message": f"Reset {count} emails back to Ready status.",
        "items": batch
    }

@router.put("/{dispatch_id}")
def update_email_draft(dispatch_id: int, payload: UpdateDraftRequest):
    """
    Updates the email subject, body, follow-ups, or recipient email.
    """
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    updates = []
    params = []
    if payload.subject is not None:
        updates.append("subject = ?")
        params.append(payload.subject)
    if payload.body is not None:
        updates.append("body = ?")
        params.append(payload.body)
        updates.append("word_count = ?")
        params.append(len(payload.body.split()))
    if payload.recipient_email is not None:
        updates.append("recipient_email = ?")
        params.append(payload.recipient_email)
    if payload.followup_day2 is not None:
        updates.append("followup_day2 = ?")
        params.append(payload.followup_day2)
    if payload.followup_day3 is not None:
        updates.append("followup_day3 = ?")
        params.append(payload.followup_day3)
    if payload.followup_day5 is not None:
        updates.append("followup_day5 = ?")
        params.append(payload.followup_day5)

    if not updates:
        conn.close()
        raise HTTPException(status_code=400, detail="No update fields provided")

    params.append(dispatch_id)
    cur.execute(f"UPDATE daily_email_dispatches SET {', '.join(updates)} WHERE id = ?", params)
    rows = cur.rowcount
    conn.commit()
    conn.close()

    if rows == 0:
        raise HTTPException(status_code=404, detail="Email record not found")

    return {"success": True, "message": "Email draft updated successfully"}

@router.post("/{dispatch_id}/send")
def mark_single_email_sent(dispatch_id: int):
    """
    Marks a specific email in today's batch as SENT.
    """
    success = daily_email_agent.mark_email_status(dispatch_id, status="SENT")
    if not success:
        raise HTTPException(status_code=404, detail="Email record not found")
    return {"success": True, "message": f"Email #{dispatch_id} marked as SENT"}

@router.post("/send-all")
def mark_all_batch_sent():
    """
    Dispatches / marks all READY emails in today's 15-batch as SENT.
    """
    count = daily_email_agent.mark_all_todays_batch_sent()
    return {"success": True, "dispatched_count": count, "message": f"Dispatched {count} emails in today's batch"}

@router.get("/history")
def get_batch_history():
    """
    Retrieves previous outreach batches and overall send statistics.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            batch_date,
            COUNT(*) as total_emails,
            SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent_count,
            SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) as ready_count
        FROM daily_email_dispatches
        GROUP BY batch_date
        ORDER BY batch_date DESC
    """)
    history = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"history": history}
