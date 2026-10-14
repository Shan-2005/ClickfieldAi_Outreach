import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from app.api.routes_calendar import get_icalendar_feed
from app.db.models import User, Meeting

def test_icalendar_feed_generation():
    async def _run():
        test_token = "secure-token-abc123xyz"
        mock_user = User(
            id="usr-zoya-1",
            email="zoya@clickfield.ai",
            full_name="Zoya Patel",
            role="ADMIN",
            ics_token=test_token
        )

        mock_meeting = Meeting(
            id="meet-42",
            lead_id=1,
            lead_name="Sri Balaji Precision Works",
            owner_id="usr-zoya-1",
            title="Intro & AI Automation Scoping Call",
            start_time=datetime(2026, 10, 16, 11, 0),
            end_time=datetime(2026, 10, 16, 11, 45),
            location_or_link="https://meet.google.com/xyz-abc",
            notes="Discuss CNC shop floor ticketing system."
        )

        mock_db = AsyncMock()

        # Create mock result sequence for user query and meetings query
        user_result = MagicMock()
        user_result.scalars().first.return_value = mock_user

        meetings_result = MagicMock()
        meetings_result.scalars().all.return_value = [mock_meeting]

        mock_db.execute.side_effect = [user_result, meetings_result]

        response = await get_icalendar_feed(token=test_token, db=mock_db)

        assert response.status_code == 200
        assert response.media_type == "text/calendar; charset=utf-8"

        content = response.body.decode("utf-8")
        assert "BEGIN:VCALENDAR" in content
        assert "VERSION:2.0" in content
        assert "PRODID:-//Clickfield AI//Opportunity Radar 2.0//EN" in content
        assert "BEGIN:VEVENT" in content
        assert "UID:meet-meet-42@clickfield.ai" in content or "meet-42" in content
        assert "SUMMARY:Intro & AI Automation Scoping Call" in content
        assert "LOCATION:https://meet.google.com/xyz-abc" in content
        assert "STATUS:CONFIRMED" in content
        assert "END:VEVENT" in content
        assert "END:VCALENDAR" in content

    asyncio.run(_run())
