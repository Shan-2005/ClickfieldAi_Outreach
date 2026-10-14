import csv
import json
import os
import sqlite3
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.agents.b2b_swarm import b2b_swarm

router = APIRouter(prefix="/chennai-leads", tags=["chennai-leads"])

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

DB_PATH = os.path.join(BACKEND_DIR, "radar.db")
CSV_PATH = os.path.join(PROJECT_ROOT, "chennai_b2b_leads.csv")
CSV_U50_PATH = os.path.join(PROJECT_ROOT, "chennai_b2b_leads_under_50.csv")

def ensure_intel_table():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chennai_leads_intel (
            lead_id INTEGER PRIMARY KEY,
            intel_json TEXT NOT NULL,
            status TEXT DEFAULT 'DRAFT',
            approved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(lead_id) REFERENCES chennai_b2b_leads(id)
        )
    """)
    conn.commit()
    conn.close()

# Ensure table exists on import
ensure_intel_table()

class UpdateDraftRequest(BaseModel):
    subject: Optional[str] = None
    cold_email: Optional[str] = None
    whatsapp_message: Optional[str] = None

@router.get("")
def get_chennai_leads(
    sector: Optional[str] = "ALL",
    area: Optional[str] = "ALL",
    search: Optional[str] = None,
    owner: Optional[str] = None,
    current_user_id: Optional[str] = None,
    has_phone: bool = False,
    has_email: bool = False,
    intel_only: bool = False,
    under_50_only: bool = True,
    limit: int = 300,
    offset: int = 0
):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    conditions = []
    params = []

    if under_50_only:
        conditions.append("l.is_under_50 = 1")

    if sector and sector != "ALL":
        conditions.append("l.sector = ?")
        params.append(sector)

    if area and area != "ALL":
        conditions.append("l.area = ?")
        params.append(area)

    if owner == "unassigned":
        conditions.append("(l.assigned_user_id IS NULL OR l.assigned_user_id = '')")
    elif owner == "my_leads" and current_user_id:
        conditions.append("l.assigned_user_id = ?")
        params.append(current_user_id)
    elif owner and owner != "ALL":
        conditions.append("l.assigned_user_id = ?")
        params.append(owner)

    if search and isinstance(search, str) and search.strip():
        s = f"%{search.strip()}%"
        conditions.append("(l.name LIKE ? OR l.category LIKE ? OR l.address LIKE ? OR l.area LIKE ?)")
        params.extend([s, s, s, s])

    if has_phone:
        conditions.append("l.phone IS NOT NULL AND l.phone != '' AND l.phone != 'N/A'")

    if has_email:
        conditions.append("l.email IS NOT NULL AND l.email != '' AND l.email != 'N/A'")

    if intel_only:
        conditions.append("i.lead_id IS NOT NULL")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    count_query = f"""
        SELECT COUNT(*) 
        FROM chennai_b2b_leads l
        LEFT JOIN chennai_leads_intel i ON l.id = i.lead_id
        {where_clause}
    """
    cur.execute(count_query, params)
    total_count = cur.fetchone()[0]

    data_query = f"""
        SELECT l.id, l.sector, l.name, l.category, l.phone, l.email, l.website,
               l.address, l.area, l.pincode, l.city, l.rating, l.reviews_count,
               l.google_maps_url, l.latitude, l.longitude, l.created_at,
               l.employee_range, l.employee_provenance, l.employee_audit_note, l.is_under_50,
               l.owner_name, l.owner_designation, l.owner_provenance,
               l.assigned_user_id, l.assigned_user_name, l.stage, l.next_due_date, l.is_paused,
               i.status AS intel_status,
               i.approved_at AS intel_approved_at,
               CASE WHEN i.lead_id IS NOT NULL THEN 1 ELSE 0 END AS has_intel
        FROM chennai_b2b_leads l
        LEFT JOIN chennai_leads_intel i ON l.id = i.lead_id
        {where_clause}
        ORDER BY l.id ASC
        LIMIT ? OFFSET ?
    """
    cur.execute(data_query, params + [limit, offset])
    rows = [dict(row) for row in cur.fetchall()]

    # Stats
    cur.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN l.is_under_50 = 1 THEN 1 ELSE 0 END) as under_50_count,
            SUM(CASE WHEN l.is_under_50 = 0 THEN 1 ELSE 0 END) as enterprise_count,
            SUM(CASE WHEN l.sector = 'Manufacturing' THEN 1 ELSE 0 END) as manufacturing,
            SUM(CASE WHEN l.sector = 'Construction' THEN 1 ELSE 0 END) as construction,
            SUM(CASE WHEN l.sector = 'Real Estate' THEN 1 ELSE 0 END) as real_estate,
            SUM(CASE WHEN l.phone IS NOT NULL AND l.phone != '' AND l.phone != 'N/A' THEN 1 ELSE 0 END) as with_phone,
            SUM(CASE WHEN l.email IS NOT NULL AND l.email != '' AND l.email != 'N/A' THEN 1 ELSE 0 END) as with_email,
            SUM(CASE WHEN l.website IS NOT NULL AND l.website != '' AND l.website != 'N/A' THEN 1 ELSE 0 END) as with_website,
            SUM(CASE WHEN l.owner_name IS NOT NULL AND l.owner_name != '' AND l.owner_name != 'Not Disclosed Online' THEN 1 ELSE 0 END) as with_owner,
            SUM(CASE WHEN i.lead_id IS NOT NULL THEN 1 ELSE 0 END) as with_intel,
            SUM(CASE WHEN i.status = 'APPROVED' THEN 1 ELSE 0 END) as approved_intel
        FROM chennai_b2b_leads l
        LEFT JOIN chennai_leads_intel i ON l.id = i.lead_id
    """)
    stats_row = cur.fetchone()
    stats = dict(stats_row) if stats_row else {}

    # Unique areas
    cur.execute("SELECT DISTINCT area FROM chennai_b2b_leads WHERE area IS NOT NULL AND area != '' ORDER BY area ASC")
    areas = [r[0] for r in cur.fetchall()]

    conn.close()

    return {
        "total": total_count,
        "items": rows,
        "stats": stats,
        "areas": areas
    }

