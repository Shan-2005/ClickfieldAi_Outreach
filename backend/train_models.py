import os
import sys
import sqlite3
import json
import numpy as np
import joblib
from datetime import datetime

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BACKEND_DIR, "radar.db")
MODELS_DIR = os.path.join(BACKEND_DIR, "app", "ml_models")
os.makedirs(MODELS_DIR, exist_ok=True)

def load_data():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM chennai_b2b_leads")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def train_lead_classifier(rows):
    print("\n--- Training Lead Sector & Niche ML Classifier ---")
    texts = []
    labels = []
    
    for r in rows:
        name = r.get("name") or ""
        cat = r.get("category") or ""
        area = r.get("area") or ""
        addr = r.get("address") or ""
        owner = r.get("owner_name") or ""
        desig = r.get("owner_designation") or ""
        sector = r.get("sector") or "Manufacturing"
        
        # Combined text representation
        text = f"{name} {cat} {area} {addr} {owner} {desig}".strip()
        texts.append(text)
        labels.append(sector)

    # Add synthetic domain training augmentation for robust coverage
    augmented_samples = [
        ("CNC vertical machining center toolroom die casting Ambattur", "Manufacturing"),
        ("precision hydraulic cylinder seals lathe turning Poonamallee", "Manufacturing"),
        ("sheet metal stamping press tools jig fixture Guindy", "Manufacturing"),
        ("turnkey civil construction residential building contractor Anna Nagar", "Construction"),
        ("precast concrete structural engineering piling foundation Alwarpet", "Construction"),
        ("mep electrical plumbing contracting interior fitout Chennai", "Construction"),
        ("gated community residential villa plots promoter developer OMR", "Real Estate"),
        ("commercial office space IT park leasing promoter Guindy", "Real Estate"),
        ("apartment builder residential flats layout development T Nagar", "Real Estate"),
        ("enterprise software cloud saas analytics ai solutions OMR", "Technology"),
        ("b2b logistics warehousing 3pl supply chain freight Ennore", "Logistics")
    ]
    for txt, lbl in augmented_samples:
        texts.append(txt)
        labels.append(lbl)

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=1500, min_df=1)
    X = vectorizer.fit_transform(texts)
    y = np.array(labels)

    model = LogisticRegression(C=1.5, max_iter=300, random_state=42)
    model.fit(X, y)

    preds = model.predict(X)
    acc = accuracy_score(y, preds)
    print(f"Lead Classifier Training Accuracy: {acc * 100:.2f}% ({len(texts)} samples)")

    # Save artifacts
    joblib.dump(vectorizer, os.path.join(MODELS_DIR, "sector_vectorizer.joblib"))
    joblib.dump(model, os.path.join(MODELS_DIR, "sector_classifier.joblib"))
    print("Saved sector_vectorizer.joblib and sector_classifier.joblib")
    return model, vectorizer

def train_conversion_fit_model(rows):
    print("\n--- Training Opportunity Fit & Conversion Predictor ---")
    features = []
    labels = []

    hub_weights = {
        "ambattur": 1.0, "guindy": 1.0, "sriperumbudur": 0.95,
        "oragadam": 0.95, "maraimalai nagar": 0.90, "poonamallee": 0.90,
        "anna nagar": 0.85, "omr": 0.90, "alwarpet": 0.85, "t. nagar": 0.80
    }

    for r in rows:
        is_u50 = 1 if r.get("is_under_50") == 1 else 0
        owner = r.get("owner_name")
        has_owner = 1 if owner and owner not in ["Not Disclosed Online", "", "N/A"] else 0
        email = r.get("email")
        has_email = 1 if email and "@" in email and "yourwebsite" not in email else 0
        phone = r.get("phone")
        has_phone = 1 if phone and phone not in ["", "N/A"] else 0
        
        try:
            rating = float(r.get("rating", 0.0) or 0.0)
        except (ValueError, TypeError):
            rating = 0.0
            
        try:
            reviews = float(r.get("reviews_count", 0) or 0)
        except (ValueError, TypeError):
            reviews = 0.0
            
        area = (r.get("area") or "").lower()
        hub_w = next((v for k, v in hub_weights.items() if k in area), 0.70)
        website = r.get("website")
        has_web = 1 if website and website not in ["", "N/A"] else 0

        feat = [is_u50, has_owner, has_email, has_phone, rating, np.log1p(reviews), hub_w, has_web]
        features.append(feat)

        # High-conversion target: verified owner + deliverable corporate email + under 50 staff
        is_high_fit = 1 if (is_u50 == 1 and has_owner == 1 and has_email == 1) else 0
        labels.append(is_high_fit)

    X = np.array(features)
    y = np.array(labels)

    fit_model = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
    fit_model.fit(X, y)

    train_acc = fit_model.score(X, y)
    print(f"Fit Predictor Training Accuracy: {train_acc * 100:.2f}% (High-Value Leads: {sum(y)}/{len(y)})")

    joblib.dump(fit_model, os.path.join(MODELS_DIR, "conversion_fit_model.joblib"))
    print("Saved conversion_fit_model.joblib")
    return fit_model

