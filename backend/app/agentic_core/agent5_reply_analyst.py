import time
from typing import Dict, Any, Optional
from app.agentic_core.agent_base import BaseOllamaAgent, log_agent_action, get_db_connection

class InboundReplyAgent(BaseOllamaAgent):
    """
    Agent 5: Inbound Reply Analyst.
    Classifies incoming prospect replies and triggers automatic workflow actions
    (e.g., auto-cancels future follow-ups if prospect responds, alerts for demo booking).
    """
    def __init__(self):
        super().__init__(name="InboundReplyAgent")

    def process_reply(
        self,
        sender_email: str,
        reply_body: str,
        lead_id: Optional[int] = None,
        subject: Optional[str] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        clean_text = reply_body.strip()

        # Fast-track "Yes" response check
        is_direct_yes = clean_text.lower() in ["yes", "yes.", "yes please", "sure", "send it", "interested", "send the video"]

        if is_direct_yes:
            classification = "INTERESTED"
            confidence = 0.99
            recommended_action = "SEND_VIDEO_AND_SCHEDULE_DEMO"
            reasoning = "Direct affirmative response to 'Reply Yes' CTA."
        else:
            system_prompt = """You are an incoming B2B email classifier.
Classify the email text into ONE category:
- INTERESTED: wants info, agreed to demo/video, requested a call.
- NOT_NOW: busy, not ready currently, follow up later.
- WRONG_PERSON: referral to another contact or wrong department.
- UNSUBSCRIBE: requested removal, complaints.
- QUESTION: pricing, technical, or clarification inquiry.

Return ONLY a JSON object:
{
  "category": "INTERESTED|NOT_NOW|WRONG_PERSON|UNSUBSCRIBE|QUESTION",
  "confidence": 0.0-1.0,
  "recommended_action": "SCHEDULE_DEMO|PAUSE_30_DAYS|UPDATE_CONTACT|SUPPRESS|ANSWER_QUESTION",
  "reasoning": "brief note"
}"""
            prompt = f"Inbound message:\n{clean_text[:1500]}"
            raw = self.query_ollama(prompt, system_prompt=system_prompt, format_json=True, temperature=0.1)
            parsed = self.parse_json_response(raw)

            classification = parsed.get("category", "QUESTION")
            confidence = float(parsed.get("confidence", 0.8))
            recommended_action = parsed.get("recommended_action", "MANUAL_REVIEW")
            reasoning = parsed.get("reasoning", "Classified via Ollama")

        # Database recording & automatic follow-up suppression
        conn = get_db_connection()
        cur = conn.cursor()

        # Insert reply record
        cur.execute("""
            INSERT INTO prospect_replies (
                lead_id, sender_email, subject, reply_body,
                classification, confidence, recommended_action
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            lead_id, sender_email, subject, clean_text,
            classification, confidence, recommended_action
        ))

        # Auto-cancel any pending scheduled follow-ups for this lead so we don't spam them
        if lead_id:
            cur.execute("""
                UPDATE email_followup_cadence
                SET status = 'CANCELLED_REPLIED'
                WHERE lead_id = ? AND status = 'PENDING'
            """, (lead_id,))

        conn.commit()
        conn.close()

        elapsed_ms = (time.time() - start_time) * 1000
        log_agent_action(
            agent_name=self.name,
            action_type="REPLY_CLASSIFIED",
            lead_id=lead_id,
            company_name=sender_email,
            input_summary=f"From: {sender_email} | Snippet: {clean_text[:80]}",
            output_summary=f"Class: {classification} ({confidence:.2f}) -> {recommended_action}. Suppressed future follow-ups.",
            is_success=True,
            execution_time_ms=elapsed_ms
        )

        return {
            "classification": classification,
            "confidence": confidence,
            "recommended_action": recommended_action,
            "reasoning": reasoning
        }
