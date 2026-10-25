"""
Unit tests for Baseline Detectors.
"""

import pandas as pd
from model.src.identity_drift.models.baselines import (
    PolicyRuleBaseline,
    SmoothedLikelihoodBaseline,
    MarkovSequenceBaseline,
    CompositeBaselineDetector,
)


def test_policy_rule_baseline():
    rule_base = PolicyRuleBaseline()
    
    # Allowed case
    feat_ok = {"is_allowed_by_policy": True, "is_in_permission_scope": True}
    is_viol, reasons = rule_base.predict_record(feat_ok)
    assert is_viol is False
    assert len(reasons) == 0

    # Denied by policy
    feat_denied = {"is_allowed_by_policy": False, "is_in_permission_scope": True}
    is_viol, reasons = rule_base.predict_record(feat_denied)
    assert is_viol is True
    assert "HARD_POLICY_DISALLOWED" in reasons

    # Out of scope
    feat_scope = {"is_allowed_by_policy": True, "is_in_permission_scope": False}
    is_viol, reasons = rule_base.predict_record(feat_scope)
    assert is_viol is True
    assert "OUT_OF_PERMISSION_SCOPE" in reasons


def test_smoothed_likelihood_and_composite():
    train_feat = pd.DataFrame([
        {
            "agent_role": "customer_support",
            "tool": "search_kb",
            "operation": "query",
            "resource_sensitivity_tier": 0,
            "destination_trust_tier_num": 0,
            "prev_tool": "START_OF_SESSION",
            "is_allowed_by_policy": True,
            "is_in_permission_scope": True,
            "sensitive_egress_indicator": False,
            "is_cold_start": True,
        },
        {
            "agent_role": "customer_support",
            "tool": "search_kb",
            "operation": "query",
            "resource_sensitivity_tier": 0,
            "destination_trust_tier_num": 0,
            "prev_tool": "search_kb",
            "is_allowed_by_policy": True,
            "is_in_permission_scope": True,
            "sensitive_egress_indicator": False,
            "is_cold_start": False,
        }
    ])

    detector = CompositeBaselineDetector(anomaly_threshold=6.0)
    detector.fit(train_feat)

    # In-role record
    normal_rec = {
        "agent_role": "customer_support",
        "tool": "search_kb",
        "operation": "query",
        "resource_sensitivity_tier": 0,
        "destination_trust_tier_num": 0,
        "prev_tool": "search_kb",
        "is_allowed_by_policy": True,
        "is_in_permission_scope": True,
        "sensitive_egress_indicator": False,
        "is_cold_start": False,
    }
    out_normal = detector.predict_record(normal_rec)
    assert out_normal["policy_violation"] is False
    assert out_normal["anomaly_score"] < 6.0
    assert out_normal["predicted_drift"] is False

    # Out-of-role anomalous record (shell execution + egress)
    anomaly_rec = {
        "agent_role": "customer_support",
        "tool": "execute_shell",
        "operation": "execute",
        "resource_sensitivity_tier": 3,
        "destination_trust_tier_num": 2,
        "prev_tool": "search_kb",
        "is_allowed_by_policy": True,
        "is_in_permission_scope": True,
        "sensitive_egress_indicator": True,
        "is_cold_start": False,
    }
    out_anomaly = detector.predict_record(anomaly_rec)
    assert out_anomaly["anomaly_score"] > out_normal["anomaly_score"]
    assert out_anomaly["predicted_drift"] is True
