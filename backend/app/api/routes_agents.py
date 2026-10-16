from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db, AsyncSessionLocal
from app.agents.orchestrator import orchestrator_agent

router = APIRouter(prefix="/agents", tags=["Agents"])

@router.get("/status")
async def get_agent_statuses(db: AsyncSession = Depends(get_db)):
    """Return real-time operational status, processed count, and latency for all 11 agents."""
    return await orchestrator_agent.get_all_agent_metrics(db)

async def _bg_run_pipeline():
    async with AsyncSessionLocal() as session:
        await orchestrator_agent.run_pipeline(session, max_items_per_source=4)

@router.post("/run")
@router.post("/crawl")
async def trigger_agent_run(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Trigger an immediate crawling, extraction, and ranking pipeline run."""
    background_tasks.add_task(_bg_run_pipeline)
    return {"status": "triggered", "message": "Multi-agent crawl run dispatched in background."}
