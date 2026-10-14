import sqlite3
from app.agents.classifier import classifier_agent

conn = sqlite3.connect('radar.db')
cur = conn.cursor()

# 1. Create rejected_opportunities table if it doesn't exist
cur.execute("""
    CREATE TABLE IF NOT EXISTS rejected_opportunities (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        company_name VARCHAR(255),
        description TEXT,
        source_url TEXT NOT NULL,
        opportunity_type VARCHAR(50) DEFAULT 'Job-posting',
        rejection_reason TEXT NOT NULL,
        rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

# 2. Add missing columns to opportunities table if not present
columns_to_add = [
    ("opportunity_type", "VARCHAR(50) DEFAULT 'Project-post'"),
    ("confidence", "INTEGER DEFAULT 90"),
    ("is_job_posting", "BOOLEAN DEFAULT 0"),
    ("rejection_reason", "TEXT"),
    ("is_saved", "BOOLEAN DEFAULT 0"),
    ("notes", "TEXT")
]

cur.execute("PRAGMA table_info(opportunities)")
existing_cols = [c[1] for c in cur.fetchall()]

for col_name, col_def in columns_to_add:
    if col_name not in existing_cols:
        print(f"+ Adding column {col_name} to opportunities...")
        cur.execute(f"ALTER TABLE opportunities ADD COLUMN {col_name} {col_def}")

conn.commit()

# 3. Audit all opportunities against new B2B Project rules
cur.execute("SELECT id, title, description, source_url FROM opportunities")
rows = cur.fetchall()

print(f"Auditing {len(rows)} existing opportunities in database against new B2B rules...")
purged_count = 0
updated_count = 0

for opp_id, title, desc, source_url in rows:
    res = classifier_agent.classify(title, desc or "", [], source_url or "")
    if not res.is_b2b_project:
        print(f"-> REJECTING NON-B2B ITEM: '{title[:50]}' (Reason: {res.rejection_reason})")
        cur.execute("""
            INSERT OR REPLACE INTO rejected_opportunities (id, title, description, source_url, opportunity_type, rejection_reason, rejected_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        """, (opp_id, title, desc, source_url, res.opportunity_type, res.rejection_reason))
        cur.execute("DELETE FROM fit_evaluations WHERE opportunity_id = ?", (opp_id,))
        cur.execute("DELETE FROM outreach_drafts WHERE opportunity_id = ?", (opp_id,))
        cur.execute("DELETE FROM opportunities WHERE id = ?", (opp_id,))
        purged_count += 1
    else:
        new_status = "NEEDS_REVIEW" if res.confidence < 70 else "NEW"
        cur.execute("""
            UPDATE opportunities 
            SET opportunity_type = ?, confidence = ?, is_job_posting = 0, status = ?
            WHERE id = ?
        """, (res.opportunity_type, res.confidence, new_status, opp_id))
        updated_count += 1

conn.commit()

# Report remaining B2B opportunities
cur.execute("SELECT id, title, opportunity_type, primary_category, status FROM opportunities")
remaining = cur.fetchall()
print(f"\nAudit complete! Purged: {purged_count} individual jobs. Retained: {len(remaining)} genuine B2B Project Opportunities:")
for r in remaining:
    print(f"• [{r[2]}] [{r[3]}] ({r[4]}) {r[1][:60]}...")

conn.close()