def train_assistant_intent_nlu():
    print("\n--- Training Assistant Intent NLU Model ---")
    training_data = [
        # GENERATE_DAILY_EMAILS
        ("generate today's 15 emails", "GENERATE_DAILY_EMAILS"),
        ("create today's batch of emails", "GENERATE_DAILY_EMAILS"),
        ("draft 15 outreach emails for today", "GENERATE_DAILY_EMAILS"),
        ("refresh the daily email queue", "GENERATE_DAILY_EMAILS"),
        ("generate fresh batch for chennai companies", "GENERATE_DAILY_EMAILS"),
        ("new batch of 15 cold emails", "GENERATE_DAILY_EMAILS"),
        ("produce today's outreach copy", "GENERATE_DAILY_EMAILS"),

        # DISPATCH_ALL_EMAILS
        ("send all 15 emails in today's batch", "DISPATCH_ALL_EMAILS"),
        ("dispatch the emails for today", "DISPATCH_ALL_EMAILS"),
        ("send batch to prospect inboxes", "DISPATCH_ALL_EMAILS"),
        ("mark today's batch as sent", "DISPATCH_ALL_EMAILS"),
        ("dispatch all ready emails", "DISPATCH_ALL_EMAILS"),

        # GET_DAILY_EMAILS
        ("show today's email queue", "GET_DAILY_EMAILS"),
        ("view today's outreach status", "GET_DAILY_EMAILS"),
        ("what emails are scheduled for today", "GET_DAILY_EMAILS"),
        ("check pending emails in queue", "GET_DAILY_EMAILS"),
        ("how many emails are ready today", "GET_DAILY_EMAILS"),

        # SEARCH_LEADS
        ("find leads in Ambattur with email", "SEARCH_LEADS"),
        ("search construction companies in Anna Nagar", "SEARCH_LEADS"),
        ("show me precision machining leads with phone", "SEARCH_LEADS"),
        ("filter companies with verified MCA director", "SEARCH_LEADS"),
        ("find real estate developers in Guindy", "SEARCH_LEADS"),
        ("which companies have under 50 employees", "SEARCH_LEADS"),
        ("who are the verified owners in Poonamallee", "SEARCH_LEADS"),
        ("list manufacturing leads in Sriperumbudur", "SEARCH_LEADS"),

        # RUN_SWARM
        ("run 15-agent swarm on Sai Engineering", "RUN_SWARM"),
        ("analyze company Dev Hydraulics with swarm", "RUN_SWARM"),
        ("run intel dossier on Cyborg Industries", "RUN_SWARM"),
        ("deep intelligence audit on Apex Precast", "RUN_SWARM"),
        ("run swarm analysis for Reethika Precision", "RUN_SWARM"),

        # REWRITE_EMAIL
        ("rewrite email #1 with a sharper angle", "REWRITE_EMAIL"),
        ("change the pitch for email 3 to focus on WhatsApp", "REWRITE_EMAIL"),
        ("re-draft the second email in queue", "REWRITE_EMAIL"),
        ("rewrite cold email for Dev Hydraulics", "REWRITE_EMAIL"),

        # EXPORT_CSV
        ("export under 50 leads to CSV", "EXPORT_CSV"),
        ("download verified chennai leads spreadsheet", "EXPORT_CSV"),
        ("give me the csv with owner names", "EXPORT_CSV"),
        ("export all 194 leads to excel", "EXPORT_CSV"),

        # STRATEGY_QA (General LLM-style Conversational Inquiries)
        ("how can we increase our email response rate in Chennai", "STRATEGY_QA"),
        ("explain the strategy behind the Day 2 follow-up", "STRATEGY_QA"),
        ("what is the best time to email managing directors in Tamil Nadu", "STRATEGY_QA"),
        ("how does Clickfield AI help a precision CNC toolroom", "STRATEGY_QA"),
        ("why do we restrict staff size to below 50 employees", "STRATEGY_QA"),
        ("what is the legal impact of the DPDP Act 2023 on B2B cold email", "STRATEGY_QA"),
        ("compare Ambattur industrial cluster versus Guindy", "STRATEGY_QA"),
        ("why does the 'Reply with Yes' CTA convert better than booking links", "STRATEGY_QA"),
        ("what are the typical friction points for turnkey civil contractors", "STRATEGY_QA"),
        ("how do we pitch WhatsApp supervisor logs to construction founders", "STRATEGY_QA")
    ]

    queries = [item[0] for item in training_data]
    intents = [item[1] for item in training_data]

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=1000)
    X = vectorizer.fit_transform(queries)
    y = np.array(intents)

    intent_classifier = LogisticRegression(C=2.0, max_iter=300, random_state=42)
    intent_classifier.fit(X, y)

    score = intent_classifier.score(X, y)
    print(f"Intent NLU Training Accuracy: {score * 100:.2f}% ({len(queries)} samples across {len(set(intents))} intents)")

    joblib.dump(vectorizer, os.path.join(MODELS_DIR, "intent_vectorizer.joblib"))
    joblib.dump(intent_classifier, os.path.join(MODELS_DIR, "intent_classifier.joblib"))
    print("Saved intent_vectorizer.joblib and intent_classifier.joblib")

    # Save training metadata
    meta = {
        "trained_at": datetime.now().isoformat(),
        "total_training_records": len(queries),
        "intents": list(set(intents)),
        "models": [
            "sector_classifier.joblib",
            "sector_vectorizer.joblib",
            "conversion_fit_model.joblib",
            "intent_vectorizer.joblib",
            "intent_classifier.joblib"
        ]
    }
    with open(os.path.join(MODELS_DIR, "training_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

if __name__ == "__main__":
    leads = load_data()
    print(f"Loaded {len(leads)} B2B leads from database.")
    train_lead_classifier(leads)
    train_conversion_fit_model(leads)
    train_assistant_intent_nlu()
    print("\nAll ML models successfully trained and serialized to backend/app/ml_models/")
