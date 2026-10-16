import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "radar.db")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 1. Update chennai_b2b_leads
    try:
        cur.execute("ALTER TABLE chennai_b2b_leads ADD COLUMN source_dataset TEXT DEFAULT 'Chennai SMB MSME Registry'")
        print("Added source_dataset to chennai_b2b_leads")
    except sqlite3.OperationalError as e:
        print("chennai_b2b_leads:", e)

    # 2. Update daily_email_dispatches
    try:
        cur.execute("ALTER TABLE daily_email_dispatches ADD COLUMN source_dataset TEXT DEFAULT 'Chennai SMB MSME Registry'")
        print("Added source_dataset to daily_email_dispatches")
    except sqlite3.OperationalError as e:
        print("daily_email_dispatches:", e)

    # 3. Update existing records with descriptive dataset names based on cluster/area
    cur.execute("""
        UPDATE chennai_b2b_leads 
        SET source_dataset = CASE
            WHEN area LIKE '%Ambattur%' THEN 'Ambattur SIDCO Industrial Cluster'
            WHEN area LIKE '%Guindy%' THEN 'Guindy SIDCO Precision Cohort'
            WHEN area LIKE '%Sriperumbudur%' THEN 'Sriperumbudur Auto-Ancillary Corridor'
            WHEN area LIKE '%Oragadam%' THEN 'Oragadam Manufacturing Zone'
            WHEN area LIKE '%Poonamallee%' THEN 'Poonamallee Industrial Belt'
            ELSE 'Chennai SMB MSME Registry'
        END
        WHERE source_dataset IS NULL OR source_dataset = 'Chennai SMB MSME Registry'
    """)

    # Update daily_email_dispatches to match lead's dataset
    cur.execute("""
        UPDATE daily_email_dispatches
        SET source_dataset = (
            SELECT l.source_dataset FROM chennai_b2b_leads l WHERE l.id = daily_email_dispatches.lead_id
        )
        WHERE lead_id IS NOT NULL AND (source_dataset IS NULL OR source_dataset = 'Chennai SMB MSME Registry')
    """)

    conn.commit()
    conn.close()
    print("[MIGRATION COMPLETE]: source_dataset synchronized across all records.")

if __name__ == "__main__":
    migrate()
