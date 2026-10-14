import asyncio
import sqlite3
import os
import bcrypt
from datetime import datetime, timedelta
from app.db.session import engine, Base
from app.db.models import User, ActionLog

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def upgrade_existing_sqlite_tables():
    db_path = "radar.db" if os.path.exists("radar.db") else "backend/radar.db"
    if not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1. Update chennai_b2b_leads
    cur.execute("PRAGMA table_info(chennai_b2b_leads)")
    existing_lead_cols = [c[1] for c in cur.fetchall()]
    
    lead_cols_to_add = [
        ("assigned_user_id", "TEXT"),
        ("assigned_user_name", "TEXT"),
        ("stage", "TEXT DEFAULT 'NEW'"),
        ("next_due_date", "DATE"),
        ("is_paused", "INTEGER DEFAULT 0"),
        ("sequence_step", "TEXT DEFAULT 'DAY0'"),
        ("last_message_id", "TEXT"),
        ("last_contacted_at", "TIMESTAMP")
    ]
    for col_name, col_type in lead_cols_to_add:
        if col_name not in existing_lead_cols:
            try:
                cur.execute(f"ALTER TABLE chennai_b2b_leads ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                print(f"Column {col_name} notice: {e}")

    # Set default stages if not set
    cur.execute("UPDATE chennai_b2b_leads SET stage = 'NEW' WHERE stage IS NULL")

    # 2. Update daily_email_dispatches
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='daily_email_dispatches'")
    if cur.fetchone():
        cur.execute("PRAGMA table_info(daily_email_dispatches)")
        existing_dispatch_cols = [c[1] for c in cur.fetchall()]
        dispatch_cols_to_add = [
            ("assigned_user_id", "TEXT"),
            ("assigned_user_name", "TEXT"),
            ("message_id", "TEXT"),
            ("retry_count", "INTEGER DEFAULT 0"),
            ("failure_reason", "TEXT")
        ]
        for col_name, col_type in dispatch_cols_to_add:
            if col_name not in existing_dispatch_cols:
                try:
                    cur.execute(f"ALTER TABLE daily_email_dispatches ADD COLUMN {col_name} {col_type}")
                except Exception as e:
                    print(f"Column {col_name} notice: {e}")

    conn.commit()
    conn.close()

async def setup_database():
    # 1. Create all SQLAlchemy models
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Upgrade SQLite columns
    upgrade_existing_sqlite_tables()

    # 3. Seed initial admin user if none exists
    from sqlalchemy.future import select
    from app.db.session import AsyncSessionLocal
    
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).limit(1))
        existing_user = res.scalars().first()
        if not existing_user:
            admin_user = User(
                email="zoya@clickfield.ai",
                hashed_password=hash_password("ZoyaAdmin2026!"),
                full_name="Zoya Patel",
                role="ADMIN",
                is_active=True,
                sender_signature="--\nZoya Patel\nTechnical Solutions & Engineering Lead\nClickfield AI",
                sender_address="Clickfield Technologies Pvt. Ltd., Level 4, Prestige Tech Park, Marathahalli-Sarjapur Ring Rd, Bengaluru, KA 560103, India",
                mailbox_username="zoya@clickfield.ai",
                daily_send_cap=15,
                daily_sends_today=0
            )
            session.add(admin_user)
            await session.commit()
            print("Seeded primary Administrator: zoya@clickfield.ai (Password: ZoyaAdmin2026!)")

            # Seed a sales user and viewer user for multi-role testing
            sales_user = User(
                email="rohit@clickfield.ai",
                hashed_password=hash_password("RohitSales2026!"),
                full_name="Rohit Sharma",
                role="SALES",
                is_active=True,
                sender_signature="--\nRohit Sharma\nTechnical Sales Specialist\nClickfield AI",
                mailbox_username="rohit@clickfield.ai",
                daily_send_cap=15
            )
            viewer_user = User(
                email="viewer@clickfield.ai",
                hashed_password=hash_password("ViewerRead2026!"),
                full_name="Pooja Verma",
                role="VIEWER",
                is_active=True
            )
            session.add(sales_user)
            session.add(viewer_user)
            await session.commit()
            print("Seeded standard Sales & Viewer accounts.")

if __name__ == "__main__":
    asyncio.run(setup_database())
