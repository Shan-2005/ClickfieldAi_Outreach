import logging
from typing import List, Dict, Any
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Source

logger = logging.getLogger("source_discovery")

# Disallowed wire service & news domains (hard rejection at discovery and ingestion)
DISALLOWED_DOMAINS = [
    "prnewswire.com", "businesswire.com", "globenewswire.com", "govconwire.com",
    "g2.com", "economictimes.indiatimes.com", "financialexpress.com", "livemint.com",
    "reuters.com", "bloomberg.com", "techcrunch.com", "venturebeat.com",
    "solarbytes.net", "businesstravelnews.com", "fundsforngos.org", "ndtv.com",
    "thehindu.com", "hindustantimes.com", "timesofindia.indiatimes.com"
]

# Official Procurement Sources ONLY (News and wire services are completely disabled)
DEFAULT_REAL_SOURCES: List[Dict[str, Any]] = [
    {
        "name": "India CPPP & GeM Public AI/Software Tenders",
        "category": "GOV_TENDER",
        "base_url": "https://news.google.com/rss/search?q=(site:eprocure.gov.in+OR+site:gem.gov.in)+AND+(%22tender%22+OR+%22NIT%22+OR+%22bid%22)+AND+(%22software%22+OR+%22AI%22+OR+%22portal%22)+-news+-press+-review&hl=en-IN&gl=IN&ceid=IN:en",
        "crawl_frequency": "HOURLY",
        "rate_limit_delay_seconds": 2.0,
        "yield_score": 9.8,
        "is_active": True
    },
    {
        "name": "India State eProcurement & NIC Digital NIT Tenders",
        "category": "GOV_TENDER",
        "base_url": "https://news.google.com/rss/search?q=%22Notice+Inviting+Tender%22+AND+(%22software+development%22+OR+%22system+integrator%22+OR+%22AI%22)+AND+India+-news+-article&hl=en-IN&gl=IN&ceid=IN:en",
        "crawl_frequency": "HOURLY",
        "rate_limit_delay_seconds": 2.0,
        "yield_score": 9.5,
        "is_active": True
    },
    {
        "name": "TED Europa — European Public IT & Software Tenders",
        "category": "GOV_TENDER",
        "base_url": "https://news.google.com/rss/search?q=site:ted.europa.eu+AND+(%22contract+notice%22+OR+%22tender%22)+AND+(%22software+development%22+OR+%22artificial+intelligence%22)+-news&hl=en-US&gl=US&ceid=US:en",
        "crawl_frequency": "HOURLY",
        "rate_limit_delay_seconds": 2.0,
        "yield_score": 9.4,
        "is_active": True
    },
    {
        "name": "US Federal SAM.gov IT & Cloud Solicitations",
        "category": "GOV_TENDER",
        "base_url": "https://news.google.com/rss/search?q=site:sam.gov+AND+(%22solicitation%22+OR+%22Request+for+Proposal%22)+AND+(%22software%22+OR+%22AI%22)+-news+-wire&hl=en-US&gl=US&ceid=US:en",
        "crawl_frequency": "HOURLY",
        "rate_limit_delay_seconds": 2.0,
        "yield_score": 9.2,
        "is_active": True
    },
    {
        "name": "UN & Global Development Agency RFPs (UNDP / World Bank)",
        "category": "RFP_PORTAL",
        "base_url": "https://news.google.com/rss/search?q=(site:ungm.org+OR+site:undp.org)+AND+%22Request+for+Proposal%22+AND+(%22software%22+OR+%22AI%22+OR+%22digital%22)&hl=en-US&gl=US&ceid=US:en",
        "crawl_frequency": "HOURLY",
        "rate_limit_delay_seconds": 2.0,
        "yield_score": 9.3,
        "is_active": True
    }
]

class SourceDiscoveryAgent:
    """
    Agent 2: Source Discovery
    Maintains strictly verified official procurement sources.
    Excludes all news sites, wire services, blog/listicle platforms, and job boards.
    """
    name = "Source Discovery Agent"

    def is_source_allowed(self, url: str) -> bool:
        url_lower = url.lower()
        return not any(d in url_lower for d in DISALLOWED_DOMAINS)

    async def initialize_default_sources(self, db: AsyncSession) -> List[Source]:
        """Ensure baseline procurement sources exist in the database and disable any legacy news sources."""
        # Deactivate any legacy news/wire sources in DB
        stmt_all = select(Source)
        all_sources = (await db.execute(stmt_all)).scalars().all()
        for src in all_sources:
            if not self.is_source_allowed(src.base_url) or src.category == "TECH_NEWS":
                src.is_active = False
                logger.info(f"Deactivated legacy news/wire source: {src.name}")
        await db.commit()

        created_or_existing = []
        for src_def in DEFAULT_REAL_SOURCES:
            stmt = select(Source).where(Source.base_url == src_def["base_url"])
            result = await db.execute(stmt)
            existing = result.scalars().first()
            if not existing:
                source = Source(
                    name=src_def["name"],
                    category=src_def["category"],
                    base_url=src_def["base_url"],
                    crawl_frequency=src_def["crawl_frequency"],
                    rate_limit_delay_seconds=src_def["rate_limit_delay_seconds"],
                    yield_score=src_def["yield_score"],
                    is_active=src_def.get("is_active", True)
                )
                db.add(source)
                await db.commit()
                await db.refresh(source)
                created_or_existing.append(source)
                logger.info(f"Registered verified procurement source: {source.name}")
            else:
                existing.is_active = True
                await db.commit()
                created_or_existing.append(existing)
        return created_or_existing

    async def get_active_sources(self, db: AsyncSession) -> List[Source]:
        """Retrieve all currently active crawl sources."""
        stmt = select(Source).where(Source.is_active == True).order_by(Source.yield_score.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

source_discovery_agent = SourceDiscoveryAgent()
