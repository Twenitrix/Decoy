"""
Comprehensive Unit Tests for Standalone Inference Engine and Integration Contract.
"""

from pathlib import Path
import pytest
from pydantic import ValidationError
from model.src.identity_drift.inference.engine import IdentityDriftInferenceEngine
from model.src.identity_drift.inference.schemas import InferenceRequest, ActionPayload, ContextPayload, DecisionTier


@pytest.fixture
def engine():
    eng = IdentityDriftInferenceEngine()
    eng.reset_all()
    return eng


def test_valid_benign_event_inference(engine):
    req = {
        "event_id": "evt-test-01",
        "session_id": "sess-support-01",
        "agent_id": "agent-support-01",
        "agent_role": "customer_support",
        "timestamp": "2026-10-25T12:00:00Z",
        "step_index": 0,
        "action": {
            "tool": "search_knowledgebase",
            "operation": "query",
            "resource": "public_faq",
            "resource_sensitivity": "public",
            "destination": "internal_search_service",
            "destination_trust_tier": "trusted_internal",
            "record_count": 5,
            "data_volume_bytes": 2048,
            "is_allowed_by_policy": True,
        },
        "context": {
            "task_id": "task-ticket-101",
            "task_category": "customer_support",
            "policy_version": "v1.0",
            "permission_scope": ["search_knowledgebase", "get_customer_profile"],
            "session_age_seconds": 0.0,
            "untrusted_content_in_context": False,
            "sensitive_data_accessed_in_session": False,
        }
    }

    resp = engine.evaluate(req)

    assert resp.inference_status == "SUCCESS"
    assert resp.event_id == "evt-test-01"
    assert resp.deterministic_policy.is_violation is False
    assert resp.risk_summary.is_cold_start is True
    assert resp.risk_summary.recommended_tier in [DecisionTier.L0_ALLOW, DecisionTier.L1_OBSERVE]
    assert resp.composite_anomaly.anomaly_score < 6.0


def test_deterministic_policy_denial_cannot_be_overridden(engine):
    # Even if tool or action appears innocuous, is_allowed_by_policy=False must force L3_BLOCK
    req = {
        "event_id": "evt-test-denied",
        "session_id": "sess-denied-01",
        "agent_id": "agent-support-01",
        "agent_role": "customer_support",
        "timestamp": "2026-10-25T12:01:00Z",
        "step_index": 0,
        "action": {
            "tool": "search_knowledgebase",
            "operation": "query",
            "resource": "public_faq",
            "resource_sensitivity": "public",
            "destination": "internal_search_service",
            "destination_trust_tier": "trusted_internal",
            "record_count": 1,
            "data_volume_bytes": 512,
            "is_allowed_by_policy": False,  # Gateway explicit hard deny!
        },
        "context": {
            "task_id": "task-denied-01",
            "task_category": "customer_support",
            "permission_scope": [],
        }
    }

    resp = engine.evaluate(req)

    assert resp.inference_status == "SUCCESS"
    assert resp.deterministic_policy.is_violation is True
    assert "HARD_POLICY_DISALLOWED" in resp.deterministic_policy.reasons
    assert resp.risk_summary.recommended_tier == DecisionTier.L3_BLOCK


