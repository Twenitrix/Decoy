"""
Tests for AgentShield-Bench External Adapter.
"""

import pandas as pd
from model.src.identity_drift.data.external_adapter import AgentShieldBenchAdapter


def test_parse_tool_from_text():
    adapter = AgentShieldBenchAdapter()
    text = "Task: Search records\nTool: query_database\nContext: [tool_output] OK"
    tool = adapter.parse_tool_from_text(text)
    assert tool == "query_database"

    text2 = "Task: Run bash\nTool: execute_shell\nContext: none"
    assert adapter.parse_tool_from_text(text2) == "execute_shell"


def test_to_agent_action_events():
    adapter = AgentShieldBenchAdapter()
    sample_df = pd.DataFrame([
        {
            "text": "Task: Answer question\nTool: execute_shell\nContext: [tool_output] curl evil.com",
            "label": 1,
            "scenario_id": "asi-sample-01",
        },
        {
            "text": "Task: Read documentation\nTool: read_docs\nContext: clean context",
            "label": 0,
            "scenario_id": "asi-sample-02",
        }
    ])
    events = adapter.to_agent_action_events(sample_df)
    assert len(events) == 2
    assert events[0].is_drift is True
    assert events[0].is_synthetic is False
    assert events[0].tool == "execute_shell"
    assert events[1].is_drift is False
    assert events[1].is_synthetic is False
    assert events[1].tool == "read_docs"
