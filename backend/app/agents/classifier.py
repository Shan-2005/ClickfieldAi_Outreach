import re
import logging
from typing import Tuple, List, Optional
from pydantic import BaseModel

logger = logging.getLogger("classifier")

# Acceptable content types vs rejected types
ACCEPTED_CONTENT_TYPES = {"Tender/RFP", "EOI", "Vendor-call", "Project-post"}
REJECTED_CONTENT_TYPES = {"News", "Press-release", "Blog/Listicle", "Product-page", "Job", "Other"}

class ClassificationResult(BaseModel):
    is_b2b_project: bool
    content_type: str = "Tender/RFP" # Tender/RFP | EOI | Vendor-call | Project-post | News | Press-release | Blog/Listicle | Product-page | Job | Other
    opportunity_type: str = "Project-post" # RFP | Tender | EOI | Vendor-call | Project-post | Partnership
    is_job_posting: bool = False
    primary_category: str = "WEB_MOBILE"
    secondary_categories: List[str] = []
    confidence: int = 85 # 0-100 (< 70 -> Needs Review queue)
    has_named_buyer: bool = True
    has_deliverable: bool = True
    has_submission_method_or_deadline: bool = True
    rejection_reason: Optional[str] = None

# Hard-rejection employment patterns
JOB_POSTING_PATTERNS = [
    r"\b(we are hiring|we're hiring|now hiring|hiring for|job vacancy|job opening|vacancies|job description)\b",
    r"\b(apply with (your )?(resume|cv)|submit (your )?(resume|cv)|send (your )?(resume|cv)|attach (your )?(resume|cv))\b",
    r"\b(salary|ctc|lpa|compensation package|per annum|per month|stipend|health benefits|401k|paid time off|pto)\b",
    r"\b(full[- ]?time|part[- ]?time|internship|interns?|walk[- ]?in|on[- ]?roll|payroll|notice period|probation period|work from home job)\b",
    r"\b(\d+\+?\s*(years?|yrs?)\s*(of\s*)?experience|min(imum)?\s*\d+\s*(years?|yrs?))\b",
    r"\b(staff augmentation|contract (developer|engineer|programmer) needed for \d+|temporary staffing)\b",
    r"\b(looking for a (developer|engineer|coder|architect) to join (our|my) team|join our growing team|as an employee)\b",
    r"\b(recruitment agency|staffing agency|placement consultant|talent acquisition|recruiter)\b",
    r"\b(i am a (freelance|developer|designer|engineer)|i can build your|hire me|my portfolio)\b",
    r"\b(equal opportunity employer|eoe|visa sponsorship|w2|1099 candidate|candidate profile)\b",
    r"\b(remote jobs?|job alert|apply now for this role)\b"
]

# Blog / Listicle / Tutorial Patterns
BLOG_LISTICLE_PATTERNS = [
    r"\b(\d+\s+best\b|\d+\s+top\b|top\s+\d+|best\s+\d+)\b",
    r"\b(how to respond|how to write|how to submit|how to win|tips for|guide to|ultimate guide|tutorial|walkthrough)\b",
    r"\b(learning hub|review\b|product review|software review|vs\b|versus\b|comparison\b|alternatives to)\b"
]

# Press Release / Vendor Product Launch Patterns
PRESS_RELEASE_PATTERNS = [
    r"\b(launches|unveils|announces|introduces|releases new|partners with|expands into|raises \$|secures \$|series [abc]|funding round)\b",
    r"\b(press release|pr newswire|business wire|globenewswire|marketwired)\b",
    r"\b(subscription platform|turning thousands of|launches rfp automation|boosted win rates at)\b",
    r"\b(hires\s+[a-z']+\s+cumming|appoints\s+new|names\s+new\s+(ceo|cto|cfo|vp|director|president))\b"
]

# News / Journalism / Policy Patterns
NEWS_PATTERNS = [
    r"\b(inside the deal|takes over|to take over|cuts chip timelines|steps up ai regulation|regulation push|consultation paper)\b",
    r"\b(court refuses|court allows|court rules|high court|supreme court|legal battle|debarred contractor)\b",
    r"\b(says ceo|says director|interview with|opinion:|analysis:|exclusive:|news:|wire:)\b",
    r"\b(the economic times|financial express|livemint|reuters|bloomberg|techcrunch|venturebeat)\b"
]

