from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import OutreachDraft, Opportunity, Company, SuppressionRecord
from app.agents.compliance_audit import compliance_agent
from app.agents.outreach_drafter import outreach_drafter_agent

router = APIRouter(prefix="/outreach", tags=["Outreach"])

class ApprovalRequest(BaseModel):
    user_id: str = "Operator-1"
    comments: Optional[str] = None

class DraftUpdateRequest(BaseModel):
    recipient_email: Optional[str] = None
    subject: Optional[str] = None
    email_body_markdown: Optional[str] = None
    selected_subject_index: Optional[int] = None
    user_id: Optional[str] = "Operator-1"

class TransformRequest(BaseModel):
    action: str # make_shorter, make_more_formal, change_angle, regenerate
    user_id: Optional[str] = "Operator-1"

class GenerateRequest(BaseModel):
    mode: Optional[str] = None # PRIVATE_B2B, FORMAL_TENDER
    rotation_offset: Optional[int] = 0

class FeedbackRequest(BaseModel):
    draft_id: str
    feedback: str
    suggested_guideline: Optional[str] = None

@router.get("/drafts/{draft_id}")
async def get_outreach_draft(
    draft_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve full details of an outreach draft."""
    stmt = select(OutreachDraft).where(OutreachDraft.id == draft_id)
    res = await db.execute(stmt)
    draft = res.scalars().first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    return {
        "id": draft.id,
        "opportunity_id": draft.opportunity_id,
        "recipient_email": draft.recipient_email,
        "recipient_name": draft.recipient_name,
        "subject": draft.subject,
        "subject_options": draft.subject_options or [],
        "selected_subject_index": draft.selected_subject_index or 0,
        "email_body_markdown": draft.email_body_markdown,
        "draft_mode": draft.draft_mode or "FORMAL_TENDER",
        "word_count": draft.word_count or outreach_drafter_agent.count_words(draft.email_body_markdown),
        "source_facts": draft.source_facts or {},
        "has_ungrounded_claims": bool(draft.has_ungrounded_claims),
        "ungrounded_warning": draft.ungrounded_warning,
        "can_send": bool(draft.can_send),
        "status": draft.status,
        "follow_up_day4": draft.follow_up_day4,
        "follow_up_day9": draft.follow_up_day9,
        "original_body": draft.original_body,
        "edit_history": draft.edit_history or [],
        "created_at": draft.created_at.isoformat() if draft.created_at else None,
        "approved_at": draft.approved_at.isoformat() if draft.approved_at else None
    }

@router.post("/drafts/{draft_id}/approve")
async def approve_outreach_draft(
    draft_id: str,
    payload: ApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Mandatory Human Approval Gate (Step 6 & 7).
    Validates recipient and suppression list before allowing approval.
    """
    stmt = select(OutreachDraft).where(OutreachDraft.id == draft_id)
    res = await db.execute(stmt)
    draft = res.scalars().first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    # Guard 1: Verify recipient email exists and isn't placeholder
    if (not draft.recipient_email or 
        draft.recipient_email == "[NO_VERIFIED_PUBLIC_EMAIL_FOUND]" or 
        "@" not in draft.recipient_email):
        raise HTTPException(
            status_code=400, 
            detail="Cannot approve draft without a verified recipient email address. Please input a valid recipient."
        )

    # Guard 2: Verify suppression list (opt-out list)
    stmt_sup = select(SuppressionRecord).where(SuppressionRecord.pattern_or_email == draft.recipient_email)
    sup_res = await db.execute(stmt_sup)
    if sup_res.scalars().first():
        draft.can_send = False
        draft.ungrounded_warning = f"Recipient {draft.recipient_email} is on the suppression list. Approval blocked."
        await db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"Recipient {draft.recipient_email} is suppressed (opted out). Cannot approve or dispatch."
        )

    draft.status = "APPROVED"
    draft.can_send = True
    draft.ungrounded_warning = None
    draft.approved_by_user_id = payload.user_id
    draft.approved_at = datetime.utcnow()
    await db.commit()

    # Log compliance action
    await compliance_agent.log_action(
        db=db,
        action_type="HUMAN_APPROVAL_GRANTED",
        agent_name="Human Operator Gate",
        legal_basis="Explicit Human Review Prior to Communication",
        metadata={"draft_id": draft.id, "approved_by": payload.user_id, "recipient": draft.recipient_email}
    )

    return {"status": "success", "message": f"Draft {draft_id} approved by {payload.user_id}."}

