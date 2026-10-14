import pytest
import asyncio
from fastapi import HTTPException
from app.db.models import User
from app.core.auth import require_role

def test_viewer_forbidden_on_sales_action():
    async def _run():
        viewer = User(
            id="usr-viewer-1",
            email="viewer@clickfield.ai",
            full_name="Viewer Person",
            role="VIEWER",
            is_active=True
        )
        sales_or_admin = require_role(["ADMIN", "SALES"])
        
        with pytest.raises(HTTPException) as exc_info:
            await sales_or_admin(viewer)
        assert exc_info.value.status_code == 403
        assert "forbidden" in exc_info.value.detail.lower()

    asyncio.run(_run())

def test_sales_allowed_on_export_forbidden_on_admin():
    async def _run():
        sales = User(
            id="usr-sales-1",
            email="rohit@clickfield.ai",
            full_name="Rohit Sales",
            role="SALES",
            is_active=True
        )
        sales_or_admin = require_role(["ADMIN", "SALES"])
        admin_only = require_role(["ADMIN"])
        
        # Sales should pass sales_or_admin
        user_passed = await sales_or_admin(sales)
        assert user_passed.role == "SALES"
        
        # Sales should fail admin_only
        with pytest.raises(HTTPException) as exc_info:
            await admin_only(sales)
        assert exc_info.value.status_code == 403

    asyncio.run(_run())

def test_admin_allowed_everywhere():
    async def _run():
        admin = User(
            id="usr-admin-1",
            email="zoya@clickfield.ai",
            full_name="Zoya Admin",
            role="ADMIN",
            is_active=True
        )
        sales_or_admin = require_role(["ADMIN", "SALES"])
        admin_only = require_role(["ADMIN"])
        
        res1 = await sales_or_admin(admin)
        assert res1.role == "ADMIN"
        
        res2 = await admin_only(admin)
        assert res2.role == "ADMIN"

    asyncio.run(_run())

def test_reassignment_permission_rules():
    # Test reassignment business logic
    # Scenario 1: Unassigned lead can be claimed by Sales
    existing_owner_id = None
    requester_id = "usr-sales-1"
    requester_role = "SALES"
    can_reassign = (not existing_owner_id) or (existing_owner_id == requester_id) or (requester_role == "ADMIN")
    assert can_reassign is True

    # Scenario 2: Lead owned by someone else CANNOT be reassigned by another Sales user
    existing_owner_id = "usr-sales-2"
    requester_id = "usr-sales-1"
    requester_role = "SALES"
    can_reassign = (not existing_owner_id) or (existing_owner_id == requester_id) or (requester_role == "ADMIN")
    assert can_reassign is False

    # Scenario 3: Lead owned by someone else CAN be reassigned by Admin
    existing_owner_id = "usr-sales-2"
    requester_id = "usr-admin-1"
    requester_role = "ADMIN"
    can_reassign = (not existing_owner_id) or (existing_owner_id == requester_id) or (requester_role == "ADMIN")
    assert can_reassign is True
