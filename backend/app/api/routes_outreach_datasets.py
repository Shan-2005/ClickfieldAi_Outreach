import os
import json
import sqlite3
import shutil
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
import openpyxl

from app.services.dataset_service import (
    get_db,
    DEFAULT_PERSONAS,
    regenerate_with_ollama,
    generate_default_pitch,
    import_excel_datasets,
    init_dataset_tables
)

router = APIRouter(prefix="/outreach-studio", tags=["Outreach Studio"])

class UpdateDraftRequest(BaseModel):
    subject: str
    body: str

class UpdateStatusRequest(BaseModel):
    status: str # 'CONTACTED' | 'SKIPPED' | 'PENDING'
    contacted_by: Optional[str] = "Operator"

class RegenerateRequest(BaseModel):
    persona_id: str = "zoya"
    tone: str = "concise" # 'concise' | 'technical' | 'roi'
    custom_notes: Optional[str] = ""

@router.get("/personas")
def get_personas():
    """Returns available sender personas for outreach."""
    return {"success": True, "personas": DEFAULT_PERSONAS}

@router.get("/datasets")
def list_datasets():
    """Returns all available lead datasets with real-time progress stats."""
    init_dataset_tables()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT d.*,
               COUNT(l.id) as current_leads_count,
               SUM(CASE WHEN l.status = 'CONTACTED' THEN 1 ELSE 0 END) as contacted_count,
               SUM(CASE WHEN l.status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped_count,
               SUM(CASE WHEN l.status = 'PENDING' THEN 1 ELSE 0 END) as pending_count
        FROM outreach_datasets d
        LEFT JOIN outreach_dataset_leads l ON d.id = l.dataset_id
        GROUP BY d.id
        ORDER BY d.created_at ASC
    """)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"success": True, "datasets": rows}

@router.get("/datasets/{dataset_id}/leads")
def get_dataset_leads(
    dataset_id: str,
    status: Optional[str] = "ALL",
    search: Optional[str] = None,
    limit: int = 500,
    offset: int = 0
):
    """Fetches leads for a specific dataset with search and status filtering."""
    conn = get_db()
    cur = conn.cursor()
    
    query = "SELECT * FROM outreach_dataset_leads WHERE dataset_id = ?"
    params = [dataset_id]

    if status and status.upper() != "ALL":
        query += " AND status = ?"
        params.append(status.upper())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query += " AND (company_name LIKE ? OR recipient_name LIKE ? OR recipient_email LIKE ? OR company_industry LIKE ?)"
        params.extend([term, term, term, term])

    query += " ORDER BY id ASC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cur.execute(query, tuple(params))
    leads = [dict(r) for r in cur.fetchall()]

    # Stats for dataset
    cur.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'CONTACTED' THEN 1 ELSE 0 END) as contacted,
            SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped,
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
        FROM outreach_dataset_leads
        WHERE dataset_id = ?
    """, (dataset_id,))
    stats_row = cur.fetchone()
    conn.close()

    return {
        "success": True,
        "dataset_id": dataset_id,
        "total_returned": len(leads),
        "stats": {
            "total": stats_row["total"] if stats_row else 0,
            "contacted": stats_row["contacted"] or 0,
            "skipped": stats_row["skipped"] or 0,
            "pending": stats_row["pending"] or 0
        },
        "leads": leads
    }

@router.get("/leads/{lead_id}")
def get_lead_detail(lead_id: int):
    """Retrieves full company profile and draft for a single lead."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM outreach_dataset_leads WHERE id = ?", (lead_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True, "lead": dict(row)}

@router.put("/leads/{lead_id}/draft")
def update_draft(lead_id: int, req: UpdateDraftRequest):
    """Updates subject and body for a lead's outreach draft."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE outreach_dataset_leads SET draft_subject = ?, draft_body = ? WHERE id = ?",
        (req.subject, req.body, lead_id)
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "Draft saved successfully"}

