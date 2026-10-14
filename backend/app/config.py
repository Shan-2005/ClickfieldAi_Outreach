import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "ClickfieldAI Opportunity Radar"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./radar.db")
    
    # LLM Settings (Optional Claude / Anthropic API Key)
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")
    
    # Clickfield Capabilities for Fit Scoring
    CLICKFIELD_COMPANY_NAME: str = "ClickfieldAI"
    CLICKFIELD_WEBSITE: str = "https://clickfield.ai"
    CLICKFIELD_CORE_CAPABILITIES: List[str] = [
        "Generative AI & Enterprise LLMs",
        "Agentic Automation & RPA Workflows",
        "Data Engineering, ETL & Real-time Analytics",
        "High-performance Web & Mobile Platforms",
        "Embedded Systems, IoT & Edge Computing",
        "Enterprise ERP, CRM & Legacy Cloud Integrations"
    ]
    
    # Compliance & Crawling Settings
    USER_AGENT: str = "ClickfieldRadarBot/1.0 (+https://clickfield.ai/bot-policy; compliance@clickfield.ai)"
    RATE_LIMIT_DELAY_SECONDS: float = 2.0
    REQUEST_TIMEOUT_SECONDS: int = 20
    MAX_RETRIES: int = 3
    
    # Target Regions (India first, then Global)
    PRIMARY_REGION: str = "India"
    SECONDARY_REGIONS: List[str] = ["Global", "US", "Europe", "APAC"]

    # Outreach Sender & Compliance Identity
    SENDER_FIRST_NAME: str = os.getenv("SENDER_FIRST_NAME", "Zoya")
    SENDER_FULL_NAME: str = os.getenv("SENDER_FULL_NAME", "Zoya Patel")
    SENDER_ROLE: str = os.getenv("SENDER_ROLE", "Technical Solutions & Engineering Lead")
    COMPANY_REGISTERED_ADDRESS: str = os.getenv(
        "COMPANY_REGISTERED_ADDRESS",
        "Clickfield Technologies Pvt. Ltd., Level 4, Prestige Tech Park, Marathahalli-Sarjapur Ring Rd, Bengaluru, KA 560103, India"
    )
    COMPLIANCE_EMAIL: str = os.getenv("COMPLIANCE_EMAIL", "compliance@clickfield.ai")

    # Approved Capabilities (strict grounding: only cite capabilities in this approved list)
    APPROVED_CAPABILITIES: dict = {
        "GENAI": "custom LLM extraction pipelines, local embeddings, and bounded validation loops",
        "AUTOMATION_RPA": "agentic document processing, headless automation, and verified workflow orchestrators",
        "DATA_ENGINEERING": "real-time telemetry streaming, high-throughput event queues, and deterministic ETL pipelines",
        "ERP_INTEGRATION": "idempotent API gateways and bidirectional synchronization between legacy ERP backends and modern web platforms",
        "EMBEDDED_IOT": "edge telemetry ingestion, automated anomaly detection, and municipal-grade LoRaWAN/MQTT middleware",
        "WEB_MOBILE": "high-performance reactive web platforms, resilient offline-first mobile apps, and distributed microservices",
        "ML_DATA_SCIENCE": "production scoring services, predictive model pipelines, and tabular feature store architectures"
    }

    # Approved Proof Points / Metrics (strict grounding: no invented statistics or case studies)
    # Operators can populate verified metrics here (e.g. "Processed 12M events/day with 99.98% uptime")
    APPROVED_PROOF_POINTS: List[str] = []

    # Editable Banned Phrases List (never permitted in generated outreach drafts)
    BANNED_PHRASES: List[str] = [
        "consistently hits",
        "costly roadblock",
        "same bottleneck",
        "schema drag",
        "schema drift",
        "data drag",
        "friction point",
        "Should I send over a quick overview, or would you like more details first?"
    ]

    # --- LOCAL LEADS MODULE (CHENNAI SCOPE) ---
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    LOCAL_LEADS_MONTHLY_BUDGET_USD: float = float(os.getenv("LOCAL_LEADS_MONTHLY_BUDGET_USD", "25.0"))
    LOCAL_LEADS_SPEND_LIMIT_PER_RUN_USD: float = float(os.getenv("LOCAL_LEADS_SPEND_LIMIT_PER_RUN_USD", "5.0"))
    LOCAL_LEADS_CURRENT_SPEND_USD: float = 0.0

    LOCAL_LEADS_CENTER_LAT: float = 13.0827
    LOCAL_LEADS_CENTER_LNG: float = 80.2707
    LOCAL_LEADS_RADIUS_KM: float = 60.0

    # Chennai & ~60 km Industrial Corridor Hubs (Editable via Settings)
    LOCAL_LEADS_HUBS: dict = {
        "Ambattur": {"lat": 13.1143, "lng": 80.1481, "type": "Industrial Estate", "priority": 1.0},
        "Guindy": {"lat": 13.0067, "lng": 80.2024, "type": "Industrial Estate", "priority": 1.0},
        "Sriperumbudur": {"lat": 12.9675, "lng": 79.9439, "type": "Auto & Electronics SIPCOT", "priority": 0.95},
        "Oragadam": {"lat": 12.8342, "lng": 79.9547, "type": "Automotive Corridor", "priority": 0.95},
        "Maraimalai Nagar": {"lat": 12.7955, "lng": 80.0242, "type": "Automotive & Engineering", "priority": 0.90},
        "Gummidipoondi": {"lat": 13.4072, "lng": 80.1256, "type": "Heavy Fabrication & Plastics", "priority": 0.85},
        "Ennore": {"lat": 13.2163, "lng": 80.3228, "type": "Port & Energy Logistics", "priority": 0.85},
        "Tambaram": {"lat": 12.9249, "lng": 80.1488, "type": "Engineering & MEP", "priority": 0.90},
        "OMR/ECR": {"lat": 12.8996, "lng": 80.2209, "type": "Tech Parks & Real Estate", "priority": 0.95},
        "Chengalpattu": {"lat": 12.6841, "lng": 79.9836, "type": "Pharma & Township Hub", "priority": 0.80},
        "Kanchipuram": {"lat": 12.8342, "lng": 79.7036, "type": "Machinery & Textiles", "priority": 0.80},
        "Tiruvallur": {"lat": 13.1432, "lng": 79.9079, "type": "Heavy Machinery & Logistics", "priority": 0.80}
    }

    # Editable Target Industries & Search Terms
    LOCAL_INDUSTRIES: dict = {
        "Manufacturing": [
            "auto components", "electronics EMS", "machinery", "fabrication", 
            "plastics", "textiles", "FMCG", "pharma units", "packaging"
        ],
        "Construction": [
            "contractors", "civil MEP", "infrastructure", "builders", "PEB pre-engineered buildings"
        ],
        "Real estate": [
            "developers", "brokers", "property management", "township projects"
        ]
    }

    # Industry-specific Outreach Strategy (Grounding & Friction)
    INDUSTRY_OUTREACH_ANGLES: dict = {
        "Manufacturing": {
            "focus": "shop-floor data, ERP/MES integration, and predictive quality analytics",
            "friction": "When connecting legacy CNC/PLC machinery with central ERP systems, handling intermittent line disconnects and cycle-time latency usually causes data gaps.",
            "capability": "custom shop-floor telemetry ingestion buffers and bidirectional ERP synchronization gateways"
        },
        "Construction": {
            "focus": "project milestone tracking, contractor site telemetry, material reconciliation, and document automation",
            "friction": "Site supervisors managing distributed civil packages often face delayed invoice approvals and discrepancy in subcontractor material reconciliation.",
            "capability": "automated site measurement verification workflows and digital drawing document extraction pipelines"
        },
        "Real estate": {
            "focus": "lead triage automation, WhatsApp CRM routing, broker attribution, and property portfolio analytics",
            "friction": "Property developers running multi-portal campaigns frequently lose high-intent site-visit inquiries to slow follow-up times and duplicate lead routing.",
            "capability": "event-driven lead triage queues, automated WhatsApp appointment routing, and ERP inventory integration"
        }
    }

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()


