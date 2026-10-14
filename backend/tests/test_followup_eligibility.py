import pytest
from app.services.scheduler import check_followup_eligibility

def test_followup_eligible_when_all_conditions_met():
    result = check_followup_eligibility(
        previous_touch_sent=True,
        has_reply=False,
        is_bounced=False,
        is_unsubscribed=False,
        is_paused=False,
        current_daily_count=5,
        daily_cap=15,
        claims_lint_passed=True
    )
    assert result["eligible"] is True
    assert "satisfied" in result["reason"].lower()

def test_followup_stops_when_previous_touch_not_sent():
    result = check_followup_eligibility(
        previous_touch_sent=False,
        has_reply=False,
        is_bounced=False,
        is_unsubscribed=False,
        is_paused=False,
        current_daily_count=0,
        daily_cap=15,
        claims_lint_passed=True
    )
    assert result["eligible"] is False
    assert "not been sent" in result["reason"].lower()

def test_followup_stops_on_reply():
    result = check_followup_eligibility(
        previous_touch_sent=True,
        has_reply=True,
        is_bounced=False,
        is_unsubscribed=False,
        is_paused=False,
        current_daily_count=2,
        daily_cap=15,
        claims_lint_passed=True
    )
    assert result["eligible"] is False
    assert "replied" in result["reason"].lower()

def test_followup_stops_on_bounce():
    result = check_followup_eligibility(
        previous_touch_sent=True,
        has_reply=False,
        is_bounced=True,
        is_unsubscribed=False,
        is_paused=False,
        current_daily_count=2,
        daily_cap=15,
        claims_lint_passed=True
    )
    assert result["eligible"] is False
    assert "bounced" in result["reason"].lower()

def test_followup_stops_on_unsubscribe():
    result = check_followup_eligibility(
        previous_touch_sent=True,
        has_reply=False,
        is_bounced=False,
        is_unsubscribed=True,
        is_paused=False,
        current_daily_count=2,
        daily_cap=15,
        claims_lint_passed=True
    )
    assert result["eligible"] is False
    assert "unsubscribe" in result["reason"].lower() or "opt-out" in result["reason"].lower()

def test_followup_stops_on_pause():
    result = check_followup_eligibility(
        previous_touch_sent=True,
        has_reply=False,
        is_bounced=False,
        is_unsubscribed=False,
        is_paused=True,
        current_daily_count=2,
        daily_cap=15,
        claims_lint_passed=True
    )
    assert result["eligible"] is False
    assert "paused" in result["reason"].lower()

def test_followup_stops_on_daily_cap_reached():
    result = check_followup_eligibility(
        previous_touch_sent=True,
        has_reply=False,
        is_bounced=False,
        is_unsubscribed=False,
        is_paused=False,
        current_daily_count=15,
        daily_cap=15,
        claims_lint_passed=True
    )
    assert result["eligible"] is False
    assert "cap reached" in result["reason"].lower()

def test_followup_stops_on_claims_linter_failure():
    result = check_followup_eligibility(
        previous_touch_sent=True,
        has_reply=False,
        is_bounced=False,
        is_unsubscribed=False,
        is_paused=False,
        current_daily_count=5,
        daily_cap=15,
        claims_lint_passed=False
    )
    assert result["eligible"] is False
    assert "claims" in result["reason"].lower()
