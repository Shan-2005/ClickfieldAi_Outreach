import sqlite3

conn = sqlite3.connect("backend/radar.db")
cur = conn.cursor()

def add_col_if_missing(table, col_name, col_type):
    cols = [r[1] for r in cur.execute(f"PRAGMA table_info({table})").fetchall()]
    if col_name not in cols:
        print(f"Adding {col_name} ({col_type}) to {table}...")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
    else:
        print(f"{table}.{col_name} already exists.")

# Opportunity columns
add_col_if_missing("opportunities", "buyer_type", "VARCHAR(50) DEFAULT 'Government'")
add_col_if_missing("opportunities", "reference_number", "VARCHAR(100)")

# OutreachDraft columns
add_col_if_missing("outreach_drafts", "draft_mode", "VARCHAR(50) DEFAULT 'FORMAL_TENDER'")
add_col_if_missing("outreach_drafts", "subject_options", "JSON")
add_col_if_missing("outreach_drafts", "selected_subject_index", "INTEGER DEFAULT 0")
add_col_if_missing("outreach_drafts", "source_facts", "JSON")
add_col_if_missing("outreach_drafts", "has_ungrounded_claims", "BOOLEAN DEFAULT 0")
add_col_if_missing("outreach_drafts", "ungrounded_warning", "TEXT")
add_col_if_missing("outreach_drafts", "can_send", "BOOLEAN DEFAULT 1")
add_col_if_missing("outreach_drafts", "word_count", "INTEGER DEFAULT 0")
add_col_if_missing("outreach_drafts", "follow_up_day4", "TEXT")
add_col_if_missing("outreach_drafts", "follow_up_day9", "TEXT")
add_col_if_missing("outreach_drafts", "original_body", "TEXT")
add_col_if_missing("outreach_drafts", "edit_history", "JSON")

# Infer buyer_type for existing records
print("Updating buyer_type on existing opportunities...")
cur.execute("""
    UPDATE opportunities SET buyer_type = 'Government' 
    WHERE (buyer_type IS NULL OR buyer_type = 'Unknown') 
    AND (source_url LIKE '%.gov%' OR title LIKE '%NIT%' OR title LIKE '%Ministry%' OR title LIKE '%Department%' OR title LIKE '%e-Procurement%' OR source_url LIKE '%eprocure%' OR source_url LIKE '%mahatenders%')
""")

cur.execute("""
    UPDATE opportunities SET buyer_type = 'Public-sector' 
    WHERE (company_id IN (SELECT id FROM companies WHERE name LIKE '%NPCI%' OR name LIKE '%Metro%'))
""")

cur.execute("""
    UPDATE opportunities SET buyer_type = 'University' 
    WHERE (company_id IN (SELECT id FROM companies WHERE name LIKE '%IISc%' OR name LIKE '%University%' OR name LIKE '%College%'))
""")

cur.execute("""
    UPDATE opportunities SET buyer_type = 'NGO/UN' 
    WHERE (source_url LIKE '%undp%' OR source_url LIKE '%ungm%' OR title LIKE '%UNDP%' OR title LIKE '%WHO%')
""")

conn.commit()
print("Migration completed successfully.")
conn.close()
