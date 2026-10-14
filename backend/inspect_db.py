import sqlite3
import json

conn = sqlite3.connect("backend/radar.db")
conn.row_factory = sqlite3.Row
cur = conn.cursor()

tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Tables in radar.db:", tables)

for t in tables:
    cols = [r[1] for r in cur.execute(f"PRAGMA table_info({t})").fetchall()]
    count = cur.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"\n--- Table: {t} (row count: {count}) ---")
    print("Columns:", cols)

print("\n================ SOURCES ================")
for row in cur.execute("SELECT * FROM sources"):
    print(dict(row))

print("\n================ AGENTS ================")
if "agents" in tables:
    for row in cur.execute("SELECT * FROM agents"):
        print(dict(row))

print("\n================ OPPORTUNITIES (ALL ROWS) ================")
for row in cur.execute("SELECT * FROM opportunities"):
    d = dict(row)
    print({
        "id": d.get("id"),
        "title": d.get("title"),
        "source_url": d.get("source_url"),
        "company_name": d.get("company_name"),
        "is_accepted": d.get("is_accepted"),
        "is_expired": d.get("is_expired"),
        "raw_crawl_id": d.get("raw_crawl_id"),
        "created_at": d.get("created_at"),
        "deadline": d.get("deadline"),
        "fit_score": d.get("fit_score"),
        "source_trust": d.get("source_trust"),
        "provenance": d.get("provenance")
    })

conn.close()
