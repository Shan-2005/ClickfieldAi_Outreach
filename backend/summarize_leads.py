import csv
import os
from collections import Counter

csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "chennai_b2b_leads.csv")

if not os.path.exists(csv_path):
    print("CSV not found yet.")
    exit(0)

with open(csv_path, mode="r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

total = len(rows)
if total == 0:
    print("No records yet.")
    exit(0)

sectors = Counter(r["sector"] for r in rows)
areas = Counter(r["area"] for r in rows if r["area"])
with_phone = sum(1 for r in rows if r["phone"] and r["phone"] != "N/A")
with_email = sum(1 for r in rows if r["email"] and r["email"] != "N/A")
with_web = sum(1 for r in rows if r["website"] and r["website"] != "N/A")

print("=" * 60)
print(f"[SUMMARY] CHENNAI B2B LEADS DATASET (Total: {total})")
print("=" * 60)
print("\n[+] BY SECTOR:")
for s, count in sectors.most_common():
    print(f"  - {s:<18}: {count:>3} leads ({count/total*100:.1f}%)")

print("\n[+] CONTACT COMPLETENESS:")
print(f"  - With Phone Number: {with_phone:>3}/{total} ({with_phone/total*100:.1f}%)")
print(f"  - With Website     : {with_web:>3}/{total} ({with_web/total*100:.1f}%)")
print(f"  - With Email       : {with_email:>3}/{total} ({with_email/total*100:.1f}%)")

print("\n[+] TOP LOCATIONS / HUBS IN & AROUND CHENNAI:")
for a, count in areas.most_common(8):
    print(f"  - {a:<18}: {count:>3} businesses")

print("\n[+] SAMPLE TOP RATED LISTINGS:")
top_rated = sorted(
    [r for r in rows if r.get("rating") and r.get("reviews_count")],
    key=lambda x: (float(x["rating"]) if x["rating"].replace(".", "").isdigit() else 0, int(x["reviews_count"]) if x["reviews_count"].isdigit() else 0),
    reverse=True
)[:5]

for r in top_rated:
    print(f"  * {r['name']} ({r['sector']})")
    print(f"    Rating: {r['rating']} * ({r['reviews_count']} reviews) | Phone: {r['phone'] or 'N/A'}")
    print(f"    Area: {r['area']} | Pincode: {r['pincode']} | Web: {r['website'] or 'N/A'}")
print("=" * 60)
