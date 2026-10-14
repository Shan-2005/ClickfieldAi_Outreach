import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, Date, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def gen_uuid():
    return str(uuid.uuid4())

class Source(Base):
    __tablename__ = "sources"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False) # GOV_TENDER, FREELANCE_BOARD, RFP_PORTAL, TECH_NEWS
    base_url = Column(Text, nullable=False)
    crawl_frequency = Column(String(50), default="HOURLY")
    is_active = Column(Boolean, default=True)
    robots_txt_status = Column(String(50), default="ALLOWED")
    rate_limit_delay_seconds = Column(Float, default=2.0)
    yield_score = Column(Float, default=1.0)
    last_crawled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    raw_crawls = relationship("RawCrawl", back_populates="source", cascade="all, delete-orphan")
    opportunities = relationship("Opportunity", back_populates="source")

class RawCrawl(Base):
    __tablename__ = "raw_crawls"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=True)
    target_url = Column(Text, nullable=False)
    status_code = Column(Integer, nullable=False)
    content_hash = Column(String(64), index=True)
    raw_content = Column(Text, nullable=True)
    fetched_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source", back_populates="raw_crawls")

class Company(Base):
    __tablename__ = "companies"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False, index=True)
    domain = Column(String(255), nullable=True, index=True)
    website_url = Column(Text, nullable=True)
    industry = Column(String(150), nullable=True)
    employee_size_range = Column(String(50), nullable=True)
    headquarters_country = Column(String(100), default="India")
    headquarters_city = Column(String(100), nullable=True)
    public_contact_emails = Column(JSON, default=list) # e.g. ["procurement@acme.com", "tenders@acme.com"]
    public_phone = Column(String(50), nullable=True)
    is_suppressed = Column(Boolean, default=False)
    enriched_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    opportunities = relationship("Opportunity", back_populates="company")

class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=True)
    raw_crawl_id = Column(String(36), ForeignKey("raw_crawls.id"), nullable=True)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=True)
    
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    content_type = Column(String(50), default="Tender/RFP", index=True) # Tender/RFP, EOI, Vendor-call, Project-post, News, Press-release, Blog/Listicle, Product-page, Job, Other
    opportunity_type = Column(String(50), default="Project-post") # RFP, Tender, EOI, Vendor-call, Project-post, Partnership
    buyer_type = Column(String(50), default="Government", index=True) # Government, Public-sector, Private company, NGO/UN, University, Unknown
    reference_number = Column(String(100), nullable=True)
    primary_category = Column(String(100), nullable=False, index=True) # GENAI, ML_DATA_SCIENCE, AUTOMATION_RPA, DATA_ENGINEERING, WEB_MOBILE, EMBEDDED_IOT, ERP_INTEGRATION
    secondary_categories = Column(JSON, default=list)
    tech_stack = Column(JSON, default=list)
    
    budget_min = Column(Float, nullable=True)
    budget_max = Column(Float, nullable=True)
    currency = Column(String(10), default="INR")
    
    posted_date = Column(Date, nullable=True)
    listed_time = Column(DateTime, nullable=True)
    deadline = Column(DateTime, nullable=True, index=True)
    is_expired = Column(Boolean, default=False, index=True)
    
    source_url = Column(Text, nullable=False)
    status = Column(String(50), default="NEW", index=True) # NEW, REVIEWED, CONTACTED, REPLIED, PROPOSAL, WON, LOST, REJECTED, NEEDS_REVIEW
    confidence = Column(Integer, default=90) # 0-100
    is_job_posting = Column(Boolean, default=False)
    rejection_reason = Column(Text, nullable=True)
    is_saved = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    dedup_hash = Column(String(64), index=True)
    is_verified = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    source = relationship("Source", back_populates="opportunities")
    company = relationship("Company", back_populates="opportunities")
    fit_evaluation = relationship("FitEvaluation", back_populates="opportunity", uselist=False, cascade="all, delete-orphan")
    outreach_drafts = relationship("OutreachDraft", back_populates="opportunity", cascade="all, delete-orphan")

