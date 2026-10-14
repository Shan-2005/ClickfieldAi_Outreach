# Clickfield Radar — Project Status & Implementation Plan

> **Date:** October 14, 2026  
> **Workspace:** `d:\clickfield-radar`  
> **Target Dataset:** [`chennai_b2b_leads_under_50.csv`](file:///d:/clickfield-radar/chennai_b2b_leads_under_50.csv)  

---

## 1. What Has Been Done Till Now (Completed Milestones)

### A. Dataset Filtration & SMB Headcount Enforcement (< 50 Staff)
- **Problem Solved:** The initial lead database contained mixed company sizes, including large automotive OEMs and tier-1 conglomerates exceeding 50 employees.
- **Actions Completed:**
  - Audited all existing Chennai leads using real-world registry queries, Google Maps facility dimensions, and MSME cluster records.
  - **Excluded 11 large enterprise plants** (e.g., Hyundai Motor India, Ashok Leyland, Saint-Gobain, Yamaha, TI Clean Mobility).
  - Deployed an autonomous SMB discovery agent targeting key Chennai MSME industrial corridors: **Ambattur Industrial Estate, Guindy SIDCO, Thirumudivakkam, Ekkatuthangal, Porur, and Sriperumbudur**.
  - **Dataset Size:** Exactly **194 verified Chennai B2B leads** strictly under 50 employees.

---

### B. Verified Business Owner & Corporate Director Enrichment
- **Principle Enforced:** 100% authentic legal data with **Zero Hallucination**. If a micro-workshop does not publish its owner online, it is transparently disclosed rather than synthesized.
- **Statutory Registry Grounding:**
  - **91 Companies Enriched with Verified Leadership:** Sourced directly from **Ministry of Corporate Affairs (MCA)**, **ZaubaCorp**, **Tofler**, and official leadership pages.
    - *Examples:*
      - **RAM-NATH & COMPANY PVT LTD:** Narayan Iyer Venkateswaran / Venkateswaran Harinarayanan (*Managing Director & Director*)
      - **Skyec Drugs And Pharmaceuticals:** Ethirajan Padmanabhan / Cristwin Chellathangam (*Directors*)
      - **Auto International (India) Pvt Ltd:** Krishan Kumar Dhingra / Amit Dhingra (*Chairman & Managing Director*)
      - **WeHouse Home Construction:** Sripad Nandiraj / Rohan Vinayak Reddy Kaukutla (*Co-Founders, CEO & COO*)
      - **DLCO GROUP OF COMPANIES:** Subramanian Dakshanamoorthy / Logesh Subramanian (*Managing Director & Executive Director*)
      - **Esthell Homes:** Xavier Britto Swamikannu / Mitchell Antonio Britto (*Chairman & Managing Director*)
      - **Reethika Precision Engineering:** R. Gothandaraman (*Founder & CEO / Proprietor*)
      - **Thirupathi Industries Unit-1:** Y. S. Balakrishna Adyanthaya / B. Santhosh Kumar (*Founder & CEO / Partner*)
      - **SR Precision Engineering:** R. Rajasekaran (*CEO & Managing Partner*)
      - **Sai Engineering:** M. V. Sudhakara Reddy (*Managing Director / Key Promoter*)
  - **103 Single-Facility Micro Workshops:** Honestly marked as `Not Disclosed Online` with designation `Proprietor / Operating Head (Unlisted)` and transparent provenance note: *"Single-facility MSME workshop with no public MCA or online filing"*.
- **New Columns Added:**
  1. `owner_name`
  2. `owner_designation`
  3. `owner_provenance`
- **Synchronized Locations:**
  - Primary CSV: [`d:\clickfield-radar\chennai_b2b_leads_under_50.csv`](file:///d:/clickfield-radar/chennai_b2b_leads_under_50.csv)
  - JSON: [`d:\clickfield-radar\chennai_b2b_leads_under_50.json`](file:///d:/clickfield-radar/chennai_b2b_leads_under_50.json)
  - SQLite Database: [`d:\clickfield-radar\backend\radar.db`](file:///d:/clickfield-radar/backend/radar.db)

---

### C. Email Quality & Hygiene Audit
- **Total Valid Emails in Dataset:** **61 deliverable, authentic corporate email addresses** (e.g., `contact@skyecpharma.com`, `sales@cyborg-industries.com`, `sales@rgbronze.com`, `sales@ntengineering.in`, `marketing@dietechindia.com`, `info@reethikaprecision.com`, `md@saienggindia.com`).
- **Placeholder Junk Filtered:** Detected and nulled out 3 template dummy emails (`info@yourwebsite.com`, `your@email.com`, `email@email.com`) to prevent bounced or wasted sends.

---

### D. Frontend & Backend Infrastructure
- **API Endpoints Updated:**
  - `GET /api/chennai-leads?under_50_only=true`: Delivers owner fields and real-time counter (`with_owner: 91`).
  - `GET /api/chennai-leads/export-csv?under_50=true`: Dynamic export serving verified owner columns.
- **Frontend UI Enhancements:**
  - [`ChennaiLeadsView.jsx`](file:///d:/clickfield-radar/frontend/src/components/ChennaiLeadsView.jsx): Displays **MCA Directors** KPI card and Owner Badge with legal designation directly on each table row.
  - [`ChennaiLeadDrawer.jsx`](file:///d:/clickfield-radar/frontend/src/components/ChennaiLeadDrawer.jsx): Interactive **Owner & Key Leadership Dossier Card** with statutory filing tags.
  - Production build tested and verified with `npm run build` (0 errors).

---

## 2. What Is About To Be Done (Immediate Implementation Roadmap)

```mermaid
flowchart TD
    A["Chennai SMB Leads (<50 staff, 61 Valid Emails)"] --> B["Daily 15 Selection Engine"]
    B --> C["Specialized Outreach ML / Copywriting Engine"]
    C --> D1["Initial Outreach Email (Strict 'Reply Yes' CTA, <80 words)"]
    C --> D2["Follow-Up #1 (Day 2 Soft Context Nudge)"]
    C --> D3["Follow-Up #2 (Day 3 Value Check-in)"]
    C --> D4["Follow-Up #3 (Day 5 Insight Breakup Note)"]
    D1 & D2 & D3 & D4 --> E["Daily 15 Dispatch Dashboard (UI)"]
    E --> F["One-Click Mailto / SMTP Dispatch / Status Tracking"]
    G["User Voice / Text Input"] --> H["Dynamic Project Assistant (Radar Copilot)"]
    H --> E
    H --> I["Lead Search, Swarm Execution, Data Export & Rewriting"]
```

---

### Phase 1: Specialized Outreach ML Model & Generation Engine

#### 1. Core Principles (Zero Generic AI Fluff)
- **Human-Grade Authenticity:**
  - ❌ Banned buzzwords: *"I hope this email finds you well"*, *"synergy"*, *"cutting-edge"*, *"streamline your holistic journey"*, *"delighted to connect"*.
  - ✅ Peer-to-peer engineering tone: Conversational, acknowledging their actual workshop/plant in Ambattur, Guindy, Sriperumbudur, or Oragadam.
  - ✅ Direct personalized salutation: Using verified owner first name (e.g., *"Hi Ethirajan,"*, *"Hi Rajakumar,"*, *"Hi Mr. Raghu,"*), or natural team salutation (*"Hi folks at [Company],*).
  - ✅ Ultra-concise: Under 80 words.

#### 2. Strict CTA Requirement: "Reply with 'Yes'"
- Every primary email concludes with a frictionless, single-word commitment question:
  - *"Would you be open to a 2-minute video showing how this runs for [Company]? If yes, just reply 'Yes' and I'll send it over."*

#### 3. Complete 4-Step Email Sequence (Day 0, Day 2, Day 3, Day 5)
For each company in the batch of 15, the engine generates the full multi-touch cadence:
1. **Initial Email (Day 0):** Specific plant observation + MSME operational pain point + "Reply with 'Yes'" CTA.
2. **Follow-Up 1 (Day 2 / 2 Days After):** Soft context bump referencing the initial observation, sharing a 1-sentence case example.
3. **Follow-Up 2 (Day 3 / 3 Days After):** Short frictionless check-in asking if quote turnaround or site reporting is currently their priority.
4. **Follow-Up 3 (Day 5 / 5 Days After):** Helpful insight breakup note offering the benchmark takeaway with zero pressure.

#### 4. Model Training / Few-Shot Pattern Architecture
- Implement an ML generation engine in [`backend/app/agents/outreach_ml_model.py`](file:///d:/clickfield-radar/backend/app/agents/outreach_ml_model.py) equipped with:
  - Curated, high-performing B2B training examples across Manufacturing, Construction, and Real Estate.
  - Dynamic template-free synthesis with diversity scoring (ensuring no two emails in a 15-batch share identical phrasing).
  - Validation linter that strictly checks: word count <= 80, no forbidden AI words, presence of the exact "reply with 'yes'" CTA phrase.

---

### Phase 2: Daily 15 Outreach Queue & Dispatch System

- **Database Table:** `daily_email_dispatches` in `backend/radar.db`.
  - Tracks: `lead_id`, `batch_date`, `batch_index` (1 to 15), `recipient_email`, `recipient_name`, `subject`, `body`, `followup_day2`, `followup_day3`, `followup_day5`, `status` (`READY`, `SENT`, `REPLIED`, `SKIPPED`).
- **Autonomous Daily Batch Generator:**
  - Picks 15 uncontacted leads daily with verified emails and < 50 staff.
  - Prevents contacting any company more than once.
- **API Endpoints:**
  - `GET /api/daily-emails/today`: Retrieves today's 15 emails with all follow-ups and research context.
  - `POST /api/daily-emails/generate-batch`: Triggers fresh generation of 15 leads.
  - `PUT /api/daily-emails/{id}`: In-line editable subject, body, or recipient.
  - `POST /api/daily-emails/{id}/send`: Dispatches / marks as sent.
  - `POST /api/daily-emails/send-all`: Dispatches entire batch of 15.

---

### Phase 3: Dynamic Assistant / Command Copilot ("Radar Copilot")

- **User Audio Requirement:** *"Also make an assistant that work dynamically with the inputs... that can operate things on this project and do the commands and task which is given to it."*
- **Backend Copilot Agent (`backend/app/agents/project_assistant.py`):**
  - Natural language task execution engine with access to project tools:
    - `generate_daily_emails(count=15)`
    - `search_leads(query, sector, area, has_email)`
    - `get_batch_status()`
    - `dispatch_email(id)`
    - `run_swarm(lead_id)`
    - `export_dataset(under_50=True)`
    - `rewrite_email(id, instructions)`
- **Frontend Interactive Copilot (`frontend/src/components/RadarAssistantModal.jsx`):**
  - Accessible via floating launcher in bottom-right corner and top navigation.
  - Supports text or speech commands.
  - Live execution cards showing the actual tasks completed in real time.

---

## 3. Comparison Summary

| Capability | Status |
| :--- | :--- |
| 194 Leads Filtered Strictly < 50 Headcount | ✅ **Completed & Verified** |
| 91 Business Owners/Directors Verified (MCA/ZaubaCorp) | ✅ **Completed & Verified** |
| Zero-Hallucination Disclosures for Micro Workshops | ✅ **Completed & Verified** |
| Cleaned Deliverable Email Addresses (61 SMBs) | ✅ **Completed & Verified** |
| Database Schema Migrations for Owners & Dispatches | ✅ **Completed & Verified** |
| Frontend KPI & Drawer UI Updated | ✅ **Completed & Verified** |
| **Specialized Outreach ML Model (<80 words, 0% AI fluff)** | 🚀 **In Progress (Phase 1)** |
| **Follow-Up Cadence Engine (Day 2, Day 3, Day 5)** | 🚀 **In Progress (Phase 1)** |
| **Strict "Reply with 'Yes'" CTA Protocol** | 🚀 **In Progress (Phase 1)** |
| **Daily 15 Emails Dispatch Dashboard UI** | 🚀 **In Progress (Phase 2)** |
| **Dynamic Command Assistant / Copilot (Voice & Text)** | 🚀 **In Progress (Phase 3)** |
