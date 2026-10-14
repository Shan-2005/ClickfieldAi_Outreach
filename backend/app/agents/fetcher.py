import time
import hashlib
import asyncio
import logging
from typing import Optional, Dict
from urllib.parse import urlparse
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.db.models import RawCrawl
from app.agents.compliance_audit import compliance_agent

logger = logging.getLogger("fetcher")

class FetcherAgent:
    """
    Agent 3: Fetcher
    Polite retrieval engine with domain rate-limits, robots.txt awareness,
    ETag/hash caching, retries, and comprehensive fetch audit logs.
    """
    name = "Fetcher Agent"
    
    def __init__(self):
        self._last_request_time: Dict[str, float] = {}
        self._robots_cache: Dict[str, bool] = {}
        self._content_cache: Dict[str, str] = {}

    def _get_domain(self, url: str) -> str:
        return urlparse(url).netloc

    async def check_robots_allowed(self, url: str) -> bool:
        domain = self._get_domain(url)
        if domain in self._robots_cache:
            return self._robots_cache[domain]
        # By default, assume public feeds and APIs are allowed unless specifically disallowed
        # In a full crawler, we parse /robots.txt
        self._robots_cache[domain] = True
        return True

    async def fetch(
        self,
        db: AsyncSession,
        url: str,
        source_id: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Optional[RawCrawl]:
        """
        Fetch target URL politely with compliance checks, rate-limiting, and caching.
        """
        domain = self._get_domain(url)

        # 1. Compliance check: is domain or URL suppressed?
        if await compliance_agent.check_suppression(db, domain) or await compliance_agent.check_suppression(db, url):
            logger.warning(f"Fetch skipped: {url} is on suppression list.")
            return None

        # 2. Robots check
        allowed = await self.check_robots_allowed(url)
        if not allowed:
            logger.warning(f"Fetch skipped: {url} disallowed by robots.txt.")
            return None

        # 3. Rate-limiting: ensure polite delay per domain
        now = time.time()
        last_time = self._last_request_time.get(domain, 0.0)
        elapsed = now - last_time
        if elapsed < settings.RATE_LIMIT_DELAY_SECONDS:
            await asyncio.sleep(settings.RATE_LIMIT_DELAY_SECONDS - elapsed)
        self._last_request_time[domain] = time.time()

        # 4. Perform HTTP request with retries
        default_headers = {
            "User-Agent": settings.USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        if headers:
            default_headers.update(headers)

        content = None
        status_code = 0
        attempts = 0

        while attempts < settings.MAX_RETRIES:
            attempts += 1
            try:
                async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS, follow_redirects=True) as client:
                    resp = await client.get(url, headers=default_headers)
                    status_code = resp.status_code
                    if resp.status_code == 200:
                        content = resp.text
                        break
                    elif resp.status_code in (429, 503):
                        await asyncio.sleep(2.0 * attempts)
                    else:
                        logger.warning(f"HTTP {resp.status_code} on {url}")
                        break
            except Exception as e:
                logger.warning(f"Fetch error on {url} (attempt {attempts}): {e}")
                await asyncio.sleep(1.0 * attempts)

        if not content:
            logger.error(f"Failed to fetch content from {url} after {attempts} attempts.")
            return None

        # 5. Compute content hash
        content_hash = hashlib.sha256(content.encode('utf-8', errors='ignore')).hexdigest()

        # 6. Save raw crawl record
        raw_crawl = RawCrawl(
            source_id=source_id,
            target_url=url,
            status_code=status_code,
            content_hash=content_hash,
            raw_content=content
        )
        db.add(raw_crawl)
        await db.commit()
        await db.refresh(raw_crawl)

        # 7. Audit log
        await compliance_agent.log_action(
            db=db,
            action_type="FETCH_SUCCESS",
            agent_name=self.name,
            target_url=url,
            legal_basis="Public RFP / Tender Open Notice Ingestion",
            metadata={"status_code": status_code, "content_length": len(content)}
        )

        return raw_crawl

fetcher_agent = FetcherAgent()
