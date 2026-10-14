from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List

from app.db.session import get_db
from app.db.models import ComplianceAuditLog, SuppressionRecord
from app.agents.compliance_audit import compliance_agent

router = APIRouter(prefix="/compliance", tags=["Compliance & Audit"])

class SuppressRequest(BaseModel):
    pattern_or_email: str
    reason: str = "User Requested Opt-Out / Suppression"

@router.get("/logs")
async def get_compliance_logs(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Fetch the latest compliance and audit trail records."""
    stmt = select(ComplianceAuditLog).order_by(ComplianceAuditLog.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return [
        {
            "id": l.id,
            "action_type": l.action_type,
            "agent_name": l.agent_name,
            "target_url": l.target_url,
            "legal_basis": l.legal_basis,
            "metadata": l.metadata_json,
            "created_at": l.created_at.isoformat()
        }
        for l in logs
    ]

@router.get("/suppression")
async def get_suppression_list(db: AsyncSession = Depends(get_db)):
    """Retrieve all active suppressed domains or emails."""
    stmt = select(SuppressionRecord).where(SuppressionRecord.is_active == True).order_by(SuppressionRecord.suppressed_at.desc())
    res = await db.execute(stmt)
    records = res.scalars().all()
    return [
        {
            "id": r.id,
            "pattern": r.pattern_or_email,
            "reason": r.reason,
            "suppressed_at": r.suppressed_at.isoformat()
        }
        for r in records
    ]

@router.post("/suppress")
async def add_suppression(payload: SuppressRequest, db: AsyncSession = Depends(get_db)):
    """Add a domain or email pattern to the suppression list."""
    rec = await compliance_agent.add_suppression(db, payload.pattern_or_email, payload.reason)
    return {"status": "success", "id": rec.id, "pattern": rec.pattern_or_email}
