import pytest
from app.services.imap_tracker import classify_inbound_message

SAMPLE_MESSAGES = [
    # --- 1. BOUNCE SAMPLES (5) ---
    {
        "sender": "mailer-daemon@googlemail.com",
        "subject": "Delivery Status Notification (Failure)",
        "headers": {},
        "body": "Your message to ceo@old-chennai-plant.com couldn't be delivered. 5.1.1 The email account that you tried to reach does not exist.",
        "expected": "BOUNCED"
    },
    {
        "sender": "postmaster@outlook.com",
        "subject": "Undeliverable: Clickfield AI Industrial Automation",
        "headers": {},
        "body": "Remote Server returned '550 5.4.1 Recipient address rejected: Access denied'. Diagnostic-Code: smtp; 550 5.4.1",
        "expected": "BOUNCED"
    },
    {
        "sender": "mail-delivery-system@corp-server.in",
        "subject": "Failure Notice",
        "headers": {},
        "body": "Hi. This is the qmail-send program. I'm afraid I wasn't able to deliver your message. User unknown.",
        "expected": "BOUNCED"
    },
    {
        "sender": "bounce-handler@domain.com",
        "subject": "Returned mail: see transcript for details",
        "headers": {},
        "body": "The following address had permanent fatal errors: <procurement@closedplant.in>. Status: 5.2.1 Mailbox unavailable",
        "expected": "BOUNCED"
    },
    {
        "sender": "noreply@mx.telecom.in",
        "subject": "Undelivered Mail Returned to Sender",
        "headers": {},
        "body": "Host or domain name not found. Name service error for name=nonexistent-plant.in: Host not found",
        "expected": "BOUNCED"
    },

    # --- 2. OUT-OF-OFFICE / AUTO-REPLY SAMPLES (4) ---
    {
        "sender": "plant.manager@precisionengg.com",
        "subject": "Automatic reply: idea on RFQ flow",
        "headers": {"auto-submitted": "auto-replied"},
        "body": "Thank you for reaching out. I am currently out of the office until Monday 20th Oct with limited email access.",
        "expected": "AUTO_REPLY"
    },
    {
        "sender": "md@diecasting.in",
        "subject": "Out of Office: Clickfield Automation",
        "headers": {},
        "body": "I am on annual leave from the factory and will return next week. For urgent shop-floor maintenance contact Kumar.",
        "expected": "AUTO_REPLY"
    },
    {
        "sender": "sales@autoparts.com",
        "subject": "Autoreply: Enquiry",
        "headers": {"x-autoreply": "yes"},
        "body": "This is an automatic notification that your message has been received by our server queue.",
        "expected": "AUTO_REPLY"
    },
    {
        "sender": "director@chennaicivils.com",
        "subject": "Vacation response",
        "headers": {},
        "body": "I am away from my email attending an international manufacturing expo.",
        "expected": "AUTO_REPLY"
    },

    # --- 3. UNSUBSCRIBE / OPT-OUT SAMPLES (5) ---
    {
        "sender": "procurement@fabunits.com",
        "subject": "Re: idea on machining bottlenecks",
        "headers": {},
        "body": "Please unsubscribe me from your emails. We do not require outside IT services.",
        "expected": "UNSUBSCRIBED"
    },
    {
        "sender": "owner@metalsheets.in",
        "subject": "Re: Clickfield enquiry",
        "headers": {},
        "body": "No thanks. Please remove our email from your list.",
        "expected": "UNSUBSCRIBED"
    },
    {
        "sender": "ops@contractorhub.in",
        "subject": "Re: project telemetry",
        "headers": {},
        "body": "Not interested. Stop sending messages.",
        "expected": "UNSUBSCRIBED"
    },
    {
        "sender": "admin@guindyworks.com",
        "subject": "Re: RFQ",
        "headers": {},
        "body": "Do not contact this address again. Take me off your database.",
        "expected": "UNSUBSCRIBED"
    },
    {
        "sender": "info@oragadam.com",
        "subject": "Opt out",
        "headers": {},
        "body": "I want to opt out of your outreach communications.",
        "expected": "UNSUBSCRIBED"
    },

    # --- 4. HIGH-INTENT INTEREST / "YES" SAMPLES (5) ---
    {
        "sender": "md@saienggindia.com",
        "subject": "Re: idea on Sai Engineering RFQ and job-card flow",
        "headers": {},
        "body": "Yes, please send over the 2-minute video breakdown. We run 12 CNC lines in Guindy and need to track cycle times.",
        "expected": "INTERESTED"
    },
    {
        "sender": "director@charaautomation.com",
        "subject": "Re: Motor telemetry",
        "headers": {},
        "body": "Sounds good. Can you send more information on how you connect to Siemens PLCs?",
        "expected": "INTERESTED"
    },
    {
        "sender": "gm@reethikaprecision.com",
        "subject": "Re: machining lines",
        "headers": {},
        "body": "We are interested. Let's talk this Thursday afternoon. Share the deck beforehand.",
        "expected": "INTERESTED"
    },
    {
        "sender": "partner@chennaiproperties.com",
        "subject": "Re: WhatsApp CRM routing",
        "headers": {},
        "body": "Happy to connect. Please schedule a call with our technical director next Tuesday.",
        "expected": "INTERESTED"
    },
    {
        "sender": "ceo@ambattur-plastics.com",
        "subject": "Re: ERP latency",
        "headers": {},
        "body": "Yes, please share details and pricing for your shop-floor telemetry ingestion buffer.",
        "expected": "INTERESTED"
    },

    # --- 5. GENERAL HUMAN REPLIES (Needs human review) (3) ---
    {
        "sender": "it.lead@heavyfab.com",
        "subject": "Re: enquiry",
        "headers": {},
        "body": "Are you able to integrate with legacy SAP ECC 6.0 running on an internal AS400 server without cloud access?",
        "expected": "REPLIED"
    },
    {
        "sender": "purchase@chennaimetal.com",
        "subject": "Re: vendor portal",
        "headers": {},
        "body": "What is your hourly engineering rate for custom full-stack React and Python developers?",
        "expected": "REPLIED"
    },
    {
        "sender": "consultant@sriperumbudur.com",
        "subject": "Re: Clickfield proposal",
        "headers": {},
        "body": "Who was your previous client in the automotive stamping domain in Tamil Nadu?",
        "expected": "REPLIED"
    }
]

@pytest.mark.parametrize("msg", SAMPLE_MESSAGES)
def test_reply_classifier_at_least_20_samples(msg):
    classification, reason = classify_inbound_message(
        from_email=msg["sender"],
        subject=msg["subject"],
        headers=msg["headers"],
        body_text=msg["body"]
    )
    assert classification == msg["expected"], f"Failed for {msg['sender']} (expected {msg['expected']}, got {classification}). Reason: {reason}"
