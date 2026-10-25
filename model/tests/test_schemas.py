"""
Tests for event schemas and validation.
"""

import pytest
from pydantic import ValidationError
from model.src.identity_drift.data.schemas import (
    AgentActionEvent,
    ResourceSensitivity,
    DestinationTrustTier,
    OperationType,
    DriftType,
)


def test_agent_action_event_valid():
    event = AgentActionEvent(
        event_id="evt-001",
        session_id="sess-001",
        timestamp="2026-10-25T12:00:00Z",
        step_index=0,
        agent_id="agent-01",
        agent_role="customer_support",
        task_id="task-01",
        task_category="support",
        tool="search",
        operation=OperationType.QUERY,
        resource="knowledgebase",
        resource_sensitivity=ResourceSensitivity.PUBLIC,
        destination="internal_kb",
        destination_trust_tier=DestinationTrustTier.TRUSTED_INTERNAL,
        is_allowed_by_policy=True,
        scenario_id="scen-01",
        scenario_category="normal_in_role",
    )
    assert event.event_id == "evt-001"
    assert event.is_drift is False
    assert event.is_allowed_by_policy is True


def test_agent_action_event_empty_field_raises():
    with pytest.raises(ValidationError):
        AgentActionEvent(
            event_id="",  # Empty event_id should fail validator
            session_id="sess-001",
            timestamp="2026-10-25T12:00:00Z",
            step_index=0,
            agent_id="agent-01",
            agent_role="customer_support",
            task_id="task-01",
            task_category="support",
            tool="search",
            operation=OperationType.QUERY,
            resource="knowledgebase",
            resource_sensitivity=ResourceSensitivity.PUBLIC,
            destination="internal_kb",
            destination_trust_tier=DestinationTrustTier.TRUSTED_INTERNAL,
            scenario_id="scen-01",
            scenario_category="normal_in_role",
        )
