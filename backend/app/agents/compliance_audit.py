import logging
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import ComplianceAuditLog, SuppressionRecord
from app.config import settings

logger = logging.getLogger("compliance_audit")

class ComplianceAuditAgent:
    """
    Agent 11: Compliance and Audit
    Enforces robots.txt/ToS, honors opt-outs/suppression list,
    logs every fetch and draft, stores source URL for each data point,
    and upholds CAN-SPAM, GDPR, and India DPDP Act 2023 compliance.
    """
    name = "Compliance & Audit Agent"

    async def check_suppression(self, db: AsyncSession, target: str) -> bool:
        """
        Check if a domain, email, or company pattern is on the suppression list.
        Returns True if suppressed (should NOT contact / should NOT scrape), False otherwise.
        """
        target_clean = target.strip().lower()
        stmt = select(SuppressionRecord).where(
            SuppressionRecord.is_active == True
        )
        result = await db.execute(stmt)
        records = result.scalars().all()
        for record in records:
            pattern = record.pattern_or_email.strip().lower()
            if pattern in target_clean or target_clean in pattern:
                logger.info(f"Target '{target}' is suppressed by rule '{record.pattern_or_email}' (Reason: {record.reason})")
                return True
        return False

    async def add_suppression(self, db: AsyncSession, pattern: str, reason: str) -> SuppressionRecord:
        """Add domain or email to suppression list."""
        rec = SuppressionRecord(
            pattern_or_email=pattern.strip().lower(),
            reason=reason
        )
        db.add(rec)
        await db.commit()
        await db.refresh(rec)
        await self.log_action(
            db=db,
            action_type="SUPPRESSION_ADD",
            agent_name=self.name,
            target_url=pattern,
            legal_basis="Data Subject Right to Opt-out (India DPDP 2023 / GDPR)",
            metadata={"reason": reason}
        )
        return rec

    async def log_action(
        self,
        db: AsyncSession,
        action_type: str,
        agent_name: str,
        target_url: Optional[str] = None,
        legal_basis: str = "Legitimate B2B Interest / Public Tender Requirement",
        metadata: Optional[Dict[str, Any]] = None
    ) -> ComplianceAuditLog:
        """Log an immutable audit action."""
        audit_entry = ComplianceAuditLog(
            action_type=action_type,
            agent_name=agent_name,
            target_url=target_url,
            legal_basis=legal_basis,
            metadata_json=metadata or {}
        )
        db.add(audit_entry)
        await db.commit()
        await db.refresh(audit_entry)
        return audit_entry

compliance_agent = ComplianceAuditAgent()
