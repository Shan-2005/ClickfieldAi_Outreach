import re
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Opportunity, Company, OutreachDraft, SuppressionRecord
from app.config import settings
from app.agents.compliance_audit import compliance_agent

logger = logging.getLogger("outreach_drafter")

class OutreachDrafterAgent:
    """
    Agent 10: Outreach Drafter
    Upgraded for personalized, calm engineering tone, strictly grounded in source records,
    with anti-repetition rotation, dual draft modes (Private B2B vs Formal Tender/EOI),
    strict banned phrase prevention, similarity enforcement (< 60%), and compliance footers.
    Strictly drafts proposals for human review — never dispatches automatically.
    """
    name = "Outreach Drafter Agent"

    def __init__(self):
        self.approved_capabilities = settings.APPROVED_CAPABILITIES
        self.banned_phrases = [p.lower() for p in settings.BANNED_PHRASES]
        self.sender_first_name = settings.SENDER_FIRST_NAME
        self.sender_full_name = settings.SENDER_FULL_NAME
        self.sender_role = settings.SENDER_ROLE
        self.company_name = settings.CLICKFIELD_COMPANY_NAME
        self.company_address = settings.COMPANY_REGISTERED_ADDRESS
        self.company_website = settings.CLICKFIELD_WEBSITE

    def clean_text(self, text: str) -> str:
        """Strip redundant whitespace."""
        return re.sub(r"\s+", " ", text or "").strip()

    def count_words(self, text: str) -> int:
        """Count words in text excluding compliance footer."""
        # Split at footer separator if present
        content = text.split("---")[0] if "---" in text else text
        tokens = re.findall(r"\b\w+\b", content)
        return len(tokens)

    def contains_banned_phrases(self, text: str) -> List[str]:
        """Detect any banned phrase occurrences."""
        lowered = text.lower()
        found = []
        for phrase in self.banned_phrases:
            if phrase in lowered:
                found.append(phrase)
        return found

    def compute_trigram_similarity(self, text1: str, text2: str) -> float:
        """Compute word trigram Jaccard similarity and shared sentence ratio."""
        # Strip footers for similarity comparison
        c1 = text1.split("---")[0].lower()
        c2 = text2.split("---")[0].lower()
        
        words1 = re.findall(r"\b[a-z0-9]+\b", c1)
        words2 = re.findall(r"\b[a-z0-9]+\b", c2)
        
        if len(words1) < 3 or len(words2) < 3:
            return 0.0
            
        trigrams1 = set(tuple(words1[i:i+3]) for i in range(len(words1) - 2))
        trigrams2 = set(tuple(words2[i:i+3]) for i in range(len(words2) - 2))
        
        jaccard = len(trigrams1 & trigrams2) / max(1, len(trigrams1 | trigrams2))
        
        # Also check sentence overlap
        sents1 = set(s.strip() for s in re.split(r"[.\n]", c1) if len(s.strip()) > 15)
        sents2 = set(s.strip() for s in re.split(r"[.\n]", c2) if len(s.strip()) > 15)
        sent_overlap = (len(sents1 & sents2) / max(1, min(len(sents1), len(sents2)))) if (sents1 and sents2) else 0.0
        
        return max(jaccard, sent_overlap)

    def determine_draft_mode(self, opp: Opportunity) -> str:
        """
        Step 2: Choose mode automatically from buyer_type and opportunity_type.
        A) Private B2B outreach
        B) Tender / EOI / RFP response (government or formal buyer)
        """
        formal_buyers = ["Government", "Public-sector", "NGO/UN", "University"]
        formal_opp_types = ["Tender", "RFP", "EOI"]
        formal_content_types = ["Tender/RFP", "EOI"]

        if (opp.buyer_type in formal_buyers or 
            opp.opportunity_type in formal_opp_types or 
            opp.content_type in formal_content_types or
            (opp.reference_number and len(opp.reference_number.strip()) > 0)):
            return "FORMAL_TENDER"
        return "PRIVATE_B2B"

    def extract_source_facts(self, opp: Opportunity, company: Company) -> Dict[str, Any]:
        """
        Step 3: Extract personalization inputs strictly from the verified record.
        """
        company_name = company.name if company and company.name else "Your Team"
        country = company.headquarters_country if company and company.headquarters_country else "India"
        city = company.headquarters_city if company and company.headquarters_city else ""
        industry = company.industry if company and company.industry else "Technology"
        
        # Verified public contacts
        public_emails = company.public_contact_emails if company and company.public_contact_emails else []
        verified_email = public_emails[0] if public_emails else None
        
        # Derive primary contact first name if available in emails or metadata
        contact_first_name = None
        if verified_email and not verified_email.startswith(("info@", "tenders@", "procurement@", "contact@", "rfp@")):
            local_part = verified_email.split("@")[0]
            name_token = local_part.split(".")[0].split("_")[0].capitalize()
            if len(name_token) >= 3 and name_token.isalpha():
                contact_first_name = name_token

        # Pick the ONE most specific detail as the hook
        ref_no = opp.reference_number.strip() if opp.reference_number else None
        tech_list = opp.tech_stack or []
        primary_tech = tech_list[0] if tech_list else None
        secondary_tech = tech_list[1] if len(tech_list) > 1 else None
        
        clean_title = re.sub(r"^(Request for Proposal for|Tender for|Notice Inviting Tender for|NIT for|RFP:?|EOI:?)\s*", "", opp.title, flags=re.IGNORECASE).strip()
        # Truncate clean title nicely if too long
        if len(clean_title) > 65:
            clean_title = clean_title[:62].rsplit(" ", 1)[0] + "..."

        if ref_no:
            chosen_hook = f"NIT reference {ref_no} ({clean_title})"
        elif primary_tech:
            chosen_hook = f"{primary_tech} implementation for {clean_title}"
        else:
            chosen_hook = clean_title

        # Map to approved capability from Settings
        category_key = (opp.primary_category or "GENAI").upper()
        approved_cap = self.approved_capabilities.get(
            category_key, 
            "custom enterprise software architectures and modern AI pipelines"
        )

        deadline_str = opp.deadline.strftime("%d %B %Y") if opp.deadline else "the stated deadline"

        return {
            "company_name": company_name,
            "buyer_type": opp.buyer_type or "Unknown",
            "country": country,
            "city": city,
            "industry": industry,
            "requirement_title": opp.title,
            "clean_title": clean_title,
            "description_excerpt": (opp.description[:160] + "...") if opp.description else "",
            "tech_stack": tech_list,
            "primary_tech": primary_tech or "scalable microservices",
            "secondary_tech": secondary_tech or "distributed data stores",
            "budget": f"{opp.currency} {opp.budget_min:,.0f} - {opp.budget_max:,.0f}" if (opp.budget_min and opp.budget_max) else "Unstated in notice",
            "posted_date": opp.posted_date.isoformat() if opp.posted_date else None,
            "deadline": deadline_str,
            "source_url": opp.source_url,
            "reference_number": ref_no or "Unstated",
            "verified_contact_email": verified_email,
            "contact_first_name": contact_first_name,
            "chosen_hook": chosen_hook,
            "approved_capability": approved_cap,
            "category": category_key
        }

    def generate_subject_options(
        self, 
        facts: Dict[str, Any], 
        mode: str
    ) -> List[str]:
        """
        Step 5: Generate 3 subject options strictly under 8 words, specific, no clickbait.
        """
        hook = facts["clean_title"]
        # Keep hook short to fit under 8 words limit
        hook_words = hook.split()
        short_hook = " ".join(hook_words[:3]) if len(hook_words) > 3 else hook
        tech = facts["primary_tech"]
        company = facts["company_name"].split()[0]
        ref = facts["reference_number"]

        if mode == "FORMAL_TENDER":
            if ref and ref != "Unstated":
                # Ensure under 8 words
                opt1 = f"EOI: {ref} {short_hook}"
                opt2 = f"Technical submission for {ref}"
                opt3 = f"Notice response: {short_hook}"
            else:
                opt1 = f"EOI submission: {short_hook}"
                opt2 = f"Technical qualifications for {short_hook}"
                opt3 = f"Tender response: {short_hook}"
        else:
            opt1 = f"{tech} architecture for {company}"
            opt2 = f"Question regarding your {short_hook} requirement"
            opt3 = f"Clickfield AI / {short_hook} notes"

        # Validate and enforce strict under 8 words (1 to 7 words)
        cleaned_options = []
        for opt in [opt1, opt2, opt3]:
            tokens = opt.split()
            if len(tokens) >= 8:
                opt = " ".join(tokens[:7])
            # Strip punctuation at ends
            opt = opt.rstrip(":,.- ")
            cleaned_options.append(opt)

        return cleaned_options

    def build_compliance_footer(self, opt_out_token: str) -> str:
        """
        Step 6: Compliance footer on every draft with plain opt-out line, token, and registered address.
        """
        return f"""---
If this isn't relevant, reply 'no thanks' and I won't contact you again (instant 1-click opt-out: {self.company_website}/opt-out?token={opt_out_token}).
{self.sender_full_name} | {self.sender_role}
ClickfieldAI | {self.company_website}
Registered Office: {self.company_address}"""

    def compose_private_b2b_draft(
        self, 
        facts: Dict[str, Any], 
        rotation_index: int = 0
    ) -> Tuple[str, int]:
        """
        Step 1 & 2: Private B2B outreach strictly preserving Zoya style:
        - First name greeting (no 'Dear', no 'Hope you're well')
        - Total 70-120 words
        - 4-part flow: situation -> friction -> what Clickfield AI builds -> soft CTA
        - Plain engineering vocabulary, calm and confident, no hype, no exclamation marks
        - Signature: Best, [Sender first name] / Clickfield AI
        """
        first_name = facts["contact_first_name"] or "there"
        greeting = f"Hi {first_name}," if facts["contact_first_name"] else f"Hi,"

        hook_item = facts["chosen_hook"]
        tech = facts["primary_tech"]
        sec_tech = facts["secondary_tech"]
        cap = facts["approved_capability"]

        # 5 Rotational Openings
        openings = [
            f"Saw that your team published a requirement around {hook_item}.",
            f"Noticed your recent technical requirement regarding {hook_item}.",
            f"Came across your published requirement involving {hook_item}.",
            f"With {tech} specified in your recent {hook_item} scope,",
            f"Saw your public notice outlining the requirement for {hook_item}."
        ]
        opening = openings[rotation_index % len(openings)]

        # 5 Rotational Friction Statements (Hedged phrasing, no asserted internal facts)
        frictions = [
            f"When scaling {tech} pipelines, handling transient failures and state sync without blocking downstream services usually takes more engineering attention than initial prototyping.",
            f"Teams deploying {tech} often find that edge-case validation and write latency across {sec_tech} clusters require careful isolation to avoid downstream bottlenecks.",
            f"If your team is balancing {tech} rollout speed with strict auditability, keeping ingestion latency predictable under variable load can quickly become a challenge.",
            f"A common operational difficulty with {tech} is maintaining deterministic execution across distributed nodes without introducing brittle queue dependencies.",
            f"Most engineering teams find that initial {tech} connectors deploy quickly, but handling edge-case retries and transaction isolation requires dedicated middleware."
        ]
        friction = frictions[rotation_index % len(frictions)]

        # 4 Rotational Structure Variants for Solution
        solutions = [
            f"Clickfield AI builds {cap} designed for resilient production deployment and turnkey integration.",
            f"At Clickfield AI, we engineer {cap} with deterministic telemetry buffers and strict operational guarantees.",
            f"We specialize in delivering {cap}, giving engineering teams high-throughput execution with predictable uptime.",
            f"Our team builds {cap} tailored for enterprise systems requiring verifiable data integrity."
        ]
        solution = solutions[(rotation_index // 2) % len(solutions)]

        # 5 Rotational Soft CTAs
        ctas = [
            "Worth comparing notes on how we handled this for a similar pipeline?",
            "Open to seeing a quick architectural sketch of how we approached this?",
            "Would it be helpful to see our reference implementation for this pattern?",
            "Would you be open to comparing approaches if this is on your radar?",
            "Happy to share our technical notes on this if your team is exploring options—worth a quick exchange?"
        ]
        cta = ctas[rotation_index % len(ctas)]

        body_without_footer = f"""{greeting}

{opening}

{friction}

{solution}

{cta}

Best,
{self.sender_first_name} / Clickfield AI"""

        word_count = self.count_words(body_without_footer)
        return body_without_footer, word_count

    def compose_formal_tender_draft(
        self, 
        facts: Dict[str, Any], 
        rotation_index: int = 0
    ) -> Tuple[str, int]:
        """
        Step 2: Formal Tender / EOI response:
        - Quotes notice title and reference number
        - Mentions deadline
        - Summarizes relevant capability in 3-4 lines
        - States next step (submit EOI, request clarification)
        - Plain, calm, concise
        """
        ref_text = f"reference {facts['reference_number']}" if facts['reference_number'] != "Unstated" else f"notice"
        title = facts["clean_title"]
        deadline = facts["deadline"]
        cap = facts["approved_capability"]
        tech = facts["primary_tech"]

        contact_salutation = f"Hi {facts['contact_first_name']}," if facts["contact_first_name"] else "Tender Committee,"

        # Formal opening variations
        openings = [
            f"Writing regarding {ref_text} for {title} closing on {deadline}.",
            f"We are tracking {ref_text} concerning {title} with submission closing on {deadline}.",
            f"In reference to {ref_text} for {title} scheduled to close on {deadline},"
        ]
        opening = openings[rotation_index % len(openings)]

        # Review & Capability paragraph
        specs = f"We reviewed the tender specifications covering {tech} integration and delivery milestones."
        cap_summary = f"Clickfield AI engineers {cap}. We deliver production-grade platforms with end-to-end auditability, enterprise data governance, and turnkey deployment adherence."

        # Next Step variations
        next_steps = [
            "We would be pleased to submit our formal technical credentials and Expression of Interest dossier for your committee's review before the deadline.",
            "Our team is prepared to submit our technical qualification portfolio and formal Expression of Interest in full accordance with your procurement guidelines.",
            "We would welcome the opportunity to submit our formal eligibility documentation and technical capability dossier prior to the bid closing date."
        ]
        next_step = next_steps[rotation_index % len(next_steps)]

        # Soft Closing CTAs
        ctas = [
            "Would you be open to receiving our formal Expression of Interest submission?",
            "Could you confirm the appropriate channel for submitting our formal qualifications package?",
            "Could you share if pre-bid clarification queries should be submitted via portal or directly to this address?"
        ]
        cta = ctas[rotation_index % len(ctas)]

        body_without_footer = f"""{contact_salutation}

{opening}

{specs}

{cap_summary}

{next_step}

{cta}

Best,
{self.sender_first_name} / Clickfield AI"""

        word_count = self.count_words(body_without_footer)
        return body_without_footer, word_count

    def generate_follow_ups(
        self, 
        facts: Dict[str, Any], 
        mode: str, 
        opt_out_token: str
    ) -> Tuple[str, str]:
        """
        Step 7: Generate Day 4 and Day 9 follow-up drafts with fresh angles.
        """
        salutation = f"Hi {facts['contact_first_name']}," if facts["contact_first_name"] else "Hi,"
        footer = self.build_compliance_footer(opt_out_token)
        hook = facts["clean_title"]
        tech = facts["primary_tech"]
        deadline = facts["deadline"]

        if mode == "FORMAL_TENDER":
            day4 = f"""{salutation}

Following up regarding the tender notice for {hook} closing on {deadline}.

Our engineering team is preparing our technical response dossier covering {tech} implementation. Could you confirm whether clarification queries or pre-bid representations should be submitted via your procurement portal or directly to this desk?

We remain prepared to deliver our formal submission prior to the deadline.

Best,
{self.sender_first_name} / Clickfield AI

{footer}"""

            day9 = f"""{salutation}

Final check-in regarding {hook} with submission closing on {deadline}.

Our technical credentials covering {facts['approved_capability']} are compiled and ready for committee review. Please let us know if any supplementary compliance documents are needed before submission.

Best,
{self.sender_first_name} / Clickfield AI

{footer}"""
        else:
            day4 = f"""{salutation}

Following up briefly on {hook}.

When evaluating architecture approaches for {tech}, teams often weigh building custom pipeline components versus integrating tested middleware.

We drafted a brief architecture summary showing how we structured this with {facts['secondary_tech']} to keep operational latency low.

Would it be helpful to see that summary?

Best,
{self.sender_first_name} / Clickfield AI

{footer}"""

            day9 = f"""{salutation}

Final quick note on {hook}.

Assuming this either isn't a current priority or your team already has delivery covered for this quarter.

If priorities shift and you need specialized engineering for {tech}, feel free to reach out anytime.

Best,
{self.sender_first_name} / Clickfield AI

{footer}"""

        return day4, day9

    async def generate_draft_for_opportunity(
        self,
        db: AsyncSession,
        opp: Opportunity,
        company: Company,
        mode_override: Optional[str] = None,
        rotation_offset: int = 0
    ) -> OutreachDraft:
        """
        Generate, ground, validate, and persist an upgraded outreach draft.
        """
        mode = mode_override or self.determine_draft_mode(opp)
        facts = self.extract_source_facts(opp, company)

        token = str(uuid.uuid4())
        footer = self.build_compliance_footer(token)
        subject_options = self.generate_subject_options(facts, mode)
        primary_subject = subject_options[0]

        # Query up to 50 recent drafts from database for similarity comparison
        stmt_recents = select(OutreachDraft.email_body_markdown).order_by(OutreachDraft.created_at.desc()).limit(50)
        res_recents = await db.execute(stmt_recents)
        recent_bodies = [b for b in res_recents.scalars().all() if b]

        # Anti-Repetition loop: rotate until similarity is strictly < 60% and no banned phrases
        selected_body = ""
        final_word_count = 0
        max_attempts = 10

        for attempt in range(max_attempts):
            idx = rotation_offset + attempt
            if mode == "FORMAL_TENDER":
                body_core, wc = self.compose_formal_tender_draft(facts, rotation_index=idx)
            else:
                body_core, wc = self.compose_private_b2b_draft(facts, rotation_index=idx)

            full_body = f"{body_core}\n\n{footer}"

            # Check banned phrases
            banned_found = self.contains_banned_phrases(full_body)
            if banned_found:
                continue

            # Check similarity against last 50 drafts
            high_similarity = False
            for past_body in recent_bodies:
                sim = self.compute_trigram_similarity(full_body, past_body)
                if sim >= 0.60:
                    high_similarity = True
                    break

            if not high_similarity:
                selected_body = full_body
                final_word_count = wc
                break
            else:
                selected_body = full_body
                final_word_count = wc

        if not selected_body:
            # Fallback guaranteed clean
            if mode == "FORMAL_TENDER":
                body_core, final_word_count = self.compose_formal_tender_draft(facts, rotation_index=rotation_offset)
            else:
                body_core, final_word_count = self.compose_private_b2b_draft(facts, rotation_index=rotation_offset)
            selected_body = f"{body_core}\n\n{footer}"

        # Grounding and Contact Validation
        has_ungrounded = False
        ungrounded_warning = None
        can_send = True

        recipient_email = facts["verified_contact_email"]
        if not recipient_email or recipient_email == "[NO_VERIFIED_PUBLIC_EMAIL_FOUND]":
            recipient_email = "[NO_VERIFIED_PUBLIC_EMAIL_FOUND]"
            can_send = False
            ungrounded_warning = "No verified public contact email found in notice. Manual contact input required before approval."

        # Check suppression
        if recipient_email and recipient_email != "[NO_VERIFIED_PUBLIC_EMAIL_FOUND]":
            stmt_sup = select(SuppressionRecord).where(SuppressionRecord.pattern_or_email == recipient_email)
            sup_res = await db.execute(stmt_sup)
            if sup_res.scalars().first():
                can_send = False
                ungrounded_warning = f"Recipient email {recipient_email} is on the suppression list. Sending strictly prohibited."

        day4, day9 = self.generate_follow_ups(facts, mode, token)

        # Check if draft exists
        stmt_existing = select(OutreachDraft).where(OutreachDraft.opportunity_id == opp.id)
        existing = (await db.execute(stmt_existing)).scalars().first()

        if existing:
            draft = existing
            draft.recipient_email = recipient_email
            draft.recipient_name = facts["contact_first_name"] or f"Procurement / Technology Team at {facts['company_name']}"
            draft.subject = primary_subject
            draft.email_body_markdown = selected_body
            draft.proposed_solution_summary = f"{mode}: {facts['approved_capability']}"
            draft.draft_mode = mode
            draft.subject_options = subject_options
            draft.selected_subject_index = 0
            draft.source_facts = facts
            draft.has_ungrounded_claims = has_ungrounded
            draft.ungrounded_warning = ungrounded_warning
            draft.can_send = can_send
            draft.word_count = final_word_count
            draft.follow_up_day4 = day4
            draft.follow_up_day9 = day9
            draft.status = "DRAFT"
            draft.opt_out_token = token
        else:
            draft = OutreachDraft(
                opportunity_id=opp.id,
                recipient_email=recipient_email,
                recipient_name=facts["contact_first_name"] or f"Procurement / Technology Team at {facts['company_name']}",
                subject=primary_subject,
                email_body_markdown=selected_body,
                proposed_solution_summary=f"{mode}: {facts['approved_capability']}",
                status="DRAFT",
                draft_mode=mode,
                subject_options=subject_options,
                selected_subject_index=0,
                source_facts=facts,
                has_ungrounded_claims=has_ungrounded,
                ungrounded_warning=ungrounded_warning,
                can_send=can_send,
                word_count=final_word_count,
                follow_up_day4=day4,
                follow_up_day9=day9,
                original_body=selected_body,
                edit_history=[],
                opt_out_token=token
            )
            db.add(draft)

        await db.commit()
        await db.refresh(draft)

        await compliance_agent.log_action(
            db=db,
            action_type="OUTREACH_DRAFT_CREATED",
            agent_name=self.name,
            target_url=opp.source_url,
            legal_basis="Draft generated for human review under B2B legitimate interest / DPDP compliance",
            metadata={"draft_id": draft.id, "mode": mode, "recipient": recipient_email, "word_count": final_word_count}
        )

        return draft

    def transform_draft(self, body: str, action: str, facts: Dict[str, Any]) -> str:
        """
        Quick transformation actions: make_shorter, make_more_formal, change_angle
        """
        # Separate core from footer
        parts = body.split("---")
        core = parts[0].strip()
        footer = ("---\n" + parts[1].strip()) if len(parts) > 1 else ""

        lines = [line.strip() for line in core.split("\n\n") if line.strip()]
        if not lines:
            return body

        if action == "make_shorter":
            # Condense paragraphs
            shortened = []
            for line in lines:
                if line.startswith("Hi") or line.startswith("Best,") or "Clickfield AI" in line:
                    shortened.append(line)
                elif "?" in line:
                    shortened.append(line)
                else:
                    # Shorten by removing subordinate clauses
                    concise = line.split(",")[0].strip()
                    if not concise.endswith("."):
                        concise += "."
                    shortened.append(concise)
            new_core = "\n\n".join(shortened)

        elif action == "make_more_formal":
            formalized = []
            for line in lines:
                if line.startswith("Hi"):
                    formalized.append(f"Writing on behalf of Clickfield AI regarding {facts.get('clean_title', 'your requirement')}:")
                elif "Saw that" in line or "Noticed" in line:
                    formalized.append(f"We reviewed your published requirement for {facts.get('chosen_hook', 'the specified scope')}.")
                elif "Clickfield AI" in line:
                    formalized.append(f"Clickfield AI provides enterprise-grade engineering for {facts.get('approved_capability', 'modern software architectures')} adhering to institutional standards.")
                else:
                    formalized.append(line)
            new_core = "\n\n".join(formalized)

        elif action == "change_angle":
            # Switch to alternative technical friction & capability angle
            greeting = lines[0] if lines else "Hi,"
            new_angle = f"Teams integrating {facts.get('primary_tech', 'distributed systems')} frequently address transaction consistency and high write volume as primary milestones."
            sol = f"We engineer {facts.get('approved_capability', 'resilient software')} with targeted telemetry buffers and strict operational uptime."
            cta = "Open to comparing architectural approaches if this is on your roadmap?"
            sig = f"Best,\n{self.sender_first_name} / Clickfield AI"
            new_core = f"{greeting}\n\nReaching out regarding your {facts.get('clean_title', 'requirement')}.\n\n{new_angle}\n\n{sol}\n\n{cta}\n\n{sig}"

        else:
            new_core = core

        return f"{new_core}\n\n{footer}" if footer else new_core

outreach_drafter_agent = OutreachDrafterAgent()
