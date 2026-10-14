import csv
import io
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import Opportunity, Company, FitEvaluation, OutreachDraft, ComplianceAuditLog, RejectedOpportunity
from app.agents.deadline_alert import deadline_alert_agent

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])

class StatusUpdateRequest(BaseModel):
    status: str

@router.get("/summary")
async def get_overview_summary(db: AsyncSession = Depends(get_db)):
    """Overview metric cards strictly adhering to Active = Accepted + Not Expired."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Active opportunities only: accepted status and NOT expired
    active_statuses = ["NEW", "REVIEWED", "CONTACTED", "REPLIED", "PROPOSAL", "WON"]
    stmt_active = select(Opportunity).where(
        Opportunity.status.in_(active_statuses),
        Opportunity.is_expired == False
    )
    res_active = await db.execute(stmt_active)
    active_records = res_active.scalars().all()
    total_active = len(active_records)

    # New today (active only)
    new_today = len([o for o in active_records if o.created_at and o.created_at >= today_start])

    # Closing in 7 days (active and non-expired only)
    closing_7d = []
    for o in active_records:
        if o.deadline and o.deadline > now:
            days_left = (o.deadline - now).days
            if 0 <= days_left <= 7:
                closing_7d.append(o)

    # High fit leads (score >= 80 among active)
    stmt_high = select(Opportunity).join(FitEvaluation).where(
        Opportunity.status.in_(active_statuses),
        Opportunity.is_expired == False,
        FitEvaluation.total_score >= 80
    )
    res_high = await db.execute(stmt_high)
    high_fit = len(res_high.scalars().all())

    # Contacted leads
    contacted_count = len([o for o in active_records if o.status == "CONTACTED"])

    # Won leads
    won_count = len([o for o in active_records if o.status == "WON"])

    # Needs Review count
    stmt_nr = select(Opportunity).where(Opportunity.status == "NEEDS_REVIEW")
    needs_review_count = len((await db.execute(stmt_nr)).scalars().all())

    # Expired count
    stmt_exp = select(Opportunity).where(
        (Opportunity.is_expired == True) | (Opportunity.status == "EXPIRED")
    )
    expired_count = len((await db.execute(stmt_exp)).scalars().all())

    # Rejected count
    stmt_rej = select(RejectedOpportunity)
    rejected_count = len((await db.execute(stmt_rej)).scalars().all())

    return {
        "new_today": new_today,
        "closing_in_7_days": len(closing_7d),
        "high_fit_leads": high_fit,
        "contacted": contacted_count,
        "won": won_count,
        "total_active": total_active,
        "needs_review_count": needs_review_count,
        "expired_count": expired_count,
        "rejected_count": rejected_count,
        "claim": "Active Opportunities = accepted + not expired only"
    }

@router.get("")
async def list_opportunities(
    view: str = Query("active", description="active | closing_soon | expired | needs_review | all"),
    category: Optional[str] = None,
    country: Optional[str] = None,
    min_score: Optional[int] = None,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Main table search and filtered feed with active/expired segmentation and score breakdown."""
    now = datetime.utcnow()
    stmt = select(Opportunity).options(
        selectinload(Opportunity.company),
        selectinload(Opportunity.fit_evaluation)
    ).order_by(Opportunity.created_at.desc())

    # View filtering
    if view == "active":
        stmt = stmt.where(
            Opportunity.is_expired == False,
            Opportunity.status.notin_(["REJECTED", "NEEDS_REVIEW", "EXPIRED"])
        )
    elif view == "closing_soon":
        stmt = stmt.where(
            Opportunity.is_expired == False,
            Opportunity.status.notin_(["REJECTED", "NEEDS_REVIEW", "EXPIRED"]),
            Opportunity.deadline > now
        )
    elif view == "expired":
        stmt = stmt.where(
            (Opportunity.is_expired == True) | (Opportunity.status == "EXPIRED")
        )
    elif view == "needs_review":
        stmt = stmt.where(Opportunity.status == "NEEDS_REVIEW")

    if status and status != "ALL":
        stmt = stmt.where(Opportunity.status == status)
    if category and category != "ALL":
        stmt = stmt.where(Opportunity.primary_category == category)

    res = await db.execute(stmt)
    records = res.scalars().all()

    # Apply in-memory secondary filters for flexible matching
    filtered = []
    for opp in records:
        comp = opp.company
        fit = opp.fit_evaluation

        if view == "closing_soon":
            if not opp.deadline or not (0 <= (opp.deadline - now).days <= 7):
                continue

        if country and country != "ALL" and comp:
            if country.lower() not in (comp.headquarters_country or "").lower():
                continue

        if min_score is not None and fit:
            if fit.total_score < min_score:
                continue

        if keyword:
            kw = keyword.lower()
            text_corpus = f"{opp.title} {opp.description} {comp.name if comp else ''} {' '.join(opp.tech_stack or [])}".lower()
            if kw not in text_corpus:
                continue

        countdown = deadline_alert_agent.format_countdown(opp.deadline)
        urgency = deadline_alert_agent.get_urgency_tier(opp.deadline)

        # Determine source trust tier
        source_trust = "Official Portal" if any(p in (opp.source_url or "").lower() for p in [".gov", "gem.gov", "eprocure", "ted.europa", "sam.gov", "ungm.org", "undp.org"]) else ("Aggregator" if "news.google" in (opp.source_url or "").lower() else "Unverified")

        filtered.append({
            "id": opp.id,
            "title": opp.title,
            "description": opp.description,
            "content_type": opp.content_type or "Tender/RFP",
            "opportunity_type": opp.opportunity_type or "Project-post",
            "is_expired": bool(opp.is_expired),
            "rejection_reason": opp.rejection_reason,
            "source_trust": source_trust,
            "is_demo_data": bool(opp.raw_crawl_id is None),
            "raw_crawl_id": opp.raw_crawl_id,
            "provenance_type": "Demo data" if opp.raw_crawl_id is None else "Live Fetch",
            "company": {
                "id": comp.id if comp else None,
                "name": comp.name if comp else "Unknown Buyer",
                "domain": comp.domain if comp else None,
                "country": comp.headquarters_country if comp else "Unknown",
                "city": comp.headquarters_city if comp else "Unknown",
                "industry": comp.industry if comp else "",
                "contacts": comp.public_contact_emails if comp else []
            },
            "primary_category": opp.primary_category,
            "tech_stack": opp.tech_stack or [],
            "budget": {
                "min": opp.budget_min,
                "max": opp.budget_max,
                "currency": opp.currency
            },
            "posted_date": opp.posted_date.isoformat() if opp.posted_date else None,
            "listed_time": opp.listed_time.isoformat() if opp.listed_time else None,
            "deadline": opp.deadline.isoformat() if opp.deadline else None,
            "countdown": countdown,
            "urgency": urgency,
            "fit_score": fit.total_score if fit else 70,
            "fit_breakdown": {
                "total": fit.total_score if fit else 70,
                "service": fit.service_fit_score if fit else 30,
                "region": fit.region_fit_score if fit else 20,
                "budget": fit.budget_fit_score if fit else 10,
                "urgency": fit.urgency_score if fit else 10,
                "penalty": fit.penalty_score if fit else 0,
                "reasoning": fit.score_reasoning if fit else ""
            },
            "source_url": opp.source_url,
            "status": opp.status,
            "created_at": opp.created_at.isoformat()
        })

    return {
        "total": len(filtered),
        "claim": "Active Opportunities = accepted + not expired only",
        "items": filtered[offset:offset+limit]
    }

