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
    
    # Automatically execute initial agent pipeline crawl on startup to ingest real data!
    logger.info("Triggering initial multi-agent real data ingestion...")
    try:
        async with AsyncSessionLocal() as session:
            stats = await orchestrator_agent.run_pipeline(session, max_items_per_source=4)
            logger.info(f"Initial crawl completed: {stats}")
    except Exception as e:
        logger.error(f"Initial crawl run failed: {e}")

    yield
    logger.info("Shutting down ClickfieldAI Opportunity Radar.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
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
app.include_router(compliance_router, prefix=settings.API_V1_STR)
app.include_router(chennai_leads_router, prefix=settings.API_V1_STR)
app.include_router(daily_emails_router, prefix=settings.API_V1_STR)
app.include_router(assistant_router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
