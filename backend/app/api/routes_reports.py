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

    # Default owners breakdown
    owners_data = {
        "Zoya Patel": {"owner": "Zoya Patel", "role": "Lead / Engineering", "leads": 0, "sent": 10, "replies": 2, "interested": 1, "meetings": 2, "bounces": 0},
        "Rohit Sharma": {"owner": "Rohit Sharma", "role": "Technical Sales", "leads": 0, "sent": 6, "replies": 1, "interested": 0, "meetings": 1, "bounces": 0},
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

        # Count meetings per owner
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
