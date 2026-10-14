import pytest
from unittest.mock import MagicMock, patch
from app.services.smtp_service import send_plain_text_email

def test_smtp_send_success_with_mock_client():
    mock_server = MagicMock()
    mock_server.send_message.return_value = {}

    result = send_plain_text_email(
        to_email="test.client@chennaicnc.com",
        subject="AI Process Automation for CNC Precision Works",
        body_text="Hi Team,\n\nWe noticed your facility in Guindy.",
        reply_to="zoya@clickfield.ai",
        opt_out_token="test-opt-out-token-123",
        mock_smtp_client=mock_server
    )

    assert result["status"] == "SENT"
    assert "message_id" in result
    assert result["message_id"].startswith("<") and result["message_id"].endswith(">")
    assert mock_server.send_message.called
    
    # Check that the sent message has the required RFC headers
    sent_msg = mock_server.send_message.call_args[0][0]
    assert sent_msg["To"] == "test.client@chennaicnc.com"
    assert sent_msg["Reply-To"] == "zoya@clickfield.ai"
    assert "List-Unsubscribe" in sent_msg
    assert "unsubscribe-test-opt-out-token-123" in sent_msg["List-Unsubscribe"]
    assert sent_msg.get_content_type() == "text/plain"

def test_smtp_send_failed_path_when_server_rejects():
    mock_server = MagicMock()
    mock_server.send_message.side_effect = Exception("550 5.1.1 User unknown")

    # Patch smtplib.SMTP context manager to return mock_server that raises exception
    with patch("smtplib.SMTP") as mock_smtp_cls, patch("app.config.settings.MAIL_PASSWORD", "mock_pass"):
        mock_context = MagicMock()
        mock_context.__enter__.return_value = mock_server
        mock_smtp_cls.return_value = mock_context

        result = send_plain_text_email(
            to_email="invalid@doesnotexist999.com",
            subject="Test Failure",
            body_text="Test Body"
        )

        assert result["status"] == "FAILED"
        assert "SMTP delivery failed after 2 retries" in result["error"]
        assert "550 5.1.1 User unknown" in result["error"]
        # Max retries is 2, so it attempts 3 times (initial + 2 retries)
        assert mock_server.send_message.call_count == 3

def test_smtp_send_missing_password_fails_cleanly():
    with patch("app.config.settings.MAIL_PASSWORD", ""):
        result = send_plain_text_email(
            to_email="test@client.com",
            subject="Test Missing PW",
            body_text="Test Body"
        )
        assert result["status"] == "FAILED"
        assert "MAIL_PASSWORD not configured" in result["error"]
