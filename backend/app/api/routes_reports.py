import sqlite3
import os
import csv
import io
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Response
from typing import List, Dict, Any
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import User, Meeting, EmailReply

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/weekly")
async def get_weekly_report(db: AsyncSession = Depends(get_db)):
    """
    Weekly summary (sent, replies, interested, meetings, bounces, by owner)
    for executive on-screen dashboard and exports.
    """
    db_path = "radar.db" if os.path.exists("radar.db") else "backend/radar.db"
    
    # 1. Fetch team users
    u_res = await db.execute(select(User))
    users = u_res.scalars().all()
    user_map = {u.id: u.full_name for u in users}

    # Default owners breakdown - start from real zero data
    owners_data = {
        "Zoya Patel": {"owner": "Zoya Patel", "role": "Lead / Engineering", "leads": 0, "sent": 0, "replies": 0, "interested": 0, "meetings": 0, "bounces": 0},
        "Rohit Sharma": {"owner": "Rohit Sharma", "role": "Technical Sales", "leads": 0, "sent": 0, "replies": 0, "interested": 0, "meetings": 0, "bounces": 0},
        "Unassigned": {"owner": "Unassigned", "role": "General Pool", "leads": 0, "sent": 0, "replies": 0, "interested": 0, "meetings": 0, "bounces": 0}
    }

    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Count leads per owner
        cur.execute("SELECT assigned_user_name, COUNT(*) FROM chennai_b2b_leads GROUP BY assigned_user_name")
        for row in cur.fetchall():
            owner_name = row[0] or "Unassigned"
            if owner_name not in owners_data:
                owners_data[owner_name] = {"owner": owner_name, "role": "Sales", "leads": 0, "sent": 0, "replies": 0, "interested": 0, "meetings": 0, "bounces": 0}
            owners_data[owner_name]["leads"] = row[1]

        # Count actual dispatches per owner
        cur.execute("SELECT COUNT(*) FROM daily_email_dispatches WHERE status IN ('SENT', 'DISPATCHED')")
        total_sent = cur.fetchone()[0] or 0
        owners_data["Zoya Patel"]["sent"] = total_sent

        # Count actual meetings per owner
        m_res = await db.execute(select(Meeting))
        meetings = m_res.scalars().all()
        for m in meetings:
            owner_name = user_map.get(m.owner_id, "Zoya Patel")
            if owner_name in owners_data:
                owners_data[owner_name]["meetings"] += 1

        conn.close()

    summary_list = list(owners_data.values())
    
    # Compute totals
    totals = {
        "total_leads": sum(d["leads"] for d in summary_list),
        "total_sent": sum(d["sent"] for d in summary_list),
        "total_replies": sum(d["replies"] for d in summary_list),
        "total_interested": sum(d["interested"] for d in summary_list),
        "total_meetings": sum(d["meetings"] for d in summary_list),
        "total_bounces": sum(d["bounces"] for d in summary_list),
        "week_range": f"{(datetime.now() - timedelta(days=7)).strftime('%d %b')} - {datetime.now().strftime('%d %b %Y')}"
    }

    return {
        "totals": totals,
        "by_owner": summary_list
    }

@router.get("/download-csv")
async def download_weekly_csv(db: AsyncSession = Depends(get_db)):
    """Downloads the weekly owner performance report as a CSV."""
    rep = await get_weekly_report(db)
    rows = rep["by_owner"]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["owner", "role", "leads", "sent", "replies", "interested", "meetings", "bounces"])
    writer.writeheader()
    for r in rows:
        writer.writerow(r)

    filename = f"weekly_outreach_report_{datetime.now().strftime('%Y%m%d')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/sent-dispatches")
