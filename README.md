# ClickfieldAI Opportunity Radar 📡

An autonomous, multi-agent intelligence platform that continuously tracks, classifies, deduplicates, enriches, and ranks public AI and software opportunities (RFPs, government tenders, vendor calls, enterprise tech modernization announcements, and project listings).

Built with **FastAPI**, **React**, **Tailwind CSS**, and **PostgreSQL/SQLite**, governed by an immutable **11-Agent Architecture** with strict **Human-in-the-Loop approval** and **DPDP / CAN-SPAM / GDPR** compliance shields.

---

## 🌟 Key Highlights

- **Zero Fabricated Data**: Every record ingested originates from verified public sources with live source URLs and timestamped crawl logs.
- **Priority Focus**: India First (GeM, CPPP, State Portals), followed by Global (EU TED, US SAM.gov, public enterprise feeds).
- **The 11 Autonomous Agents**: Each agent operates with a dedicated contract schema, retry policies, domain rate-limiting, and health telemetry.
- **Strict Human-in-the-Loop Gate**: Proposals and outreach emails are drafted automatically, but cannot be dispatched without explicit human operator review and approval.
- **Full Legal Compliance**: Designed to adhere to India's **Digital Personal Data Protection Act (DPDP Act 2023)**, **CAN-SPAM**, and **GDPR**. Only publicly listed business contact channels (RFC-2142 mailboxes like `rfp@`, `procurement@`) are used. Paywalls, logins, and personal social profiles are strictly prohibited.

---

## 🤖 The 11 Autonomous Agents

| # | Agent Name | Primary Responsibility | Input / Output Contract |
|---|------------|------------------------|-------------------------|
| **1** | **Orchestrator** | Schedules pipeline runs, assigns tasks, updates 24h telemetry & latency metrics. | Cron / Trigger ➔ Dispatched Pipeline Jobs |
| **2** | **Source Discovery** | Evaluates and ranks sources across 4 public categories (Govt Tenders, Freelance, Vendor RFPs, Tech News). | Seed Feeds ➔ Verified Source Registry |
| **3** | **Fetcher** | Polite retrieval engine with domain rate limits, robots.txt compliance, hash caching, and retries. | Target URL ➔ Raw Crawl Record & Hash |
| **4** | **Extractor** | Pulls title, company, description, budget, tech stack, posted dates, deadlines, and live source URLs. | Raw HTML/XML/JSON ➔ Schema-Validated Opportunity |
| **5** | **Classifier** | Tags AI/Software domains (`GENAI`, `ML_DATA_SCIENCE`, `AUTOMATION_RPA`, `DATA_ENGINEERING`, `WEB_MOBILE`, `EMBEDDED_IOT`, `ERP_INTEGRATION`) and filters out civil/catering/hardware tenders. | Extracted Content ➔ Category Verdict & Confidence |
| **6** | **Verifier & Deduplicator** | Calculates normalized title/company fingerprint hashes to merge cross-feed duplicates and flag spam. | Classified Opp ➔ Dedup Hash & Spam Flag |
| **7** | **Company Enricher** | Locates corporate website, HQ location, industry, and public business communication mailboxes (`rfp@`, `procurement@`). | Company Name + Domain ➔ Enriched Corporate Profile |
| **8** | **Fit Scorer** | Ranks leads 0–100 against ClickfieldAI service strengths, budget, India priority (+25 pts), and urgency. | Opportunity + Profile ➔ 0-100 Score & Transparent Reasoning |
| **9** | **Deadline & Alert** | Calculates countdown timers (`3 days left`, `Critical`, `Expired`), urgency tiers, and executive daily digest queues. | Opportunity Deadlines ➔ Urgent Countdown Alerts |
| **10** | **Outreach Drafter** | Writes bespoke proposal pitches tailored to the RFP specs, tech stack, and ClickfieldAI credentials. Strictly generates **DRAFT** state. | Opportunity + Value Prop ➔ Draft Proposal (Requires Human Approval) |
| **11** | **Compliance & Audit** | Enforces robots.txt, maintains suppression list, logs every fetch/draft, and embeds 1-click unsubscribe tokens. | Pipeline Actions ➔ Immutable Compliance Audit Trail |

