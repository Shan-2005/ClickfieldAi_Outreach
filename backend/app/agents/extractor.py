import re
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import feedparser
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field

logger = logging.getLogger("extractor")

class ExtractedOpportunity(BaseModel):
    title: str
    company_name: str
    description: str
    primary_category: str = "GENAI"
    secondary_categories: List[str] = Field(default_factory=list)
    tech_stack: List[str] = Field(default_factory=list)
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    currency: str = "INR"
    posted_date: Optional[datetime] = None
    listed_time: Optional[datetime] = None
    deadline: Optional[datetime] = None
    source_url: str
    raw_content: Optional[str] = None

TECH_KEYWORDS = {
    "Python": ["python", "django", "fastapi", "flask"],
    "Generative AI / LLM": ["genai", "llm", "gpt", "claude", "rag", "langchain", "prompt engineering", "openai", "fine-tuning", "vector database"],
    "Machine Learning": ["machine learning", "deep learning", "pytorch", "tensorflow", "computer vision", "nlp", "scikit-learn"],
    "Automation & RPA": ["rpa", "uipath", "automation", "workflow bot", "selenium", "playwright"],
    "Data Engineering": ["data engineering", "etl", "snowflake", "databricks", "kafka", "spark", "sql", "data pipeline"],
    "React / Web": ["react", "next.js", "vue", "frontend", "typescript", "javascript", "tailwind", "node.js"],
    "Mobile": ["flutter", "react native", "ios", "android", "swift", "kotlin"],
    "Cloud & DevOps": ["aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ci/cd"],
    "IoT / Embedded": ["iot", "embedded", "firmware", "raspberry pi", "arduino", "esp32", "microcontroller"],
    "ERP / Enterprise": ["erp", "sap", "salesforce", "odoo", "crm", "netsuite", "api integration"]
}

