"""
ClickfieldAI Radar — 4-Agent Ollama Sequential Relay for Email Generation.
Defined in Section 4 of .agents/AGENTS.md:
- Agent 1: Company Deep Researcher
- Agent 2: Workflow and Friction Spotter
- Agent 3: Bespoke Copy Synthesizer
- Agent 4: Quality Auditor and DB Writer
"""

import re
import time
import json
import logging
import sqlite3
from typing import Dict, Any, Optional
import httpx

from app.services.ollama_client import OllamaAgentBrain
from app.agentic_core.agent_base import log_agent_action, DB_PATH

logger = logging.getLogger("email_pipeline_agents")

BANNED_BUZZWORDS = [
    "innovative", "synergy", "leverage", "empower", "cutting-edge",
    "seamless", "seamlessly", "robust", "transformative", "game changer",
    "revolutionize", "revolutionary", "streamline your holistic journey"
]

def fetch_website_snippet(url: str, timeout_sec: float = 3.0) -> str:
    """Safely extracts meta description or homepage title snippet within timeout."""
    if not url:
        return ""
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    try:
        with httpx.Client(timeout=timeout_sec, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"}) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                html = resp.text
                meta_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
                if meta_match:
                    return meta_match.group(1).strip()[:400]
                og_match = re.search(r'<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
                if og_match:
                    return og_match.group(1).strip()[:400]
                title_match = re.search(r'<title>([^<]+)</title>', html, re.IGNORECASE)
                if title_match:
                    return title_match.group(1).strip()[:200]
    except Exception:
        pass
    return ""


class CompanyDeepResearcherAgent:
    """
    Agent 1: Company Deep Researcher
    Synthesizes what the company genuinely sells, produces, or delivers in plain English.
    """
    def __init__(self, brain: Optional[OllamaAgentBrain] = None):
        self.name = "CompanyDeepResearcherAgent"
        self.brain = brain or OllamaAgentBrain()

    def research(self, lead: Dict[str, Any]) -> str:
        start_time = time.time()
        company = lead.get("company_name") or "the company"
        website = lead.get("company_website") or ""
        industry = lead.get("company_industry") or ""
        ai_one_liner = lead.get("ai_one_liner") or ""
        value_prop = lead.get("value_proposition") or ""
        service_tags = lead.get("service_tags") or ""

        # Web context if available
        web_snippet = fetch_website_snippet(website) if website else ""

        system_prompt = (
            "You are a factual business research analyst. Your job is to describe what a company "
            "TRULY does in plain English. What do they manufacture, sell, distribute, or deliver? "
            "Write 2-3 concise, factual sentences. NO buzzwords, NO marketing fluff."
        )

        user_prompt = f"""Target Company: {company}
Industry: {industry}
Core Offering: {ai_one_liner}
Value Proposition: {value_prop}
Services/Tags: {service_tags}
Website Snippet: {web_snippet}

Explain what {company} actually does in 2 concise, concrete sentences:"""

        summary = self.brain.generate(user_prompt, system=system_prompt, temperature=0.2)
        summary = summary.strip()

        # Fallback if Ollama response was empty
        if not summary:
            if ai_one_liner and value_prop:
                summary = f"{company} specializes in {ai_one_liner.rstrip('.')}. Their core focus is on {value_prop.rstrip('.')}."
            else:
                summary = f"{company} operates in {industry or 'commercial operations'}."

        elapsed_ms = (time.time() - start_time) * 1000
        log_agent_action(
            agent_name=self.name,
            action_type="COMPANY_RESEARCHED",
            lead_id=lead.get("id"),
            company_name=company,
            input_summary=f"Input: {company} | {industry} | Web: {bool(web_snippet)}",
            output_summary=summary[:500],
            is_success=True,
            execution_time_ms=elapsed_ms
        )
        return summary


class WorkflowFrictionSpotterAgent:
    """
    Agent 2: Workflow and Friction Spotter
    Identifies realistic day-to-day manual bottlenecks (employee management, reporting, ticketing).
    """
    def __init__(self, brain: Optional[OllamaAgentBrain] = None):
        self.name = "WorkflowFrictionSpotterAgent"
        self.brain = brain or OllamaAgentBrain()

    def spot_friction(self, lead: Dict[str, Any], company_summary: str) -> str:
        start_time = time.time()
        company = lead.get("company_name") or "the company"
        industry = lead.get("company_industry") or ""
        title = lead.get("recipient_title") or "Operations Leader"

        system_prompt = (
            "You are an operational bottleneck specialist. Think about where this specific company's "
            "day-to-day operations create manual friction or delays. Focus on employee management, "
            "client acquisition report management, or ticketing bottlenecks. "
            "Output exactly ONE concise sentence stating their primary operational friction area."
        )

        user_prompt = f"""Company: {company}
Industry: {industry}
Recipient Title: {title}
Company Reality: {company_summary}

State their main operational friction in one concise sentence:"""

        friction = self.brain.generate(user_prompt, system=system_prompt, temperature=0.2).strip()

        if not friction:
            friction = f"Managing distributed client delivery reporting and cross-team service ticketing bottlenecks."

        elapsed_ms = (time.time() - start_time) * 1000
        log_agent_action(
            agent_name=self.name,
            action_type="FRICTION_IDENTIFIED",
            lead_id=lead.get("id"),
            company_name=company,
            input_summary=f"Company: {company} | Title: {title}",
            output_summary=friction[:500],
            is_success=True,
            execution_time_ms=elapsed_ms
        )
        return friction


class BespokeCopySynthesizerAgent:
    """
    Agent 3: Bespoke Copy Synthesizer
    Writes strictly Line 2 of the email matching the formula:
    'I was reviewing [Company]'s work in [what they do] and your focus on [their focus/mission].'
    """
    def __init__(self, brain: Optional[OllamaAgentBrain] = None):
        self.name = "BespokeCopySynthesizerAgent"
        self.brain = brain or OllamaAgentBrain()

    def synthesize_line2(self, lead: Dict[str, Any], company_summary: str, friction: str) -> str:
        start_time = time.time()
        company = lead.get("company_name") or "your company"
        ai_one_liner = (lead.get("ai_one_liner") or "").strip().rstrip('.')
        value_prop = (lead.get("value_proposition") or "").strip().rstrip('.')

        system_prompt = f"""You are a precise B2B outreach copywriter.
You must generate EXACTLY ONE SENTENCE that will serve as Line 2 of an email.
The sentence MUST strictly follow this exact grammatical pattern:
"I was reviewing {company}'s work in [what they genuinely do] and your focus on [their real mission/focus]."

STRICT RULES:
1. Output ONLY the single sentence. Nothing else. No quotes, no intro, no punctuation at start.
2. Must mention {company}.
3. NO buzzwords allowed: {', '.join(BANNED_BUZZWORDS)}.
4. Be specific to their actual business, not vague generic terms.
5. Sound like an observant human professional wrote it."""

        user_prompt = f"""Company Name: {company}
Factual Summary: {company_summary}
Operational Friction: {friction}
One-liner: {ai_one_liner}
Value Proposition: {value_prop}

Write Line 2 now:"""

        raw_line = self.brain.generate(user_prompt, system=system_prompt, temperature=0.3).strip()
        raw_line = raw_line.strip('"\'`')

        # Clean up any multi-sentence spillover
        first_sentence = raw_line.split("\n")[0].strip()
        match = re.search(r'(I was reviewing .+?\.)', first_sentence)
        if match:
            line2 = match.group(1)
        else:
            line2 = first_sentence

        elapsed_ms = (time.time() - start_time) * 1000
        log_agent_action(
            agent_name=self.name,
            action_type="LINE2_SYNTHESIZED",
            lead_id=lead.get("id"),
            company_name=company,
            input_summary=f"Synthesize Line 2 for {company}",
            output_summary=line2[:500],
            is_success=True,
            execution_time_ms=elapsed_ms
        )
        return line2


class QualityAuditorDBWriterAgent:
    """
    Agent 4: Quality Auditor and DB Writer
    Verifies pattern adherence, buzzword exclusion, locks into fixed template, and saves to DB.
    """
    def __init__(self):
        self.name = "QualityAuditorDBWriterAgent"

    def audit_and_save(
        self,
        lead: Dict[str, Any],
        line2_candidate: str,
        persona: Dict[str, Any],
        model_name: str = "Ollama (llama3.2:3b)"
    ) -> Dict[str, Any]:
        start_time = time.time()
        lead_id = lead.get("id")
        company = lead.get("company_name") or "your company"
        first_name = lead.get("recipient_first_name") or "there"
        sender_name = persona.get("name", "Zoya")
        sender_company = "ClickfieldAI"

        ai_one_liner = (lead.get("ai_one_liner") or "").strip().rstrip('.')
        value_prop = (lead.get("value_proposition") or "").strip().rstrip('.')
        if len(ai_one_liner) > 1 and not ai_one_liner[:2].isupper():
            ai_one_liner = ai_one_liner[0].lower() + ai_one_liner[1:]
        if len(value_prop) > 1 and not value_prop[:2].isupper():
            value_prop = value_prop[0].lower() + value_prop[1:]

        # Verification tests
        is_pattern_ok = line2_candidate.startswith("I was reviewing") and "work in" in line2_candidate
        has_company = company.lower() in line2_candidate.lower()
        has_banned = any(bw in line2_candidate.lower() for bw in BANNED_BUZZWORDS)

        # Fallback sanitize if checks failed
        if not is_pattern_ok or not has_company or has_banned:
            if ai_one_liner and value_prop:
                final_line2 = f"I was reviewing {company}'s work in {ai_one_liner} and your focus on {value_prop}."
            elif ai_one_liner:
                final_line2 = f"I was reviewing {company}'s work in {ai_one_liner}."
            else:
                industry = (lead.get("company_industry") or "digital transformation").lower()
                final_line2 = f"I was reviewing {company}'s work in {industry} and your focus on modernizing core commercial operations."
        else:
            final_line2 = line2_candidate.strip().rstrip('.') + "."

        # Section 3.1: Strict Fixed Email Template
        auto_line = (
            "Your Company might be thought of some Ai automation to be done in your Day-to-day work , "
            "involving from employee management and client acquisition report management or Ticketing Management.\n"
            "and We provide you the solutions ."
        )

        cta_line = f"If you'd be open to seeing a 2-minute breakdown of how we support teams like {company}, just reply Yes."

        body = (
            f"Hi {first_name},\n\n"
            f"{final_line2}\n\n"
            f"{auto_line}\n\n"
            f"{cta_line}\n\n"
            f"Best,\n"
            f"{sender_name}\n"
            f"{sender_company}"
        )

        subject = f"Quick note regarding {company}"

        # Write to SQLite DB
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("""
            UPDATE outreach_dataset_leads
            SET draft_subject = ?, draft_body = ?
            WHERE id = ?
        """, (subject, body, lead_id))
        conn.commit()
        conn.close()

        elapsed_ms = (time.time() - start_time) * 1000
        log_agent_action(
            agent_name=self.name,
            action_type="EMAIL_AUDITED_SAVED",
            lead_id=lead_id,
            company_name=company,
            input_summary=f"Line 2: {final_line2}",
            output_summary=f"Subject: {subject} | Assembled & Saved to DB (Model: {model_name})",
            is_success=True,
            execution_time_ms=elapsed_ms
        )

        return {
            "success": True,
            "subject": subject,
            "body": body,
            "line2": final_line2,
            "model": model_name
        }


def run_ollama_outreach_relay(lead: Dict[str, Any], persona: Dict[str, Any]) -> Dict[str, Any]:
    """
    Coordinates the sequential 4-agent relay.
    Gracefully falls back to Company Intelligence Engine if Ollama is offline.
    """
    brain = OllamaAgentBrain()
    if not brain.is_available(auto_start=False):
        # Fallback to Agent 4 directly using DB company intelligence
        auditor = QualityAuditorDBWriterAgent()
        return auditor.audit_and_save(
            lead=lead,
            line2_candidate="",
            persona=persona,
            model_name="Company Intelligence Engine (Ollama offline)"
        )

    # 4-Agent Sequential Relay with local Ollama
    agent1 = CompanyDeepResearcherAgent(brain=brain)
    summary = agent1.research(lead)

    agent2 = WorkflowFrictionSpotterAgent(brain=brain)
    friction = agent2.spot_friction(lead, summary)

    agent3 = BespokeCopySynthesizerAgent(brain=brain)
    line2 = agent3.synthesize_line2(lead, summary, friction)

    agent4 = QualityAuditorDBWriterAgent()
    return agent4.audit_and_save(
        lead=lead,
        line2_candidate=line2,
        persona=persona,
        model_name="Ollama Multi-Agent Pipeline (llama3.2:3b)"
    )
