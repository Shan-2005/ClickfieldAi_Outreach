import os
import sys

# Support UTF-8 encoding in Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Ensure app is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agentic_core.agent6_workstation_orchestrator import orchestrator
from scripts.generate_submission_proof import generate_proof

def run_batch():
    print("==================================================================")
    print("[BATCH] STARTING MULTI-AGENT AUTONOMOUS 15-LEAD BATCH (OLLAMA)")
    print("==================================================================")

    # 1. Verify health
    if not orchestrator.is_healthy():
        print("[ERROR]: Ollama daemon is not reachable on http://localhost:11434")
        return

    # 2. Trigger Batch of 15
    print("\n[INFO]: Selecting 15 uncontacted Chennai SMB leads with verified emails...")
    batch_result = orchestrator.run_daily_15_batch(count=15)
    size = batch_result.get("batch_size", 0)
    print(f"[SUCCESS]: Multi-Agent pipeline processed {size} leads successfully.")

    for i, lead in enumerate(batch_result.get("generated_leads", []), 1):
        print(f"\n--- Lead #{i}: {lead.get('company')} ---")
        print(f"   Recipient: {lead.get('owner')} <{lead.get('email')}>")
        print(f"   Subject: {lead.get('day0_subject')}")
        print(f"   Word Count: {lead.get('word_count')} words (<80 constraint)")
        print(f"   Follow-ups Scheduled: {lead.get('followups_scheduled')} (Day 2, 3, 5)")

    # 3. Regenerate Official Submission Proof
    print("\n[INFO]: Regenerating official SUBMISSION_PROOF.md from database...")
    generate_proof()
    print("[SUCCESS]: Submission proof regenerated.")

if __name__ == "__main__":
    run_batch()