---

## 🖥️ Operations Dashboard

1. **KPI Metric Cards**: Real-time counter of New Leads Today, Closing in 7 Days, High-Fit Leads (≥ 80%), Contacted, and Won Contracts.
2. **Main Table View**: Dynamic search, category tags, technology stack chips, countdown clocks, fit scores, and 1-click link to verified source URLs.
3. **Pipeline Kanban Board**: Interactive board to transition leads across stages (`New` ➔ `Reviewed` ➔ `Contacted` ➔ `Replied` ➔ `Proposal` ➔ `Won/Lost`).
4. **Lead Detail Drawer**: Slide-out pane presenting full tender specifications, company profile, AI fit score breakdown, and the proposal draft with **"Approve"** and **"Send"** human approval buttons.
5. **Agent Telemetry Panel**: Live operational dashboard showing health status, processed items, error counts, and latency for all 11 agents with a manual crawl trigger.
6. **Export & Digest**: CSV export with real source links and daily markdown executive digest generator.

---

## ⚙️ Quickstart & Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt greenlet

# Run the test suite across all 11 agents
python tests/test_agents.py

# Start the FastAPI server (Initial crawl runs automatically on startup!)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend API will be accessible at: `http://127.0.0.1:8000` (API Docs: `http://127.0.0.1:8000/docs`).

### 2. Frontend Setup
```bash
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```
Dashboard will be accessible at: `http://localhost:5173`.

---

## 🏢 Office Deployment, Docker & Team Infrastructure

Clickfield Radar provides robust deployment configurations for both single-operator workstations and multi-user office team deployments.

### Deployment Options: Single-User SQLite vs Team PostgreSQL
- **Single-User Mode (Default)**: Runs on zero-configuration SQLite (`radar.db`). Perfect for individual sales representatives running locally on Windows or macOS.
- **Team Mode**: Uses PostgreSQL 16 with `pgvector` container. Supports concurrent operators, role-based access control, session authentication, and lead ownership partitioning.

### Docker Compose Architecture
The production `docker-compose.yml` deploys 4 tightly integrated containers:
1. `db`: PostgreSQL 16 + pgvector on internal port 5432 with persistent volume `pgdata`.
2. `backend`: FastAPI application on port 8000 with volume `./backups:/app/backups`.
3. `frontend`: Optimized Nginx container serving SPA with `/api/` reverse proxy.
4. `caddy`: Production reverse proxy handling HTTP/HTTPS routing.

```bash
# Start all containers in background
docker-compose up -d --build
```

#### Network Access: LAN HTTP vs Domain HTTPS
- **Office LAN Deployment (No Domain Needed)**:
  Access across your office local area network via `http://<office-ip>` or `http://localhost`. Caddy forwards port 80 directly to the frontend.
