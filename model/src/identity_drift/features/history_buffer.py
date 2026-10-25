"""
Bounded Per-Agent and Per-Session History Buffer.
Maintains recent action events to extract sequence, transition, and temporal features.
"""

from __future__ import annotations
from collections import deque
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class HistorySnapshot:
    prev_tool: str
    prev_operation: str
    prev_sensitivity: str
    history_length: int
    failed_attempt_count: int
    sensitive_data_accessed_in_session: bool
    tool_frequencies: Dict[str, int]
    is_cold_start: bool


class AgentHistoryBuffer:
    """
    Bounded deque of recent action events for an agent session.
    Default capacity is 20 events.
    """

    def __init__(self, max_capacity: int = 20):
        self.max_capacity = max_capacity
        self.buffer: deque = deque(maxlen=max_capacity)
        self._consecutive_denials: int = 0
        self._sensitive_accessed: bool = False

    def push(self, event_dict: Dict[str, Any]) -> None:
        """
        Appends an event to the history deque and updates internal running state.
        """
        self.buffer.append(event_dict)

        # Track consecutive policy denials
        is_allowed = event_dict.get("is_allowed_by_policy", True)
        if not is_allowed:
            self._consecutive_denials += 1
        else:
            self._consecutive_denials = 0

        # Track sensitive resource access
        sens = str(event_dict.get("resource_sensitivity", "")).lower()
        if sens in ["confidential", "restricted"]:
            self._sensitive_accessed = True

    def get_snapshot(self) -> HistorySnapshot:
        """
        Extracts historical snapshot features for the next incoming action.
        """
        if len(self.buffer) == 0:
            return HistorySnapshot(
                prev_tool="START_OF_SESSION",
                prev_operation="NONE",
                prev_sensitivity="none",
                history_length=0,
                failed_attempt_count=0,
                sensitive_data_accessed_in_session=False,
                tool_frequencies={},
                is_cold_start=True,
            )

        last_event = self.buffer[-1]
        freqs: Dict[str, int] = {}
        for ev in self.buffer:
            t = ev.get("tool", "__UNKNOWN__")
            freqs[t] = freqs.get(t, 0) + 1

        return HistorySnapshot(
            prev_tool=last_event.get("tool", "START_OF_SESSION"),
            prev_operation=last_event.get("operation", "NONE"),
            prev_sensitivity=str(last_event.get("resource_sensitivity", "none")),
            history_length=len(self.buffer),
            failed_attempt_count=self._consecutive_denials,
            sensitive_data_accessed_in_session=self._sensitive_accessed,
            tool_frequencies=freqs,
            is_cold_start=False,
        )

    def clear(self) -> None:
        self.buffer.clear()
        self._consecutive_denials = 0
        self._sensitive_accessed = False
