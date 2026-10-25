"""
Feature Extractor for Identity Drift Detection.
Transforms raw event requests and session histories into structured feature sets.
Fitted exclusively on training data to prevent data leakage.
"""

from __future__ import annotations
import math
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

from .feature_schema import FEATURE_REGISTRY, FeatureType
from .history_buffer import AgentHistoryBuffer, HistorySnapshot


class IdentityDriftFeatureExtractor:
    """
    Extracts features for drift detection models and baselines.
    Fits vocabularies and reference statistics strictly on the training partition.
    """

    SENSITIVITY_MAP = {
        "public": 0,
        "internal": 1,
        "confidential": 2,
        "restricted": 3,
    }

    DESTINATION_TIER_MAP = {
        "trusted_internal": 0,
        "partner_approved": 1,
        "untrusted_external": 2,
        "unknown": 2,
    }

    # Target label and metadata columns that MUST NEVER be included in feature outputs
    FORBIDDEN_LABEL_COLUMNS = {
        "is_drift",
        "drift_type",
        "scenario_category",
        "scenario_id",
        "label_justification",
        "is_synthetic",
    }

    def __init__(self):
        self.is_fitted: bool = False
        self.known_roles: set = set()
        self.known_tools: set = set()
        self.known_operations: set = set()
        self.known_destinations: set = set()

    def fit(self, df_train: pd.DataFrame) -> "IdentityDriftFeatureExtractor":
        """
        Learns known feature vocabularies and categories from training data only.
        """
        self.known_roles = set(df_train["agent_role"].dropna().unique()) if "agent_role" in df_train.columns else set()
        self.known_tools = set(df_train["tool"].dropna().unique()) if "tool" in df_train.columns else set()
        self.known_operations = set(df_train["operation"].dropna().unique()) if "operation" in df_train.columns else set()
        self.known_destinations = set(df_train["destination"].dropna().unique()) if "destination" in df_train.columns else set()
        self.is_fitted = True
        return self

    def extract_single_event(
        self,
        event: Dict[str, Any],
        history_snapshot: Optional[HistorySnapshot] = None,
    ) -> Dict[str, Any]:
        """
        Extracts features for a single event, combining current request with historical snapshot.
        """
        features: Dict[str, Any] = {}

        # 1. Identity Context
        role = event.get("agent_role", "__UNKNOWN_ROLE__")
        features["agent_role"] = role if (not self.is_fitted or role in self.known_roles) else "__UNKNOWN_ROLE__"
        features["task_category"] = event.get("task_category", "unspecified_task")
        
        delegation = event.get("delegation_chain")
        features["has_delegation"] = bool(len(delegation) > 0) if delegation is not None else False

        # 2. Action Attributes
        tool = event.get("tool", "__UNKNOWN_TOOL__")
        features["tool"] = tool if (not self.is_fitted or tool in self.known_tools) else "__UNKNOWN_TOOL__"
        
        op = str(event.get("operation", "query")).lower()
        features["operation"] = op if (not self.is_fitted or op in self.known_operations) else "query"

        sens_str = str(event.get("resource_sensitivity", "internal")).lower()
        sens_num = self.SENSITIVITY_MAP.get(sens_str, 1)
        features["resource_sensitivity_tier"] = sens_num

        dest_str = str(event.get("destination_trust_tier", "unknown")).lower()
        dest_num = self.DESTINATION_TIER_MAP.get(dest_str, 2)
        features["destination_trust_tier_num"] = dest_num

        rec_count = max(0, int(event.get("record_count", 1)))
        vol_bytes = max(0, int(event.get("data_volume_bytes", 0)))
        features["log_record_count"] = math.log1p(rec_count)
        features["log_volume_bytes"] = math.log1p(vol_bytes)

        # 3. Policy & Scope Indicators
        scope = event.get("permission_scope")
        scope_list = list(scope) if scope is not None else []
        features["is_in_permission_scope"] = (tool in scope_list) if len(scope_list) > 0 else True
        features["is_allowed_by_policy"] = bool(event.get("is_allowed_by_policy", True))

        # 4. Provenance & Taint
        features["untrusted_content_in_context"] = bool(event.get("untrusted_content_in_context", False))
        
        # History-aware or event-level sensitive flag
        hist_sensitive = history_snapshot.sensitive_data_accessed_in_session if history_snapshot else False
        event_sensitive = bool(event.get("sensitive_data_accessed_in_session", False)) or (sens_num >= 2)
        sensitive_active = hist_sensitive or event_sensitive
        features["sensitive_data_accessed_in_session"] = sensitive_active
        features["sensitive_egress_indicator"] = (sensitive_active and dest_num == 2)

        # 5. Temporal & Frequency
        step_idx = max(0, int(event.get("step_index", 0)))
        session_age = max(0.0, float(event.get("session_age_seconds", 0.0)))
        features["step_index"] = step_idx
        features["action_rate"] = step_idx / max(1.0, session_age)

        # 6. Sequence & History
        if history_snapshot is not None:
            features["prev_tool"] = history_snapshot.prev_tool
            features["prev_operation"] = history_snapshot.prev_operation
            features["history_length"] = history_snapshot.history_length
            features["failed_attempt_count"] = history_snapshot.failed_attempt_count
            features["is_cold_start"] = history_snapshot.is_cold_start
        else:
            features["prev_tool"] = "START_OF_SESSION"
            features["prev_operation"] = "NONE"
            features["history_length"] = 0
            features["failed_attempt_count"] = 0
            features["is_cold_start"] = True

        return features

    def extract_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extracts features from an entire DataFrame of events.
        Simulates session progression along trajectories (grouped by session_id).
        Guarantees that target labels are completely excluded from the returned features.
        """
        records: List[Dict[str, Any]] = []

        # Process per session to correctly propagate history buffers
        for session_id, group in df.groupby("session_id", sort=False):
            buffer = AgentHistoryBuffer(max_capacity=20)
            sorted_events = group.sort_values("step_index").to_dict(orient="records")

            for ev in sorted_events:
                snapshot = buffer.get_snapshot()
                feat = self.extract_single_event(ev, history_snapshot=snapshot)
                feat["event_id"] = ev.get("event_id")  # Preserve event_id for joining
                records.append(feat)
                buffer.push(ev)

        feat_df = pd.DataFrame(records)
        return feat_df