- **Public Domain with Automatic HTTPS**:
  When deploying with a domain (e.g., `radar.clickfield.ai`), uncomment the domain block in [Caddyfile](file:///d:/clickfield-radar/Caddyfile). Caddy automatically provisions and renews Let's Encrypt / ZeroSSL TLS certificates on port 443.

### SQLite to PostgreSQL Migration
To migrate your existing SQLite leads, intellectual property records, and dispatch queue to PostgreSQL:
```bash
# Test schema and inspect tables safely on a temporary copy
python backend/scripts/migrate_sqlite_to_postgres.py --dry-run

# Run live migration into PostgreSQL
python backend/scripts/migrate_sqlite_to_postgres.py --sqlite backend/radar.db --pg-url "postgresql://postgres:clickfield_secret_pass@localhost:5432/clickfield_radar"
```

### Nightly Backups & Restoration Procedure
- **Automated Scheduler**: APScheduler runs every morning at **02:00 IST** taking database snapshots into `./backups` with a strict **14-day retention policy**.
- **Manual Backups**:
  - Windows: Run `powershell -File backend/scripts/backup.ps1`
  - Linux/Docker: Run `bash backend/scripts/backup.sh`
- **Database Restoration**:
  - *PostgreSQL*: `psql $DATABASE_URL < backups/postgres_backup_YYYYMMDD_HHMMSS.sql`
  - *SQLite*: Copy desired snapshot file from `backups/radar_sqlite_YYYYMMDD_HHMMSS.db` back to `backend/radar.db`.

### 👥 Team Roles & Permissions Matrix
The platform enforces role-based access control (RBAC) via secure 8-hour HttpOnly session cookies:
| Capability | Admin (`ADMIN`) | Sales (`SALES`) | Viewer (`VIEWER`) |
|------------|:---------------:|:---------------:|:-----------------:|
| View Leads, Calendar & Tenders | ✅ | ✅ | ✅ |
| Filter & View Own Leads | ✅ | ✅ | ✅ |
| Run MCA & Company Intelligence | ✅ | ✅ | ❌ Read-only |
| Export Datasets (CSV & XLSX) | ✅ | ✅ | ❌ Forbidden |
| Approve & Dispatch Outreach | ✅ | ✅ | ❌ Read-only |
| Reassign Unassigned / Own Leads | ✅ | ✅ | ❌ Forbidden |
| Reassign Other Operator's Leads | ✅ (Exclusive) | ❌ Blocked | ❌ Forbidden |
| Invite Users, Roles & Password Reset | ✅ (Exclusive) | ❌ Blocked | ❌ Forbidden |
| Edit SMTP / Mailbox Settings | ✅ (Exclusive) | ❌ Blocked | ❌ Forbidden |

### ✉️ Mailbox Configuration & Security
- **Security Rule**: `MAIL_PASSWORD` lives strictly in `.env`. It is **never** saved in the database, never logged, and never returned by any API endpoint.
- **Connection Test**: Go to **Settings > Mailbox** and click *"Test Connection"*. The system tests SMTP handshake, authentication, self-test send, IMAP handshake, login, and INBOX read with live pass/fail diagnostics per step.
- **Outreach Constraints**: Sends plain text only via standard SMTP (zero tracking pixels, zero link shorteners). Compliant with RFC Message-ID, Reply-To, and List-Unsubscribe headers. Sending window strictly enforced for Mon-Sat 09:30-17:30 IST with a random 60-120s dispatch interval.

---

## ⚖️ Legal Limits & Compliance Guardrails

During the implementation and analysis of web tender collection, the following legal limits were identified and addressed:

1. **Digital Personal Data Protection Act (DPDP Act 2023, India)**:
   - *Risk*: Harvesting individual employee contact details or scraping personal directories without consent violates Section 6 of the DPDP Act.
   - *Guardrail*: The system strictly restricts enrichment to **public enterprise entities** and standardized business communication mailboxes (e.g., `rfp@`, `tenders@`, `procurement@`). No personal emails, phone numbers, or social handles are ever scraped.

2. **CAN-SPAM & GDPR (B2B Legitimate Interest)**:
   - *Risk*: Unsolicited automated email blasting can lead to domain blacklisting and statutory penalties.
   - *Guardrail*: **Mandatory Human-in-the-Loop Gate**. The Outreach Drafter produces drafts only. No automated dispatch engine is permitted. Each draft includes ClickfieldAI's legal identity, explicit reference to the published public notice, and a 1-click unsubscribe token that instantly updates `suppression_list`.

3. **Crawl Politeness & Terms of Service (ToS)**:
   - *Risk*: Over-aggressive requests can result in HTTP 429 throttling or IP bans on government portals (GeM / CPPP).
   - *Guardrail*: The Fetcher enforces robots.txt rules, a minimum delay of 2.0 seconds between requests to the same domain, and circuit breakers with exponential backoff.

4. **Zero Bypass Rule**:
   - The system **never** attempts to bypass logins, paywalls, CAPTCHAs, or access password-restricted procurement portals. Only open, publicly published RSS, API, and notice documents are ingested.
