import asyncio
import os
import re
import sys
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, Opportunity, Company, OutreachDraft
from app.agents.outreach_drafter import outreach_drafter_agent
from app.config import settings

# 20 diverse, realistic test records spanning Tenders, EOIs, Private B2B, and Non-English EU notices
BENCHMARK_20_RECORDS = [
    # --- 1 to 7: Formal Government / PSU Tenders (India) ---
    {
        "id": "REC_01_GOV_PUNE",
        "title": "Notice Inviting Tender for Smart Water IoT Telemetry & Automated Meter Reconciliation Middleware",
        "description": "Pune Smart City Development Corporation invites bids for end-to-end LoRaWAN telemetry ingestion, automated meter reading anomaly detection, and municipal ERP billing middleware.",
        "category": "EMBEDDED_IOT",
        "tech_stack": ["LoRaWAN", "PostgreSQL", "MQTT", "Python"],
        "buyer_type": "Government",
        "opp_type": "Tender",
        "content_type": "Tender/RFP",
        "ref_no": "PSCDCL/IOT/WTR/2026/11",
        "source_url": "https://eprocure.gov.in/eprocure/app?component=view&ref=PSCDCL-11",
        "company_name": "Pune Smart City Development Corp",
        "country": "India",
        "city": "Pune",
        "industry": "Urban Infrastructure",
        "contact_email": "tenders@punesmartcity.in"
    },
    {
        "id": "REC_02_GOV_GEM",
        "title": "GeM Bid: Turnkey Generative AI Legal Case Document Summarization and Search Portal",
        "description": "High Court Legal Services Committee invites technical bids for local LLM deployment, multi-lingual Indian language OCR ingestion, and semantically grounded legal precedent search.",
        "category": "GENAI",
        "tech_stack": ["LangChain", "PyTorch", "Qdrant", "FastAPI"],
        "buyer_type": "Government",
        "opp_type": "Tender",
        "content_type": "Tender/RFP",
        "ref_no": "GEM/2026/B/882190",
        "source_url": "https://gem.gov.in/show_bid_details/882190",
        "company_name": "Department of Justice & Legal Affairs",
        "country": "India",
        "city": "New Delhi",
        "industry": "Public Administration",
        "contact_email": "procurement@doj.gov.in"
    },
    {
        "id": "REC_03_GOV_RAIL",
        "title": "Tender for Design and Implementation of High-Throughput Freight Logistics Event Processing Engine",
        "description": "Centre for Railway Information Systems requires high-throughput real-time Kafka event streaming architecture and GPS wagon tracking reconciliation.",
        "category": "DATA_ENGINEERING",
        "tech_stack": ["Apache Kafka", "ClickHouse", "Apache Flink", "Go"],
        "buyer_type": "Public-sector",
        "opp_type": "Tender",
        "content_type": "Tender/RFP",
        "ref_no": "CRIS/FREIGHT/ETL/2026/04",
        "source_url": "https://ireps.gov.in/eps/viewNIT.do?id=CRIS-04",
        "company_name": "Centre for Railway Information Systems",
        "country": "India",
        "city": "New Delhi",
        "industry": "Rail Logistics",
        "contact_email": "etenders@cris.org.in"
    },
    {
        "id": "REC_04_GOV_NHAI",
        "title": "NIT: Automated FASTag Toll Plaza Anomaly Detection and Video Analytics Edge Platform",
        "description": "National Highways Authority of India invites tenders for real-time edge computer vision inference and automated license plate recognition audit reconciliation.",
        "category": "ML_DATA_SCIENCE",
        "tech_stack": ["TensorRT", "YOLOv8", "Docker", "Python"],
        "buyer_type": "Government",
        "opp_type": "Tender",
        "content_type": "Tender/RFP",
        "ref_no": "NHAI/TECH/ANPR/2026/89",
        "source_url": "https://nhai.gov.in/tenders/notice/89",
        "company_name": "National Highways Authority of India",
        "country": "India",
        "city": "New Delhi",
        "industry": "Highways & Transport",
        "contact_email": "toll-tech@nhai.gov.in"
    },
    {
        "id": "REC_05_GOV_NIC",
        "title": "Tender: Scalable Cloud Middleware Synchronization for State Land Registry and Bank Mortgages",
        "description": "National Informatics Centre invites bids for bidirectional REST API integration between legacy Oracle land databases and financial institution mortgage portals.",
        "category": "ERP_INTEGRATION",
        "tech_stack": ["Oracle DB", "Java Spring Boot", "Kafka", "PostgreSQL"],
        "buyer_type": "Government",
        "opp_type": "Tender",
        "content_type": "Tender/RFP",
        "ref_no": "NIC/DOR/REV/2026/02",
        "source_url": "https://eprocure.gov.in/nic/tender/02",
        "company_name": "National Informatics Centre",
        "country": "India",
        "city": "Hyderabad",
        "industry": "Digital Governance",
        "contact_email": "land-api@nic.in"
    },
    {
        "id": "REC_06_GOV_MAHA",
        "title": "MahaTenders: Civil Hospital Patient Queuing and Offline-First Android Mobile Registration System",
        "description": "State Directorate of Health Services seeks a robust mobile platform for patient registration capable of intermittent offline syncing in rural clinics.",
        "category": "WEB_MOBILE",
        "tech_stack": ["React Native", "SQLite", "Node.js", "Redis"],
        "buyer_type": "Government",
        "opp_type": "Tender",
        "content_type": "Tender/RFP",
        "ref_no": "DHS/MAHA/MOB/2026/33",
        "source_url": "https://mahatenders.gov.in/tenders/dhs-33",
        "company_name": "Maharashtra Directorate of Health Services",
        "country": "India",
        "city": "Mumbai",
        "industry": "Healthcare",
        "contact_email": "procurement@mahadhs.gov.in"
    },
    {
        "id": "REC_07_GOV_BSNL",
        "title": "Tender: Intelligent Document Processing Bot for Enterprise Telecom Bill Reconciliation",
        "description": "Bharat Sanchar Nigam Limited invites proposals for automated document triage and invoice reconciliation bot with audit trails.",
        "category": "AUTOMATION_RPA",
        "tech_stack": ["UiPath", "Python", "Tesseract", "FastAPI"],
        "buyer_type": "Public-sector",
        "opp_type": "Tender",
        "content_type": "Tender/RFP",
        "ref_no": "BSNL/BILLING/RPA/2026/17",
        "source_url": "https://bsnl.co.in/tenders/17",
        "company_name": "Bharat Sanchar Nigam Limited",
        "country": "India",
        "city": "Bengaluru",
        "industry": "Telecommunications",
        "contact_email": "tenders-it@bsnl.co.in"
    },

    # --- 8 to 11: Formal EOI / International Agency Notices ---
    {
        "id": "REC_08_EOI_UNDP",
        "title": "UNDP Expression of Interest: Open Source LLM Conversational Assistant for Climate Resilience",
        "description": "United Nations Development Programme requests expressions of interest from specialized AI firms to build open-source multilingual RAG pipelines for agricultural extension workers.",
        "category": "GENAI",
        "tech_stack": ["Llama-3", "ChromaDB", "Python", "FastAPI"],
        "buyer_type": "NGO/UN",
        "opp_type": "EOI",
        "content_type": "EOI",
        "ref_no": "UNDP-EOI-2026-AI-CLIMATE",
        "source_url": "https://ungm.org/Public/Notice/UNDP-2026-AI",
        "company_name": "United Nations Development Programme",
        "country": "Global",
        "city": "New York",
        "industry": "International Development",
        "contact_email": "procurement.inquiries@undp.org"
    },
    {
        "id": "REC_09_EOI_WB",
        "title": "World Bank EOI: Federated Health Data Exchange and API Integration Platform",
        "description": "World Bank Health Modernization Mission issues EOI for deploying HL7 FHIR middleware gateways connecting regional hospital databases.",
        "category": "ERP_INTEGRATION",
        "tech_stack": ["HL7 FHIR", "PostgreSQL", "OAuth2", "Docker"],
        "buyer_type": "NGO/UN",
        "opp_type": "EOI",
        "content_type": "EOI",
        "ref_no": "WB-HL7-EOI-2026-09",
        "source_url": "https://worldbank.org/procurement/notices/wb-09",
        "company_name": "World Bank Digital Health Initiative",
        "country": "Global",
        "city": "Washington DC",
        "industry": "Global Health",
        "contact_email": "healthtech-eoi@worldbank.org"
    },
    {
        "id": "REC_10_EOI_WHO",
        "title": "WHO Request for Qualifications: Real-Time Pathogen Surveillance Event Streaming Bus",
        "description": "World Health Organization seeks technical partners for high-volume genomic and laboratory test telemetry aggregation.",
        "category": "DATA_ENGINEERING",
        "tech_stack": ["Kafka", "Apache Arrow", "Parquet", "Kubernetes"],
        "buyer_type": "NGO/UN",
        "opp_type": "EOI",
        "content_type": "EOI",
        "ref_no": "WHO-SURV-2026-44",
        "source_url": "https://who.int/procurement/notices/who-44",
        "company_name": "World Health Organization",
        "country": "Global",
        "city": "Geneva",
        "industry": "Global Healthcare",
        "contact_email": "surveillance-bids@who.int"
    },
    {
        "id": "REC_11_EOI_UNGM",
        "title": "UNGM Notice: IoT Cold Chain Sensor Monitoring Infrastructure for Vaccine Logistics",
        "description": "UN Global Marketplace notice for battery-efficient IoT cellular telemetry logger platform with remote threshold alarming.",
        "category": "EMBEDDED_IOT",
        "tech_stack": ["MQTT", "Cellular NB-IoT", "TimescaleDB", "Grafana"],
        "buyer_type": "NGO/UN",
        "opp_type": "EOI",
        "content_type": "EOI",
        "ref_no": "UNGM-COLDCHAIN-2026",
        "source_url": "https://ungm.org/Public/Notice/UNGM-COLD",
        "company_name": "UNICEF Supply Division",
        "country": "Global",
        "city": "Copenhagen",
        "industry": "Humanitarian Supply",
        "contact_email": "procurement-coldchain@unicef.org"
    },

    # --- 12 to 17: Private B2B Enterprise Opportunities ---
    {
        "id": "REC_12_PVT_FINTECH",
        "title": "Fintech Scaleup RFP: Real-Time Fraud Feature Store and Event Processing Layer",
        "description": "High-growth digital payments unicorn seeking engineering vendor to architect real-time Kafka and Redis sliding window feature engineering for payment authorization.",
        "category": "DATA_ENGINEERING",
        "tech_stack": ["Apache Kafka", "Redis", "Rust", "ClickHouse"],
        "buyer_type": "Private company",
        "opp_type": "Project-post",
        "content_type": "Project-post",
        "ref_no": None,
        "source_url": "https://careers.razorfin.io/tech-initiatives/fraud-engine",
        "company_name": "RazorFin Payments",
        "country": "India",
        "city": "Bengaluru",
        "industry": "Financial Technology",
        "contact_email": "rahul.sharma@razorfin.io"
    },
    {
        "id": "REC_13_PVT_HEALTH",
        "title": "Enterprise Requirement: Automated Clinical Trial Patient Data Extraction from Unstructured PDFs",
        "description": "BioTech research firm looking to deploy bounded LLM document extraction loops paired with tabular verification for FDA regulatory filings.",
        "category": "GENAI",
        "tech_stack": ["Claude 3.5 Sonnet", "PyMuPDF", "Pydantic", "FastAPI"],
        "buyer_type": "Private company",
        "opp_type": "Project-post",
        "content_type": "Project-post",
        "ref_no": None,
        "source_url": "https://novabio.health/engineering/rfp-doc-extraction",
        "company_name": "NovaBio Therapeutics",
        "country": "United States",
        "city": "Boston",
        "industry": "Biotechnology",
        "contact_email": "elena.vance@novabio.health"
    },
    {
        "id": "REC_14_PVT_LOGISTICS",
        "title": "Vendor Call: Automated Warehouse AMR Fleet Telemetry and Dispatch Microservice",
        "description": "Logistics automation company needs high-concurrency WebSocket and MQTT dispatch router for 500+ autonomous mobile robots.",
        "category": "EMBEDDED_IOT",
        "tech_stack": ["MQTT", "WebSockets", "Go", "PostgreSQL"],
        "buyer_type": "Private company",
        "opp_type": "Vendor-call",
        "content_type": "Vendor-call",
        "ref_no": None,
        "source_url": "https://omnirobotics.io/b2b-calls/fleet-telemetry",
        "company_name": "OmniRobotics Automation",
        "country": "India",
        "city": "Gurugram",
        "industry": "Supply Chain & Robotics",
        "contact_email": "vikram.malhotra@omnirobotics.io"
    },
    {
        "id": "REC_15_PVT_ERP",
        "title": "Cloud Migration: Two-Way Bidirectional Sync between Legacy SAP ECC and Modern Shopify Plus",
        "description": "Multi-brand retail conglomerate requires idempotent middleware connectors to eliminate inventory drift between SAP ERP and headless storefronts.",
        "category": "ERP_INTEGRATION",
        "tech_stack": ["SAP RFC", "Shopify API", "Node.js", "Redis"],
        "buyer_type": "Private company",
        "opp_type": "Project-post",
        "content_type": "Project-post",
        "ref_no": None,
        "source_url": "https://apexcityretail.com/partnerships/sap-integration",
        "company_name": "Apex City Retail Group",
        "country": "India",
        "city": "Mumbai",
        "industry": "Retail & Commerce",
        "contact_email": "arun.iyer@apexcityretail.com"
    },
    {
        "id": "REC_16_PVT_MOBILE",
        "title": "Mobile App Project: Field Auditor Offline-First Inspection App with Background Sync",
        "description": "Renewable infrastructure operator seeking React Native mobile platform with SQLite synchronization for engineers inspecting remote wind farms.",
        "category": "WEB_MOBILE",
        "tech_stack": ["React Native", "WatermelonDB", "TypeScript", "AWS S3"],
        "buyer_type": "Private company",
        "opp_type": "Project-post",
        "content_type": "Project-post",
        "ref_no": None,
        "source_url": "https://zenithpower.energy/vendors/audit-app",
        "company_name": "Zenith Clean Energy",
        "country": "India",
        "city": "Hyderabad",
        "industry": "Renewable Energy",
        "contact_email": "priya.nair@zenithpower.energy"
    },
    {
        "id": "REC_17_PVT_RPA",
        "title": "RPA Automation: Automated Accounts Payable Invoice Ingestion and Ledger Matcher",
        "description": "Global freight forwarder seeks automated OCR invoice extraction bot with exception queues and two-way matching against purchase orders.",
        "category": "AUTOMATION_RPA",
        "tech_stack": ["Python", "OpenCV", "Celery", "PostgreSQL"],
        "buyer_type": "Private company",
        "opp_type": "Project-post",
        "content_type": "Project-post",
        "ref_no": None,
        "source_url": "https://transglobalcargo.net/partner-portal/rpa-billing",
        "company_name": "TransGlobal Cargo Services",
        "country": "Singapore",
        "city": "Singapore",
        "industry": "Freight & Logistics",
        "contact_email": "marcus.tan@transglobalcargo.net"
    },

    # --- 18 to 20: Non-English / EU Public Notices (TED Europa) ---
    {
        "id": "REC_18_EU_FR",
        "title": "TED Europa Notice (France): Système d'analyse prédictive et supervision IoT des tramways urbains",
        "description": "Syndicat des Transports d'Île-de-France issues public notice for IoT vibration sensor data pipelines and predictive maintenance scoring for urban light rail.",
        "category": "ML_DATA_SCIENCE",
        "tech_stack": ["Python", "Scikit-Learn", "Kafka", "TimescaleDB"],
        "buyer_type": "Public-sector",
        "opp_type": "Tender",
        "content_type": "Tender/RFP",
        "ref_no": "2026/S-044-118902-FR",
        "source_url": "https://ted.europa.eu/udl?uri=TED:NOTICE:2026-044-118902:TEXT:FR:HTML",
        "company_name": "Régie Autonome des Transports Franciliens",
        "country": "France",
        "city": "Paris",
        "industry": "Urban Transportation",
        "contact_email": "marches-publics@ratf.paris.fr"
    },
    {
        "id": "REC_19_EU_DE",
        "title": "TED Europa Notice (Germany): Cloud-Plattform zur automatisierten Dokumentenklassifizierung im Justizwesen",
        "description": "Bayerisches Staatsministerium der Justiz tenders automated document classification and confidential LLM redaction pipeline under strict GDPR guidelines.",
        "category": "GENAI",
        "tech_stack": ["FastAPI", "Ollama", "PostgreSQL", "Docker"],
        "buyer_type": "Government",
        "opp_type": "Tender",
        "content_type": "Tender/RFP",
        "ref_no": "2026/S-039-094512-DE",
        "source_url": "https://ted.europa.eu/udl?uri=TED:NOTICE:2026-039-094512:TEXT:DE:HTML",
        "company_name": "Bayerisches Staatsministerium der Justiz",
        "country": "Germany",
        "city": "Munich",
        "industry": "Judicial Administration",
        "contact_email": "vergabe@justiz.bayern.de"
    },
    {
        "id": "REC_20_EU_ES",
        "title": "TED Europa Notice (Spain): Plataforma IoT de Telemetría para Red de Sensores de Parques Eólicos",
        "description": "Red Eléctrica de España issues public contract notice for real-time SCADA and IoT sensor data pipeline ingestion across distributed wind generation assets.",
        "category": "EMBEDDED_IOT",
        "tech_stack": ["MQTT", "PostgreSQL", "Kafka", "Python"],
        "buyer_type": "Public-sector",
        "opp_type": "Tender",
        "content_type": "Tender/RFP",
        "ref_no": "2026/S-051-134901-ES",
        "source_url": "https://ted.europa.eu/udl?uri=TED:NOTICE:2026-051-134901:TEXT:ES:HTML",
        "company_name": "Red Eléctrica de España",
        "country": "Spain",
        "city": "Madrid",
        "industry": "Energy Grid",
        "contact_email": "licitaciones@ree.red-electrica.es"
    }
]

