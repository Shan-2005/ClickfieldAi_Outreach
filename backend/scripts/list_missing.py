import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
data = json.load(open('data/distinct_missing.json', encoding='utf-8'))
print(f"Total companies: {len(data)}")
for i, d in enumerate(data):
    print(f"{i}: {d['name']} | {d.get('industry')} | {d.get('website')}")