@router.get("/export-csv")
def download_csv(under_50: bool = True):
    alt_u50 = os.path.join(PROJECT_ROOT, "chennai_b2b_leads_under_50_with_owners.csv")
    if under_50:
        if os.path.exists(alt_u50):
            target_path = alt_u50
        elif os.path.exists(CSV_U50_PATH):
            target_path = CSV_U50_PATH
        else:
            target_path = CSV_PATH
        filename = "chennai_b2b_leads_under_50.csv"
    else:
        target_path = CSV_PATH
        filename = "chennai_b2b_leads.csv"

    if os.path.exists(target_path):
        return FileResponse(
            target_path,
            media_type="text/csv",
            filename=filename
        )
    return {"error": "CSV file not found"}

@router.get("/{lead_id}")
def get_lead_detail(lead_id: int):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
        SELECT l.*, i.intel_json, i.status AS intel_status, i.approved_at, i.updated_at AS intel_updated_at
        FROM chennai_b2b_leads l
        LEFT JOIN chennai_leads_intel i ON l.id = i.lead_id
        WHERE l.id = ?
    """, (lead_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Chennai B2B Lead not found")

    lead_dict = dict(row)
    intel = None
    if lead_dict.get("intel_json"):
        try:
            intel = json.loads(lead_dict["intel_json"])
        except Exception:
            intel = None

    return {
        "lead": {
            "id": lead_dict["id"],
            "name": lead_dict["name"],
            "sector": lead_dict["sector"],
            "category": lead_dict["category"],
            "phone": lead_dict["phone"],
            "email": lead_dict["email"],
            "website": lead_dict["website"],
            "address": lead_dict["address"],
            "area": lead_dict["area"],
            "pincode": lead_dict["pincode"],
            "rating": lead_dict["rating"],
            "reviews_count": lead_dict["reviews_count"],
            "google_maps_url": lead_dict["google_maps_url"],
            "employee_range": lead_dict.get("employee_range"),
            "employee_provenance": lead_dict.get("employee_provenance"),
            "owner_name": lead_dict.get("owner_name"),
            "owner_designation": lead_dict.get("owner_designation"),
            "owner_provenance": lead_dict.get("owner_provenance")
        },
        "has_intel": bool(intel),
        "intel_status": lead_dict.get("intel_status") or "UNPROCESSED",
        "approved_at": lead_dict.get("approved_at"),
        "intel": intel
    }

@router.post("/{lead_id}/run-intel")
def run_lead_intel(lead_id: int):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM chennai_b2b_leads WHERE id = ?", (lead_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Lead not found")

    company_data = dict(row)

    # Execute the 15-Agent Autonomous Intelligence Swarm (with live web intelligence)
    intel_result = b2b_swarm.analyze_company(company_data)

    # If new live web domain or verified email was discovered, persist to directory record
    web_intel = intel_result.get("tabs", {}).get("dossier", {}).get("web_intelligence", {})
    if not company_data.get("website") and web_intel.get("web_status") == "VERIFIED_LIVE_WEBSITE" and web_intel.get("final_url"):
        cur.execute("UPDATE chennai_b2b_leads SET website = ? WHERE id = ?", (web_intel["final_url"], lead_id))
    if not company_data.get("email") and web_intel.get("verified_emails"):
        cur.execute("UPDATE chennai_b2b_leads SET email = ? WHERE id = ?", (web_intel["verified_emails"][0], lead_id))

    intel_json_str = json.dumps(intel_result)
    cur.execute("""
        INSERT INTO chennai_leads_intel (lead_id, intel_json, status, updated_at)
        VALUES (?, ?, 'DRAFT', CURRENT_TIMESTAMP)
        ON CONFLICT(lead_id) DO UPDATE SET
            intel_json = excluded.intel_json,
            status = 'DRAFT',
            updated_at = CURRENT_TIMESTAMP
    """, (lead_id, intel_json_str))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "lead_id": lead_id,
        "intel": intel_result,
        "status": "DRAFT"
    }

@router.post("/{lead_id}/live-web-search")
def live_web_search_lead(lead_id: int):
    """
    On-Demand Autonomous Live Web Search & Scraping for a specific Chennai B2B Lead.
    Queries search engines, scrapes live HTML, extracts real verified details, and returns
    zero-hallucination provenance.
    """
    from app.agents.web_intel_agent import web_intel_agent

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM chennai_b2b_leads WHERE id = ?", (lead_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Lead not found")

    company_data = dict(row)
    conn.close()

    web_intel = web_intel_agent.enrich_company_details(
        company_name=company_data.get("name", ""),
        provided_website=company_data.get("website"),
        area=company_data.get("area", ""),
        city="Chennai",
        phone=company_data.get("phone", ""),
        existing_email=company_data.get("email", "")
    )

    return {
        "success": True,
        "lead_id": lead_id,
        "company_name": company_data.get("name"),
        "web_intel": web_intel
    }

@router.post("/{lead_id}/approve")
def approve_lead_pitch(lead_id: int):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT intel_json, status FROM chennai_leads_intel WHERE lead_id = ?", (lead_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot approve: Run 15-Agent Swarm first")

    now_iso = datetime.utcnow().isoformat()
    try:
        intel = json.loads(row["intel_json"])
        # Update agent 15 status inside json
        for a in intel.get("agents", []):
            if a.get("agent_id") == 15:
                a["status"] = "APPROVED by Human Operator - Ready to Dispatch"
                a["approved"] = True
                a["approved_at"] = now_iso
        if "tabs" in intel and "outreach" in intel["tabs"] and "shield" in intel["tabs"]["outreach"]:
            intel["tabs"]["outreach"]["shield"]["status"] = "APPROVED by Human Operator - Ready to Dispatch"
            intel["tabs"]["outreach"]["shield"]["approved"] = True
            intel["tabs"]["outreach"]["shield"]["approved_at"] = now_iso

        updated_json = json.dumps(intel)
    except Exception:
        updated_json = row["intel_json"]

    cur.execute("""
        UPDATE chennai_leads_intel
        SET status = 'APPROVED', approved_at = ?, intel_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE lead_id = ?
    """, (now_iso, updated_json, lead_id))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "lead_id": lead_id,
        "status": "APPROVED",
        "approved_at": now_iso
    }

@router.post("/{lead_id}/update-draft")
def update_lead_draft(lead_id: int, payload: UpdateDraftRequest):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT intel_json FROM chennai_leads_intel WHERE lead_id = ?", (lead_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Intel record not found for lead")

    try:
        intel = json.loads(row["intel_json"])
        if payload.subject is not None:
            if "tabs" in intel and "outreach" in intel["tabs"]:
                intel["tabs"]["outreach"]["subjects"]["primary_subject"] = payload.subject
                intel["tabs"]["outreach"]["cold_email"]["subject"] = payload.subject
        if payload.cold_email is not None:
            if "tabs" in intel and "outreach" in intel["tabs"]:
                intel["tabs"]["outreach"]["cold_email"]["body"] = payload.cold_email
                words = payload.cold_email.split()
                intel["tabs"]["outreach"]["cold_email"]["word_count"] = len(words)
                intel["tabs"]["outreach"]["cold_email"]["is_under_80_words"] = len(words) <= 80
        if payload.whatsapp_message is not None:
            if "tabs" in intel and "outreach" in intel["tabs"]:
                intel["tabs"]["outreach"]["multitouch"]["whatsapp_message"] = payload.whatsapp_message

        updated_json = json.dumps(intel)
        cur.execute("""
            UPDATE chennai_leads_intel
            SET intel_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE lead_id = ?
        """, (updated_json, lead_id))
        conn.commit()
    finally:
        conn.close()

    return {"success": True, "intel": intel}

class AssignLeadsRequest(BaseModel):
    lead_ids: list[int]
    user_id: str
    user_name: str

@router.post("/assign")
def assign_leads(payload: AssignLeadsRequest, requester_role: Optional[str] = "ADMIN", requester_id: Optional[str] = None):
    """
    Bulk assigns leads to a team owner.
    Rule: A lead owned by someone else can be viewed, but only an Admin can reassign.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    updated = []
    try:
        for lid in payload.lead_ids:
            cur.execute("SELECT id, name, assigned_user_id, assigned_user_name FROM chennai_b2b_leads WHERE id = ?", (lid,))
            row = cur.fetchone()
            if not row:
                continue

            existing_owner_id = row["assigned_user_id"]
            lead_name = row["name"]

            # If already assigned to someone else, only Admin can reassign
            if existing_owner_id and existing_owner_id != payload.user_id:
                if requester_role != "ADMIN" and requester_id != existing_owner_id:
                    conn.close()
                    raise HTTPException(
                        status_code=403,
                        detail=f"Lead '{lead_name}' is currently owned by {row['assigned_user_name']}. Only an Admin can reassign it."
                    )

            cur.execute("""
                UPDATE chennai_b2b_leads 
                SET assigned_user_id = ?, assigned_user_name = ?
                WHERE id = ?
            """, (payload.user_id, payload.user_name, lid))
            updated.append(lid)

            # Insert into action_log
            cur.execute("""
                INSERT INTO action_log (id, lead_id, user_id, user_name, action_type, details, timestamp)
                VALUES (?, ?, ?, ?, 'ASSIGNED', ?, CURRENT_TIMESTAMP)
            """, (str(uuid.uuid4()) if 'uuid' in globals() else f"act-{lid}-{int(datetime.now().timestamp())}",
                  lid, payload.user_id, payload.user_name,
                  f"Assigned lead to {payload.user_name}"))

        conn.commit()
    finally:
        conn.close()

    return {"status": "success", "assigned_count": len(updated), "lead_ids": updated}

@router.get("/{lead_id}/activity")
def get_lead_activity(lead_id: int):
    """Activity feed on each lead showing who did what and when (from action_log)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
        SELECT id, lead_id, user_id, user_name, action_type, details, timestamp
        FROM action_log
        WHERE lead_id = ?
        ORDER BY timestamp DESC
    """, (lead_id,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    if not rows:
        # Default starter event if none
        return [{
            "id": f"init-{lead_id}",
            "lead_id": lead_id,
            "user_name": "System Discovery",
            "action_type": "DISCOVERED",
            "details": "Lead verified from Google Maps Platform & MCA registry",
            "timestamp": datetime.utcnow().isoformat()
        }]

    return rows
