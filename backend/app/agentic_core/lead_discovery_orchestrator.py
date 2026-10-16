"""
ClickfieldAI Lead Discovery Orchestrator
Coordinates the multi-agent pipeline:
1. Agent 1: Google Maps & Global Scout (Authentic live place discovery)
2. Agent 2: Deep Web Scraper (Live contact & decision-maker extraction)
3. Agent 3: Ollama Schema Structurer (Strict zero-hallucination guardrail)
4. Agent 4: Dataset Manager (User-named dataset persistence to SQLite)
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.agentic_core.agent1_web_scout import web_scout_agent
from app.agentic_core.agent2_web_scraper import web_scraper_agent
from app.agentic_core.agent3_ollama_structurer import ollama_structurer_agent
from app.agentic_core.agent4_dataset_manager import dataset_manager_agent

logger = logging.getLogger("lead_discovery_orchestrator")

class LeadDiscoveryOrchestrator:
    """Coordinates authentic, unfaked web scraping and lead generation."""

    def discover_and_extract(
        self,
        location: str,
        sector: str = "Manufacturing",
        target_count: int = 5
    ) -> Dict[str, Any]:
        """
        Runs Agent 1, Agent 2, and Agent 3. Returns the structured leads with metrics before saving.
        """
        logger.info(f"Starting Lead Discovery: Location='{location}', Sector='{sector}', Count={target_count}")

        # Step 1: Agent 1 - Discover real companies from Google Maps & Web
        candidates = web_scout_agent.search_candidates(
            location=location,
            sector=sector,
            target_count=target_count
        )

        structured_leads: List[Dict[str, Any]] = []

        # Step 2 & 3: For each candidate, scrape live pages and structure data
        for c in candidates:
            try:
                # Agent 2: Deep scrape website
                raw_data = web_scraper_agent.scrape_company_details(c)

                # Agent 3: Ollama intelligence verification & schema structuring
                verified_lead = ollama_structurer_agent.structure_and_audit(raw_data)
                
                # Add transparency metadata
                verified_lead["source_tools"] = ["Google Maps Scout", "Web Contact Scraper", "Ollama Structurer"]
                verified_lead["source_urls"] = [
                    u for u in [verified_lead.get("google_maps_url"), verified_lead.get("website")] if u
                ]
                verified_lead["retrieved_at"] = datetime.now().isoformat()
                
                structured_leads.append(verified_lead)
            except Exception as e:
                logger.error(f"Error processing lead '{c.get('name')}': {e}")

        # Summary statistics
        has_website_count = sum(1 for l in structured_leads if l.get("website"))
        has_phone_count = sum(1 for l in structured_leads if l.get("phone"))
        has_email_count = sum(1 for l in structured_leads if l.get("email"))

        return {
            "success": True,
            "location": location,
            "sector": sector,
            "requested_count": target_count,
            "found_count": len(structured_leads),
            "stats": {
                "has_website": has_website_count,
                "has_phone": has_phone_count,
                "has_email": has_email_count
            },
            "source_tools": ["google_maps_search", "web_search", "fetch_page", "ollama_structurer"],
            "leads": structured_leads
        }

    def save_dataset(
        self,
        dataset_name: str,
        leads: List[Dict[str, Any]],
        location: str
    ) -> Dict[str, Any]:
        """
        Runs Agent 4: Saves the verified leads under the requested dataset name.
        """
        return dataset_manager_agent.save_leads_to_dataset(
            dataset_name=dataset_name,
            leads=leads,
            location=location
        )

    def scrape_dataset_with_ollama(
        self,
        location: str,
        sector: str = "Manufacturing",
        query: Optional[str] = None,
        max_results: int = 5,
        dataset_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Autonomous discovery and optional direct persistence run.
        """
        effective_sector = query or sector or "Manufacturing"
        discovery_result = self.discover_and_extract(
            location=location,
            sector=effective_sector,
            target_count=max_results
        )

        leads = discovery_result.get("leads", [])
        if not leads:
            return {
                "success": False,
                "error": f"No active operational businesses found on Google Maps/Web index for location '{location}'.",
                "leads": [],
                "requested_count": max_results,
                "found_count": 0,
                "stats": {"has_website": 0, "has_phone": 0, "has_email": 0}
            }

        # If dataset_name is supplied, save immediately; otherwise return for preview and user naming
        saved_info = {}
        if dataset_name and dataset_name.strip():
            saved_info = self.save_dataset(
                dataset_name=dataset_name,
                leads=leads,
                location=location
            )

        return {
            "success": True,
            "dataset_name": dataset_name or f"{effective_sector} in {location}",
            "dataset_id": saved_info.get("dataset_id"),
            "total_extracted": len(leads),
            "requested_count": max_results,
            "found_count": len(leads),
            "stats": discovery_result.get("stats", {}),
            "source_tools": discovery_result.get("source_tools", []),
            "leads": leads,
            "is_saved": bool(dataset_name and dataset_name.strip())
        }

orchestrator = LeadDiscoveryOrchestrator()
