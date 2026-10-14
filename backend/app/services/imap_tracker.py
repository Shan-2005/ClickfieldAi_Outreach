import re
import imaplib
import email
import email.message
from email.header import decode_header
from typing import Dict, Any, Tuple, Optional
from datetime import datetime

BOUNCE_SENDER_PATTERNS = [
    r"mailer-daemon",
    r"postmaster",
    r"mail-delivery-system",
    r"bounces?@",
    r"noreply@.*mail"
]

BOUNCE_KEYWORDS = [
    "delivery status notification",
    "failure notice",
    "undelivered mail",
    "returned mail",
    "undeliverable",
    "5.1.1",
    "5.2.1",
    "5.4.1",
    "user unknown",
    "mailbox unavailable",
    "host not found",
    "recipient rejected"
]

AUTO_REPLY_KEYWORDS = [
    "out of office",
    "automatic reply",
    "autoreply",
    "on annual leave",
    "on leave",
    "vacation response",
    "away from my email",
    "currently unavailable"
]

UNSUBSCRIBE_KEYWORDS = [
    "unsubscribe",
    "no thanks",
    "not interested",
    "stop",
    "remove me",
    "please remove",
    "take me off",
    "opt out",
    "do not contact",
    "don't contact",
    "wrong person",
    "cease and desist"
]

INTERESTED_KEYWORDS = [
    "interested",
    "sounds good",
    "send over",
    "send more",
    "please send",
    "can you send",
    "yes",
    "let's talk",
    "let's connect",
    "share the deck",
    "share details",
    "schedule a call",
    "book a time",
    "happy to connect",
    "share pricing",
    "send the video",
    "what are the costs"
]

def classify_inbound_message(
    from_email: str,
    subject: str,
    headers: Dict[str, str],
    body_text: str
) -> Tuple[str, str]:
    """
    Classifies an inbound message using deterministic B2B rules:
    Returns (classification, rule_matched):
    - BOUNCED
    - AUTO_REPLY
    - UNSUBSCRIBED
    - INTERESTED
    - REPLIED (needs human)
    """
    from_clean = (from_email or "").lower()
    subj_clean = (subject or "").lower()
    body_clean = (body_text or "").lower()

    # 1. BOUNCE CHECK
    for pattern in BOUNCE_SENDER_PATTERNS:
        if re.search(pattern, from_clean):
            return "BOUNCED", f"Sender matches bounce pattern: {pattern}"

    for kw in BOUNCE_KEYWORDS:
        if kw in subj_clean or kw in body_clean:
            return "BOUNCED", f"Matched bounce diagnostic text: '{kw}'"

    # DSN 5.x.x code check
    if re.search(r"\b5\.[0-9]\.[0-9]\b", body_clean) or re.search(r"status:\s*5\.", body_clean):
        return "BOUNCED", "Matched DSN 5.x.x permanent delivery failure code"

    # 2. AUTO-REPLY / OUT OF OFFICE CHECK
    auto_submitted = headers.get("auto-submitted", "").lower()
    if auto_submitted and auto_submitted != "no":
        return "AUTO_REPLY", f"Auto-Submitted header present: '{auto_submitted}'"

    x_auto_response = headers.get("x-autoreply", "").lower()
    if x_auto_response or headers.get("x-autorespond"):
        return "AUTO_REPLY", "Auto-responder header detected"

    for kw in AUTO_REPLY_KEYWORDS:
        if kw in subj_clean or kw in body_clean[:200]:
            return "AUTO_REPLY", f"Matched out-of-office phrasing: '{kw}'"

    # 3. UNSUBSCRIBE CHECK
    for kw in UNSUBSCRIBE_KEYWORDS:
        # Check boundary words or phrases
        if re.search(r"\b" + re.escape(kw) + r"\b", body_clean):
            return "UNSUBSCRIBED", f"Prospect opted out with keyword: '{kw}'"

    # 4. POSITIVE INTEREST CHECK
    for kw in INTERESTED_KEYWORDS:
        if re.search(r"\b" + re.escape(kw) + r"\b", body_clean):
            return "INTERESTED", f"High-intent positive response keyword: '{kw}'"

    # 5. GENERAL HUMAN REPLY (Needs human review)
    return "REPLIED", "Prospect replied with custom inquiries; human review required"

def extract_body_text_from_email_message(msg: email.message.Message) -> str:
    """Extracts plain text body and limits to 300 characters for strict compliance."""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            if content_type == "text/plain" and "attachment" not in content_disposition:
                payload = part.get_payload(decode=True)
                if payload:
                    body = payload.decode(errors="ignore")
                    break
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode(errors="ignore")

    # Clean whitespace and truncate strictly to 300 chars
    cleaned = " ".join(body.split())
    return cleaned[:300]
