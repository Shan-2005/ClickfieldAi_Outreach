import urllib.request
import json

def test_copilot_questions():
    test_queries = [
        "Why does the 'Reply with Yes' CTA convert better than booking links?",
        "Compare Ambattur versus Guindy industrial leads",
        "Explain the strategy behind our Day 2 and Day 5 follow-up cadences",
        "Find leads in Ambattur with email",
        "What is the impact of the DPDP Act 2023 on our cold outreach?"
    ]

    for q in test_queries:
        print(f"\n=======================================================")
        print(f"USER: {q}")
        print(f"=======================================================")
        payload = json.dumps({"command": q}).encode('utf-8')
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/assistant/command",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        try:
            res = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
            print(f"INTENT: {res.get('intent_detected')} (Action: {res.get('action')})")
            print(f"REPLY:\n{res.get('message')}")
            if res.get('data') and 'matches' in res['data']:
                print(f"Matches count: {len(res['data']['matches'])}")
                for m in res['data']['matches'][:2]:
                    print(f"  - {m['name']} ({m['area']}) | {m.get('email')} | Owner: {m.get('owner_name')}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_copilot_questions()
