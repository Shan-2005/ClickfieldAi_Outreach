import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel

from app.agentic_core.lead_discovery_orchestrator import orchestrator

router = APIRouter(prefix="/api/agentic", tags=["Ollama Multi-Agent System"])

class CopilotCommandRequest(BaseModel):
    command: str

class InboundReplyRequest(BaseModel):
    sender_email: str
    reply_body: str
    lead_id: Optional[int] = None
    subject: Optional[str] = None

class GenerateEmailRequest(BaseModel):
    lead_id: int
    sender_name: Optional[str] = "Zoya Patel"
    custom_instructions: Optional[str] = None

class DirectDispatchRequest(BaseModel):
    lead_id: int
    recipient_email: str
    recipient_name: Optional[str] = None
    subject: str
    body: str
    followup_day2: Optional[str] = None
    followup_day3: Optional[str] = None
    followup_day5: Optional[str] = None
    sender_name: Optional[str] = "Zoya Patel"

class ScrapeDatasetRequest(BaseModel):
    location: str
    sector: Optional[str] = "Manufacturing"
    query: Optional[str] = None
    max_results: Optional[int] = 5
    dataset_name: Optional[str] = None

class SaveDatasetRequest(BaseModel):
    dataset_name: str
    location: str
    leads: List[Dict[str, Any]]

@router.get("/summary")
def get_system_summary():
    """
    Returns authentic, verified system-wide progress metrics.
    Guarantees 100% zero-hallucination data.
    """
    try:
        summary = orchestrator.get_real_work_summary()
        return {"success": True, "data": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/daily-batch")
def generate_daily_batch(count: int = Query(15, ge=1, le=50)):
    """
    Triggers multi-agent pipeline (Agents 1-4) to process `count` uncontacted leads.
    """
    try:
        result = orchestrator.run_daily_15_batch(count=count)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dispatches")
def get_daily_dispatches(limit: int = 50, status: Optional[str] = None):
    """
    Lists generated outreach packages with full 4-step sequence.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    query = "SELECT * FROM daily_email_dispatches"
    params = []
    if status:
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    cur.execute(query, tuple(params))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"success": True, "count": len(rows), "data": rows}

@router.get("/cadence-due")
def get_cadence_due():
    """
    Returns scheduled follow-ups (Day 2, Day 3, Day 5) due on or before today.
    """
    today_str = datetime.now().strftime("%Y-%m-%d")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT * FROM email_followup_cadence
        WHERE due_date <= ? AND status = 'PENDING'
        ORDER BY due_date ASC, stage_day ASC
    """, (today_str,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"success": True, "count": len(rows), "data": rows}

@router.post("/dispatch/{dispatch_id}")
def mark_dispatched(dispatch_id: int):
    """
    Dispatches a Day 0 email and records execution in the audit log.
    """
    res = orchestrator.dispatch_email_item(dispatch_id)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Dispatch failed."))
    return {"success": True, "data": res.get("dispatched_item")}

@router.post("/dispatch-cadence/{cadence_id}")
def mark_cadence_dispatched(cadence_id: int):
    """
    Dispatches a staged follow-up (Day 2, 3, or 5).
    """
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE email_followup_cadence
        SET status = 'SENT', sent_at = ?
        WHERE id = ?
    """, (now_str, cadence_id))
    cur.execute("SELECT * FROM email_followup_cadence WHERE id = ?", (cadence_id,))
    row = cur.fetchone()
    conn.commit()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Cadence record not found.")
    return {"success": True, "data": dict(row)}

@router.post("/inbound-reply")
def log_inbound_reply(req: InboundReplyRequest):
    """
    Processes incoming prospect reply with Agent 5 (InboundReplyAgent),
    auto-suppressing future follow-ups if appropriate.
    """
    result = reply_agent.process_reply(
        sender_email=req.sender_email,
        reply_body=req.reply_body,
        lead_id=req.lead_id,
        subject=req.subject
    )
    return {"success": True, "data": result}

@router.get("/audit-trail")
def get_audit_trail(limit: int = 100):
    """
    Retrieves the immutable audit ledger of all agent operations.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT * FROM agent_action_audit_log
        ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"success": True, "count": len(rows), "data": rows}

@router.post("/copilot-command")
def handle_copilot_command(req: CopilotCommandRequest):
    """
    Workstation Copilot Natural Language Action Interpreter.
    Routes commands dynamically to the appropriate agent.
    """
    cmd = req.command.lower().strip()
    summary = orchestrator.get_real_work_summary()

    if "run" in cmd and ("batch" in cmd or "daily" in cmd or "15" in cmd):
        batch_res = orchestrator.run_daily_15_batch(count=15)
        return {
            "success": True,
            "response": f"Autonomous Multi-Agent batch executed. Processed {batch_res.get('batch_size')} leads with full 4-step sequences.",
            "data": batch_res
        }
    elif "status" in cmd or "summary" in cmd or "how much" in cmd or "report" in cmd:
        return {
            "success": True,
            "response": f"System Status: {summary['total_verified_leads']} verified leads ({summary['mca_statutory_directors']} MCA directors), {summary['outreach_packages_generated']} packages generated, {summary['emails_dispatched']} dispatched, {summary['followups_scheduled']} follow-ups scheduled, {summary['inbound_replies_logged']} replies logged.",
            "data": summary
        }
    elif "follow up" in cmd or "followup" in cmd or "cadence" in cmd:
        today_str = datetime.now().strftime("%Y-%m-%d")
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM email_followup_cadence WHERE due_date <= ? AND status = 'PENDING'", (today_str,))
        due_count = cur.fetchone()[0]
        conn.close()
        return {
            "success": True,
            "response": f"There are currently {due_count} staged follow-up touchpoints due for dispatch today.",
            "data": {"due_count": due_count}
        }
    else:
        # Fallback to Ollama orchestrator reasoning
        prompt = f"User Command: {req.command}\nCurrent Metrics: {summary}\nProvide a direct, helpful technical response in 2 sentences."
        response_text = orchestrator.query_ollama(prompt, temperature=0.3)
        return {
            "success": True,
            "response": response_text or f"Command acknowledged. System running with {summary['total_verified_leads']} active records.",
            "data": summary
        }

