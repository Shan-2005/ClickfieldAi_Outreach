import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Opportunity, FitEvaluation, Company

logger = logging.getLogger("deadline_alert")

class DeadlineAlertAgent:
    """
    Agent 9: Deadline and Alert
    Tracks closing dates, generates human-readable countdowns,
    identifies urgent tender deadlines, and prepares daily digests.
    """
    name = "Deadline & Alert Agent"

    def format_countdown(self, deadline: Optional[datetime]) -> str:
        if not deadline:
            return "Ongoing / Rolling"
        now = datetime.utcnow()
        diff = deadline - now
        if diff.total_seconds() < 0:
            return "Expired"
        days = diff.days
        hours = int(diff.seconds // 3600)
        if days == 0:
            return f"{hours}h left"
        elif days == 1:
            return f"1 day {hours}h left"
        else:
            return f"{days} days left"

    def get_urgency_tier(self, deadline: Optional[datetime]) -> str:
        if not deadline:
            return "NORMAL"
        diff = deadline - datetime.utcnow()
        if diff.total_seconds() < 0:
            return "EXPIRED"
        if diff.days <= 2:
            return "CRITICAL"
        if diff.days <= 7:
            return "URGENT"
        return "NORMAL"

    async def get_closing_soon_opportunities(self, db: AsyncSession, days: int = 7) -> List[Opportunity]:
        cutoff = datetime.utcnow() + timedelta(days=days)
        now = datetime.utcnow()
        stmt = select(Opportunity).where(
            Opportunity.deadline != None,
            Opportunity.deadline >= now,
            Opportunity.deadline <= cutoff
        ).order_by(Opportunity.deadline.asc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def generate_daily_digest(self, db: AsyncSession) -> Dict[str, Any]:
        """Generate summary digest of high-priority opportunities."""
        now = datetime.utcnow()
        closing_7d = await self.get_closing_soon_opportunities(db, days=7)

        # High fit leads
        stmt_high = select(Opportunity).join(FitEvaluation).where(
            FitEvaluation.total_score >= 80
        ).order_by(FitEvaluation.total_score.desc()).limit(10)
        res_high = await db.execute(stmt_high)
        high_fit = list(res_high.scalars().all())

        return {
            "generated_at": now.isoformat(),
            "closing_in_7_days_count": len(closing_7d),
            "high_fit_leads_count": len(high_fit),
            "urgent_items": [
                {
                    "id": opp.id,
                    "title": opp.title,
                    "deadline": opp.deadline.isoformat() if opp.deadline else None,
                    "countdown": self.format_countdown(opp.deadline),
                    "source_url": opp.source_url
                }
                for opp in closing_7d[:5]
            ]
        }

deadline_alert_agent = DeadlineAlertAgent()