@router.get("/{opp_id}")
async def get_opportunity_detail(opp_id: str, db: AsyncSession = Depends(get_db)):
    """Lead detail drawer data."""
    stmt = select(Opportunity).options(
        selectinload(Opportunity.company),
        selectinload(Opportunity.fit_evaluation),
        selectinload(Opportunity.outreach_drafts)
    ).where(Opportunity.id == opp_id)

    res = await db.execute(stmt)
    opp = res.scalars().first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    comp = opp.company
    fit = opp.fit_evaluation
    drafts = opp.outreach_drafts

    # Fetch recent compliance logs for this lead
    stmt_logs = select(ComplianceAuditLog).where(
        ComplianceAuditLog.target_url == opp.source_url
    ).order_by(ComplianceAuditLog.created_at.desc()).limit(5)
    logs_res = await db.execute(stmt_logs)
    audit_trail = [
        {
            "action": l.action_type,
            "agent": l.agent_name,
            "legal_basis": l.legal_basis,
            "timestamp": l.created_at.isoformat()
        }
        for l in logs_res.scalars().all()
    ]

    return {
        "id": opp.id,
        "title": opp.title,
        "description": opp.description,
        "company": {
            "name": comp.name if comp else "Enterprise",
            "domain": comp.domain if comp else None,
            "website": comp.website_url if comp else None,
            "country": comp.headquarters_country if comp else "India",
            "city": comp.headquarters_city if comp else "",
            "industry": comp.industry if comp else "",
            "size": comp.employee_size_range if comp else "",
            "public_contacts": comp.public_contact_emails if comp else [],
            "public_phone": comp.public_phone if comp else None
        },
        "primary_category": opp.primary_category,
        "tech_stack": opp.tech_stack or [],
        "budget_min": opp.budget_min,
        "budget_max": opp.budget_max,
        "currency": opp.currency,
        "posted_date": opp.posted_date.isoformat() if opp.posted_date else None,
        "listed_time": opp.listed_time.isoformat() if opp.listed_time else None,
        "deadline": opp.deadline.isoformat() if opp.deadline else None,
        "countdown": deadline_alert_agent.format_countdown(opp.deadline),
        "source_url": opp.source_url,
        "status": opp.status,
        "is_demo_data": bool(opp.raw_crawl_id is None),
        "raw_crawl_id": opp.raw_crawl_id,
        "provenance_type": "Demo data" if opp.raw_crawl_id is None else "Live Fetch",
        "fit": {
            "total_score": fit.total_score if fit else 0,
            "service_score": fit.service_fit_score if fit else 0,
            "budget_score": fit.budget_fit_score if fit else 0,
            "region_score": fit.region_fit_score if fit else 0,
            "urgency_score": fit.urgency_score if fit else 0,
            "reasoning": fit.score_reasoning if fit else ""
        },
        "drafts": [
            {
                "id": d.id,
                "recipient_email": d.recipient_email,
                "recipient_name": d.recipient_name,
                "subject": d.subject,
                "subject_options": d.subject_options or [],
                "selected_subject_index": d.selected_subject_index or 0,
                "body_markdown": d.email_body_markdown,
                "draft_mode": d.draft_mode or "FORMAL_TENDER",
                "word_count": d.word_count or 0,
                "source_facts": d.source_facts or {},
                "has_ungrounded_claims": bool(d.has_ungrounded_claims),
                "ungrounded_warning": d.ungrounded_warning,
                "can_send": bool(d.can_send),
                "solution_summary": d.proposed_solution_summary,
                "follow_up_day4": d.follow_up_day4,
                "follow_up_day9": d.follow_up_day9,
                "original_body": d.original_body,
                "edit_history": d.edit_history or [],
                "status": d.status,
                "opt_out_token": d.opt_out_token,
                "created_at": d.created_at.isoformat() if d.created_at else None
            }
            for d in drafts
        ],
        "audit_trail": audit_trail
    }