@router.post("/generate-email")
def generate_lead_email(req: GenerateEmailRequest):
    """
    On-demand custom cold email synthesis for a specific lead powered directly by Ollama (llama3.2:3b).
    Strictly guarantees < 80 words and 'Reply with Yes' CTA.
    """
    res = orchestrator.synthesize_pitch_preview(
        lead_id=req.lead_id,
        sender_name=req.sender_name or "Zoya Patel",
        custom_instructions=req.custom_instructions
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to synthesize email."))
    return res

@router.post("/direct-dispatch")
def direct_dispatch_email(req: DirectDispatchRequest):
    """
    Direct 1-click email dispatch from Leads view or Outreach view.
    Updates daily_email_dispatches, schedules follow-ups in email_followup_cadence,
    and logs immutable audit event in agent_action_audit_log.
    """
    res = orchestrator.direct_dispatch_email(
        lead_id=req.lead_id,
        recipient_email=req.recipient_email,
        recipient_name=req.recipient_name,
        subject=req.subject,
        body=req.body,
        followup_day2=req.followup_day2,
        followup_day3=req.followup_day3,
        followup_day5=req.followup_day5,
        sender_name=req.sender_name or "Zoya Patel"
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Dispatch failed."))
    return res

@router.get("/lead-intelligence/{lead_id}")
def get_lead_intelligence(lead_id: int):
    """
    Inspects full company intelligence, operational bottlenecks, dataset source provenance,
    and complete audit trail history for a specific lead.
    """
    res = orchestrator.get_lead_full_intelligence(lead_id)
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("error", "Lead dossier not found."))
    return res

@router.get("/scrape-locations")
def get_supported_scrape_locations():
    """
    Returns curated Tamil Nadu industrial clusters available for AI Dataset Scraping.
    """
    clusters = [
        {"id": "ambattur", "name": "Ambattur Industrial Estate", "specialty": "Automotive CNC & Stamping", "region": "Chennai"},
        {"id": "guindy", "name": "Guindy SIDCO Estate", "specialty": "Precision Labs & Automation", "region": "Chennai"},
        {"id": "sriperumbudur", "name": "Sriperumbudur Industrial Corridor", "specialty": "Auto Pressings & Moulds", "region": "Kanchipuram"},
        {"id": "coimbatore", "name": "Coimbatore SIDCO & Kurichi", "specialty": "Motors, Pumps & Foundry Tools", "region": "Coimbatore"},
        {"id": "thirumudivakkam", "name": "Thirumudivakkam SIDCO", "specialty": "Fiber Laser & Sheet Metal", "region": "Chennai"},
        {"id": "oragadam", "name": "Oragadam Industrial Corridor", "specialty": "Automotive Jigs & Tooling", "region": "Kanchipuram"},
        {"id": "ekkatuthangal", "name": "Ekkatuthangal Industrial Estate", "specialty": "Electrical Control Panels", "region": "Chennai"},
        {"id": "porur", "name": "Porur Industrial Belt", "specialty": "Hydraulics & Fluid Power", "region": "Chennai"},
        {"id": "maraimalai-nagar", "name": "Maraimalai Nagar SIPCOT", "specialty": "Precision Auto Components", "region": "Chengalpattu"},
        {"id": "ranipet", "name": "Ranipet SIPCOT", "specialty": "Industrial Fabrication & Tooling", "region": "Ranipet"}
    ]
    return {"success": True, "locations": clusters}

@router.post("/scrape-dataset")
def scrape_dataset_with_ollama(req: ScrapeDatasetRequest):
    """
    Interactive AI Dataset Scraper powered by Google Maps & Ollama.
    Extracts authentic B2B leads from any location worldwide with zero fabrication.
    """
    res = orchestrator.scrape_dataset_with_ollama(
        location=req.location,
        sector=req.sector or "Manufacturing",
        query=req.query,
        max_results=req.max_results or 5,
        dataset_name=req.dataset_name
    )
    return res

@router.post("/save-dataset")
def save_scraped_dataset(req: SaveDatasetRequest):
    """
    Saves verified real leads under user-provided dataset name into radar database.
    """
    res = orchestrator.save_dataset(
        dataset_name=req.dataset_name,
        leads=req.leads,
        location=req.location
    )
    return res

@router.get("/ollama-status")
def get_ollama_status():
    """
    Live Ollama Daemon Connectivity & Verification Status.
    """
    from app.services.ollama_client import ollama_brain
    is_online = ollama_brain.is_available()
    models = ollama_brain.list_installed_models() if is_online else []
    return {
        "success": True,
        "online": is_online,
        "host": ollama_brain.host,
        "model": ollama_brain.model,
        "models": models,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/ollama-start")
def start_ollama_daemon():
    """
    User-triggered explicit start for Ollama daemon.
    """
    from app.services.ollama_client import ollama_brain
    res = ollama_brain.start_service()
    return res

@router.post("/ollama-stop")
def stop_ollama_daemon():
    """
    User-triggered explicit stop for Ollama daemon to free VRAM and RAM.
    """
    from app.services.ollama_client import ollama_brain
    res = ollama_brain.stop_service()
    return res


