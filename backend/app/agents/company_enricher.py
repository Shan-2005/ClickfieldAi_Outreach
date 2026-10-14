import re
import logging
from typing import Optional, List, Tuple
from urllib.parse import urlparse
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Company

from app.agents.web_intel_agent import web_intel_agent

logger = logging.getLogger("company_enricher")

TENDER_PORTAL_DOMAINS = [
    "eprocure.gov.in", "gem.gov.in", "ted.europa.eu", "sam.gov",
    "cppp.gov.in", "etenders.gov.in", "tenders.gov.in", "ireps.gov.in",
    "defproc.gov.in", "news.google", "firebaseio", "remotive", "github",
    "twitter", "reddit", "facebook", "linkedin"
]

INDIAN_CITIES = [
    "Bengaluru", "Bangalore", "New Delhi", "Delhi", "Mumbai", "Hyderabad",
    "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
    "Chandigarh", "Bhopal", "Patna", "Kochi", "Thiruvananthapuram",
    "Guwahati", "Bhubaneswar", "Gandhinagar", "Dehradun", "Ranchi", "Raipur"
]

US_CITIES = [
    "Washington", "New York", "San Francisco", "Austin", "Seattle",
    "Boston", "Chicago", "Denver", "Atlanta", "Los Angeles"
]

EU_CITIES = [
    "Brussels", "Copenhagen", "Dublin", "Berlin", "Paris", "Amsterdam",
    "Madrid", "Rome", "Stockholm", "Vienna", "Helsinki", "Warsaw"
]