# Product Catalog Page Patterns (e.g. GeM product catalog)
PRODUCT_PAGE_PATTERNS = [
    r"\b(antivirus software|accounting software(\s*\(v\d+\))?|operating system|ms office)\b",
    r"\b(catalog page|product category|product details|buy online|add to cart|sku:\s*\d+|price per unit)\b"
]

# Non-software / Civil / Physical Infrastructure Exclusions
PHYSICAL_INFRA_PATTERNS = [
    r"\b(bess epc|solar park|solar project|700 mw|3\.3gwh|ists solar|battery energy storage)\b",
    r"\b(civil construction|road construction|pipeline construction|building construction|drainage|bridge)\b",
    r"\b(arabica coffee|coffee value chain|agricultural survey|crop insurance)\b",
    r"\b(catering|canteen|security guard|housekeeping|sanitation|cleaning|printing paper|stationery|furniture|vehicle hiring)\b"
]

# Known non-opportunity publisher domains / names
NON_BUYER_DOMAINS_AND_NAMES = [
    "g2", "g2 learning hub", "govcon wire", "the economic times", "economic times",
    "financial express", "livemint", "reuters", "bloomberg", "solarbytes",
    "btn business travel news", "fundsforngos", "mordor intelligence", "transfix",
    "pr newswire", "business wire", "globenewswire"
]

# Tech Domains
AI_KEYWORDS = ["artificial intelligence", "ai", "genai", "generative ai", "llm", "large language model", "machine learning", "deep learning", "nlp", "computer vision", "rag", "neural"]
AUTOMATION_KEYWORDS = ["automation", "rpa", "robotic process automation", "bot", "workflow automation", "scraper"]
DATA_KEYWORDS = ["data engineering", "etl", "data pipeline", "data warehouse", "lakehouse", "snowflake", "databricks", "kafka", "spark"]
WEB_MOBILE_KEYWORDS = ["software development", "web development", "mobile application", "app development", "frontend", "backend", "full stack", "react", "flutter", "fastapi", "portal", "website development", "platform"]
EMBEDDED_KEYWORDS = ["iot", "embedded systems", "firmware", "edge computing", "sensor", "telemetry", "scada"]
ERP_KEYWORDS = ["erp", "sap", "crm", "salesforce", "oracle", "integration", "api gateway", "digital transformation", "system integration"]

# Opportunity Type Patterns
TENDER_PATTERNS = [r"\b(tender|notice inviting tender|nit|bid submission|gem bid|gem\.gov|eprocure|procurement notice|bid document)\b"]
RFP_PATTERNS = [r"\b(request for proposal|rfp|call for proposals|proposal due|bids invited)\b"]
EOI_PATTERNS = [r"\b(expression of interest|eoi|request for information|rfi|empanelment of (vendors|agencies|firms))\b"]
VENDOR_CALL_PATTERNS = [r"\b(vendor call|vendor solicitation|invitation to vendor|vendor registration|seeking agency|seeking vendor)\b"]
PARTNERSHIP_PATTERNS = [r"\b(technology partner|implementation partner|solution partner|consortium)\b"]

