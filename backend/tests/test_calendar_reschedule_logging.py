import pytest
import asyncio
from datetime import date, timedelta
from fastapi import HTTPException
from unittest.mock import MagicMock, AsyncMock, patch
from app.api.routes_calendar import reschedule_followup, RescheduleRequest

def test_reschedule_past_date_is_blocked():
    async def _run():
        yesterday = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")
        payload = RescheduleRequest(lead_id=1, new_date=yesterday)
        
        with pytest.raises(HTTPException) as exc_info:
            await reschedule_followup(payload=payload, current_user=None, db=AsyncMock())
        
        assert exc_info.value.status_code == 400
        assert "past" in exc_info.value.detail.lower()

    asyncio.run(_run())

def test_reschedule_future_date_updates_and_logs():
    async def _run():
        tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
        payload = RescheduleRequest(lead_id=1, new_date=tomorrow)

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()

        # Mock sqlite3 calls inside reschedule_followup
        with patch("sqlite3.connect") as mock_conn:
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = ("Precision Tech Industries", "2026-10-10")
            mock_conn.return_value.cursor.return_value = mock_cursor

            res = await reschedule_followup(payload=payload, current_user=None, db=mock_db)

            assert res["status"] == "success"
            assert res["new_date"] == tomorrow

            # Verify SQL update was called
            mock_cursor.execute.assert_any_call(
                "UPDATE chennai_b2b_leads SET next_due_date = ? WHERE id = ?",
                (tomorrow, 1)
            )

            # Verify ActionLog was added to DB
            assert mock_db.add.called
            action_log_entry = mock_db.add.call_args[0][0]
            assert action_log_entry.action_type == "RESCHEDULED"
            assert action_log_entry.lead_id == 1
            assert "Rescheduled follow-up" in action_log_entry.details
            assert tomorrow in action_log_entry.details

    asyncio.run(_run())