class RejectedOpportunity(Base):
    __tablename__ = "rejected_opportunities"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    title = Column(String(500), nullable=False)
    company_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    source_url = Column(Text, nullable=False)
    content_type = Column(String(50), default="Other") # News, Press-release, Blog/Listicle, Product-page, Job, Other
    opportunity_type = Column(String(50), default="Job-posting")
    rejection_reason = Column(Text, nullable=False)
    rejected_at = Column(DateTime, default=datetime.utcnow)

class FitEvaluation(Base):
    __tablename__ = "fit_evaluations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    opportunity_id = Column(String(36), ForeignKey("opportunities.id"), unique=True)
    
    total_score = Column(Integer, default=0, index=True) # 0-100
    service_fit_score = Column(Integer, default=0)
    budget_fit_score = Column(Integer, default=0)
    region_fit_score = Column(Integer, default=0)
    urgency_score = Column(Integer, default=0)
    penalty_score = Column(Integer, default=0)
    
    score_reasoning = Column(Text, nullable=False)
    scored_by_model = Column(String(100), default="Clickfield-Scorer-v1")
    scored_at = Column(DateTime, default=datetime.utcnow)

    opportunity = relationship("Opportunity", back_populates="fit_evaluation")

class OutreachDraft(Base):
    __tablename__ = "outreach_drafts"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    opportunity_id = Column(String(36), ForeignKey("opportunities.id"))
    
    recipient_email = Column(String(255), nullable=False)
    recipient_name = Column(String(255), nullable=True)
    subject = Column(String(300), nullable=False)
    email_body_markdown = Column(Text, nullable=False)
    proposed_solution_summary = Column(Text, nullable=True)
    
    # Phase 3 upgrades
    draft_mode = Column(String(50), default="FORMAL_TENDER") # PRIVATE_B2B, FORMAL_TENDER
    subject_options = Column(JSON, default=list)
    selected_subject_index = Column(Integer, default=0)
    source_facts = Column(JSON, default=dict) # Grounding trace
    has_ungrounded_claims = Column(Boolean, default=False)
    ungrounded_warning = Column(Text, nullable=True)
    can_send = Column(Boolean, default=True)
    word_count = Column(Integer, default=0)
    follow_up_day4 = Column(Text, nullable=True)
    follow_up_day9 = Column(Text, nullable=True)
    original_body = Column(Text, nullable=True)
    edit_history = Column(JSON, default=list)

    status = Column(String(50), default="DRAFT", index=True) # DRAFT, APPROVED, SENT, REJECTED
    approved_by_user_id = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    opt_out_token = Column(String(64), unique=True, default=gen_uuid)
    created_at = Column(DateTime, default=datetime.utcnow)

    opportunity = relationship("Opportunity", back_populates="outreach_drafts")

class SuppressionRecord(Base):
    __tablename__ = "suppression_list"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    pattern_or_email = Column(String(255), unique=True, nullable=False)
    reason = Column(String(255), nullable=False)
    suppressed_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class ComplianceAuditLog(Base):
    __tablename__ = "compliance_audit_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    action_type = Column(String(100), nullable=False, index=True) # FETCH, EXTRACT, SUPPRESSION_CHECK, HUMAN_APPROVAL, DISPATCH
    agent_name = Column(String(100), nullable=False)
    target_url = Column(Text, nullable=True)
    legal_basis = Column(String(200), default="Legitimate B2B Interest / Public Tender")
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

class AgentHealthMetric(Base):
    __tablename__ = "agent_health_metrics"

    agent_name = Column(String(100), primary_key=True)
    status = Column(String(50), default="HEALTHY") # IDLE, RUNNING, HEALTHY, DEGRADED, ERROR
    last_run_at = Column(DateTime, nullable=True)
    items_processed_24h = Column(Integer, default=0)
    errors_24h = Column(Integer, default=0)
    last_error_message = Column(Text, nullable=True)
    avg_latency_ms = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)