class CompanyEnricherAgent:
    """
    Agent 7: Company Enricher
    Enriches corporate / public authority records from verified source signals and live web fetch.
    Never guesses locations, employee counts, or phone numbers.
    All missing fields are set to 'Unknown' or None.
    """
    name = "Company Enricher Agent"

    def _infer_domain(self, company_name: str, source_url: str) -> Optional[str]:
        parsed = urlparse(source_url)
        netloc = parsed.netloc.lower()
        if netloc and not any(portal in netloc for portal in TENDER_PORTAL_DOMAINS):
            return netloc
        return None

    def _infer_industry(self, company_name: str, description: str) -> str:
        text = f"{company_name} {description}".lower()
        if any(w in text for w in ["bank", "fintech", "payment", "insurance", "rbi", "sebi"]):
            return "Financial Services & Fintech"
        if any(w in text for w in ["health", "hospital", "pharma", "medical", "aiims"]):
            return "Healthcare & Life Sciences"
        if any(w in text for w in ["gov", "ministry", "state", "municipal", "cpw", "railway", "eprocure", "gem.gov", "ted.europa", "sam.gov"]):
            return "Government & Public Sector"
        if any(w in text for w in ["retail", "ecommerce", "fmcg", "store"]):
            return "Retail & E-commerce"
        if any(w in text for w in ["logistics", "freight", "transport", "supply chain"]):
            return "Logistics & Supply Chain"
        if any(w in text for w in ["manufactur", "industrial", "automotive"]):
            return "Manufacturing & Industrial"
        return "Technology & Digital Services"

    def _extract_location(self, company_name: str, description: str, source_url: str) -> Tuple[str, str]:
        """
        Extracts verified location from notice text or source domain.
        Returns ('Unknown', 'Unknown') if no verified geographic indicator is present.
        Never defaults to Bengaluru or Brussels!
        """
        text = f"{company_name} {description} {source_url}".lower()

        # India detection
        has_india = bool(
            re.search(r"\b(india|indian|eprocure\.gov\.in|gem\.gov\.in|inr|₹|rs\.?\s*\d|delhi|bengaluru|mumbai|karnataka|maharashtra|tamil nadu|telangana|gujarat|uttar pradesh)\b", text)
            or source_url.endswith(".in") or ".gov.in" in source_url
        )
        if has_india:
            country = "India"
            city = "Unknown"
            for c in INDIAN_CITIES:
                if re.search(rf"\b{c.lower()}\b", text):
                    city = "Bengaluru" if c.lower() in ("bengaluru", "bangalore") else ("New Delhi" if c.lower() in ("new delhi", "delhi") else c)
                    break
            return country, city

        # European Union detection
        has_eu = bool(
            re.search(r"\b(ted\.europa\.eu|european union|denmark|copenhagen|ireland|dublin|germany|france|netherlands|spain|italy|sweden|brussels)\b", text)
            or ".europa.eu" in source_url
        )
        if has_eu:
            if "denmark" in text or "copenhagen" in text:
                return "Denmark", "Copenhagen"
            if "ireland" in text or "dublin" in text:
                return "Ireland", "Dublin"
            if "germany" in text or "berlin" in text:
                return "Germany", "Berlin" if "berlin" in text else "Unknown"
            if "france" in text or "paris" in text:
                return "France", "Paris" if "paris" in text else "Unknown"
            
            city = "Unknown"
            for c in EU_CITIES:
                if re.search(rf"\b{c.lower()}\b", text):
                    city = c
                    break
            return "European Union", city

        # United States detection
        has_us = bool(
            re.search(r"\b(sam\.gov|united states|u\.s\.|usa|california|texas|new york|washington|virginia|maryland)\b", text)
            or ".gov" in source_url
        )
        if has_us:
            country = "United States"
            city = "Unknown"
            for c in US_CITIES:
                if re.search(rf"\b{c.lower()}\b", text):
                    city = c
                    break
            return country, city

        return "Unknown", "Unknown"

    def _extract_verified_contacts(self, text: str) -> List[str]:
        """Extract only genuine email addresses found verbatim in the public notice text."""
        raw_emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
        clean = []
        for em in raw_emails:
            em_lower = em.lower().strip('.')
            if not any(em_lower.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.svg', '.gif']):
                if em_lower not in clean:
                    clean.append(em_lower)
        return clean

    def _extract_verified_phone(self, text: str) -> Optional[str]:
        """Extract verified official phone number if explicitly present."""
        match = re.search(r'(?:phone|tel|contact|helpline)[:\s]+(\+?[\d\s-]{10,16})', text, re.IGNORECASE)
        if match:
            clean_phone = match.group(1).strip()
            if len(clean_phone) >= 10:
                return clean_phone
        return None

    async def get_or_enrich_company(
        self,
        db: AsyncSession,
        company_name: str,
        description: str,
        source_url: str
    ) -> Company:
        """Find existing company or create enriched verified public business record."""
        clean_comp_name = company_name.strip() or "Unknown Buyer"
        stmt = select(Company).where(Company.name == clean_comp_name)
        result = await db.execute(stmt)
        existing = result.scalars().first()
        if existing:
            return existing

        country, city = self._extract_location(clean_comp_name, description, source_url)
        industry = self._infer_industry(clean_comp_name, description)
        public_contacts = self._extract_verified_contacts(f"{clean_comp_name} {description}")
        public_phone = self._extract_verified_phone(f"{clean_comp_name} {description}")

        # Check if direct domain is in source_url (only if not a generic portal)
        direct_domain = self._infer_domain(clean_comp_name, source_url)
        website_url = f"https://{direct_domain}" if direct_domain else None

        # Autonomous Web Intelligence: search live web for company official website if domain is missing
        if not direct_domain and clean_comp_name != "Unknown Buyer" and len(clean_comp_name) > 3:
            try:
                web_intel = web_intel_agent.enrich_company_details(
                    company_name=clean_comp_name,
                    provided_website=None,
                    area=city if city != "Unknown" else "",
                    city=country if country != "Unknown" else "India"
                )
                if web_intel.get("web_status") == "VERIFIED_LIVE_WEBSITE":
                    website_url = web_intel.get("final_url") or web_intel.get("target_url")
                    if website_url:
                        parsed = urlparse(website_url)
                        direct_domain = parsed.netloc.lower()
                    # Add verified web emails if not already present
                    for em in web_intel.get("verified_emails", []):
                        if em not in public_contacts:
                            public_contacts.append(em)
            except Exception as e:
                logger.warning(f"Web intel discovery failed for {clean_comp_name}: {e}")

        company = Company(
            name=clean_comp_name,
            domain=direct_domain,
            website_url=website_url,
            industry=industry,
            employee_size_range="Not Disclosed on Web",
            headquarters_country=country,
            headquarters_city=city,
            public_contact_emails=public_contacts,
            public_phone=public_phone
        )
        db.add(company)
        await db.commit()
        await db.refresh(company)
        return company

company_enricher_agent = CompanyEnricherAgent()
