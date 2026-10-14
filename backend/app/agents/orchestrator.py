import time
import logging
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AgentHealthMetric, Opportunity, Source, RejectedOpportunity
from app.agents.source_discovery import source_discovery_agent
from app.agents.fetcher import fetcher_agent
from app.agents.extractor import extractor_agent
from app.agents.classifier import classifier_agent
from app.agents.verifier_dedup import verifier_dedup_agent
from app.agents.company_enricher import company_enricher_agent
from app.agents.fit_scorer import fit_scorer_agent
from app.agents.deadline_alert import deadline_alert_agent
from app.agents.outreach_drafter import outreach_drafter_agent
from app.agents.compliance_audit import compliance_agent

logger = logging.getLogger("orchestrator")

ALL_AGENTS = [
    "Orchestrator",
    "Source Discovery",
    "Fetcher",
    "Extractor",
    "Classifier",
    "Verifier & Deduplicator",
    "Company Enricher",
    "Fit Scorer",
    "Deadline & Alert",
    "Outreach Drafter",
    "Compliance & Audit"
]

class OrchestratorAgent:
    """
    Agent 1: Orchestrator
    Schedules runs, assigns work across the 11 agents, monitors agent health telemetry,
    and coordinates end-to-end ingestion from public sources into the radar database.
    """
    name = "Orchestrator"

    async def update_agent_metric(
        self,
        db: AsyncSession,
        agent_name: str,
        status: str,
        processed_increment: int = 0,
        errors_increment: int = 0,
        last_error: str = None,
        latency_ms: int = 0
    ):
        stmt = select(AgentHealthMetric).where(AgentHealthMetric.agent_name == agent_name)
        res = await db.execute(stmt)
        metric = res.scalars().first()
        if not metric:
            metric = AgentHealthMetric(agent_name=agent_name)
            db.add(metric)

        metric.status = status
        metric.last_run_at = datetime.utcnow()
        metric.items_processed_24h = (metric.items_processed_24h or 0) + processed_increment
        metric.errors_24h = (metric.errors_24h or 0) + errors_increment
        if last_error:
            metric.last_error_message = last_error
        metric.avg_latency_ms = latency_ms
        await db.commit()

    async def get_all_agent_metrics(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Fetch real-time health telemetry of all 11 agents."""
        stmt = select(AgentHealthMetric)
        res = await db.execute(stmt)
        metrics = {m.agent_name: m for m in res.scalars().all()}
        
        result = []
        for name in ALL_AGENTS:
            m = metrics.get(name)
            result.append({
                "agent_name": name,
                "status": m.status if m else "HEALTHY",
                "last_run_at": m.last_run_at.isoformat() if (m and m.last_run_at) else datetime.utcnow().isoformat(),
                "items_processed_24h": m.items_processed_24h if m else 0,
                "errors_24h": m.errors_24h if m else 0,
                "last_error_message": m.last_error_message if m else None,
                "avg_latency_ms": m.avg_latency_ms if m else 120
            })
        return result

    async def run_pipeline(self, db: AsyncSession, max_items_per_source: int = 5) -> Dict[str, Any]:
        """
        Execute end-to-end multi-agent crawl and enrichment cycle across active public sources.
        """
        start_time = time.time()
        logger.info("Starting ClickfieldAI Opportunity Radar Pipeline run...")
        await self.update_agent_metric(db, "Orchestrator", "RUNNING")

        # 1. Source Discovery
        t0 = time.time()
        sources = await source_discovery_agent.initialize_default_sources(db)
        await self.update_agent_metric(
            db, "Source Discovery", "HEALTHY",
            processed_increment=len(sources),
            latency_ms=int((time.time() - t0) * 1000)
        )

        total_fetched = 0
        total_extracted = 0
        total_classified = 0
        total_new_opportunities = 0

        for source in sources:
            logger.info(f"Crawl cycle for source: {source.name} ({source.base_url})")

            # 2. Fetcher
            t_fetch = time.time()
            raw_crawl = await fetcher_agent.fetch(db, source.base_url, source_id=source.id)
            if not raw_crawl or not raw_crawl.raw_content:
                await self.update_agent_metric(
                    db, "Fetcher", "DEGRADED",
                    errors_increment=1,
                    last_error=f"Empty content from {source.base_url}",
                    latency_ms=int((time.time() - t_fetch) * 1000)
                )
                continue

            total_fetched += 1
            await self.update_agent_metric(
                db, "Fetcher", "HEALTHY",
                processed_increment=1,
                latency_ms=int((time.time() - t_fetch) * 1000)
            )

            # 3. Extractor
            t_ext = time.time()
            extracted_items = []
            content_trimmed = raw_crawl.raw_content.strip()
            if content_trimmed.startswith("{") or content_trimmed.startswith("[") or "json" in source.base_url or "api" in source.base_url:
                extracted_items = extractor_agent.extract_from_json(raw_crawl.raw_content, source.base_url)
            else:
                extracted_items = extractor_agent.extract_from_feed(raw_crawl.raw_content, source.base_url, source.category)

            # Limit per source for polite rapid cycle
            extracted_items = extracted_items[:max_items_per_source]
            total_extracted += len(extracted_items)
            await self.update_agent_metric(
                db, "Extractor", "HEALTHY",
                processed_increment=len(extracted_items),
                latency_ms=int((time.time() - t_ext) * 1000)
            )

            for item in extracted_items:
                # 4. Classifier
                t_class = time.time()
                # Check source allowlist first
                if not source_discovery_agent.is_source_allowed(item.source_url):
                    rej = RejectedOpportunity(
                        title=item.title,
                        company_name=item.company_name,
                        description=item.description[:1000] if item.description else "",
                        source_url=item.source_url,
                        content_type="News",
                        opportunity_type="News",
                        rejection_reason="Rejected: Source URL belongs to a news site, PR wire service, or aggregator."
                    )
                    db.add(rej)
                    await db.commit()
                    continue

                class_res = classifier_agent.classify(
                    item.title, item.description, item.tech_stack, item.source_url, item.company_name
                )
                await self.update_agent_metric(
                    db, "Classifier", "HEALTHY",
                    processed_increment=1,
                    latency_ms=int((time.time() - t_class) * 1000)
                )

                if not class_res.is_b2b_project:
                    # Log rejection into RejectedOpportunity for tuning and audit
                    rej = RejectedOpportunity(
                        title=item.title,
                        company_name=item.company_name,
                        description=item.description[:1000] if item.description else "",
                        source_url=item.source_url,
                        content_type=class_res.content_type,
                        opportunity_type=class_res.opportunity_type,
                        rejection_reason=class_res.rejection_reason or "Classified as non-project / rejected content type"
                    )
                    db.add(rej)
                    await db.commit()
                    continue

                total_classified += 1

                # 5. Verifier & Deduplicator
                t_dedup = time.time()
                is_spam, spam_reason = verifier_dedup_agent.is_spam_or_fake(item.title, item.description)
                if is_spam:
                    rej = RejectedOpportunity(
                        title=item.title,
                        company_name=item.company_name,
                        description=item.description[:1000] if item.description else "",
                        source_url=item.source_url,
                        content_type="Other",
                        opportunity_type="Spam",
                        rejection_reason=f"Spam filter: {spam_reason}"
                    )
                    db.add(rej)
                    await db.commit()
                    continue

                dedup_hash = verifier_dedup_agent.compute_dedup_hash(item.title, item.company_name, item.source_url)
                is_dup, _ = await verifier_dedup_agent.verify_and_check_duplicate(db, dedup_hash, item.source_url)
                await self.update_agent_metric(
                    db, "Verifier & Deduplicator", "HEALTHY",
                    processed_increment=1,
                    latency_ms=int((time.time() - t_dedup) * 1000)
                )

                if is_dup:
                    continue

                # 6. Company Enricher
                t_comp = time.time()
                company = await company_enricher_agent.get_or_enrich_company(
                    db, item.company_name, item.description, item.source_url
                )
                await self.update_agent_metric(
                    db, "Company Enricher", "HEALTHY",
                    processed_increment=1,
                    latency_ms=int((time.time() - t_comp) * 1000)
                )

                # Check Expiration (Never show records older than 12 months as active)
                now = datetime.utcnow()
                is_expired = False
                if item.deadline and item.deadline < now:
                    is_expired = True
                if item.posted_date and (now - item.posted_date).days > 365:
                    is_expired = True

                # Strict Acceptance Criteria: Named Buyer + Deliverable + Submission Method or Deadline
                if is_expired:
                    initial_status = "EXPIRED"
                elif class_res.confidence >= 70 and class_res.has_named_buyer and class_res.has_deliverable and class_res.has_submission_method_or_deadline:
                    initial_status = "NEW"
                else:
                    initial_status = "NEEDS_REVIEW"

                opp = Opportunity(
                    source_id=source.id,
                    raw_crawl_id=raw_crawl.id,
                    company_id=company.id,
                    title=item.title,
                    description=item.description,
                    content_type=class_res.content_type,
                    opportunity_type=class_res.opportunity_type,
                    primary_category=class_res.primary_category,
                    secondary_categories=class_res.secondary_categories,
                    tech_stack=item.tech_stack,
                    budget_min=item.budget_min,
                    budget_max=item.budget_max,
                    currency=item.currency,
                    posted_date=item.posted_date.date() if item.posted_date else datetime.utcnow().date(),
                    listed_time=item.listed_time or datetime.utcnow(),
                    deadline=item.deadline,
                    is_expired=is_expired,
                    source_url=item.source_url,
                    status=initial_status,
                    confidence=class_res.confidence,
                    is_job_posting=False,
                    rejection_reason=None if initial_status == "NEW" else ("Expired notice" if is_expired else "Missing named buyer, deliverable, or submission method - routed to Needs Review"),
                    dedup_hash=dedup_hash,
                    is_verified=True
                )
                db.add(opp)
                await db.commit()
                await db.refresh(opp)
                total_new_opportunities += 1

                # 7. Fit Scorer
                t_fit = time.time()
                await fit_scorer_agent.evaluate_opportunity(db, opp, company)
                await self.update_agent_metric(
                    db, "Fit Scorer", "HEALTHY",
                    processed_increment=1,
                    latency_ms=int((time.time() - t_fit) * 1000)
                )

                # 8. Deadline & Alert
                t_dl = time.time()
                _ = deadline_alert_agent.format_countdown(opp.deadline)
                await self.update_agent_metric(
                    db, "Deadline & Alert", "HEALTHY",
                    processed_increment=1,
                    latency_ms=int((time.time() - t_dl) * 1000)
                )

                # 9. Outreach Drafter
                t_out = time.time()
                await outreach_drafter_agent.generate_draft_for_opportunity(db, opp, company)
                await self.update_agent_metric(
                    db, "Outreach Drafter", "HEALTHY",
                    processed_increment=1,
                    latency_ms=int((time.time() - t_out) * 1000)
                )

                # 10. Compliance & Audit
                t_comp_log = time.time()
                await compliance_agent.log_action(
                    db=db,
                    action_type="OPPORTUNITY_ENROLLED",
                    agent_name=self.name,
                    target_url=opp.source_url,
                    metadata={"opp_id": opp.id, "title": opp.title}
                )
                await self.update_agent_metric(
                    db, "Compliance & Audit", "HEALTHY",
                    processed_increment=1,
                    latency_ms=int((time.time() - t_comp_log) * 1000)
                )

        total_duration = time.time() - start_time
        await self.update_agent_metric(
            db, "Orchestrator", "HEALTHY",
            processed_increment=total_new_opportunities,
            latency_ms=int(total_duration * 1000)
        )

        return {
            "status": "completed",
            "total_new_opportunities": total_new_opportunities,
            "total_fetched": total_fetched,
            "total_extracted": total_extracted,
            "total_classified": total_classified,
            "duration_seconds": round(total_duration, 2)
        }

orchestrator_agent = OrchestratorAgent()
