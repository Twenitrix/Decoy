import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.db.models import Agent, Policy, ActionEvent, Decision, Approval

client = TestClient(app)

def test_health_and_ready():
    r1 = client.get("/api/v1/health")
    assert r1.status_code == 200
    assert r1.json()["status"] == "healthy"

    r2 = client.get("/api/v1/ready")
    assert r2.status_code == 200
    assert r2.json()["status"] == "ready"

def test_agent_listing():
    res = client.get("/api/v1/agents")
    assert res.status_code == 200
    agents = res.json()
    assert len(agents) >= 4
    procurement = next((a for a in agents if a["id"] == "agent-procurement-01"), None)
    assert procurement is not None
    assert procurement["role"] == "Procurement Specialist"

def test_gateway_allowed_action():
    payload = {
        "agent_id": "agent-procurement-01",
        "session_id": "test-session-001",
        "task_id": "test-task",
        "action": {
            "tool": "read_file",
            "resource": "supplier_catalog",
            "destination": "internal_erp",
            "parameters": {"catalog_id": "cat-test-01"}
        }
    }
    res = client.post("/api/v1/gateway/actions", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["allowed", "observed"]
    assert data["executed"] is True
    assert data["tier"] in ["L0", "L1"]
    assert data["execution_result"] is not None
    assert data["execution_result"]["status"] == "success"

def test_gateway_hard_policy_denial():
    # Attempting to access sensitive salary records forbidden by Procurement Policy
    payload = {
        "agent_id": "agent-procurement-01",
        "session_id": "test-session-002",
        "action": {
            "tool": "read_file",
            "resource": "hr_salary_records_2026",
            "destination": "internal_erp",
            "parameters": {"file": "confidential_salaries.csv"}
        }
    }
    res = client.post("/api/v1/gateway/actions", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "denied"
    assert data["executed"] is False
    assert any("SENSITIVE" in r or "RESOURCE_NOT_ALLOWED" in r for r in data["reasons"])

def test_gateway_unregistered_tool():
    payload = {
        "agent_id": "agent-procurement-01",
        "session_id": "test-session-003",
        "action": {
            "tool": "unregistered_malicious_tool",
            "parameters": {}
        }
    }
    res = client.post("/api/v1/gateway/actions", json=payload)
    assert res.status_code == 400
    assert "not registered" in res.json()["detail"]

def test_approval_flow():
    # Request approval listing
    res = client.get("/api/v1/approvals?status=pending")
    assert res.status_code == 200
    approvals = res.json()
    if len(approvals) > 0:
        appr_id = approvals[0]["id"]
        resolve_res = client.post(
            f"/api/v1/approvals/{appr_id}/resolve",
            json={
                "status": "approved",
                "reviewer_id": "TEST_SECURITY_ANALYST",
                "comment": "Verified legitimate customer support escalation"
            }
        )
        assert resolve_res.status_code == 200
        resolved_data = resolve_res.json()
        assert resolved_data["status"] == "approved"
        assert resolved_data["reviewer_id"] == "TEST_SECURITY_ANALYST"

def test_dashboard_summary():
    res = client.get("/api/v1/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_agents"] >= 4
    assert "L0" in data["risk_tier_distribution"]
    assert "L4" in data["risk_tier_distribution"]
