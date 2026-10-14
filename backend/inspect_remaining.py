import sqlite3

conn = sqlite3.connect('radar.db')
cur = conn.cursor()
cur.execute("SELECT id, title, description FROM opportunities WHERE title LIKE '%Typeform%' OR title LIKE '%Engineer%' OR title LIKE '%Developer%'")
rows = cur.fetchall()
for r in rows:
    print(f"ID: {r[0]}")
    print(f"Title: {r[1]}")
    print(f"Desc snippet: {r[2][:250]}")
    print("-" * 50)
conn.close()
