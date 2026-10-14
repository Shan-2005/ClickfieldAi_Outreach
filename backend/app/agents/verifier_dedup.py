import re
import hashlib
import logging
from typing import Tuple, Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Opportunity

logger = logging.getLogger("verifier_dedup")

SPAM_PATTERNS = [
    r"earn \$\d+ per hour from home",
    r"crypto investment opportunity",
    r"telegram channel for leads",
    r"whatsapp us for quick loan",
    r"paid surveys online",
    r"pyramid scheme"
]

class VerifierDedupAgent:
    """
    Agent 6: Verifier and Deduplicator
    Merges duplicates, verifies source links and dates,
    flags suspected spam or fraudulent postings.
    """
    name = "Verifier & Deduplicator Agent"

    def compute_dedup_hash(self, title: str, company_name: str, source_url: str) -> str:
        """Create normalized fingerprint for deduplication."""
        norm_title = re.sub(r'[^a-zA-Z0-9]', '', title.lower())[:80]
        norm_company = re.sub(r'[^a-zA-Z0-9]', '', company_name.lower())[:40]
        # In case title/company are identical, hash them
        raw = f"{norm_title}:{norm_company}"
        return hashlib.sha256(raw.encode('utf-8')).hexdigest()

    def is_spam_or_fake(self, title: str, description: str) -> Tuple[bool, Optional[str]]:
        combined = f"{title} {description}".lower()
        for pat in SPAM_PATTERNS:
            if re.search(pat, combined):
                return True, f"Matched spam pattern: {pat}"
        if len(description.strip()) < 15:
            return True, "Listing description too short (<15 chars), likely placeholder"
        return False, None

    async def verify_and_check_duplicate(
        self,
        db: AsyncSession,
        dedup_hash: str,
        source_url: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if an opportunity already exists in the database by dedup_hash or exact source_url.
        Returns (is_duplicate, existing_opportunity_id).
        """
        stmt = select(Opportunity).where(
            (Opportunity.dedup_hash == dedup_hash) | (Opportunity.source_url == source_url)
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()
        if existing:
            return True, existing.id
        return False, None

verifier_dedup_agent = VerifierDedupAgent()
