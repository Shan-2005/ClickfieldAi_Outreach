"""
ClickfieldAI Agentic Core Package
"""

from app.agentic_core.lead_discovery_orchestrator import orchestrator, LeadDiscoveryOrchestrator
from app.agentic_core.agent1_web_scout import web_scout_agent, GlobalWebScoutAgent
from app.agentic_core.agent2_web_scraper import web_scraper_agent, WebScraperAgent
from app.agentic_core.agent3_ollama_structurer import ollama_structurer_agent, OllamaStructurerAgent
from app.agentic_core.agent4_dataset_manager import dataset_manager_agent, DatasetManagerAgent

__all__ = [
    "orchestrator",
    "LeadDiscoveryOrchestrator",
    "web_scout_agent",
    "web_scraper_agent",
    "ollama_structurer_agent",
    "dataset_manager_agent"
]
