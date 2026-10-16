import os
import re
import json
import sqlite3
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import openpyxl

from app.services.ollama_client import OllamaAgentBrain
from app.agentic_core.email_pipeline_agents import run_ollama_outreach_relay

logger = logging.getLogger("dataset_service")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BACKEND_DIR, "radar.db")
EXCEL_PATH = os.path.join(BACKEND_DIR, "data", "digital_transformation_leads.xlsx")

# Default Sender Personas (Only Zoya and Shan Neeraj)
DEFAULT_PERSONAS = [
    {
        "id": "zoya",
        "name": "Zoya",
        "role": "Technical Solutions & Engineering Lead",
        "company": "ClickfieldAI",
        "email": "zoya@clickfield.ai",
        "angle": "Engineering Automation & AI Workflows",
        "avatar": "Z",
        "bio": "Specializes in building autonomous AI automation, internal workflows, and operations solutions."
    },
    {
        "id": "shan",
        "name": "Shan Neeraj",
        "role": "Founder & AI Solutions Architect",
        "company": "ClickfieldAI",
        "email": "shan@clickfield.ai",
        "angle": "Enterprise Digital Transformation & Architecture",
        "avatar": "SN",
        "bio": "Advises leadership on deploying AI solutions across employee management, client acquisition, and reporting."
    }
]

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_dataset_tables():
    """Initializes tables for multi-dataset management and lead tracking."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS outreach_datasets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            source_file TEXT,
            sheet_name TEXT,
            total_leads INTEGER DEFAULT 0,
            verified_emails_count INTEGER DEFAULT 0,
            description TEXT,
            category TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS outreach_dataset_leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset_id TEXT NOT NULL,
            company_name TEXT NOT NULL,
            company_website TEXT,
            company_industry TEXT,
            company_country TEXT,
            company_city TEXT,
            recipient_name TEXT,
            recipient_first_name TEXT,
            recipient_last_name TEXT,
            recipient_title TEXT,
            recipient_email TEXT,
            recipient_linkedin TEXT,
            ai_one_liner TEXT,
            value_proposition TEXT,
            service_tags TEXT,
            icp_target_titles TEXT,
            employee_range TEXT,
            raw_metadata TEXT,
            draft_subject TEXT,
            draft_body TEXT,
            status TEXT DEFAULT 'PENDING',
            contacted_at TIMESTAMP,
            contacted_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(dataset_id) REFERENCES outreach_datasets(id)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_leads_dataset ON outreach_dataset_leads(dataset_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_leads_status ON outreach_dataset_leads(status);")
    conn.commit()
    conn.close()

def generate_default_pitch(lead: Dict[str, Any], persona: Dict[str, Any], tone: str = "concise") -> Dict[str, str]:
    """
    Generates a high-converting, human, bespoke cold email pitch.
    Uses real context: person first name, title, company, AI One-Liner, and Value Proposition.
    Includes the specific automation offerings and strict CTA.
    """
    first_name = lead.get("recipient_first_name") or "there"
    company = lead.get("company_name") or "your company"
    title = lead.get("recipient_title") or "Leader"
    ai_one_liner = lead.get("ai_one_liner") or ""
    value_prop = lead.get("value_proposition") or ""

    sender_name = persona.get("name", "Zoya")
    sender_company = "ClickfieldAI"

    subject = f"Quick note regarding {company}"

    # Paragraph 1: Personalized hook based on real company intelligence
    if ai_one_liner and value_prop:
        one_clean = ai_one_liner.strip().rstrip('.')
        val_clean = value_prop.strip().rstrip('.')
        if len(one_clean) > 1 and not one_clean[:2].isupper():
            one_clean = one_clean[0].lower() + one_clean[1:]
        if len(val_clean) > 1 and not val_clean[:2].isupper():
            val_clean = val_clean[0].lower() + val_clean[1:]

        if tone == "technical":
            hook = f"I was reviewing {company}'s technical operations in {one_clean} and your focus on {val_clean}."
        elif tone == "roi":
            hook = f"I was reviewing {company}'s market leadership in {one_clean} and your focus on {val_clean}."
        else:
            hook = f"I was reviewing {company}'s work in {one_clean} and your focus on {val_clean}."
    elif ai_one_liner:
        hook = f"I came across {company}'s focus on {ai_one_liner.strip().rstrip('.')}."
    else:
        industry = lead.get("company_industry") or "digital transformation"
        hook = f"I was reviewing {company}'s work in {industry.lower()} and your focus on modernizing core commercial operations."

    # Paragraph 2: Core AI automation offering (strictly formatted with spacing)
    auto_line = (
        "Your Company might be thought of some Ai automation to be done in your Day-to-day work , "
        "involving from employee management and client acquisition report management or Ticketing Management.\n"
        "and We provide you the solutions ."
    )

    # Paragraph 3: CTA & Sign-off (strict double line breaks between all paragraphs)
    body = (
        f"Hi {first_name},\n\n"
        f"{hook}\n\n"
        f"{auto_line}\n\n"
        f"If you'd be open to seeing a 2-minute breakdown of how we support teams like {company}, just reply Yes.\n\n"
        f"Best,\n"
        f"{sender_name}\n"
        f"{sender_company}"
    )

    return {"subject": subject, "body": body}

def import_excel_datasets(force: bool = False):
    """
    Imports the Digital Transformation Leads Excel file into SQLite tables.
    """
    init_dataset_tables()
    if not os.path.exists(EXCEL_PATH):
        logger.warning(f"Excel file not found at {EXCEL_PATH}")
        return {"status": "error", "message": "Excel file missing"}

    conn = get_db()
    cur = conn.cursor()

    # Check if already imported
    cur.execute("SELECT COUNT(*) FROM outreach_dataset_leads WHERE dataset_id = 'digital-transformation-sheet1'")
    existing = cur.fetchone()[0]
    if existing > 0 and not force:
        conn.close()
        return {"status": "skipped", "message": f"Already imported ({existing} leads)"}

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    persona = DEFAULT_PERSONAS[0]

    # Clean existing if forcing
    if force:
        cur.execute("DELETE FROM outreach_dataset_leads WHERE dataset_id LIKE 'digital-transformation-%'")
        cur.execute("DELETE FROM outreach_datasets WHERE id LIKE 'digital-transformation-%'")

    imported_stats = {}

    # 1. Process Sheet 1
    if "Sheet1" in wb.sheetnames:
        ws1 = wb["Sheet1"]
        rows1 = list(ws1.iter_rows(values_only=True))
        if rows1:
            headers = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(rows1[0])]
            leads1 = []
            for r in rows1[1:]:
                if not any(r):
                    continue
                item = {headers[i]: r[i] for i in range(min(len(headers), len(r)))}
                leads1.append(item)

            dataset_id = "digital-transformation-sheet1"
            dataset_name = "Digital Transformation Leads (Sheet 1)"
            
            cur.execute("""
                INSERT OR REPLACE INTO outreach_datasets 
                (id, name, source_file, sheet_name, total_leads, verified_emails_count, description, category)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                dataset_id,
                dataset_name,
                "Digital transformation leads cold email reachout.xlsx",
                "Sheet1",
                len(leads1),
                len([l for l in leads1 if l.get("Email")]),
                "163 Global Enterprise IT, Consulting, and Digital Transformation Leaders with complete AI One-Liners and Value Propositions.",
                "Digital Transformation"
            ))

            for item in leads1:
                first_name = (item.get("First name") or "").strip()
                last_name = (item.get("Last name") or "").strip()
                full_name = (item.get("Full name") or f"{first_name} {last_name}").strip()
                company_name = (item.get("Company name") or "").strip()
                email = (item.get("Email") or "").strip()

                if not company_name and not email:
                    continue

                lead_dict = {
                    "recipient_first_name": first_name or "there",
                    "recipient_name": full_name or "Team",
                    "recipient_title": item.get("Job title"),
                    "company_name": company_name or "your company",
                    "ai_one_liner": item.get("AI One-Liner"),
                    "value_proposition": item.get("Value Proposition"),
                    "service_tags": item.get("Service Tags"),
                    "company_industry": item.get("Company industry")
                }
                pitch = generate_default_pitch(lead_dict, persona)

                cur.execute("""
                    INSERT INTO outreach_dataset_leads
                    (dataset_id, company_name, company_website, company_industry, company_country,
                     company_city, recipient_name, recipient_first_name, recipient_last_name,
                     recipient_title, recipient_email, recipient_linkedin, ai_one_liner,
                     value_proposition, service_tags, icp_target_titles, employee_range,
                     raw_metadata, draft_subject, draft_body, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    dataset_id,
                    company_name,
                    item.get("Company website"),
                    item.get("Company industry"),
                    item.get("Person country") or item.get("Company country"),
                    item.get("Person city") or item.get("Company city"),
                    full_name,
                    first_name,
                    last_name,
                    item.get("Job title"),
                    email,
                    item.get("Person LinkedIn URL"),
                    item.get("AI One-Liner"),
                    item.get("Value Proposition"),
                    item.get("Service Tags"),
                    item.get("ICP Target Titles"),
                    item.get("Company employee range"),
                    json.dumps({k: str(v) for k, v in item.items() if v is not None}),
                    pitch["subject"],
                    pitch["body"],
                    "PENDING"
                ))

            imported_stats["sheet1"] = len(leads1)

    # 2. Process Sheet 2
    if "Sheet2" in wb.sheetnames:
        ws2 = wb["Sheet2"]
        rows2 = list(ws2.iter_rows(values_only=True))
        if rows2:
            # Use headers from sheet1
            headers = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(rows1[0])]
            leads2 = []
            for r in rows2:
                if not any(r):
                    continue
                item = {headers[i]: r[i] for i in range(min(len(headers), len(r)))}
                leads2.append(item)

            dataset_id = "digital-transformation-sheet2"
            dataset_name = "Digital Transformation Leads (Sheet 2 - Executive Focus)"
            
            cur.execute("""
                INSERT OR REPLACE INTO outreach_datasets 
                (id, name, source_file, sheet_name, total_leads, verified_emails_count, description, category)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                dataset_id,
                dataset_name,
                "Digital transformation leads cold email reachout.xlsx",
                "Sheet2",
                len(leads2),
                len([l for l in leads2 if l.get("Email")]),
                "11 High-Priority Executive Transformation Leaders with direct verified emails.",
                "Digital Transformation"
            ))

            for item in leads2:
                first_name = (item.get("First name") or "").strip()
                last_name = (item.get("Last name") or "").strip()
                full_name = (item.get("Full name") or f"{first_name} {last_name}").strip()
                company_name = (item.get("Company name") or "").strip()
                email = (item.get("Email") or "").strip()

                if not company_name and not email:
                    continue

                lead_dict = {
                    "recipient_first_name": first_name or "there",
                    "recipient_name": full_name or "Team",
                    "recipient_title": item.get("Job title"),
                    "company_name": company_name or "your company",
                    "ai_one_liner": item.get("AI One-Liner"),
                    "value_proposition": item.get("Value Proposition"),
                    "service_tags": item.get("Service Tags"),
                    "company_industry": item.get("Company industry")
                }
                pitch = generate_default_pitch(lead_dict, persona)

                cur.execute("""
                    INSERT INTO outreach_dataset_leads
                    (dataset_id, company_name, company_website, company_industry, company_country,
                     company_city, recipient_name, recipient_first_name, recipient_last_name,
                     recipient_title, recipient_email, recipient_linkedin, ai_one_liner,
                     value_proposition, service_tags, icp_target_titles, employee_range,
                     raw_metadata, draft_subject, draft_body, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    dataset_id,
                    company_name,
                    item.get("Company website"),
                    item.get("Company industry"),
                    item.get("Person country") or item.get("Company country"),
                    item.get("Person city") or item.get("Company city"),
                    full_name,
                    first_name,
                    last_name,
                    item.get("Job title"),
                    email,
                    item.get("Person LinkedIn URL"),
                    item.get("AI One-Liner"),
                    item.get("Value Proposition"),
                    item.get("Service Tags"),
                    item.get("ICP Target Titles"),
                    item.get("Company employee range"),
                    json.dumps({k: str(v) for k, v in item.items() if v is not None}),
                    pitch["subject"],
                    pitch["body"],
                    "PENDING"
                ))

            imported_stats["sheet2"] = len(leads2)

    # 3. Also register Chennai B2B Leads as a selectable dataset
    cur.execute("SELECT COUNT(*) FROM chennai_b2b_leads")
    chennai_count = cur.fetchone()[0] or 0
    if chennai_count > 0:
        cur.execute("SELECT COUNT(*) FROM outreach_dataset_leads WHERE dataset_id = 'chennai-b2b'")
        chennai_leads_exist = cur.fetchone()[0]
        if chennai_leads_exist == 0:
            cur.execute("""
                INSERT OR REPLACE INTO outreach_datasets
                (id, name, source_file, sheet_name, total_leads, verified_emails_count, description, category)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "chennai-b2b",
                "Chennai B2B SMB Leaders (Under 50)",
                "chennai_b2b_leads.csv",
                "Chennai SMBs",
                chennai_count,
                chennai_count,
                "250+ Verified Chennai Manufacturing, Engineering, IT, and Healthcare SMB Leaders.",
                "India Regional SMB"
            ))

            cur.execute("""
                SELECT id, name, website, sector, area, owner_name, email, phone, employee_range, category
                FROM chennai_b2b_leads
                WHERE email IS NOT NULL AND email != ''
            """)
            c_rows = cur.fetchall()
            for r in c_rows:
                c_id, c_name, c_web, c_sec, c_area, c_owner, c_email, c_phone, c_emp, c_cat = r
                tokens = (c_owner or "").split()
                c_first = tokens[0] if tokens else "there"
                lead_dict = {
                    "recipient_first_name": c_first,
                    "recipient_name": c_owner or "Business Owner",
                    "recipient_title": "Promoter / Director",
                    "company_name": c_name,
                    "ai_one_liner": f"Industrial operations and manufacturing in {c_area or 'Chennai'}",
                    "value_proposition": f"Specialized {c_cat or c_sec} capabilities",
                    "service_tags": f"{c_sec}, {c_cat}",
                    "company_industry": c_sec
                }
                pitch = generate_default_pitch(lead_dict, persona)
                cur.execute("""
                    INSERT INTO outreach_dataset_leads
                    (dataset_id, company_name, company_website, company_industry, company_country,
                     company_city, recipient_name, recipient_first_name, recipient_title,
                     recipient_email, ai_one_liner, value_proposition, service_tags,
                     employee_range, draft_subject, draft_body, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    "chennai-b2b",
                    c_name,
                    c_web,
                    c_sec,
                    "India",
                    c_area or "Chennai",
                    c_owner,
                    c_first,
                    "Promoter / Director",
                    c_email,
                    lead_dict["ai_one_liner"],
                    lead_dict["value_proposition"],
                    c_cat or c_sec,
                    c_emp,
                    pitch["subject"],
                    pitch["body"],
                    "PENDING"
                ))
            imported_stats["chennai"] = len(c_rows)

    conn.commit()
    conn.close()
    return {"status": "success", "imported": imported_stats}

def regenerate_with_ollama(lead_id: int, persona_id: str = "zoya", tone: str = "concise", custom_notes: str = "") -> Dict[str, Any]:
    """
    Invokes the 4-Agent Ollama Relay (Section 4 of AGENTS.md) to synthesize
    an ultra-bespoke cold pitch grounded in the lead's true company intelligence.
    Sequential pipeline:
    Agent 1: Company Deep Researcher (DB + Web context)
    Agent 2: Workflow and Friction Spotter (Operational pain points)
    Agent 3: Bespoke Copy Synthesizer (Generates strictly Line 2)
    Agent 4: Quality Auditor and DB Writer (Validates, locks into template, saves to DB & audit log)
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM outreach_dataset_leads WHERE id = ?", (lead_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"Lead ID {lead_id} not found")

    lead = dict(row)
    conn.close()

    persona = next((p for p in DEFAULT_PERSONAS if p["id"] == persona_id), DEFAULT_PERSONAS[0])

    # Run the 4-agent relay with Ollama (or graceful fallback to Company Intelligence Engine if Ollama offline)
    result = run_ollama_outreach_relay(lead=lead, persona=persona)
    return result
