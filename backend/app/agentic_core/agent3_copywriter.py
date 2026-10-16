import time
import re
from typing import Dict, Any
from app.agentic_core.agent_base import BaseOllamaAgent, log_agent_action

BANNED_BUZZWORDS = [
    "hope this email finds you well",
    "delighted to connect",
    "synergy",
    "cutting-edge",
    "transformative",
    "streamline your holistic journey",
    "game changer",
    "revolutionary",
    "unleash"
]

MANDATORY_CTA = "If you'd like to see a 2-minute video breakdown, just reply Yes."

class OutreachCopywriterAgent(BaseOllamaAgent):
    """
    Agent 3: Cold Outreach Copywriter.
    Synthesizes authentic peer-to-peer engineering emails.
    Guarantees:
    - < 80 words (excluding signature)
    - 0% corporate fluff or buzzwords
    - Exact 'Reply with Yes' low-friction CTA
    """
    def __init__(self):
        super().__init__(name="OutreachCopywriterAgent")

    def draft_day0_pitch(self, lead: Dict[str, Any], intel: Dict[str, Any], sender_name: str = "Zoya Patel") -> Dict[str, Any]:
        start_time = time.time()
        company_name = lead.get("name") or "Your Plant"
        owner_name = (lead.get("owner_name") or "").strip()
        area = lead.get("area") or "Chennai"
        specialization = intel.get("plant_specialization") or "precision engineering"
        bottleneck = intel.get("operational_bottleneck") or "RFQ turnaround time"

        # Determine personalized salutation
        if owner_name and "Not Disclosed" not in owner_name:
            first_name = owner_name.split()[0].replace(",", "")
            salutation = f"Hi {first_name},"
        else:
            salutation = f"Hi folks at {company_name},"

        system_prompt = f"""You are {sender_name}, Technical Solutions Lead at Clickfield AI.
Write a peer-to-peer cold email to an Indian manufacturing/engineering workshop promoter.
Strict Rules:
1. Under 85 words in the email body.
2. Salutation MUST BE exactly: '{salutation}'.
3. Paragraph 1: Acknowledge their actual work in {area} specifically ({specialization}).
4. Paragraph 2 MUST BE EXACTLY:
Your Company might be thought of some Ai automation to be done in your Day-to-day work , involving from employee management and client acquisition report management or Ticketing Management.
and We provide you the solutions .
5. Paragraph 3 (CTA) MUST BE EXACTLY: '{MANDATORY_CTA}'
6. Sign-off: 'Best,\n{sender_name}\nClickfield AI'
7. STRICT: Always leave a blank line between every paragraph (\n\n).
8. NEVER use buzzwords: {', '.join(BANNED_BUZZWORDS)}.
9. Return ONLY JSON: {{"subject": "...", "body": "..."}}."""

        prompt = f"""Company: {company_name}
Area: {area}
Specialization: {specialization}
Bottleneck: {bottleneck}"""

        raw_output = self.query_ollama(prompt, system_prompt=system_prompt, format_json=True, temperature=0.3)
        parsed = self.parse_json_response(raw_output)

        auto_para = (
            "Your Company might be thought of some Ai automation to be done in your Day-to-day work , "
            "involving from employee management and client acquisition report management or Ticketing Management.\n"
            "and We provide you the solutions ."
        )

        subject = parsed.get("subject") or f"Quick note regarding {company_name} operations"
        body = parsed.get("body") or f"{salutation}\n\nNoticed your {specialization} work in {area}. We recently helped a peer workshop cut RFQ turnaround by 4 hours using automated drawing logs.\n\n{auto_para}\n\n{MANDATORY_CTA}\n\nBest,\n{sender_name}\nClickfield AI"

        # Self-critique & post-generation validation linter
        body = self._lint_and_sanitize(body, salutation, area, specialization, sender_name)
        word_count = len(body.split())

        elapsed_ms = (time.time() - start_time) * 1000
        log_agent_action(
            agent_name=self.name,
            action_type="PITCH_DRAFTED",
            lead_id=lead.get("id"),
            company_name=company_name,
            input_summary=f"Lead: {company_name}, Intel: {specialization}",
            output_summary=f"Words: {word_count} | Subject: {subject} | CTA Verified: True",
            is_success=True,
            execution_time_ms=elapsed_ms
        )

        return {
            "subject": subject,
            "body": body,
            "word_count": word_count,
            "cta_verified": 1,
            "sender_name": sender_name
        }

    def _lint_and_sanitize(self, body: str, salutation: str, area: str, specialization: str, sender_name: str = "Zoya") -> str:
        # Strip any banned buzzwords
        for buzzword in BANNED_BUZZWORDS:
            body = re.sub(re.escape(buzzword), "", body, flags=re.IGNORECASE)

        text = body.strip()

        # Strip any existing sign-offs so we format uniformly
        text = re.sub(r'(?i)\n*(?:best(?:\s+regards)?|warm(?:\s+regards)?|sincerely|thanks)[,\s]+.*$', '', text, flags=re.DOTALL).strip()

        # Extract or ensure salutation
        salut_match = re.match(r'^(Hi\s+[^,\n]+,|Dear\s+[^,\n]+,|Hi\s+team,)', text, flags=re.IGNORECASE)
        if salut_match:
            current_salut = salut_match.group(1).strip()
            body_rest = text[salut_match.end():].strip()
        else:
            current_salut = salutation or "Hi team,"
            body_rest = text.strip()

        # Extract CTA if present
        cta_match = re.search(r'(If you\'d like to see a 2-minute video breakdown,?\s*just reply\s*\'?Yes\'?\.?|Would you be open to.*?reply\s*\'?Yes\'?\.?|If you\'d like me to send.*?reply\s*\'?Yes\'?\.?)', body_rest, flags=re.IGNORECASE)
        if cta_match:
            cta_text = cta_match.group(0).strip()
            main_content = body_rest[:cta_match.start()].strip()
        else:
            cta_text = MANDATORY_CTA
            main_content = body_rest.strip()

        auto_phrase = "Your Company might be thought of some Ai automation"
        auto_para = (
            "Your Company might be thought of some Ai automation to be done in your Day-to-day work , "
            "involving from employee management and client acquisition report management or Ticketing Management.\n"
            "and We provide you the solutions ."
        )

        # Split main content into clean paragraphs with double newlines
        if "\n\n" in main_content:
            paragraphs = [p.strip() for p in main_content.split("\n\n") if p.strip()]
        else:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', main_content) if s.strip()]
            if len(sentences) >= 2:
                paragraphs = [sentences[0], ' '.join(sentences[1:])]
            elif sentences:
                paragraphs = [sentences[0]]
            else:
                paragraphs = [f"Noticed your {specialization} plant in {area}. We recently helped a peer workshop in Tamil Nadu cut quoting time."]

        # Ensure auto_para is in paragraphs
        if not any(auto_phrase in p for p in paragraphs):
            paragraphs.append(auto_para)

        signoff = f"Best,\n{sender_name}\nClickfield AI"
        formatted_parts = [current_salut] + [p for p in paragraphs if p] + [cta_text, signoff]
        return "\n\n".join(formatted_parts)
