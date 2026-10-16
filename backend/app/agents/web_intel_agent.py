"""Web intel agent stub."""
class WebIntelAgent:
    def enrich_opportunity(self, opp):
        return {"status": "ok"}
    def search_company_web_footprint(self, name, area=None):
        return {"status": "ok", "url": None, "emails": []}
web_intel_agent = WebIntelAgent()
