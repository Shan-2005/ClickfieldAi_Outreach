import json

with open("backend/provenance_audit_results.json") as f:
    data = json.load(f)

print(f"TOTAL RECORDS: {len(data['opportunities'])}\n")
for i, o in enumerate(data["opportunities"], 1):
    print(f"{i}. [{o['provenance_type']}] | Status: {o['status']} (Expired: {o['is_expired']})")
    print(f"   Buyer: {o['buyer']} | Country: {o['country']}")
    print(f"   Title: {o['title']}")
    print(f"   Raw Crawl ID: {o['raw_crawl_id']}")
    print(f"   Fetch Timestamp: {o['fetch_timestamp']}")
    print(f"   Source URL: {o['source_url']}")
    print("-" * 80)
