import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import init_db, AsyncSessionLocal
from app.agents.orchestrator import orchestrator_agent
from app.api.routes_opportunities import router as opportunities_router
from app.api.routes_agents import router as agents_router
from app.api.routes_outreach import router as outreach_router
from app.api.routes_compliance import router as compliance_router
from app.api.routes_chennai_leads import router as chennai_leads_router
from app.api.routes_daily_emails import router as daily_emails_router
from app.api.routes_assistant import router as assistant_router
from app.api.routes_auth import router as auth_router
from app.api.routes_calendar import router as calendar_router
from app.api.routes_tracker import router as tracker_router
from app.api.routes_datasets import router as datasets_router
from app.api.routes_reports import router as reports_router
from app.api.routes_mailbox import router as mailbox_router
from app.api.routes_agentic import router as agentic_router
from app.api.routes_outreach_datasets import router as outreach_studio_router
from app.services.dataset_service import import_excel_datasets
from app.services.scheduler import start_background_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing ClickfieldAI Opportunity Radar...")
    await init_db()
    
    # Auto-initialize and import Excel datasets
    try:
        import_excel_datasets(force=False)
    except Exception as e:
        logger.warning(f"Dataset initialization warning: {e}")

    # Start APScheduler (09:00 IST follow-ups, 02:00 IST backups, 10-min IMAP tracking)
    try:
        start_background_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler initialization warning: {e}")

    yield
    logger.info("Shutting down ClickfieldAI Opportunity Radar.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="Compliant Multi-Agent System finding public AI and software opportunities.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(opportunities_router, prefix=settings.API_V1_STR)
app.include_router(agents_router, prefix=settings.API_V1_STR)
app.include_router(outreach_router, prefix=settings.API_V1_STR)
app.include_router(outreach_studio_router, prefix=settings.API_V1_STR)
app.include_router(compliance_router, prefix=settings.API_V1_STR)
app.include_router(chennai_leads_router, prefix=settings.API_V1_STR)
app.include_router(daily_emails_router, prefix=settings.API_V1_STR)
app.include_router(assistant_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(calendar_router, prefix=settings.API_V1_STR)
app.include_router(tracker_router, prefix=settings.API_V1_STR)
app.include_router(datasets_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(mailbox_router, prefix=settings.API_V1_STR)
app.include_router(agentic_router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
