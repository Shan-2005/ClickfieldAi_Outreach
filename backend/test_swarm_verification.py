import sys
import os
sys.path.insert(0, r"d:\clickfield-radar\backend")
import sqlite3
from app.agents.b2b_swarm import b2b_swarm

def test_swarm():
    conn = sqlite3.connect(r"d:\clickfield-radar\backend\radar.db")
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM chennai_b2b_leads WHERE owner_name IS NOT NULL AND owner_name != 'Not Disclosed Online' LIMIT 1")
    lead = dict(cur.fetchone())
    conn.close()

    print(f"Testing 15-Agent Swarm on: {lead['name']} ({lead.get('area')})")
    print(f"Verified MCA Owner: {lead.get('owner_name')}")

    intel = b2b_swarm.analyze_company(lead)

    agents = {a["agent_id"]: a for a in intel["agents"]}
    a1 = agents[1]
    a4 = agents[4]
    print(f"\n[Agent 1 Profiler] ML Sector: {a1.get('ml_predicted_sector')} (Conf: {a1.get('ml_sector_confidence')})")
    print(f"[Agent 4 Stakeholder] Verified MCA Director: {a4.get('verified_mca_director')} ({a4.get('director_designation')})")

    a8 = agents[8]
    print(f"[Agent 8 Readiness] ML Conversion Propensity: {a8.get('ml_conversion_propensity')}")

    a13 = agents[13]
    print(f"\n[Agent 13 Cold Email] Words: {a13.get('word_count')} | Under 80: {a13.get('is_under_80_words')}")
    print(f"Recipient: {a13.get('recipient_name')}")
    print(f"Subject: {a13.get('subject')}")
    print(f"Body snippet:\n{a13.get('body')}")

    a14 = agents[14]
    print(f"\n[Agent 14 Multi-Touch & WhatsApp]:")
    print(f"Day 2 snippet: {repr(a14.get('day_2_nudge')[:100])}")
    print(f"Day 5 snippet: {repr(a14.get('day_5_breakup')[:100])}")
    wa_clean = a14.get('whatsapp_message', '').encode('ascii', errors='ignore').decode('ascii')
    print(f"WhatsApp Message (Clean):\n{wa_clean}")

if __name__ == "__main__":
    test_swarm()
