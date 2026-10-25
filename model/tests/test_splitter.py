"""
Tests for GroupScenarioSplitter and leakage prevention.
"""

import pandas as pd
from model.src.identity_drift.data.splitter import GroupScenarioSplitter


def test_no_leakage_between_splits():
    # Construct synthetic scenarios with multiple steps per scenario
    rows = []
    for scen_idx in range(20):
        scen_id = f"scen-{scen_idx:02d}"
        for step in range(3):
            rows.append({
                "event_id": f"evt-{scen_id}-{step}",
                "scenario_id": scen_id,
                "agent_id": f"agent-{scen_idx % 3}",
                "is_drift": bool(scen_idx % 2),
                "tool": "search",
            })
    df = pd.DataFrame(rows)

    splitter = GroupScenarioSplitter(train_ratio=0.7, val_ratio=0.15, test_ratio=0.15, seed=42)
    train_df, val_df, test_df, meta = splitter.split(df, group_col="scenario_id")

    train_scens = set(train_df["scenario_id"])
    val_scens = set(val_df["scenario_id"])
    test_scens = set(test_df["scenario_id"])

    # Strict isolation verification
    assert len(train_scens & val_scens) == 0, "Train and Val scenarios overlap!"
    assert len(train_scens & test_scens) == 0, "Train and Test scenarios overlap!"
    assert len(val_scens & test_scens) == 0, "Val and Test scenarios overlap!"
    assert len(train_df) + len(val_df) + len(test_df) == len(df)