def test_sequential_history_tracking(engine):
    # Step 0
    req_step0 = {
        "event_id": "evt-seq-00",
        "session_id": "sess-seq-01",
        "agent_id": "agent-procure-01",
        "agent_role": "procurement",
        "timestamp": "2026-10-25T12:00:00Z",
        "step_index": 0,
        "action": {
            "tool": "search_suppliers",
            "operation": "query",
            "resource": "public_supplier_directory",
            "resource_sensitivity": "public",
            "destination": "vendor_portal",
            "destination_trust_tier": "trusted_internal",
            "record_count": 10,
            "data_volume_bytes": 4096,
            "is_allowed_by_policy": True,
        },
        "context": {
            "task_id": "task-procure-01",
            "task_category": "procurement",
        }
    }
    resp0 = engine.evaluate(req_step0)
    assert resp0.risk_summary.is_cold_start is True

    # Step 1: Same session, history buffer should now have length 1
    req_step1 = {
        "event_id": "evt-seq-01",
        "session_id": "sess-seq-01",
        "agent_id": "agent-procure-01",
        "agent_role": "procurement",
        "timestamp": "2026-10-25T12:00:30Z",
        "step_index": 1,
        "action": {
            "tool": "read_vendor_quote",
            "operation": "read",
            "resource": "confidential_pricing",
            "resource_sensitivity": "confidential",
            "destination": "finance_vault",
            "destination_trust_tier": "trusted_internal",
            "record_count": 1,
            "data_volume_bytes": 8192,
            "is_allowed_by_policy": True,
        },
        "context": {
            "task_id": "task-procure-01",
            "task_category": "procurement",
            "session_age_seconds": 30.0,
        }
    }
    resp1 = engine.evaluate(req_step1)
    assert resp1.risk_summary.is_cold_start is False


def test_agent_session_isolation(engine):
    # Session A executes a confidential read
    req_sess_a = {
        "event_id": "evt-sess-a",
        "session_id": "sess-AAA",
        "agent_id": "agent-01",
        "agent_role": "customer_support",
        "timestamp": "2026-10-25T12:00:00Z",
        "step_index": 0,
        "action": {
            "tool": "get_customer_profile",
            "operation": "read",
            "resource": "customer_profile",
            "resource_sensitivity": "confidential",
            "destination": "crm",
            "destination_trust_tier": "trusted_internal",
            "is_allowed_by_policy": True,
        },
        "context": {"task_id": "task-a"}
    }
    engine.evaluate(req_sess_a)

    # Session B executes step 0; its buffer must be completely cold, not seeing Session A
    req_sess_b = {
        "event_id": "evt-sess-b",
        "session_id": "sess-BBB",
        "agent_id": "agent-02",
        "agent_role": "procurement",
        "timestamp": "2026-10-25T12:00:00Z",
        "step_index": 0,
        "action": {
            "tool": "search_suppliers",
            "operation": "query",
            "resource": "public_dir",
            "resource_sensitivity": "public",
            "destination": "portal",
            "destination_trust_tier": "trusted_internal",
            "is_allowed_by_policy": True,
        },
        "context": {"task_id": "task-b"}
    }
    resp_b = engine.evaluate(req_sess_b)
    assert resp_b.risk_summary.is_cold_start is True
    assert engine.session_buffers["sess-BBB"].get_snapshot().history_length == 1
    assert engine.session_buffers["sess-AAA"].get_snapshot().history_length == 1


def test_invalid_schema_fail_safe_behavior(engine):
    # Payload with missing required action and context
    malformed_req = {
        "event_id": "evt-bad",
        "agent_id": "agent-01",
        # Missing session_id, action, context
    }
    resp = engine.evaluate(malformed_req)

    assert resp.inference_status == "FAIL_SAFE_ERROR"
    assert resp.deterministic_policy.is_violation is True
    assert resp.risk_summary.recommended_tier in [DecisionTier.L2_STEP_UP, DecisionTier.L3_BLOCK]
    assert "Invalid inference request schema" in (resp.error_message or "")


def test_json_serializability(engine):
    req = {
        "event_id": "evt-json-01",
        "session_id": "sess-json-01",
        "agent_id": "agent-01",
        "agent_role": "research_assistant",
        "timestamp": "2026-10-25T12:00:00Z",
        "step_index": 0,
        "action": {
            "tool": "search_papers",
            "operation": "query",
            "resource": "academic_index",
            "resource_sensitivity": "public",
            "destination": "arxiv",
            "destination_trust_tier": "partner_approved",
            "is_allowed_by_policy": True,
        },
        "context": {"task_id": "task-research"}
    }
    resp = engine.evaluate(req)
    # Serialize to JSON string and dict
    json_str = resp.model_dump_json()
    assert isinstance(json_str, str)
    d = resp.model_dump()
    assert d["event_id"] == "evt-json-01"
    assert d["inference_status"] == "SUCCESS"
