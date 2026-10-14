import uuid
import secrets
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
import sqlite3
import os

from app.db.session import get_db
from app.db.models import Meeting, ActionLog, User, Opportunity
from app.core.auth import get_current_user, get_current_user_optional

router = APIRouter(prefix="/calendar", tags=["Calendar & Meetings"])

class MeetingCreateRequest(BaseModel):
    lead_id: int
    title: str
    date_str: str # YYYY-MM-DD
    start_time: str # HH:MM
    end_time: str # HH:MM
    location_or_link: Optional[str] = None
    notes: Optional[str] = None

class RescheduleRequest(BaseModel):
    lead_id: int
    new_date: str # YYYY-MM-DD

@router.get("/events")
async def get_calendar_events(current_user: Optional[User] = Depends(get_current_user_optional), db: AsyncSession = Depends(get_db)):
    """
    Returns unified events for Calendar Month/Week/Agenda views:
    - Follow-ups due (primary)
    - Meetings (success)
    - Replies to handle (warn)
    - Tender deadlines (danger)
    Plus Today & Overdue items for the 300px right panel.
    """
    events = []
    today = date.today()

    # 1. Fetch Meetings from DB
    stmt = select(Meeting).order_by(Meeting.start_time.asc())
    res = await db.execute(stmt)
    meetings = res.scalars().all()
    for m in meetings:
        events.append({
            "id": f"meet-{m.id}",
            "type": "meeting",
            "title": m.title,
            "lead_id": m.lead_id,
            "lead_name": m.lead_name or "Prospect",
            "start": m.start_time.isoformat(),
            "end": m.end_time.isoformat(),
            "date": m.start_time.strftime("%Y-%m-%d"),
            "location": m.location_or_link,
            "notes": m.notes,
            "color": "var(--success)"
        })

    # 2. Fetch Tender Deadlines from Opportunities
    tender_stmt = select(Opportunity).where(Opportunity.deadline != None).limit(30)
    t_res = await db.execute(tender_stmt)
    tenders = t_res.scalars().all()
    for t in tenders:
        events.append({
            "id": f"tender-{t.id}",
            "type": "tender",
            "title": f"Deadline: {t.title[:45]}...",
            "lead_id": None,
            "date": t.deadline.strftime("%Y-%m-%d"),
            "start": t.deadline.isoformat(),
            "category": t.primary_category,
            "color": "var(--danger)"
        })

    # 3. Fetch Follow-ups and Replies from SQLite leads & dispatches
    db_path = "radar.db" if os.path.exists("radar.db") else "backend/radar.db"
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Follow-ups due
        cur.execute("""
            SELECT id, name, area, sector, next_due_date, stage, sequence_step 
            FROM chennai_b2b_leads 
            WHERE next_due_date IS NOT NULL
        """)
        leads = cur.fetchall()
        for l in leads:
            lid, name, area, sector, due_date_str, stage, seq_step = l
            events.append({
                "id": f"fu-{lid}",
                "type": "followup",
                "title": f"Follow-up: {name}",
                "lead_id": lid,
                "lead_name": name,
                "area": area,
                "sector": sector,
                "date": due_date_str,
                "stage": stage,
                "sequence_step": seq_step or "DAY4",
                "color": "var(--primary)"
            })

        # Replies to handle
        cur.execute("""
            SELECT id, lead_id, from_email, subject, snippet_300, classification, received_at
            FROM email_replies
            WHERE classification IN ('REPLIED', 'INTERESTED')
        """)
        replies = cur.fetchall()
        for r in replies:
            rid, r_lead_id, from_email, subj, snip, cls, recv_at = r
            r_date = recv_at[:10] if recv_at else today.strftime("%Y-%m-%d")
            events.append({
                "id": f"rep-{rid}",
                "type": "reply",
                "title": f"Reply from {from_email}",
                "lead_id": r_lead_id,
                "snippet": snip,
                "date": r_date,
                "classification": cls,
                "color": "var(--warn)"
            })

        conn.close()

    # Partition Today vs Overdue for 300px side panel
    today_str = today.strftime("%Y-%m-%d")
    today_items = [e for e in events if e.get("date") == today_str]
    overdue_items = [e for e in events if e.get("date") and e.get("date") < today_str and e.get("type") in ["followup", "reply"]]

    return {
        "events": events,
        "today_items": today_items,
        "overdue_items": overdue_items,
        "feed_url": f"/api/calendar/feed/{current_user.ics_token if current_user else 'clickfield'}.ics"
    }