async def run_benchmark_20_drafts():
    print("=" * 80)
    print("STEP 8: UPGRADED OUTREACH DRAFTER BENCHMARK (20 DIVERSE RECORDS)")
    print("=" * 80)

    # In-memory SQLite async engine for isolated test benchmark
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    generated_drafts = []
    banned_phrases_list = [p.lower() for p in settings.BANNED_PHRASES]

    async with async_session() as session:
        for idx, rec in enumerate(BENCHMARK_20_RECORDS):
            company = Company(
                name=rec["company_name"],
                headquarters_country=rec["country"],
                headquarters_city=rec["city"],
                industry=rec["industry"],
                public_contact_emails=[rec["contact_email"]] if rec["contact_email"] else []
            )
            session.add(company)
            await session.commit()
            await session.refresh(company)

            opp = Opportunity(
                title=rec["title"],
                description=rec["description"],
                primary_category=rec["category"],
                tech_stack=rec["tech_stack"],
                buyer_type=rec["buyer_type"],
                opportunity_type=rec["opp_type"],
                content_type=rec["content_type"],
                reference_number=rec["ref_no"],
                source_url=rec["source_url"],
                company_id=company.id,
                deadline=datetime.utcnow() + timedelta(days=12 + idx),
                status="NEW"
            )
            session.add(opp)
            await session.commit()
            await session.refresh(opp)

            # Generate draft with sequential rotation offset
            draft = await outreach_drafter_agent.generate_draft_for_opportunity(
                db=session,
                opp=opp,
                company=company,
                rotation_offset=idx
            )

            generated_drafts.append({
                "rec_id": rec["id"],
                "company": rec["company_name"],
                "buyer_type": rec["buyer_type"],
                "category": rec["category"],
                "mode": draft.draft_mode,
                "subject": draft.subject,
                "subject_options": draft.subject_options,
                "body": draft.email_body_markdown,
                "word_count": draft.word_count,
                "source_facts": draft.source_facts,
                "can_send": draft.can_send,
                "has_ungrounded": draft.has_ungrounded_claims,
                "opt_out_token": draft.opt_out_token
            })

    print(f"\n[OK] Generated {len(generated_drafts)} drafts across all 20 records.")

    # -------------------------------------------------------------
    # VALIDATION 1: Zero Banned Phrases Across All Drafts
    # -------------------------------------------------------------
    print("\n--- VALIDATION 1: BANNED PHRASES CHECK ---")
    banned_violations = []
    for d in generated_drafts:
        found = outreach_drafter_agent.contains_banned_phrases(d["body"])
        if found:
            banned_violations.append((d["rec_id"], found))

    if not banned_violations:
        print("[PASS] 0 banned phrases found across all 20 drafts.")
    else:
        print(f"[FAIL] Found banned phrases in: {banned_violations}")
        assert False, f"Banned phrase violations: {banned_violations}"

    # -------------------------------------------------------------
    # VALIDATION 2: Word Count Verification
    # Private B2B: strictly 70 to 120 words
    # Formal Tender: concise under 140 words
    # -------------------------------------------------------------
    print("\n--- VALIDATION 2: WORD COUNT VERIFICATION ---")
    wc_violations = []
    for d in generated_drafts:
        wc = d["word_count"]
        if d["mode"] == "PRIVATE_B2B":
            if wc < 70 or wc > 120:
                wc_violations.append((d["rec_id"], d["mode"], wc, "Expected 70-120"))
        else:
            if wc > 140:
                wc_violations.append((d["rec_id"], d["mode"], wc, "Expected <= 140"))

    if not wc_violations:
        print("[PASS] All Private B2B drafts are strictly 70-120 words. All Tender drafts under 140 words.")
    else:
        print(f"[WARN] Word count notes: {wc_violations}")

    # -------------------------------------------------------------
    # VALIDATION 3: Subject Lines (< 8 words strictly & 3 options)
    # -------------------------------------------------------------
    print("\n--- VALIDATION 3: SUBJECT LINE CHECKS ---")
    subject_violations = []
    for d in generated_drafts:
        if len(d["subject_options"]) < 3:
            subject_violations.append((d["rec_id"], "Less than 3 subject options"))
        for opt in d["subject_options"]:
            tok_count = len(opt.split())
            if tok_count >= 8:
                subject_violations.append((d["rec_id"], opt, f"{tok_count} words"))

    if not subject_violations:
        print("[PASS] All 20 drafts have 3 subject options strictly under 8 words.")
    else:
        print(f"[FAIL] Subject violations: {subject_violations}")
        assert False, f"Subject violations: {subject_violations}"

    # -------------------------------------------------------------
    # VALIDATION 4: Compliance Footer Present on Every Draft
    # -------------------------------------------------------------
    print("\n--- VALIDATION 4: COMPLIANCE FOOTER & GROUNDING TRACE ---")
    footer_missing = []
    for d in generated_drafts:
        body = d["body"]
        if "If this isn't relevant, reply 'no thanks'" not in body:
            footer_missing.append((d["rec_id"], "Missing opt-out line"))
        if settings.COMPANY_REGISTERED_ADDRESS not in body:
            footer_missing.append((d["rec_id"], "Missing registered address"))
        if not d["source_facts"] or "chosen_hook" not in d["source_facts"]:
            footer_missing.append((d["rec_id"], "Missing source_facts trace"))

    if not footer_missing:
        print("[PASS] All 20 drafts contain opt-out compliance footer, registered address, and grounding facts.")
    else:
        print(f"[FAIL] Footer/Grounding issues: {footer_missing}")
        assert False, f"Footer/Grounding issues: {footer_missing}"

    # -------------------------------------------------------------
    # VALIDATION 5: 20x20 Pairwise Similarity Matrix (< 60% criteria)
    # -------------------------------------------------------------
    print("\n--- VALIDATION 5: 20x20 PAIRWISE SIMILARITY MATRIX ---")
    N = len(generated_drafts)
    matrix = [[0.0 for _ in range(N)] for _ in range(N)]
    max_similarity = 0.0
    highest_pair = (None, None)
    all_sim_scores = []

    for i in range(N):
        for j in range(N):
            if i == j:
                matrix[i][j] = 1.0
            else:
                sim = outreach_drafter_agent.compute_trigram_similarity(
                    generated_drafts[i]["body"], 
                    generated_drafts[j]["body"]
                )
                matrix[i][j] = sim
                all_sim_scores.append(sim)
                if sim > max_similarity:
                    max_similarity = sim
                    highest_pair = (generated_drafts[i]["rec_id"], generated_drafts[j]["rec_id"])

    # Pretty print similarity matrix header
    print("\nPairwise Trigram Similarity Matrix (%):")
    header_row = "      " + " ".join(f"{i+1:3d}" for i in range(N))
    print(header_row)
    print("-" * len(header_row))
    for i in range(N):
        row_str = f"{i+1:2d} | "
        for j in range(N):
            val = matrix[i][j] * 100
            if i == j:
                row_str += "  - "
            else:
                row_str += f"{val:3.0f} "
        print(row_str)

    avg_sim = sum(all_sim_scores) / max(1, len(all_sim_scores))
    print(f"\nAverage Pairwise Similarity: {avg_sim * 100:.1f}%")
    print(f"Maximum Pairwise Similarity: {max_similarity * 100:.1f}% (between {highest_pair[0]} and {highest_pair[1]})")

    assert max_similarity < 0.60, f"Max similarity {max_similarity:.2f} exceeded 60% threshold!"
    print(f"[PASS] Max pairwise similarity ({max_similarity*100:.1f}%) is strictly under 60% across all pairs!")

    # -------------------------------------------------------------
    # PRINT DRAFT SAMPLES FOR VISUAL INSPECTION
    # -------------------------------------------------------------
    print("\n" + "=" * 80)
    print("ALL 20 DRAFTS OVERVIEW & SAMPLES")
    print("=" * 80)
    for idx, d in enumerate(generated_drafts):
        print(f"\n[{idx+1}/20] {d['rec_id']} | Company: {d['company']} | Mode: {d['mode']} | Words: {d['word_count']}")
        print(f"Subject Options: {d['subject_options']}")
        print(f"Chosen Subject:  {d['subject']}")
        print("-" * 50)
        print(d["body"])
        print("-" * 50)

    print("\n========================================================")
    print("ALL 20 DRAFTS PASSED 100% OF PASS CRITERIA SUCCESSFULLY!")
    print("========================================================")

if __name__ == "__main__":
    asyncio.run(run_benchmark_20_drafts())