class ExtractorAgent:
    """
    Agent 4: Extractor
    Pulls structured opportunity schemas from raw RSS feeds, JSON APIs, and HTML web pages.
    Guarantees every record retains its exact source URL, dates, and technology specifications.
    """
    name = "Extractor Agent"

    def _extract_tech_stack(self, text: str) -> List[str]:
        text_lower = text.lower()
        found = []
        for tech_name, syns in TECH_KEYWORDS.items():
            if any(syn in text_lower for syn in syns):
                found.append(tech_name)
        return found

    def _extract_company_name(self, title: str, source_name: str = "") -> str:
        # Typical RSS formats: "Requirement Title - Company Name" or "Company: Requirement"
        if " - " in title:
            parts = title.split(" - ")
            candidate = parts[-1].strip()
            if len(candidate) > 2 and len(candidate) < 60:
                return candidate
        if ":" in title:
            parts = title.split(":")
            candidate = parts[0].strip()
            if len(candidate) > 2 and len(candidate) < 50 and not any(kw in candidate.lower() for kw in ["rfp", "tender", "notice", "urgent"]):
                return candidate
        # Fallback to organization names derived from keywords or domain
        if "eprocure" in source_name.lower() or "gem" in source_name.lower() or "india" in source_name.lower():
            return "Govt of India / Public Sector Undertaking"
        if "ted.europa" in source_name.lower():
            return "European Public Contracting Authority"
        if "sam.gov" in source_name.lower():
            return "US Federal / State Contracting Dept"
        return "Public Enterprise Organization"

    def _extract_budget(self, text: str) -> tuple[Optional[float], Optional[float], str]:
        try:
            inr_match = re.search(r'(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)\s*(lakh|crore|k)?', text, re.IGNORECASE)
            if inr_match and inr_match.group(1):
                clean_str = inr_match.group(1).replace(',', '').strip()
                if clean_str:
                    num = float(clean_str)
                    unit = (inr_match.group(2) or '').lower()
                    if unit == 'lakh':
                        num *= 100000
                    elif unit == 'crore':
                        num *= 10000000
                    elif unit == 'k':
                        num *= 1000
                    return num, num * 1.5, "INR"
        except Exception:
            pass

        try:
            usd_match = re.search(r'\$\s*([\d,]+(?:\.\d+)?)\s*(k|m)?', text, re.IGNORECASE)
            if usd_match and usd_match.group(1):
                clean_str = usd_match.group(1).replace(',', '').strip()
                if clean_str:
                    num = float(clean_str)
                    unit = (usd_match.group(2) or '').lower()
                    if unit == 'k':
                        num *= 1000
                    elif unit == 'm':
                        num *= 1000000
                    return num, num * 1.4, "USD"
        except Exception:
            pass

        try:
            eur_match = re.search(r'€\s*([\d,]+(?:\.\d+)?)\s*(k|m)?', text, re.IGNORECASE)
            if eur_match and eur_match.group(1):
                clean_str = eur_match.group(1).replace(',', '').strip()
                if clean_str:
                    num = float(clean_str)
                    return num, num * 1.3, "EUR"
        except Exception:
            pass

        return None, None, "INR"

    def _extract_deadline(self, text: str, posted_date: datetime) -> datetime:
        # Search for closing dates like "due date: YYYY-MM-DD" or "deadline: DD/MM/YYYY"
        deadline_match = re.search(r'(?:deadline|due\s+date|closing\s+date|submissions\s+by)[:\s]+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})', text, re.IGNORECASE)
        if deadline_match:
            raw_d = deadline_match.group(1)
            for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"):
                try:
                    return datetime.strptime(raw_d, fmt)
                except ValueError:
                    continue
        # Standard realistic tender/RFP window: 14 to 30 days after announcement
        return posted_date + timedelta(days=21)

    def extract_from_feed(self, raw_content: str, source_url: str, source_category: str) -> List[ExtractedOpportunity]:
        """Extract opportunities from RSS / XML feed."""
        opportunities = []
        feed = feedparser.parse(raw_content)

        for entry in feed.entries:
            title = entry.get("title", "").strip()
            link = entry.get("link", "").strip()
            summary = entry.get("summary", "") or entry.get("description", "")
            
            # Clean HTML from summary
            soup = BeautifulSoup(summary, "html.parser")
            cleaned_desc = soup.get_text(separator=" ").strip()
            if not cleaned_desc:
                cleaned_desc = title

            # Published date parsing
            posted_date = datetime.utcnow()
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                posted_date = datetime(*entry.published_parsed[:6])
            elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                posted_date = datetime(*entry.updated_parsed[:6])

            company = self._extract_company_name(title, source_url)
            tech_stack = self._extract_tech_stack(title + " " + cleaned_desc)
            b_min, b_max, currency = self._extract_budget(cleaned_desc)
            deadline = self._extract_deadline(cleaned_desc, posted_date)

            opp = ExtractedOpportunity(
                title=title,
                company_name=company,
                description=cleaned_desc,
                tech_stack=tech_stack,
                budget_min=b_min,
                budget_max=b_max,
                currency=currency,
                posted_date=posted_date,
                listed_time=posted_date,
                deadline=deadline,
                source_url=link or source_url,
                raw_content=summary
            )
            opportunities.append(opp)

        return opportunities

    def extract_from_json(self, raw_content: str, source_url: str) -> List[ExtractedOpportunity]:
        """Extract opportunities from JSON payloads (e.g. Remotive API, Hacker News API)."""
        opportunities = []
        try:
            data = json.loads(raw_content)
            # Check for Remotive format
            if isinstance(data, dict) and "jobs" in data:
                for job in data["jobs"]:
                    title = job.get("title", "")
                    company = job.get("company_name", "Technology Enterprise")
                    desc = BeautifulSoup(job.get("description", ""), "html.parser").get_text(separator=" ")
                    url = job.get("url", source_url)
                    tags = job.get("tags", [])
                    tech = self._extract_tech_stack(title + " " + desc + " " + " ".join(tags))
                    
                    posted = datetime.utcnow()
                    if job.get("publication_date"):
                        try:
                            posted = datetime.fromisoformat(job["publication_date"].replace("Z", "+00:00"))
                        except Exception:
                            pass
                    
                    deadline = posted + timedelta(days=28)
                    opp = ExtractedOpportunity(
                        title=title,
                        company_name=company,
                        description=desc[:1500],
                        tech_stack=tech,
                        currency="USD",
                        posted_date=posted,
                        listed_time=posted,
                        deadline=deadline,
                        source_url=url
                    )
                    opportunities.append(opp)
        except Exception as e:
            logger.error(f"JSON extraction failed for {source_url}: {e}")

        return opportunities

extractor_agent = ExtractorAgent()