class ResolveLeadRequest(BaseModel):
    lead_id: Optional[int] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    area: Optional[str] = None
    sector: Optional[str] = None
    owner_name: Optional[str] = None

@router.post("/resolve-lead")
def resolve_lead(req: ResolveLeadRequest):
    """
    Intelligently finds a lead across all datasets or upserts it into 'chennai-b2b'
    so that clicking Outreach from any page (Leads, Today, Calendar) always opens
    the exact selected company with the correct dataset and draft.
    """
    conn = get_db()
    cur = conn.cursor()

    target_name = (req.company_name or req.name or "").strip()
    target_email = (req.email or "").strip().lower()

    # 1. First, search outreach_dataset_leads by email or company name
    matched_row = None
    if target_email and "@" in target_email:
        cur.execute("SELECT * FROM outreach_dataset_leads WHERE LOWER(recipient_email) = ? LIMIT 1", (target_email,))
        matched_row = cur.fetchone()

    if not matched_row and target_name:
        cur.execute("SELECT * FROM outreach_dataset_leads WHERE LOWER(company_name) = ? LIMIT 1", (target_name.lower(),))
        matched_row = cur.fetchone()

    if not matched_row and target_name:
        cur.execute("SELECT * FROM outreach_dataset_leads WHERE LOWER(company_name) LIKE ? LIMIT 1", (f"%{target_name.lower()}%",))
        matched_row = cur.fetchone()

    if matched_row:
        lead_dict = dict(matched_row)
        conn.close()
        return {
            "success": True,
            "dataset_id": lead_dict["dataset_id"],
            "lead_id": lead_dict["id"],
            "lead": lead_dict
        }

    # 2. If not found in outreach_dataset_leads, check chennai_b2b_leads
    cur.execute("SELECT * FROM chennai_b2b_leads WHERE LOWER(name) = ? OR (email != '' AND LOWER(email) = ?) LIMIT 1", 
                (target_name.lower(), target_email))
    c_lead = cur.fetchone()

    if c_lead:
        c_dict = dict(c_lead)
        c_owner = c_dict.get("owner_name") or req.owner_name or "Promoter"
        tokens = c_owner.split()
        c_first = tokens[0] if tokens else "there"
        c_email = c_dict.get("email") or target_email or ""
        company_name = c_dict.get("name") or target_name
        c_area = c_dict.get("area") or req.area or "Chennai"
        c_sec = c_dict.get("sector") or req.sector or "Industrial"

        lead_data = {
            "recipient_first_name": c_first,
            "recipient_name": c_owner,
            "recipient_title": "Promoter / Director",
            "company_name": company_name,
            "ai_one_liner": f"Industrial operations and manufacturing in {c_area}",
            "value_proposition": f"Specialized {c_sec} capabilities",
            "service_tags": c_sec,
            "company_industry": c_sec
        }
        pitch = generate_default_pitch(lead_data, DEFAULT_PERSONAS[0])

        cur.execute("""
            INSERT INTO outreach_dataset_leads
            (dataset_id, company_name, company_website, company_industry, company_country,
             company_city, recipient_name, recipient_first_name, recipient_title,
             recipient_email, ai_one_liner, value_proposition, service_tags,
             employee_range, draft_subject, draft_body, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "chennai-b2b",
            company_name,
            c_dict.get("website") or "",
            c_sec,
            "India",
            c_area,
            c_owner,
            c_first,
            "Promoter / Director",
            c_email,
            lead_data["ai_one_liner"],
            lead_data["value_proposition"],
            c_sec,
            c_dict.get("employee_range") or "<50",
            pitch["subject"],
            pitch["body"],
            "PENDING"
        ))
        new_id = cur.lastrowid
        conn.commit()
        cur.execute("SELECT * FROM outreach_dataset_leads WHERE id = ?", (new_id,))
        created = dict(cur.fetchone())
        conn.close()
        return {
            "success": True,
            "dataset_id": "chennai-b2b",
            "lead_id": new_id,
            "lead": created
        }

    # 3. If neither found in DB, dynamically create in chennai-b2b dataset
    if target_name or target_email:
        first_n = (req.owner_name or "there").split()[0]
        lead_data = {
            "recipient_first_name": first_n,
            "recipient_name": req.owner_name or "Business Leader",
            "recipient_title": "Leader",
            "company_name": target_name or "your company",
            "ai_one_liner": f"Operations in {req.area or 'Chennai'}",
            "value_proposition": f"{req.sector or 'Business'} solutions",
            "service_tags": req.sector or "General",
            "company_industry": req.sector or "General"
        }
        pitch = generate_default_pitch(lead_data, DEFAULT_PERSONAS[0])
        cur.execute("""
            INSERT INTO outreach_dataset_leads
            (dataset_id, company_name, company_website, company_industry, company_country,
             company_city, recipient_name, recipient_first_name, recipient_title,
             recipient_email, ai_one_liner, value_proposition, service_tags,
             employee_range, draft_subject, draft_body, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "chennai-b2b",
            target_name or "Target Company",
            "",
            req.sector or "General",
            "India",
            req.area or "Chennai",
            req.owner_name or "Leader",
            first_n,
            "Leader",
            target_email,
            lead_data["ai_one_liner"],
            lead_data["value_proposition"],
            req.sector or "General",
            "<50",
            pitch["subject"],
            pitch["body"],
            "PENDING"
        ))
        new_id = cur.lastrowid
        conn.commit()
        cur.execute("SELECT * FROM outreach_dataset_leads WHERE id = ?", (new_id,))
        created = dict(cur.fetchone())
        conn.close()
        return {
            "success": True,
            "dataset_id": "chennai-b2b",
            "lead_id": new_id,
            "lead": created
        }

    conn.close()
    raise HTTPException(status_code=404, detail="Lead could not be resolved.")

