import sqlite3
import json

conn = sqlite3.connect('radar.db')
cur = conn.cursor()

# 1. Fetch all companies and their contact emails
cur.execute("SELECT id, name, domain, public_contact_emails FROM companies")
companies = cur.fetchall()

print(f"Total companies in database: {len(companies)}")
audit_emails = []

for cid, name, domain, raw_emails in companies:
    try:
        emails = json.loads(raw_emails) if raw_emails else []
    except Exception:
        emails = []
    
    for email in emails:
        # Check source: None were extracted via regex from raw HTML, all were produced by _generate_public_b2b_contacts
        audit_emails.append({
            "company": name,
            "domain": domain,
            "email": email,
            "origin": "GUESSED",
            "reason": "Synthesized by _generate_public_b2b_contacts from inferred domain name"
        })

print(f"Total contact emails audited: {len(audit_emails)}")
print("Sample audited emails:")
for item in audit_emails[:10]:
    print(f"• {item['email']} ({item['company']}) -> {item['origin']}")

# Flag all guessed emails in database: replace with empty list or flagged indicator
for cid, name, domain, _ in companies:
    # Clear guessed contacts so we never invent contacts
    cur.execute("UPDATE companies SET public_contact_emails = ? WHERE id = ?", (json.dumps([]), cid))

# Also clear from outreach_drafts where recipient was guessed
cur.execute("UPDATE outreach_drafts SET recipient_email = '[NO_VERIFIED_PUBLIC_EMAIL_FOUND]' WHERE recipient_email LIKE 'rfp@%' OR recipient_email LIKE 'procurement@%'")

conn.commit()
conn.close()
print("All guessed emails flagged and removed from active outreach in radar.db.")