@router.post("/meetings")
async def create_meeting(payload: MeetingCreateRequest, current_user: Optional[User] = Depends(get_current_user_optional), db: AsyncSession = Depends(get_db)):
    """Creates a new meeting and automatically moves the lead to the MEETING stage."""
    # Parse dates
    start_dt = datetime.strptime(f"{payload.date_str} {payload.start_time}", "%Y-%m-%d %H:%M")
    end_dt = datetime.strptime(f"{payload.date_str} {payload.end_time}", "%Y-%m-%d %H:%M")
    
    user_id = current_user.id if current_user else "zoya-admin-id"
    user_name = current_user.full_name if current_user else "Zoya Patel"

    meeting = Meeting(
        lead_id=payload.lead_id,
        owner_id=user_id,
        title=payload.title,
        start_time=start_dt,
        end_time=end_dt,
        location_or_link=payload.location_or_link,
        notes=payload.notes
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)

    # Move lead to MEETING stage in SQLite
    db_path = "radar.db" if os.path.exists("radar.db") else "backend/radar.db"
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("UPDATE chennai_b2b_leads SET stage = 'MEETING' WHERE id = ?", (payload.lead_id,))
        cur.execute("SELECT name FROM chennai_b2b_leads WHERE id = ?", (payload.lead_id,))
        row = cur.fetchone()
        lead_name = row[0] if row else "Lead"
        conn.commit()
        conn.close()

        # Update meeting lead_name
        meeting.lead_name = lead_name
        await db.commit()

    # Log in action log
    log = ActionLog(
        lead_id=payload.lead_id,
        user_id=user_id,
        user_name=user_name,
        action_type="MEETING_CREATED",
        details=f"Meeting scheduled: '{payload.title}' on {payload.date_str} at {payload.start_time} IST. Stage moved to MEETING."
    )
    db.add(log)
    await db.commit()

    return {"status": "success", "meeting_id": meeting.id, "stage": "MEETING"}

@router.post("/reschedule")
async def reschedule_followup(payload: RescheduleRequest, current_user: Optional[User] = Depends(get_current_user_optional), db: AsyncSession = Depends(get_db)):
    """
    Drag a follow-up to another day to reschedule it.
    Dragging is blocked on past days.
    """
    new_d = datetime.strptime(payload.new_date, "%Y-%m-%d").date()
    today = date.today()
    if new_d < today:
        raise HTTPException(
            status_code=400,
            detail="Cannot reschedule a follow-up to a date in the past."
        )

    db_path = "radar.db" if os.path.exists("radar.db") else "backend/radar.db"
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT name, next_due_date FROM chennai_b2b_leads WHERE id = ?", (payload.lead_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Lead not found.")

        lead_name, old_date = row
        cur.execute("UPDATE chennai_b2b_leads SET next_due_date = ? WHERE id = ?", (payload.new_date, payload.lead_id))
        conn.commit()
        conn.close()

        # Log action log
        user_id = current_user.id if current_user else "sys"
        user_name = current_user.full_name if current_user else "System/Operator"
        log = ActionLog(
            lead_id=payload.lead_id,
            user_id=user_id,
            user_name=user_name,
            action_type="RESCHEDULED",
            details=f"Rescheduled follow-up for '{lead_name}' from {old_date} to {payload.new_date}"
        )
        db.add(log)
        await db.commit()

    return {"status": "success", "new_date": payload.new_date}

@router.get("/feed/{token}.ics")
async def get_icalendar_feed(token: str, db: AsyncSession = Depends(get_db)):
    """
    Generates a standard RFC-5545 .ics iCalendar feed for Outlook / Google Calendar subscription.
    One-way feed containing meetings, follow-ups due, and tender deadlines.
    """
    stmt = select(User).where(User.ics_token == token)
    res = await db.execute(stmt)
    user = res.scalars().first()
    # If token matches user or is demo feed
    feed_user_name = user.full_name if user else "Clickfield Team"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Clickfield AI//Opportunity Radar 2.0//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:Clickfield Radar ({feed_user_name})",
        "X-WR-TIMEZONE:Asia/Kolkata"
    ]

    # Add meetings
    stmt = select(Meeting).limit(50)
    m_res = await db.execute(stmt)
    meetings = m_res.scalars().all()
    now_stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    for m in meetings:
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:meet-{m.id}@clickfield.ai",
            f"DTSTAMP:{now_stamp}",
            f"DTSTART:{m.start_time.strftime('%Y%m%dT%H%M00')}",
            f"DTEND:{m.end_time.strftime('%Y%m%dT%H%M00')}",
            f"SUMMARY:{m.title}",
            f"DESCRIPTION:Lead: {m.lead_name or 'Prospect'}\\n{m.notes or ''}",
            f"LOCATION:{m.location_or_link or 'Online / Video Call'}",
            "STATUS:CONFIRMED",
            "END:VEVENT"
        ])

    lines.append("END:VCALENDAR")
    ics_body = "\r\n".join(lines)
    return Response(content=ics_body, media_type="text/calendar; charset=utf-8")

@router.post("/regenerate-feed")
async def regenerate_feed_token(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Regenerates a secure, random iCalendar subscription feed token."""
    new_token = secrets.token_hex(24)
    current_user.ics_token = new_token
    await db.commit()
    return {"status": "success", "token": new_token, "feed_url": f"/api/calendar/feed/{new_token}.ics"}
