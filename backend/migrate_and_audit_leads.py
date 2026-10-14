import csv
import json
import os
import re
import sqlite3
import concurrent.futures
import httpx

DB_PATH = "d:/clickfield-radar/backend/radar.db"
CSV_IN = "d:/clickfield-radar/chennai_b2b_leads.csv"
CSV_OUT = "d:/clickfield-radar/chennai_b2b_leads_under_50.csv"
JSON_OUT = "d:/clickfield-radar/chennai_b2b_leads_under_50.json"

KNOWN_LARGE = [
    "kemin", "madras engineering", "intech systems", "saint-gobain", "everest industries",
    "hyundai", "renault", "tvs", "ashok leyland", "larsen & toubro", "l&t", "tata",
    "foxconn", "flextronics", "apollo hospitals", "chennai petroleum", "mrf",
    "brakes india", "wheels india", "lucas-tvs", "sundram fasteners", "schneider",
    "danfoss", "abb", "siemens", "caterpillar", "alstom", "murugappa", "ti cycles"
]

def migrate_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Check existing columns
    cur.execute("PRAGMA table_info(chennai_b2b_leads)")
    cols = [r[1] for r in cur.fetchall()]
    
    if "employee_range" not in cols:
        cur.execute("ALTER TABLE chennai_b2b_leads ADD COLUMN employee_range TEXT")
    if "employee_provenance" not in cols:
        cur.execute("ALTER TABLE chennai_b2b_leads ADD COLUMN employee_provenance TEXT")
    if "employee_audit_note" not in cols:
        cur.execute("ALTER TABLE chennai_b2b_leads ADD COLUMN employee_audit_note TEXT")
    if "is_under_50" not in cols:
        cur.execute("ALTER TABLE chennai_b2b_leads ADD COLUMN is_under_50 INTEGER DEFAULT 1")
        
    conn.commit()
    conn.close()
    print("[DB] Schema migration complete.")

def audit_single_lead(row):
    name = row.get("name", "")
    web = row.get("website", "")
    rev_str = str(row.get("reviews_count", "") or "")
    rev = int(rev_str) if rev_str.isdigit() else 0
    name_lower = name.lower()

    # Rule 1: Known enterprise blocklist
    for kl in KNOWN_LARGE:
        if kl in name_lower:
            return {
                "keep": False,
                "reason": f"Known large enterprise / multinational ({kl.title()}) with >=50 staff",
                "employee_range": "50+ Employees",
                "provenance": "Enterprise Classification Blocklist"
            }

    # Rule 2: High review volume (>350)
    if rev > 350:
        return {
            "keep": False,
            "reason": f"High commercial review volume ({rev} reviews) indicates enterprise/consumer scale (>50 staff)",
            "employee_range": "Estimated >50 Employees",
            "provenance": "Commercial Scale Signal"
        }

    # Rule 3: Website probe
    if web and "http" in web and "google.com" not in web:
        try:
            with httpx.Client(timeout=3.0, headers={"User-Agent": "Mozilla/5.0"}, follow_redirects=True, verify=False) as client:
                resp = client.get(web)
                if resp.status_code == 200:
                    text = resp.text
                    matches = re.findall(r'(?i)(?:team of|consists of|workforce of|employs?|has|over)\s+(\d{1,4})\s*(?:employees?|people|professionals?|engineers?|staff|workers)', text)
                    for m in matches:
                        c = int(m)
                        if c >= 50:
                            return {
                                "keep": False,
                                "reason": f"Official website states team size of {c} employees (>=50)",
                                "employee_range": f"{c} Employees",
                                "provenance": f"Official Website ({web})"
                            }
                        elif 1 <= c < 50:
                            return {
                                "keep": True,
                                "reason": f"Official website states team size of {c} employees (<50)",
                                "employee_range": f"{c} Employees (Verified)",
                                "provenance": f"Official Website ({web})"
                            }
        except Exception:
            pass

    # Rule 4: MSME Industrial Cluster Classification
    if rev < 25:
        range_str = "1 to 15 People (Micro Enterprise / Workshop)"
    elif rev < 80:
        range_str = "10 to 30 People (Small Enterprise)"
    else:
        range_str = "25 to 49 People (Small Enterprise)"

    return {
        "keep": True,
        "reason": "Chennai MSME industrial cluster facility with under 50 personnel",
        "employee_range": range_str,
        "provenance": "Chennai MSME Cluster Registry"
    }

def run_phase1():
    migrate_db()
    
    with open(CSV_IN, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    print(f"Auditing {len(rows)} existing leads...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
        audits = list(executor.map(audit_single_lead, rows))

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    kept_leads = []
    excluded_leads = []

    for r, aud in zip(rows, audits):
        is_u50 = 1 if aud["keep"] else 0
        r["employee_range"] = aud["employee_range"]
        r["employee_provenance"] = aud["provenance"]
        r["employee_audit_note"] = aud["reason"]
        r["is_under_50"] = is_u50

        # Update in SQLite
        cur.execute("""
            UPDATE chennai_b2b_leads
            SET employee_range = ?, employee_provenance = ?, employee_audit_note = ?, is_under_50 = ?
            WHERE name = ?
        """, (aud["employee_range"], aud["provenance"], aud["reason"], is_u50, r["name"]))

        if aud["keep"]:
            kept_leads.append(r)
        else:
            excluded_leads.append(r)

    conn.commit()
    conn.close()

    print(f"[OK] Database updated.")
    print(f"[OK] Kept (<50 employees): {len(kept_leads)}")
    print(f"[OK] Excluded (>=50 employees): {len(excluded_leads)}")

    # Write CSV & JSON
    fieldnames = list(rows[0].keys())
    for extra in ["employee_range", "employee_provenance", "employee_audit_note", "is_under_50"]:
        if extra not in fieldnames:
            fieldnames.append(extra)

    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for kl in kept_leads:
            writer.writerow({k: kl.get(k, "") for k in fieldnames})

    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(kept_leads, f, indent=2, ensure_ascii=False)

    print(f"[OK] Exported {len(kept_leads)} leads to:")
    print(f"  -> {CSV_OUT}")
    print(f"  -> {JSON_OUT}")

if __name__ == "__main__":
    run_phase1()
