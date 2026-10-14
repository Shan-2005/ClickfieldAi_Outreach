import os
from typing import Dict, Any
from app.agents.radar_llm_brain import radar_llm_brain

class RadarProjectAssistant:
    """
    Autonomous Interactive Project Assistant (Radar Copilot) powered by RadarLLMBrain.
    Interprets natural language queries, reasons over Chennai B2B domain datasets,
    answers strategic consulting questions, and dynamically executes tasks across
    leads, emails, swarms, and exports.
    """

    def execute_command(self, user_input: str) -> Dict[str, Any]:
        return radar_llm_brain.process_query(user_input)

project_assistant = RadarProjectAssistant()
