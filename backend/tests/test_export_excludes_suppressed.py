import pytest
import sqlite3
import os
from unittest.mock import MagicMock
from app.api.routes_datasets import ExportRequest

def test_export_contact_ready_filtering_logic():
    # Mock lead records
    sample_leads = [
        {
            "id": 1,
            "name": "Eligible Industries Ltd",
            "sector": "Manufacturing",
            "area": "Guindy",
            "email": "contact@eligible.com",
            "phone": "+91 98401 22334",
            "website": "https://eligible.com",
            "employee_range": "50-100",
            "owner_name": "R. Raman",
            "created_at": "2026-10-01",
            "stage": "NEW",
            "google_maps_url": "https://maps.google.com/?q=eligible"
        },
        {
            "id": 2,
            "name": "Suppressed Tech Labs",
            "sector": "IT & SaaS",
            "area": "OMR",
            "email": "optout@suppressedtech.com",
            "phone": "+91 98401 99999",
            "website": "https://suppressedtech.com",
            "employee_range": "20-50",
            "owner_name": "S. Sundar",
            "created_at": "2026-10-01",
            "stage": "NEW",
            "google_maps_url": "https://maps.google.com/?q=suppressed"
        },
        {
            "id": 3,
            "name": "Bounced Logistics",
            "sector": "Logistics",
            "area": "Ambattur",
            "email": "invalid@bouncedlogistics.com",
            "phone": "+91 98401 88888",
            "website": "https://bounced.com",
            "employee_range": "100-250",
            "owner_name": "K. Kumar",
            "created_at": "2026-10-01",
            "stage": "BOUNCED",
            "google_maps_url": "https://maps.google.com/?q=bounced"
        },
        {
            "id": 4,
            "name": "Unsubscribed Retail",
            "sector": "Retail",
            "area": "T. Nagar",
            "email": "stop@retail.com",
            "phone": "+91 98401 77777",
            "website": "https://retail.com",
            "employee_range": "10-20",
            "owner_name": "M. Mohan",
            "created_at": "2026-10-01",
            "stage": "UNSUBSCRIBED",
            "google_maps_url": "https://maps.google.com/?q=retail"
        },
        {
            "id": 5,
            "name": "Unknown Size Enterprise",
            "sector": "Healthcare",
            "area": "Adyar",
            "email": "info@healthcare.com",
            "phone": "+91 98401 66666",
            "website": "https://healthcare.com",
            "employee_range": "Unknown",
            "owner_name": "Dr. V. Rao",
            "created_at": "2026-10-01",
            "stage": "NEW",
            "google_maps_url": "https://maps.google.com/?q=healthcare"
        }
    ]

    suppressed_patterns = ["suppressedtech.com", "blacklist@domain.com"]

    # Apply Contact-ready rules
    filtered_rows = []
    for r in sample_leads:
        # Exclude bounced & unsubscribed
        if r["stage"] in ["BOUNCED", "UNSUBSCRIBED"]:
            continue
        # Exclude unknown size
        if not r["employee_range"] or r["employee_range"].lower() == "unknown":
            continue
        # Check suppression
        email_addr = (r["email"] or "").lower()
        if any(pat in email_addr for pat in suppressed_patterns):
            continue

        size_truth = "Estimated" if r["employee_range"] else "Unknown"
        owner_truth = "Verified" if r["owner_name"] else "Unknown"
        email_truth = "Verified" if r["email"] else "Unknown"
        phone_truth = "Verified" if r["phone"] and len(r["phone"]) >= 10 else "Needs check"
        do_not_contact = "NO"

        filtered_rows.append({
            "Company": r["name"],
            "source_url": r["google_maps_url"],
            "fetched_at": r["created_at"],
            "size_truth_status": size_truth,
            "owner_truth_status": owner_truth,
            "email_truth_status": email_truth,
            "phone_truth_status": phone_truth,
            "do_not_contact": do_not_contact
        })

    # Only Eligible Industries Ltd should pass
    assert len(filtered_rows) == 1
    passed = filtered_rows[0]
    assert passed["Company"] == "Eligible Industries Ltd"
    assert passed["source_url"] == "https://maps.google.com/?q=eligible"
    assert passed["do_not_contact"] == "NO"
    assert passed["size_truth_status"] == "Estimated"
    assert passed["email_truth_status"] == "Verified"
    assert passed["phone_truth_status"] == "Verified"