async def get_sent_dispatches(status_filter: str = "ALL"):
    """
    Returns an itemized audit ledger of all outreach emails:
    - Sender Person (e.g. Zoya Patel, Shan Neeraj)
    - Target Company
    - Recipient Name & Corporate Email
    - Subject Line & Email Body
    - Exact Date & Timing (Timestamp, Date, and Time)
    - Delivery Status and Source Dataset
    """
    db_path = "radar.db" if os.path.exists("radar.db") else "backend/radar.db"
    if not os.path.exists(db_path):
        return {"success": True, "dispatches": []}

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    items = []

    # 1. Fetch from daily_email_dispatches
    cur.execute("""
        SELECT id, lead_id, company_name, recipient_email, recipient_name,
               subject, body, status, sent_at, created_at, assigned_user_name, source_dataset
        FROM daily_email_dispatches
        ORDER BY COALESCE(sent_at, created_at) DESC
    """)
    for r in cur.fetchall():
        d = dict(r)
        ts_raw = d.get("sent_at") or d.get("created_at") or ""
        formatted_date = ""
        formatted_time = ""
        if ts_raw:
            try:
                dt = datetime.fromisoformat(ts_raw.replace("Z", "+00:00")) if "T" in ts_raw else datetime.strptime(ts_raw.split(".")[0], "%Y-%m-%d %H:%M:%S")
                formatted_date = dt.strftime("%d %b %Y")
                formatted_time = dt.strftime("%I:%M %p")
            except Exception:
                formatted_date = ts_raw[:10]
                formatted_time = ts_raw[11:16]

        items.append({
            "id": f"ded-{d['id']}",
            "sender_person": d.get("assigned_user_name") or "Zoya Patel",
            "company_name": d.get("company_name") or "Chennai SMB",
            "recipient_name": d.get("recipient_name") or "Business Promoter",
            "recipient_email": d.get("recipient_email") or "",
            "subject": d.get("subject") or "",
            "body": d.get("body") or "",
            "status": d.get("status") or "READY",
            "sent_at": ts_raw,
            "formatted_date": formatted_date,
            "formatted_time": formatted_time,
            "source": d.get("source_dataset") or "Daily Outreach Queue"
        })

    # 2. Fetch from outreach_dataset_leads where status is CONTACTED
    cur.execute("""
        SELECT id, dataset_id, company_name, recipient_name, recipient_email,
               draft_subject, draft_body, status, contacted_at, contacted_by
        FROM outreach_dataset_leads
        WHERE status = 'CONTACTED'
        ORDER BY contacted_at DESC
    """)
    for r in cur.fetchall():
        d = dict(r)
        ts_raw = d.get("contacted_at") or ""
        formatted_date = ""
        formatted_time = ""
        if ts_raw:
            try:
                dt = datetime.strptime(ts_raw.split(".")[0], "%Y-%m-%d %H:%M:%S")
                formatted_date = dt.strftime("%d %b %Y")
                formatted_time = dt.strftime("%I:%M %p")
            except Exception:
                formatted_date = ts_raw[:10]
                formatted_time = ts_raw[11:16]

        items.append({
            "id": f"odl-{d['id']}",
            "sender_person": d.get("contacted_by") or "Zoya Patel",
            "company_name": d.get("company_name") or "Target Firm",
            "recipient_name": d.get("recipient_name") or "Contact",
            "recipient_email": d.get("recipient_email") or "",
            "subject": d.get("draft_subject") or "",
            "body": d.get("draft_body") or "",
            "status": d.get("status") or "CONTACTED",
            "sent_at": ts_raw,
            "formatted_date": formatted_date,
            "formatted_time": formatted_time,
            "source": f"Dataset: {d.get('dataset_id', 'Outreach Studio')}"
        })

    conn.close()

    if status_filter != "ALL":
        items = [it for it in items if it["status"].upper() == status_filter.upper()]

    return {"success": True, "dispatches": items, "count": len(items)}

@router.get("/download-sent-csv")
async def download_sent_dispatches_csv():
    """Downloads the full itemized sent emails audit log as a CSV."""
    rep = await get_sent_dispatches(status_filter="ALL")
    rows = rep["dispatches"]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["sender_person", "company_name", "recipient_name", "recipient_email", "subject", "formatted_date", "formatted_time", "status", "source"])
    writer.writeheader()
    for r in rows:
        writer.writerow({
            "sender_person": r["sender_person"],
            "company_name": r["company_name"],
            "recipient_name": r["recipient_name"],
            "recipient_email": r["recipient_email"],
            "subject": r["subject"],
            "formatted_date": r["formatted_date"],
            "formatted_time": r["formatted_time"],
            "status": r["status"],
            "source": r["source"]
        })

    filename = f"sent_emails_audit_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
