# Clickfield AI Outreach Style Guide: Zoya Style

**Target Persona:** Engineering Leadership, Technical Founders, VP Engineering, Procurement & IT Heads.  
**Core Voice:** Calm, technical, grounded, plain engineering vocabulary. No sales hype, no buzzword stacking, no exclamation marks.

---

## 1. Non-Negotiable Rules

1. **Greeting:** Greet by first name only (e.g. `Hi Rahul,` or `Alex,`). If formal tender notice with committee, use respectful concise salutation (e.g. `Tender Committee,` or `Hi [Contact First Name],`).
   - **Banned:** `Dear [Name]`, `Hope you are well`, `I hope this email finds you well`, `Happy Monday`.
2. **Length:** Strictly 70–120 words total for Private B2B cold outreach. Tenders/RFPs are 80–140 words to accommodate notice reference and deadline citation.
3. **Paragraph Structure:** 3 to 4 short, distinct paragraphs. No walls of text.
4. **4-Part Flow:**
   - **Paragraph 1 (The Situation):** Cite one specific public fact from their requirement (e.g., their tech stack, public tender scope, database migration goal).
   - **Paragraph 2 (The Friction):** Identify the likely technical friction or scaling challenge, phrased with hedge words (`"If your team is balancing..."`, `"Teams architecting X often hit..."`). Never assert internal company facts as absolute truth without verification.
   - **Paragraph 3 (What Clickfield AI Builds):** State the exact matching capability Clickfield AI engineers from the approved capability list in Settings.
   - **Paragraph 4 (The Soft CTA):** Exactly one calm, low-pressure question (e.g., `"Worth comparing notes on how we handled this?"`, `"Open to seeing how we approached a similar pipeline?"`).
5. **Signature:**
   ```text
   Best,
   [Sender First Name] / Clickfield AI
   ```
6. **Banned Phrases List (Never use across any drafts):**
   - `"consistently hits"`
   - `"costly roadblock"`
   - `"same bottleneck"`
   - `"schema drag"`
   - `"schema drift"`
   - `"data drag"`
   - `"friction point"`
   - `"Should I send over a quick overview, or would you like more details first?"`

---

## 2. Two Draft Modes

### Mode A: Private B2B Outreach
- **Trigger:** Selected automatically when `buyer_type` is `Private company` or `Unknown`, and opportunity is a project posting, vendor call, or tech requirement.
- **Tone:** Informal yet rigorous engineering voice. 70–120 words.
- **Hook:** Stated technology stack or specific architecture requirement.
- **CTA:** Low-friction exploratory question.

### Mode B: Formal Tender / EOI / RFP Response
- **Trigger:** Selected automatically when `buyer_type` is `Government`, `Public-sector`, `NGO/UN`, or `University`, or opportunity is a `Tender`, `RFP`, or `EOI`.
- **Tone:** Concise, professional, and compliant procurement tone.
- **Notice Citation:** Directly quotes the tender/RFP title, reference number, and deadline.
- **Capability Summary:** 3–4 lines summarizing relevant enterprise capabilities matching the tender scope.
- **Next Step:** States willingness to submit formal Expression of Interest or technical eligibility dossier.

---

## 3. Grounding & Anti-Repetition Standards
- **Grounding:** Every fact must trace back to the ingested record. Never invent internal recipient metrics, awards, or case studies.
- **Anti-Repetition:** Rotate across 5 opening styles, 5 CTA styles, and 4 structure variants. Ensure pairwise similarity with past drafts is below 60%.
- **Subject Lines:** Generate 3 distinct options per draft, each strictly under 8 words, specific to the requirement, with zero clickbait.

---

## 4. Few-Shot Sent Email Examples (Tone Reference Only — Do Not Copy Phrases)


### Example 1: Data Engineering & Lakehouse
```text
Hi Arun,

Saw your team is building out a real-time telemetry ingestion layer for the new vehicle sensors on Kafka.

When scaling past 10k events a second, keeping partition rebalances from backing up downstream Postgres or ClickHouse clusters usually takes more engineering attention than the streaming logic itself.

Clickfield AI engineers custom ingestion pipelines and buffer layers that maintain deterministic write orders without blocking analytics queries.

Worth comparing notes on how we structured this for a similar telemetry pipeline?

Best,
Zoya / Clickfield AI
```

### Example 2: Enterprise Generative AI & Automation
```text
Elena,

Noticed your published requirement around automated triage and document extraction across unstructured vendor contracts.

Most teams find that zero-shot LLM parsing works well in prototyping, but production edge cases—like handwritten endorsements and multi-column tables—tend to trigger silent extraction errors.

We build constrained extraction loops that pair local OCR models with targeted LLM validation passes, producing verifiable JSON with source coordinate bounding boxes.

Open to seeing a quick architectural sketch of how this works?

Best,
Zoya / Clickfield AI
```

### Example 3: Legacy ERP & Cloud Middleware Integration
```text
Hi Vikram,

Saw the initiative to link your on-prem SAP inventory ledger with the new customer-facing mobile ordering platform.

The tricky part in these hybrid integrations is usually handling intermittent network drops and transaction rollbacks without generating duplicate order IDs.

At Clickfield AI, we build idempotent API gateways and message queues designed specifically for two-way synchronization between legacy enterprise backends and modern web apps.

Would it be helpful to see our reference architecture for this pattern?

Best,
Zoya / Clickfield AI
```

### Example 4: Formal Tender / EOI Procurement Notice Response
```text
Hi Dr. Murthy,

Writing regarding NIT reference PSCDCL/IOT/WTR/2026/11 for the Smart City IoT Automated Billing and Middleware System closing on 18 October.

We reviewed the tender specifications covering LoRaWAN telemetry ingestion, meter reconciliation, and consumer billing workflows.

Clickfield AI delivers custom telemetry platforms with guaranteed delivery semantics, automated meter reading anomaly detection, and secure RESTful middleware interfaces built to municipal procurement standards.

We would be pleased to submit our formal technical credentials and eligibility dossier for your committee's review before the submission deadline.

Would you be open to receiving our formal Expression of Interest submission?

Best,
Zoya / Clickfield AI
```
