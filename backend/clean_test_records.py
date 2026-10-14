import sqlite3

conn = sqlite3.connect('radar.db')
cur = conn.cursor()

# Find and delete test record
cur.execute("SELECT id, title, source_url FROM opportunities WHERE source_url LIKE '%sample%'")
rows = cur.fetchall()
print(f"Found {len(rows)} sample test records to delete:")
for r in rows:
    print(r)
    cur.execute("DELETE FROM fit_evaluations WHERE opportunity_id = ?", (r[0],))
    cur.execute("DELETE FROM outreach_drafts WHERE opportunity_id = ?", (r[0],))
    cur.execute("DELETE FROM opportunities WHERE id = ?", (r[0],))

conn.commit()
print("Cleaned database. Now checking remaining records:")
cur.execute("SELECT id, title, source_url FROM opportunities")
for r in cur.fetchall():
    print("-", r[1][:50], "->", r[2])
conn.close()