@router.post("/leads/{lead_id}/status")
def update_lead_status(lead_id: int, req: UpdateStatusRequest):
    """Updates lead outreach status ('CONTACTED', 'SKIPPED', 'PENDING') and logs dispatch."""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S") if req.status.upper() == "CONTACTED" else None
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        UPDATE outreach_dataset_leads
        SET status = ?, contacted_at = ?, contacted_by = ?
        WHERE id = ?
    """, (req.status.upper(), now_str, req.contacted_by, lead_id))

    if req.status.upper() == "CONTACTED":
        cur.execute("SELECT * FROM outreach_dataset_leads WHERE id = ?", (lead_id,))
        row = cur.fetchone()
        if row:
            l = dict(row)
            cur.execute("""
                INSERT INTO daily_email_dispatches
                (lead_id, company_name, recipient_email, recipient_name, subject, body, status, sent_at, assigned_user_name, source_dataset)
                VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?, ?, ?)
            """, (
                l["id"],
                l["company_name"],
                l["recipient_email"] or "",
                l["recipient_name"] or "",
                l["draft_subject"] or f"Note to {l['company_name']}",
                l["draft_body"] or "",
                now_str,
                req.contacted_by or "Zoya Patel",
                l["dataset_id"]
            ))

    conn.commit()
    conn.close()
    return {"success": True, "status": req.status.upper()}

@router.post("/leads/{lead_id}/regenerate")
def regenerate_email(lead_id: int, req: RegenerateRequest):
    """Regenerates draft subject and body using Ollama or persona templates."""
    try:
        res = regenerate_with_ollama(
            lead_id=lead_id,
            persona_id=req.persona_id,
            tone=req.tone,
            custom_notes=req.custom_notes or ""
        )
        return {"success": True, "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync-excel")
def sync_excel_data(force: bool = False):
    """Re-syncs datasets from the downloaded Digital Transformation Leads Excel file."""
    res = import_excel_datasets(force=force)
    return {"success": True, "data": res}

@router.post("/upload")
async def upload_custom_sheet(
    file: UploadFile = File(...),
    dataset_name: Optional[str] = Form(None)
):
    """Uploads any Excel (.xlsx) or CSV file and creates a new outreach dataset."""
    filename = file.filename or "uploaded_leads"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".xlsx", ".csv"]:
        raise HTTPException(status_code=400, detail="Only .xlsx or .csv files are supported.")

    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_path = os.path.join(backend_dir, "data", f"upload_{filename}")
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    dataset_id = f"custom-{os.path.splitext(filename)[0].lower().replace(' ', '-')[:25]}"
    display_name = dataset_name or filename.replace("_", " ").replace("-", " ")

    conn = get_db()
    cur = conn.cursor()

    imported_count = 0
    persona = DEFAULT_PERSONAS[0]

    if ext == ".xlsx":
        wb = openpyxl.load_workbook(save_path, data_only=True)
        sheet_name = wb.sheetnames[0]
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        if rows:
            headers = [str(h).strip().lower() if h else f"col_{i}" for i, h in enumerate(rows[0])]
            
            # Map header indices
            def find_idx(*keywords):
                for kw in keywords:
                    for i, h in enumerate(headers):
                        if kw in h:
                            return i
                return None

            c_idx = find_idx("company", "organization", "firm")
            e_idx = find_idx("email", "mail")
            fn_idx = find_idx("first name", "firstname")
            name_idx = find_idx("full name", "contact", "name", "person", "lead")
            title_idx = find_idx("title", "role", "designation", "position")
            web_idx = find_idx("website", "domain", "url")
            desc_idx = find_idx("one-liner", "summary", "description", "about", "what they do")
            val_idx = find_idx("value prop", "proposition", "differentiator", "offer")

            for r in rows[1:]:
                if not any(r): continue
                c_name = str(r[c_idx]).strip() if c_idx is not None and r[c_idx] else ""
                email = str(r[e_idx]).strip() if e_idx is not None and r[e_idx] else ""
                if not c_name and not email: continue

                p_name = str(r[name_idx]).strip() if name_idx is not None and r[name_idx] else ""
                p_first = str(r[fn_idx]).strip() if fn_idx is not None and r[fn_idx] else (p_name.split()[0] if p_name else "there")
                p_title = str(r[title_idx]).strip() if title_idx is not None and r[title_idx] else "Decision Maker"
                p_web = str(r[web_idx]).strip() if web_idx is not None and r[web_idx] else ""
                ai_one = str(r[desc_idx]).strip() if desc_idx is not None and r[desc_idx] else ""
                val_prop = str(r[val_idx]).strip() if val_idx is not None and r[val_idx] else ""

                lead_dict = {
                    "recipient_first_name": p_first,
                    "recipient_name": p_name or "Team",
                    "recipient_title": p_title,
                    "company_name": c_name or "your company",
                    "ai_one_liner": ai_one,
                    "value_proposition": val_prop
                }
                pitch = generate_default_pitch(lead_dict, persona)

                cur.execute("""
                    INSERT INTO outreach_dataset_leads
                    (dataset_id, company_name, company_website, recipient_name, recipient_first_name,
                     recipient_title, recipient_email, ai_one_liner, value_proposition,
                     draft_subject, draft_body, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    dataset_id, c_name, p_web, p_name, p_first, p_title, email,
                    ai_one, val_prop, pitch["subject"], pitch["body"], "PENDING"
                ))
                imported_count += 1

    cur.execute("""
        INSERT OR REPLACE INTO outreach_datasets
        (id, name, source_file, sheet_name, total_leads, verified_emails_count, description, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        dataset_id, display_name, filename, "Sheet1", imported_count, imported_count,
        f"Custom uploaded dataset from {filename} with {imported_count} leads.", "Custom Upload"
    ))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "dataset_id": dataset_id,
        "name": display_name,
        "imported_leads": imported_count
    }
