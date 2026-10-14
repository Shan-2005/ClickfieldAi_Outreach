import asyncio
import logging
from app.db.session import init_db, AsyncSessionLocal
from app.agents.orchestrator import orchestrator_agent
from app.db.models import Opportunity, Company, FitEvaluation

logging.basicConfig(level=logging.INFO)

async def test_live():
    print("1. Initializing database schema...")
    await init_db()
    
    print("2. Running multi-agent pipeline on live public feeds...")
    async with AsyncSessionLocal() as session:
        result = await orchestrator_agent.run_pipeline(session, max_items_per_source=3)
        print("Pipeline Execution Summary:", result)
        
        # Verify stored opportunities
        from sqlalchemy.future import select
        from sqlalchemy.orm import selectinload
        stmt = select(Opportunity).options(
            selectinload(Opportunity.company),
            selectinload(Opportunity.fit_evaluation)
        )
        res = await session.execute(stmt)
        opps = res.scalars().all()
        print(f"\nDiscovered {len(opps)} REAL Opportunities:")
        for opp in opps[:5]:
            print(f"- [{opp.primary_category}] {opp.title[:60]}...")
            print(f"  Company: {opp.company.name if opp.company else 'N/A'}")
            print(f"  Fit Score: {opp.fit_evaluation.total_score if opp.fit_evaluation else 'N/A'}/100")
            print(f"  Source URL: {opp.source_url}")
            print(f"  Deadline: {opp.deadline}")
            print(f"  Tech: {opp.tech_stack}")
            print("-" * 50)

if __name__ == "__main__":
    asyncio.run(test_live())
