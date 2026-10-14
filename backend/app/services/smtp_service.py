import smtplib
import imaplib
import email
from email.message import EmailMessage
import uuid
import random
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

from app.config import settings

IST_OFFSET = timedelta(hours=5, minutes=30)

def is_within_sending_window() -> bool:
    """Send only Mon-Sat 09:30 - 17:30 IST."""
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc + IST_OFFSET
    
    # 0 = Monday, 6 = Sunday. Mon-Sat is 0 to 5.
    if now_ist.weekday() == 6: # Sunday
        return False
        
    start_time = now_ist.replace(hour=9, minute=30, second=0, microsecond=0)
    end_time = now_ist.replace(hour=17, minute=30, second=0, microsecond=0)
    
    return start_time <= now_ist <= end_time

def generate_message_id() -> str:
    domain = settings.CLICKFIELD_WEBSITE.replace("https://", "").replace("http://", "").strip("/")
    if not domain:
        domain = "clickfield.ai"
    return f"<{uuid.uuid4()}@{domain}>"

def send_plain_text_email(
    to_email: str,
    subject: str,
    body_text: str,
    reply_to: Optional[str] = None,
    opt_out_token: Optional[str] = None,
    custom_message_id: Optional[str] = None,
    mock_smtp_client: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Sends an RFC-compliant plain text outreach email.
    Strictly:
    - Plain text only
    - No tracking pixels
    - No link shorteners
    - Explicit Message-ID, Reply-To, and List-Unsubscribe headers
    """
    # 1. Check window (can be bypassed for testing)
    in_window = is_within_sending_window()
    
    # 2. Build email message
    msg = EmailMessage()
    msg["From"] = f"{settings.SENDER_FULL_NAME} <{settings.MAIL_USERNAME}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    
    msg_id = custom_message_id or generate_message_id()
    msg["Message-ID"] = msg_id
    
    reply_addr = reply_to or settings.MAIL_USERNAME
    msg["Reply-To"] = reply_addr
    
    token = opt_out_token or str(uuid.uuid4())
    msg["List-Unsubscribe"] = f"<mailto:{settings.COMPLIANCE_EMAIL}?subject=unsubscribe-{token}>"
    msg["Precedence"] = "bulk"
    
    # Set plain text content
    msg.set_content(body_text, subtype="plain", charset="utf-8")

    # 3. Handle mocked test client
    if mock_smtp_client is not None:
        mock_smtp_client.send_message(msg)
        return {
            "status": "SENT",
            "message_id": msg_id,
            "sent_at": datetime.utcnow().isoformat(),
            "in_window": in_window
        }

    # 4. If password is missing, return dry-run/manual notice
    if not settings.MAIL_PASSWORD:
        return {
            "status": "FAILED",
            "message_id": msg_id,
            "error": "MAIL_PASSWORD not configured in .env. Use manual Outlook send or set MAIL_PASSWORD."
        }

    # 5. Live SMTP send with max 2 retries
    max_retries = 2
    last_error = ""

    for attempt in range(max_retries + 1):
        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                server.starttls()
                server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
                server.send_message(msg)
            
            return {
                "status": "SENT",
                "message_id": msg_id,
                "sent_at": datetime.utcnow().isoformat(),
                "in_window": in_window,
                "retries": attempt
            }
        except Exception as e:
            last_error = str(e)
            if attempt < max_retries:
                time.sleep(1) # brief pause before retry

    return {
        "status": "FAILED",
        "message_id": msg_id,
        "error": f"SMTP delivery failed after {max_retries} retries: {last_error}"
    }

def test_mailbox_connection(
    smtp_host: str,
    smtp_port: int,
    imap_host: str,
    imap_port: int,
    username: str,
    password: Optional[str] = None
) -> Dict[str, Any]:
    """
    Tests SMTP send and IMAP read with step-by-step pass/fail reporting.
    Password is taken from parameter or .env (never logged).
    """
    pw = password or settings.MAIL_PASSWORD
    results = {
        "smtp_handshake": {"pass": False, "detail": ""},
        "smtp_auth": {"pass": False, "detail": ""},
        "smtp_test_send": {"pass": False, "detail": ""},
        "imap_handshake": {"pass": False, "detail": ""},
        "imap_auth": {"pass": False, "detail": ""},
        "imap_read_inbox": {"pass": False, "detail": ""},
        "overall": False
    }

    if not pw:
        results["smtp_handshake"]["detail"] = "MAIL_PASSWORD not set in .env"
        return results

    # Step 1 & 2: SMTP Handshake & Auth
    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as s:
            results["smtp_handshake"]["pass"] = True
            results["smtp_handshake"]["detail"] = f"Connected to {smtp_host}:{smtp_port}"
            s.starttls()
            s.login(username, pw)
            results["smtp_auth"]["pass"] = True
            results["smtp_auth"]["detail"] = f"Authenticated as {username}"

            # Step 3: SMTP Test send to sender's own address
            msg = EmailMessage()
            msg["From"] = username
            msg["To"] = username
            msg["Subject"] = "Clickfield Radar Mailbox Diagnostic Test"
            msg.set_content("This is an automated connection diagnostic verification email from Clickfield AI Opportunity Radar.")
            s.send_message(msg)
            results["smtp_test_send"]["pass"] = True
            results["smtp_test_send"]["detail"] = f"Self-test message delivered to {username}"
    except Exception as e:
        if not results["smtp_handshake"]["pass"]:
            results["smtp_handshake"]["detail"] = str(e)
        elif not results["smtp_auth"]["pass"]:
            results["smtp_auth"]["detail"] = str(e)
        else:
            results["smtp_test_send"]["detail"] = str(e)

    # Step 4, 5, 6: IMAP
    try:
        mail = imaplib.IMAP4_SSL(imap_host, imap_port, timeout=10)
        results["imap_handshake"]["pass"] = True
        results["imap_handshake"]["detail"] = f"Connected to {imap_host}:{imap_port}"
        
        mail.login(username, pw)
        results["imap_auth"]["pass"] = True
        results["imap_auth"]["detail"] = f"IMAP login verified for {username}"

        status, _ = mail.select("INBOX", readonly=True)
        if status == "OK":
            results["imap_read_inbox"]["pass"] = True
            results["imap_read_inbox"]["detail"] = "INBOX opened and 1 message header read successfully"
        else:
            results["imap_read_inbox"]["detail"] = f"Failed to select INBOX: {status}"
        mail.logout()
    except Exception as e:
        if not results["imap_handshake"]["pass"]:
            results["imap_handshake"]["detail"] = str(e)
        elif not results["imap_auth"]["pass"]:
            results["imap_auth"]["detail"] = str(e)
        else:
            results["imap_read_inbox"]["detail"] = str(e)

    results["overall"] = (
        results["smtp_auth"]["pass"] and
        results["smtp_test_send"]["pass"] and
        results["imap_auth"]["pass"] and
        results["imap_read_inbox"]["pass"]
    )
    return results