@router.patch("/{opp_id}/status")
async def update_opportunity_status(
    opp_id: str,
    payload: StatusUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Move lead across pipeline stages: NEW, REVIEWED, CONTACTED, REPLIED, PROPOSAL, WON, LOST, REJECTED."""
    valid_statuses = ["NEW", "REVIEWED", "CONTACTED", "REPLIED", "PROPOSAL", "WON", "LOST", "REJECTED"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from {valid_statuses}")

    stmt = select(Opportunity).where(Opportunity.id == opp_id)
    res = await db.execute(stmt)
    opp = res.scalars().first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    old_status = opp.status
    opp.status = payload.status
    await db.commit()

    return {"id": opp.id, "old_status": old_status, "new_status": opp.status}

@router.get("/export/csv")
async def export_opportunities_csv(db: AsyncSession = Depends(get_db)):
    """Export opportunities to CSV format with real source URLs."""
    stmt = select(Opportunity).options(
        selectinload(Opportunity.company),
        selectinload(Opportunity.fit_evaluation)
    ).order_by(Opportunity.created_at.desc())

    res = await db.execute(stmt)
    records = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Title", "Company", "Category", "Country", "Tech Stack",
        "Budget Min", "Budget Max", "Currency", "Posted Date", "Listed Time",
        "Deadline", "Countdown", "Fit Score", "Status", "Source URL"
    ])

    for opp in records:
        comp = opp.company
        fit = opp.fit_evaluation
        writer.writerow([
            opp.id,
            opp.title,
            comp.name if comp else "",
            opp.primary_category,
            comp.headquarters_country if comp else "",
            ", ".join(opp.tech_stack or []),
            opp.budget_min or "",
            opp.budget_max or "",
            opp.currency,
            opp.posted_date.isoformat() if opp.posted_date else "",
            opp.listed_time.isoformat() if opp.listed_time else "",
            opp.deadline.isoformat() if opp.deadline else "",
            deadline_alert_agent.format_countdown(opp.deadline),
            fit.total_score if fit else "",
            opp.status,
            opp.source_url
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=clickfield_opportunities.csv"}
    )

@router.get("/rejected/log")
async def list_rejected_log(
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve items filtered into the Rejected Log with their rejection reasons."""
    stmt = select(RejectedOpportunity).order_by(RejectedOpportunity.rejected_at.desc())
    res = await db.execute(stmt)
    records = res.scalars().all()

    items = [
        {
            "id": r.id,
            "title": r.title,
            "company_name": r.company_name,
            "description": r.description,
            "content_type": r.content_type,
            "opportunity_type": r.opportunity_type,
            "rejection_reason": r.rejection_reason,
            "source_url": r.source_url,
            "rejected_at": r.rejected_at.isoformat() if r.rejected_at else None
        }
        for r in records
    ]

    return {
        "total": len(items),
        "items": items[offset:offset+limit]
    }

@router.post("/{opp_id}/restore")
async def restore_opportunity(
    opp_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Restore an item to Active (NEW) status from Needs Review or Rejected."""
    stmt = select(Opportunity).where(Opportunity.id == opp_id)
    res = await db.execute(stmt)
    opp = res.scalars().first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    opp.status = "NEW"
    opp.is_expired = False
    opp.rejection_reason = None
    await db.commit()
    await db.refresh(opp)

    return {"id": opp.id, "status": opp.status, "message": "Restored to Active"}

@router.post("/{opp_id}/enrich-company")
async def live_enrich_opportunity_company(
    opp_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    On-Demand Autonomous Live Web Search & Scraping for an Opportunity's Company.
    Queries the web for the corporate website, extracts verified details and public procurement
    mailboxes, and updates company record with zero hallucination.
    """
    from urllib.parse import urlparse
    from app.agents.web_intel_agent import web_intel_agent

    stmt = select(Opportunity).options(selectinload(Opportunity.company)).where(Opportunity.id == opp_id)
    res = await db.execute(stmt)
    opp = res.scalars().first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    comp = opp.company
    if not comp:
        raise HTTPException(status_code=400, detail="No company associated with this opportunity")

    web_intel = web_intel_agent.enrich_company_details(
        company_name=comp.name,
        provided_website=comp.website_url,
        area=comp.headquarters_city or "",
        city=comp.headquarters_country or "India"
    )

    if web_intel.get("web_status") == "VERIFIED_LIVE_WEBSITE":
        website_url = web_intel.get("final_url") or web_intel.get("target_url")
        if website_url:
            comp.website_url = website_url
            parsed = urlparse(website_url)
            comp.domain = parsed.netloc.lower()

        # Merge discovered emails
        existing_emails = comp.public_contact_emails or []
        for em in web_intel.get("verified_emails", []):
            if em not in existing_emails:
                existing_emails.append(em)
        comp.public_contact_emails = existing_emails

    comp.enriched_at = datetime.utcnow()
    await db.commit()
    await db.refresh(comp)

    return {
        "success": True,
        "opp_id": opp.id,
        "company": {
            "name": comp.name,
            "domain": comp.domain,
            "website": comp.website_url,
            "country": comp.headquarters_country,
            "city": comp.headquarters_city,
            "industry": comp.industry,
            "public_contacts": comp.public_contact_emails
        },
        "web_intel": web_intel
    }

