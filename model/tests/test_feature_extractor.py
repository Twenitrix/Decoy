"""
Unit tests for Feature Extractor and History Buffer.
"""

import pandas as pd
from model.src.identity_drift.features.extractor import IdentityDriftFeatureExtractor
from model.src.identity_drift.features.history_buffer import AgentHistoryBuffer


def test_history_buffer_cold_start():
    buf = AgentHistoryBuffer(max_capacity=5)
    snap = buf.get_snapshot()
    assert snap.is_cold_start is True
    assert snap.prev_tool == "START_OF_SESSION"
    assert snap.history_length == 0
    assert snap.failed_attempt_count == 0


def test_history_buffer_sequence_and_taint():
    buf = AgentHistoryBuffer(max_capacity=5)
    buf.push({
        "tool": "read_records",
        "operation": "read",
        "resource_sensitivity": "confidential",
        "is_allowed_by_policy": True,
    })
    snap1 = buf.get_snapshot()
    assert snap1.is_cold_start is False
    assert snap1.prev_tool == "read_records"
    assert snap1.history_length == 1
    assert snap1.sensitive_data_accessed_in_session is True

    # Push a failed attempt
    buf.push({
        "tool": "delete_all",
        "operation": "delete",
        "resource_sensitivity": "restricted",
        "is_allowed_by_policy": False,
    })
    snap2 = buf.get_snapshot()
    assert snap2.prev_tool == "delete_all"
    assert snap2.failed_attempt_count == 1


def test_feature_extractor_no_label_leakage():
    # Construct raw records with ground truth labels
    train_data = pd.DataFrame([
        {
            "event_id": "evt-01",
            "session_id": "sess-01",
            "step_index": 0,
            "agent_role": "customer_support",
            "task_category": "support",
            "tool": "search_kb",
            "operation": "query",
            "resource_sensitivity": "public",
            "destination_trust_tier": "trusted_internal",
            "record_count": 5,
            "data_volume_bytes": 1024,
            "is_allowed_by_policy": True,
            "session_age_seconds": 10.0,
            # Labels:
            "is_drift": False,
            "drift_type": "none",
            "scenario_category": "normal_in_role",
            "scenario_id": "scen-01",
            "label_justification": "Normal benign action",
            "is_synthetic": True,
        }
    ])

    extractor = IdentityDriftFeatureExtractor().fit(train_data)
    feat_df = extractor.extract_dataframe(train_data)

    # Verify all forbidden label columns are absent
    for col in IdentityDriftFeatureExtractor.FORBIDDEN_LABEL_COLUMNS:
        assert col not in feat_df.columns, f"Label leakage: {col} found in feature dataframe!"

    assert "tool" in feat_df.columns
    assert "resource_sensitivity_tier" in feat_df.columns
    assert "log_record_count" in feat_df.columns