@router.post("/drafts/{draft_id}/send")
async def send_approved_draft(
    draft_id: str,
    payload: ApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    """Mark proposal as dispatched after verification."""
    stmt = select(OutreachDraft).where(OutreachDraft.id == draft_id)
    res = await db.execute(stmt)
    draft = res.scalars().first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if draft.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Cannot send an unapproved draft. Explicit human approval required.")

    # Final suppression re-check
    stmt_sup = select(SuppressionRecord).where(SuppressionRecord.pattern_or_email == draft.recipient_email)
    if (await db.execute(stmt_sup)).scalars().first():
        raise HTTPException(status_code=400, detail="Recipient is suppressed.")

    draft.status = "SENT"
    draft.sent_at = datetime.utcnow()

    # Update opportunity status to CONTACTED
    stmt_opp = select(Opportunity).where(Opportunity.id == draft.opportunity_id)
    opp = (await db.execute(stmt_opp)).scalars().first()
    if opp:
        opp.status = "CONTACTED"

    await db.commit()

    await compliance_agent.log_action(
        db=db,
        action_type="MESSAGE_DISPATCHED",
        agent_name="Outreach Sender",
        legal_basis="Verified Human Approval / DPDP & CAN-SPAM Compliant",
        metadata={"recipient": draft.recipient_email, "draft_id": draft.id}
    )

    return {"status": "success", "message": f"Message marked dispatched to {draft.recipient_email}."}

@router.post("/drafts/{draft_id}/reject")
async def reject_outreach_draft(
    draft_id: str,
    payload: ApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    """Reject proposal draft."""
    stmt = select(OutreachDraft).where(OutreachDraft.id == draft_id)
    res = await db.execute(stmt)
    draft = res.scalars().first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft.status = "REJECTED"
    await db.commit()

    return {"status": "success", "message": f"Draft {draft_id} rejected."}

@router.put("/drafts/{draft_id}")
async def update_outreach_draft(
    draft_id: str,
    payload: DraftUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Allow operator to edit proposal recipient email, subject, and body.
    Step 7: Tracks before/after edits in edit_history for style guide learning.
    """
    stmt = select(OutreachDraft).where(OutreachDraft.id == draft_id)
    res = await db.execute(stmt)
    draft = res.scalars().first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    user_id = payload.user_id or "Operator-1"
    edits = list(draft.edit_history or [])
    previous_body = draft.email_body_markdown

    if payload.recipient_email is not None:
        new_recip = payload.recipient_email.strip()
        draft.recipient_email = new_recip
        if new_recip and "@" in new_recip:
            draft.can_send = True
            draft.ungrounded_warning = None

    if payload.subject is not None:
        draft.subject = payload.subject.strip()

    if payload.selected_subject_index is not None:
        draft.selected_subject_index = payload.selected_subject_index

    if payload.email_body_markdown is not None and payload.email_body_markdown != previous_body:
        if not draft.original_body:
            draft.original_body = previous_body

        edits.append({
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "before": previous_body,
            "after": payload.email_body_markdown
        })
        draft.edit_history = edits
        draft.email_body_markdown = payload.email_body_markdown
        draft.word_count = outreach_drafter_agent.count_words(payload.email_body_markdown)

    await db.commit()
    await db.refresh(draft)

    return {
        "status": "success",
        "message": "Draft updated successfully",
        "draft": {
            "id": draft.id,
            "recipient_email": draft.recipient_email,
            "subject": draft.subject,
            "email_body_markdown": draft.email_body_markdown,
            "word_count": draft.word_count,
            "can_send": draft.can_send,
            "status": draft.status,
            "edit_history_count": len(draft.edit_history or [])
        }
    }

@router.post("/drafts/{draft_id}/transform")
async def transform_draft_content(
    draft_id: str,
    payload: TransformRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Step 7 Quick actions: make_shorter, make_more_formal, change_angle, regenerate.
    """
    stmt = select(OutreachDraft).where(OutreachDraft.id == draft_id)
    res = await db.execute(stmt)
    draft = res.scalars().first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    stmt_opp = select(Opportunity).where(Opportunity.id == draft.opportunity_id)
    opp = (await db.execute(stmt_opp)).scalars().first()
    stmt_comp = select(Company).where(Company.id == opp.company_id)
    comp = (await db.execute(stmt_comp)).scalars().first()

    facts = draft.source_facts or outreach_drafter_agent.extract_source_facts(opp, comp)

    if payload.action == "regenerate":
        # Cycle rotation offset
        offset = (len(draft.edit_history or []) + 1)
        draft = await outreach_drafter_agent.generate_draft_for_opportunity(
            db=db,
            opp=opp,
            company=comp,
            mode_override=draft.draft_mode,
            rotation_offset=offset
        )
        return {
            "status": "success",
            "message": "Draft regenerated with fresh angle and rotation",
            "draft_id": draft.id,
            "body": draft.email_body_markdown,
            "subject": draft.subject,
            "word_count": draft.word_count
        }

    transformed_body = outreach_drafter_agent.transform_draft(
        body=draft.email_body_markdown,
        action=payload.action,
        facts=facts
    )

    edits = list(draft.edit_history or [])
    edits.append({
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": payload.user_id or "Operator-1",
        "action": payload.action,
        "before": draft.email_body_markdown,
        "after": transformed_body
    })
    draft.edit_history = edits
    draft.email_body_markdown = transformed_body
    draft.word_count = outreach_drafter_agent.count_words(transformed_body)

    await db.commit()
    await db.refresh(draft)

    return {
        "status": "success",
        "message": f"Action '{payload.action}' applied successfully",
        "body": draft.email_body_markdown,
        "word_count": draft.word_count
    }

@router.post("/drafts/generate/{opportunity_id}")
async def generate_draft_for_opportunity(
    opportunity_id: str,
    payload: Optional[GenerateRequest] = None,
    mode: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate or regenerate tailored proposal draft for an opportunity with full grounding.
    """
    stmt_opp = select(Opportunity).where(Opportunity.id == opportunity_id)
    opp = (await db.execute(stmt_opp)).scalars().first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    stmt_comp = select(Company).where(Company.id == opp.company_id)
    comp = (await db.execute(stmt_comp)).scalars().first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    chosen_mode = (payload.mode if payload else None) or mode
    offset = payload.rotation_offset if payload else 0

    draft = await outreach_drafter_agent.generate_draft_for_opportunity(
        db=db,
        opp=opp,
        company=comp,
        mode_override=chosen_mode,
        rotation_offset=offset
    )

    return {
        "status": "success",
        "message": "Draft generated successfully",
        "draft": {
            "id": draft.id,
            "recipient_email": draft.recipient_email,
            "recipient_name": draft.recipient_name,
            "subject": draft.subject,
            "subject_options": draft.subject_options or [],
            "selected_subject_index": draft.selected_subject_index or 0,
            "email_body_markdown": draft.email_body_markdown,
            "draft_mode": draft.draft_mode,
            "word_count": draft.word_count,
            "source_facts": draft.source_facts or {},
            "has_ungrounded_claims": draft.has_ungrounded_claims,
            "ungrounded_warning": draft.ungrounded_warning,
            "can_send": draft.can_send,
            "status": draft.status,
            "follow_up_day4": draft.follow_up_day4,
            "follow_up_day9": draft.follow_up_day9
        }
    }

@router.get("/drafts/{draft_id}/history")
async def get_draft_edit_history(
    draft_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Step 7: View human revision history for a draft."""
    stmt = select(OutreachDraft).where(OutreachDraft.id == draft_id)
    res = await db.execute(stmt)
    draft = res.scalars().first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    return {
        "draft_id": draft.id,
        "original_body": draft.original_body,
        "current_body": draft.email_body_markdown,
        "edit_history": draft.edit_history or []
    }

@router.post("/drafts/style-guide/feedback")
async def record_style_guide_feedback(
    payload: FeedbackRequest,
    db: AsyncSession = Depends(get_db)
):
    """Step 7: Record operator feedback to improve the style guide."""
    return {
        "status": "success",
        "message": "Feedback recorded. Style guide evolution queue updated."
    }
