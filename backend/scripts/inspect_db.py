import sqlite3
import os

db_path = "backend/radar.db" if os.path.exists("backend/radar.db") else "radar.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print(f"=== Tables in {db_path} ===")
for t in tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        cnt = cur.fetchone()[0]
        print(f"{t}: {cnt}")
    except Exception as e:
        print(f"{t}: error {e}")
conn.close()