class ClassifierAgent:
    """
    Agent 5: B2B Opportunity Classifier & Content-Type Gatekeeper
    Accepts ONLY: Tender/RFP, EOI, Vendor-call, Project-post.
    Rejects & Logs: News, Press-release, Blog/Listicle, Product-page, Job, Other.
    Strictly verifies: Named Buyer, Technical Deliverable, and Submission Method / Deadline.
    """
    name = "Classifier Agent"

    def detect_opportunity_type(self, text: str) -> str:
        text_lower = text.lower()
        for pat in TENDER_PATTERNS:
            if re.search(pat, text_lower):
                return "Tender"
        for pat in RFP_PATTERNS:
            if re.search(pat, text_lower):
                return "RFP"
        for pat in EOI_PATTERNS:
            if re.search(pat, text_lower):
                return "EOI"
        for pat in VENDOR_CALL_PATTERNS:
            if re.search(pat, text_lower):
                return "Vendor-call"
        for pat in PARTNERSHIP_PATTERNS:
            if re.search(pat, text_lower):
                return "Partnership"
        return "Project-post"

    def classify(
        self,
        title: str,
        description: str,
        tech_stack: List[str] = None,
        source_url: str = "",
        company_name: str = ""
    ) -> ClassificationResult:
        tech_stack = tech_stack or []
        full_text = f"{title} {description} {' '.join(tech_stack)} {source_url} {company_name}".lower()
        title_lower = title.lower().strip()
        comp_lower = company_name.lower().strip()

        # Step 1: Check for Job / Employment signals
        for pat in JOB_POSTING_PATTERNS:
            match = re.search(pat, full_text)
            if match:
                has_formal_tender = bool(re.search(r"\b(tender no|rfp ref|notice inviting tender|bid document)\b", full_text))
                if not has_formal_tender:
                    return ClassificationResult(
                        is_b2b_project=False,
                        content_type="Job",
                        opportunity_type="Job-posting",
                        is_job_posting=True,
                        confidence=99,
                        rejection_reason=f"Rejected Job/Employment signal: '{match.group(0)}' (individual hiring/staffing)"
                    )

        # Title check for pure individual job title
        has_b2b_override = bool(re.search(r"\b(tender|rfp|eoi|nit|turnkey|portal|system|contract for|vendor|agency|development of|implementation of|procurement|bids? invited)\b", title_lower))
        if not has_b2b_override and re.search(r"\b(developer|engineer|specialist|manager|trainer|consultant|architect|intern|programmer|coder)\b", title_lower):
            return ClassificationResult(
                is_b2b_project=False,
                content_type="Job",
                opportunity_type="Job-posting",
                is_job_posting=True,
                confidence=96,
                rejection_reason=f"Rejected: Title '{title}' denotes an individual employment position rather than a B2B deliverable"
            )

        # Step 2: Check for Blog / Listicle / Tutorial
        for pat in BLOG_LISTICLE_PATTERNS:
            match = re.search(pat, full_text)
            if match:
                return ClassificationResult(
                    is_b2b_project=False,
                    content_type="Blog/Listicle",
                    opportunity_type="Blog/Listicle",
                    confidence=95,
                    rejection_reason=f"Rejected Blog/Listicle content: matched '{match.group(0)}' (educational/marketing article)"
                )
        if any(b_dom in full_text for b_dom in ["g2.com", "g2 learning hub", "medium.com", "/learning-hub/", "how to respond to request for proposal in"]):
            return ClassificationResult(
                is_b2b_project=False,
                content_type="Blog/Listicle",
                opportunity_type="Blog/Listicle",
                confidence=96,
                rejection_reason="Rejected: Source is a review/listicle or tutorial site (G2/Learning Hub/How-to guide)"
            )

        # Step 3: Check for Product Launch / Vendor Announcements (Press-release)
        has_formal_procurement = bool(re.search(r"\b(tender|rfp|notice inviting tender|nit|bids invited|contract notice|request for proposal|bid submission)\b", full_text))
        for pat in PRESS_RELEASE_PATTERNS:
            match = re.search(pat, full_text)
            if match and not has_formal_procurement:
                # If a company is launching or announcing a product without tender scope, they are selling, not buying!
                return ClassificationResult(
                    is_b2b_project=False,
                    content_type="Press-release",
                    opportunity_type="Press-release",
                    confidence=94,
                    rejection_reason=f"Rejected Vendor Press-Release: matched '{match.group(0)}' (vendor selling product or corporate announcement)"
                )

        # Step 4: Check for News / Journalism / Regulatory Reporting
        for pat in NEWS_PATTERNS:
            match = re.search(pat, full_text)
            if match:
                return ClassificationResult(
                    is_b2b_project=False,
                    content_type="News",
                    opportunity_type="News",
                    confidence=93,
                    rejection_reason=f"Rejected News/Journalism: matched '{match.group(0)}' (editorial reporting, no buyer tender/RFP)"
                )

        # Check publisher names acting as sources
        if any(nb in comp_lower or nb in title_lower for nb in NON_BUYER_DOMAINS_AND_NAMES):
            return ClassificationResult(
                is_b2b_project=False,
                content_type="News",
                opportunity_type="News",
                confidence=92,
                rejection_reason=f"Rejected: Source/Publisher '{company_name or title}' is a news outlet, wire service, or market intelligence vendor"
            )

        # Step 5: Check for Product Catalog Page (GeM off-the-shelf software SKUs)
        for pat in PRODUCT_PAGE_PATTERNS:
            match = re.search(pat, full_text)
            if match and not any(tender_term in full_text for tender_term in ["bid document", "notice inviting tender", "custom development", "system integration"]):
                return ClassificationResult(
                    is_b2b_project=False,
                    content_type="Product-page",
                    opportunity_type="Product-page",
                    confidence=95,
                    rejection_reason=f"Rejected Product Catalog SKU: matched '{match.group(0)}' (commodity off-the-shelf software license catalog, not a custom project)"
                )

        # Step 6: Check for Physical Infrastructure / Non-Software Exclusions
        for pat in PHYSICAL_INFRA_PATTERNS:
            match = re.search(pat, full_text)
            if match:
                return ClassificationResult(
                    is_b2b_project=False,
                    content_type="Other",
                    opportunity_type="Non-Software",
                    confidence=95,
                    rejection_reason=f"Rejected Non-Software Sector: matched physical infrastructure '{match.group(0)}'"
                )

        # Step 7: Technical Domain Categorization
        categories = []
        if any(kw in full_text for kw in AI_KEYWORDS):
            categories.append("GENAI" if any(g in full_text for g in ["genai", "generative", "llm", "rag", "gpt"]) else "ML_DATA_SCIENCE")
        if any(kw in full_text for kw in AUTOMATION_KEYWORDS):
            categories.append("AUTOMATION_RPA")
        if any(kw in full_text for kw in DATA_KEYWORDS):
            categories.append("DATA_ENGINEERING")
        if any(kw in full_text for kw in WEB_MOBILE_KEYWORDS):
            categories.append("WEB_MOBILE")
        if any(kw in full_text for kw in EMBEDDED_KEYWORDS):
            categories.append("EMBEDDED_IOT")
        if any(kw in full_text for kw in ERP_KEYWORDS):
            categories.append("ERP_INTEGRATION")

        if not categories and tech_stack:
            categories.append("WEB_MOBILE")

        if not categories:
            if any(term in full_text for term in ["software", "application", "portal", "digital", "system", "turnkey", "platform", "information technology"]):
                categories.append("WEB_MOBILE")
            else:
                return ClassificationResult(
                    is_b2b_project=False,
                    content_type="Other",
                    opportunity_type="Non-Tech",
                    confidence=90,
                    rejection_reason="No AI, software, or digital system scope found in listing content"
                )

        primary = categories[0]
        secondary = categories[1:] if len(categories) > 1 else []
        opp_type = self.detect_opportunity_type(full_text)

        # Determine Content Type for B2B Project
        if opp_type in ("Tender", "RFP"):
            content_type = "Tender/RFP"
        elif opp_type == "EOI":
            content_type = "EOI"
        elif opp_type == "Vendor-call":
            content_type = "Vendor-call"
        else:
            content_type = "Project-post"

        # Step 8: Strict Acceptance Criteria for Active (NEW) vs Needs Review
        # 1. Named Buyer Organization
        has_named_buyer = bool(
            comp_lower and
            comp_lower not in ["unknown", "public enterprise organization", "enterprise", "technology enterprise"] and
            not any(nb in comp_lower for nb in NON_BUYER_DOMAINS_AND_NAMES)
        )

        # 2. Defined Deliverable
        has_deliverable = bool(
            re.search(r"\b(build|develop|implement|design|deliver|portal|application|custom software|system|automation|pipeline|integration|tender document|scope of work)\b", full_text)
        )

        # 3. Submission Method or Deadline
        has_submission_method_or_deadline = bool(
            re.search(r"\b(deadline|due date|closing date|submission|submissions by|eprocure|gem\.gov|ted\.europa|sam\.gov|bids? invited|proposal due)\b", full_text)
        )

        # Confidence calculation
        if has_named_buyer and has_deliverable and has_submission_method_or_deadline:
            confidence = 94 if content_type in ("Tender/RFP", "EOI") else 88
        else:
            # Route to Needs Review
            confidence = 65

        return ClassificationResult(
            is_b2b_project=True,
            content_type=content_type,
            opportunity_type=opp_type,
            primary_category=primary,
            secondary_categories=secondary,
            confidence=confidence,
            has_named_buyer=has_named_buyer,
            has_deliverable=has_deliverable,
            has_submission_method_or_deadline=has_submission_method_or_deadline,
            rejection_reason=None
        )

    def predict_lead_sector_ml(self, text: str) -> Tuple[str, float]:
        """
        Uses trained scikit-learn Logistic Regression + TF-IDF model
        to classify company sector and return model confidence.
        """
        import os
        import joblib
        import numpy as np
        models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_models")
        try:
            vect = joblib.load(os.path.join(models_dir, "sector_vectorizer.joblib"))
            clf = joblib.load(os.path.join(models_dir, "sector_classifier.joblib"))
            X = vect.transform([text])
            pred = clf.predict(X)[0]
            conf = float(np.max(clf.predict_proba(X)[0]))
            return pred, conf
        except Exception:
            return "Manufacturing", 0.5

classifier_agent = ClassifierAgent()
