"""
Tests for Synthetic Scenario Generator across all 10 canonical scenarios.
"""

import pytest
from model.src.identity_drift.data.synthetic_generator import SyntheticScenarioGenerator
from model.src.identity_drift.data.schemas import DriftType


def test_generator_produces_all_scenarios():
    gen = SyntheticScenarioGenerator(seed=42)
    events = gen.generate_all_scenarios(replications_per_scenario=5)

    assert len(events) > 0

    # Verify scenario coverage across all 10 categories
    categories = set(e.scenario_category for e in events)
    expected_categories = {
        "normal_in_role",
        "forbidden_resource_access",
        "unusual_but_legitimate",
        "sensitive_read_external_transfer",
        "prompt_injection_drift",
        "repeated_denied_actions",
        "slow_gradual_drift",
        "cold_start_agent",
        "missing_incomplete_provenance",
        "multi_agent_delegation",
    }
    assert expected_categories.issubset(categories)


def test_generator_reproducibility():
    gen1 = SyntheticScenarioGenerator(seed=123)
    events1 = gen1.generate_all_scenarios(replications_per_scenario=2)

    gen2 = SyntheticScenarioGenerator(seed=123)
    events2 = gen2.generate_all_scenarios(replications_per_scenario=2)

    assert len(events1) == len(events2)
    for e1, e2 in zip(events1, events2):
        assert e1.event_id == e2.event_id
        assert e1.tool == e2.tool
        assert e1.is_drift == e2.is_drift
        assert e1.drift_type == e2.drift_type


def test_unusual_legitimate_is_not_drift():
    # Crucial test: Scenario 3 must be marked is_drift=False to test false positive resistance
    gen = SyntheticScenarioGenerator(seed=42)
    events = gen._gen_scenario_3_unusual_legitimate(rep=0)
    assert len(events) == 1
    assert events[0].is_drift is False
    assert events[0].is_allowed_by_policy is True
    assert events[0].drift_type == DriftType.UNUSUAL_LEGITIMATE
