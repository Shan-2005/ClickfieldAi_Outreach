import asyncio
from app.db.session import AsyncSessionLocal
from app.agents.source_discovery import source_discovery_agent, DEFAULT_REAL_SOURCES
from app.agents.orchestrator import orchestrator_agent
from app.db.models import Source
from sqlalchemy.future import select

async def sync_and_crawl():
    async with AsyncSessionLocal() as session:
        print("Checking sources in database...")
        for src in DEFAULT_REAL_SOURCES:
            stmt = select(Source).where(Source.base_url == src["base_url"])
            res = await session.execute(stmt)
            existing = res.scalars().first()
            if not existing:
                new_src = Source(
                    name=src["name"],
                    category=src["category"],
                    base_url=src["base_url"],
                    crawl_frequency=src["crawl_frequency"],
                    rate_limit_delay_seconds=src["rate_limit_delay_seconds"],
                    yield_score=src["yield_score"]
                )
                session.add(new_src)
                print(f"+ Added new source: {src['name']}")
        await session.commit()
        
        print("Running pipeline on new sources...")
        stats = await orchestrator_agent.run_pipeline(session, max_items_per_source=4)
        print("Pipeline run stats:", stats)

if __name__ == "__main__":
    asyncio.run(sync_and_crawl())
