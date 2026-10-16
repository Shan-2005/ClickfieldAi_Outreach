import sqlite3
from app.services.ollama_client import ollama_brain

conn = sqlite3.connect('radar.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT * FROM chennai_b2b_leads WHERE owner_name IS NOT NULL AND email LIKE '%@%' LIMIT 1")
lead = dict(cur.fetchone())
conn.close()

print("--- TARGET LEAD GROUNDING ---")
print("Company:", lead["name"])
print("Area:", lead["area"])
print("Owner:", lead["owner_name"])
print("Email:", lead["email"])

print("\n--- GENERATING BESPOKE PITCH VIA LOCAL LLAMA 3.2 ---")
pitch = ollama_brain.dynamic_draft_pitch(lead)
print("\n[SUBJECT]:", pitch.get("subject"))
print("[BODY]:\n" + pitch.get("body", ""))

print("\n--- GENERATING CONTEXTUAL DAY 3 FOLLOW-UP VIA LOCAL LLAMA 3.2 ---")
followup = ollama_brain.dynamic_followup_nudge(lead, pitch.get("body", ""), day_stage=3)
print("[FOLLOW-UP SUBJECT]:", followup.get("subject"))
print("[FOLLOW-UP BODY]:\n" + followup.get("body", ""))
