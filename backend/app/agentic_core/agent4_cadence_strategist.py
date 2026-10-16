import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from app.agentic_core.agent_base import BaseOllamaAgent, log_agent_action

class CadenceStrategistAgent(BaseOllamaAgent):
    """
    Agent 4: Cadence & Follow-Up Strategist.
    Formulates a chronologically staged 4-step sequence (Day 0, Day 2, Day 3, Day 5).
    Enforces polite, respectful brevity (< 50 words each) with exact scheduled due dates.
    """
    def __init__(self):
        super().__init__(name="CadenceStrategistAgent")

    def generate_cadence(
        self,
        lead: Dict[str, Any],
        day0_pitch: Dict[str, Any],
        base_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        start_time = time.time()
        base_date = base_date or datetime.now()
        company_name = lead.get("name") or "Your Plant"
        owner_name = (lead.get("owner_name") or "").strip()
        sender_name = day0_pitch.get("sender_name", "Zoya Patel")

        if owner_name and "Not Disclosed" not in owner_name:
            first_name = owner_name.split()[0].replace(",", "")
            salutation = f"Hi {first_name},"
        else:
            salutation = f"Hi folks at {company_name},"

        signoff = "Best,\nZoya\nClickfield AI"

        # Day 2: Soft context nudge
        due_day2 = (base_date + timedelta(days=2)).strftime("%Y-%m-%d")
        day2_touch = {
            "stage_day": 2,
            "due_date": due_day2,
            "subject": f"Re: {day0_pitch.get('subject')}",
            "body": f"{salutation}\n\nQuick follow-up on my note regarding quote turnaround for {company_name}.\n\nThought you might find it relevant given current production cycles in {lead.get('area', 'Chennai')}. Happy to send over the 2-minute video breakdown if helpful - just reply 'Yes'.\n\n{signoff}"
        }

        # Day 3: Value check-in
        due_day3 = (base_date + timedelta(days=3)).strftime("%Y-%m-%d")
        day3_touch = {
            "stage_day": 3,
            "due_date": due_day3,
            "subject": f"Quick question on {company_name} quoting time",
            "body": f"{salutation}\n\nIs speeding up customer drawing estimation currently a priority for your team this quarter, or is your current workflow already dialed in?\n\nIf you'd like to see how peer shops run this, just reply 'Yes'.\n\n{signoff}"
        }

        # Day 5: Courteous breakup note
        due_day5 = (base_date + timedelta(days=5)).strftime("%Y-%m-%d")
        day5_touch = {
            "stage_day": 5,
            "due_date": due_day5,
            "subject": f"Final note regarding {company_name}",
            "body": f"{salutation}\n\nAssuming this isn't the right time for {company_name}. I won't crowd your inbox further.\n\nIf quotation turnaround or dispatch logs become a focus later this year, feel free to reply 'Yes' anytime.\n\nWishing your team continued success,\n\n{signoff}"
        }

        cadence_list = [day2_touch, day3_touch, day5_touch]

        elapsed_ms = (time.time() - start_time) * 1000
        log_agent_action(
            agent_name=self.name,
            action_type="CADENCE_SCHEDULED",
            lead_id=lead.get("id"),
            company_name=company_name,
            input_summary=f"Base: {base_date.strftime('%Y-%m-%d')} | Lead: {company_name}",
            output_summary=f"Scheduled 3 follow-ups: Day 2 ({due_day2}), Day 3 ({due_day3}), Day 5 ({due_day5})",
            is_success=True,
            execution_time_ms=elapsed_ms
        )

        return cadence_list
