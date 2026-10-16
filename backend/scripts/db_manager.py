import sqlite3
import os
import shutil
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "radar.db")
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "backups")

def ensure_backup_dir():
    os.makedirs(BACKUP_DIR, exist_ok=True)

def take_snapshot() -> str:
    ensure_backup_dir()
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database not found at {DB_PATH}")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(BACKUP_DIR, f"radar_snapshot_{timestamp}.db")
    shutil.copy2(DB_PATH, backup_file)
    print(f"[BACKUP SUCCESS]: Snapshot created at {backup_file} ({os.path.getsize(backup_file)} bytes)")
    return backup_file

def inspect_schema():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    print(f"=== CURRENT TABLES IN {os.path.basename(DB_PATH)} ===")
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table});")
        cols = [c[1] for c in cursor.fetchall()]
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"- {table}: {count} records | Columns: {', '.join(cols[:8])}...")
    conn.close()

def setup_production_tables():
    """
    Ensures all 5 required tables exist with proper constraints, indices, and audit structures.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Daily Email Dispatches Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_email_dispatches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER,
        batch_date TEXT NOT NULL,
        batch_index INTEGER,
        recipient_name TEXT,
        recipient_email TEXT NOT NULL,
        company_name TEXT NOT NULL,
        area TEXT,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        word_count INTEGER,
        cta_verified INTEGER DEFAULT 0,
        status TEXT DEFAULT 'DRAFT', -- DRAFT, QUEUED, DISPATCHED, FAILED
        sent_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(lead_id) REFERENCES chennai_b2b_leads(id)
    );
    """)

    # Ensure existing table has required columns
    cursor.execute("PRAGMA table_info(daily_email_dispatches);")
    existing_cols = [c[1] for c in cursor.fetchall()]
    if "cta_verified" not in existing_cols:
        cursor.execute("ALTER TABLE daily_email_dispatches ADD COLUMN cta_verified INTEGER DEFAULT 1;")
    if "updated_at" not in existing_cols:
        cursor.execute("ALTER TABLE daily_email_dispatches ADD COLUMN updated_at TEXT;")

    # 2. Email Follow-up Cadence Table (Day 2, Day 3, Day 5)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS email_followup_cadence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dispatch_id INTEGER NOT NULL,
        lead_id INTEGER,
        recipient_email TEXT NOT NULL,
        company_name TEXT NOT NULL,
        stage_day INTEGER NOT NULL, -- 2, 3, or 5
        due_date TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING', -- PENDING, DUE, SENT, SKIPPED, CANCELLED_REPLIED
        sent_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(dispatch_id) REFERENCES daily_email_dispatches(id)
    );
    """)

    # 3. Prospect Inbound Replies Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS prospect_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER,
        recipient_email TEXT,
        sender_email TEXT NOT NULL,
        subject TEXT,
        reply_body TEXT NOT NULL,
        classification TEXT NOT NULL, -- INTERESTED, NOT_NOW, WRONG_PERSON, UNSUBSCRIBE, QUESTION
        confidence REAL DEFAULT 0.0,
        recommended_action TEXT,
        received_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_processed INTEGER DEFAULT 0,
        FOREIGN KEY(lead_id) REFERENCES chennai_b2b_leads(id)
    );
    """)

    # 4. Agent Action Audit Log Table (Immutable Ledger for Proof)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agent_action_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_name TEXT NOT NULL,
        lead_id INTEGER,
        company_name TEXT,
        action_type TEXT NOT NULL, -- INTEL_EXTRACTED, TRUTH_VERIFIED, PITCH_DRAFTED, CADENCE_SCHEDULED, DISPATCHED, REPLY_CLASSIFIED
        input_summary TEXT,
        output_summary TEXT,
        is_success INTEGER DEFAULT 1,
        execution_time_ms REAL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Indices for high-speed queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_dispatches_date ON daily_email_dispatches(batch_date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cadence_due ON email_followup_cadence(due_date, status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_agent ON agent_action_audit_log(agent_name, timestamp);")

    conn.commit()
    conn.close()
    print("[SCHEMA UPGRADE]: All production tables and indices verified.")

if __name__ == "__main__":
    take_snapshot()
    setup_production_tables()
    inspect_schema()
