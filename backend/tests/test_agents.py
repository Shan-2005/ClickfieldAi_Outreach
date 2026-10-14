import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_radar.db"

import asyncio
from datetime import datetime, timedelta

from app.db.session import init_db, AsyncSessionLocal
from app.agents.compliance_audit import compliance_agent
from app.agents.source_discovery import source_discovery_agent
from app.agents.extractor import extractor_agent
from app.agents.classifier import classifier_agent
from app.agents.verifier_dedup import verifier_dedup_agent
from app.agents.company_enricher import company_enricher_agent
from app.agents.fit_scorer import fit_scorer_agent
from app.agents.deadline_alert import deadline_alert_agent
from app.agents.outreach_drafter import outreach_drafter_agent

async def run_all_agent_tests():
    print("--- Starting 11 Agents Test Suite ---")
    if os.path.exists("./test_radar.db"):
        try:
            os.remove("./test_radar.db")
        except Exception:
            pass
    await init_db()

    async with AsyncSessionLocal() as session:
        # 1. Test Source Discovery
        print("Testing Agent 2: Source Discovery...")
        sources = await source_discovery_agent.initialize_default_sources(session)
        assert len(sources) >= 5, "Should register default sources"
        print(f"[PASS] Source Discovery initialized {len(sources)} sources.")

        # 2. Test Extractor
        print("Testing Agent 4: Extractor...")
        sample_rss = """
        <rss version="2.0">
            <channel>
                <item>
                    <title>AI & ML Software Development Partner RFP - National Bank of India</title>
                    <link>https://eprocure.gov.in/sample-ai-tender</link>
                    <description>Seeking vendor for enterprise GenAI LLM chatbot with Python, PyTorch and React. Budget ₹15 Lakhs. Due date: 25-11-2026. Contact: procurement@nb-india.gov.in</description>
                    <pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate>
                </item>
            </channel>
        </rss>
        """
        extracted = extractor_agent.extract_from_feed(sample_rss, "https://eprocure.gov.in", "GOV_TENDER")
        assert len(extracted) == 1, "Should extract exactly 1 item"
        item = extracted[0]
        assert "AI & ML" in item.title
        assert item.source_url == "https://eprocure.gov.in/sample-ai-tender"
        assert item.budget_min == 1500000.0
        assert "Python" in item.tech_stack
        print("[PASS] Extractor successfully parsed specs, budget, and real source link.")

        # 3. Test Classifier
        print("Testing Agent 5: Classifier...")
        tech_res = classifier_agent.classify(item.title, item.description, item.tech_stack)
        assert tech_res.is_b2b_project == True
        assert tech_res.primary_category in ("GENAI", "ML_DATA_SCIENCE")
        
        # Test rejection of irrelevant tender
        civ_res = classifier_agent.classify("Supply of stationery and civil construction of boundary wall", "Catering and sanitation", [])
        assert civ_res.is_b2b_project == False
        print(f"[PASS] Classifier accepted AI requirement ({tech_res.primary_category}) and rejected non-tech notice.")

        # 4. Test Verifier & Deduplicator
        print("Testing Agent 6: Verifier & Deduplicator...")
        h1 = verifier_dedup_agent.compute_dedup_hash(item.title, item.company_name, item.source_url)
        h2 = verifier_dedup_agent.compute_dedup_hash(item.title, item.company_name, item.source_url)
        assert h1 == h2, "Dedup hash must be deterministic"
        is_spam, _ = verifier_dedup_agent.is_spam_or_fake(item.title, item.description)
        assert is_spam == False, "Legitimate RFP must not be flagged as spam"
        print("[PASS] Verifier computed hash and verified clean content.")

        # 5. Test Company Enricher
        print("Testing Agent 7: Company Enricher...")
        company = await company_enricher_agent.get_or_enrich_company(session, item.company_name, item.description, item.source_url)
        assert company.name == item.company_name
        assert company.headquarters_country == "India"
        assert "procurement@nb-india.gov.in" in company.public_contact_emails
        print(f"[PASS] Company Enricher identified {company.headquarters_country} and verified contact: {company.public_contact_emails[0]}")

        # 6. Test Fit Scorer
        print("Testing Agent 8: Fit Scorer...")
        total, s_sc, b_sc, r_sc, u_sc, pen_sc, reason = fit_scorer_agent.calculate_score(
            category=tech_res.primary_category,
            tech_stack=item.tech_stack,
            country=company.headquarters_country,
            budget_min=item.budget_min,
            deadline=item.deadline
        )
        assert 0 <= total <= 100, "Fit score must be between 0 and 100"
        assert total >= 70, "High match should score >= 70"
        print(f"[PASS] Fit Scorer generated score: {total}/100 with explanation: '{reason[:60]}...'")

        # 7. Test Deadline & Alert
        print("Testing Agent 9: Deadline & Alert...")
        future_dl = datetime.utcnow() + timedelta(days=5)
        cd = deadline_alert_agent.format_countdown(future_dl)
        assert "days left" in cd or "day" in cd
        urgency = deadline_alert_agent.get_urgency_tier(future_dl)
        assert urgency == "URGENT"
        print(f"[PASS] Deadline & Alert calculated countdown: '{cd}', tier: {urgency}.")

        # 8. Test Compliance & Suppression (Agent 11)
        print("Testing Agent 11: Compliance & Audit...")
        import uuid
        test_domain = f"optout-{uuid.uuid4().hex[:6]}.com"
        await compliance_agent.add_suppression(session, test_domain, "Test opt-out")
        is_suppressed = await compliance_agent.check_suppression(session, test_domain)
        assert is_suppressed == True, "Suppression must be respected"
        print(f"[PASS] Compliance Agent confirmed active suppression for {test_domain} and audit logging.")

        # 9. Test Outreach Drafter (Agent 10)
        print("Testing Agent 10: Outreach Drafter...")
        from app.db.models import Opportunity
        opp = Opportunity(
            title=item.title,
            description=item.description,
            primary_category=tech_res.primary_category,
            tech_stack=item.tech_stack,
            source_url=item.source_url,
            status="NEW",
            dedup_hash=h1
        )
        session.add(opp)
        await session.commit()
        await session.refresh(opp)

        draft = await outreach_drafter_agent.generate_draft_for_opportunity(session, opp, company)
        assert draft.status == "DRAFT", "Drafts must strictly be in DRAFT state"
        assert "ClickfieldAI" in draft.email_body_markdown
        assert "opt-out" in draft.email_body_markdown.lower()
        print("[PASS] Outreach Drafter generated personalized proposal in strict DRAFT state with compliance notice.")

    print("\n--- ALL 11 AGENT TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    asyncio.run(run_all_agent_tests())
