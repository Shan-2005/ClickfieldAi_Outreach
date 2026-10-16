import time
from typing import Dict, Any
from app.agentic_core.agent_base import BaseOllamaAgent, log_agent_action

class LeadIntelAgent(BaseOllamaAgent):
    """
    Agent 1: Lead Intel & Operations Specialist.
    Analyzes verified company data and extracts concrete engineering capabilities and operational bottlenecks.
    Strictly forbids hallucinating capabilities not grounded in the industrial cluster or sector.
    """
    def __init__(self):
        super().__init__(name="LeadIntelAgent")

    def analyze_lead(self, lead: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()
        company_name = lead.get("name") or "Unknown"
        area = lead.get("area") or "Chennai"
        sector = lead.get("sector") or "Manufacturing"
        owner_name = lead.get("owner_name") or "Promoter"
        notes = lead.get("notes") or ""

        system_prompt = """You are an expert Indian Industrial Operations Analyst.
Analyze the provided company profile in Chennai's manufacturing/commercial clusters.
Extract concrete operational reality without fluff or hallucination.
Return ONLY a valid JSON object with:
{
  "plant_specialization": "specific capability (e.g. CNC precision turning, sheet metal fabrication, panel assembly)",
  "operational_bottleneck": "likely operational headache (e.g. RFQ quoting turnaround on customer drawings, dispatch tracking, machine downtime logs)",
  "value_hook": "1 concrete sentence on how AI photo logs or automated quoting saves owner 4 hours/week",
  "cluster_context": "local area context (e.g. Ambattur Industrial Estate, Guindy SIDCO, Sriperumbudur corridor)"
}"""

        prompt = f"""Target Company:
Name: {company_name}
Area: {area}
Sector: {sector}
Promoter/Owner: {owner_name}
Registered Notes: {notes}"""

        raw_output = self.query_ollama(prompt, system_prompt=system_prompt, format_json=True, temperature=0.2)
        parsed = self.parse_json_response(raw_output)

        if not parsed:
            # Deterministic, unhallucinated fallback based strictly on sector & area
            parsed = {
                "plant_specialization": f"Precision {sector.lower()} services",
                "operational_bottleneck": "RFQ quotation estimation delays and production status tracking",
                "value_hook": f"Automating quote turnarounds for {sector.lower()} RFQs",
                "cluster_context": f"{area} industrial zone"
            }

        elapsed_ms = (time.time() - start_time) * 1000
        log_agent_action(
            agent_name=self.name,
            action_type="INTEL_EXTRACTED",
            lead_id=lead.get("id"),
            company_name=company_name,
            input_summary=f"Profile: {company_name} ({sector}, {area})",
            output_summary=f"Specialization: {parsed.get('plant_specialization')} | Bottleneck: {parsed.get('operational_bottleneck')}",
            is_success=True,
            execution_time_ms=elapsed_ms
        )

        return parsed
