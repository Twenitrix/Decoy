"""
Feature Schemas and Definitions for Identity Drift Detection.
Aligned with ML_Model_Technical_Spec.md Section 2.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from enum import Enum


class FeatureType(str, Enum):
    CATEGORICAL = "categorical"
    NUMERICAL = "numerical"
    BOOLEAN = "boolean"


@dataclass
class FeatureDefinition:
    name: str
    feature_type: FeatureType
    description: str
    missing_strategy: str
    available_in_synthetic: bool = True
    available_in_external_benchmark: bool = False


# Comprehensive Registry of Extracted Features
FEATURE_REGISTRY: Dict[str, FeatureDefinition] = {
    # 1. Identity & Context
    "agent_role": FeatureDefinition(
        name="agent_role",
        feature_type=FeatureType.CATEGORICAL,
        description="Declared agent role context",
        missing_strategy="Default to '__UNKNOWN_ROLE__'",
        available_in_synthetic=True,
        available_in_external_benchmark=True,
    ),
    "task_category": FeatureDefinition(
        name="task_category",
        feature_type=FeatureType.CATEGORICAL,
        description="Declared category of current task",
        missing_strategy="Default to 'unspecified_task'",
        available_in_synthetic=True,
        available_in_external_benchmark=True,
    ),
    "has_delegation": FeatureDefinition(
        name="has_delegation",
        feature_type=FeatureType.BOOLEAN,
        description="Whether the agent was invoked via a parent delegation chain",
        missing_strategy="Default to False",
        available_in_synthetic=True,
        available_in_external_benchmark=False,
    ),
    # 2. Action Attributes
    "tool": FeatureDefinition(
        name="tool",
        feature_type=FeatureType.CATEGORICAL,
        description="Tool or API invoked",
        missing_strategy="Default to '__UNKNOWN_TOOL__'",
        available_in_synthetic=True,
        available_in_external_benchmark=True,
    ),
    "operation": FeatureDefinition(
        name="operation",
        feature_type=FeatureType.CATEGORICAL,
        description="Operation category (query, read, write, delete, execute, export)",
        missing_strategy="Default to 'query'",
        available_in_synthetic=True,
        available_in_external_benchmark=True,
    ),
    "resource_sensitivity_tier": FeatureDefinition(
        name="resource_sensitivity_tier",
        feature_type=FeatureType.NUMERICAL,
        description="Ordinal sensitivity: 0=public, 1=internal, 2=confidential, 3=restricted",
        missing_strategy="Default to 1 (internal/conservative)",
        available_in_synthetic=True,
        available_in_external_benchmark=True,
    ),
    "destination_trust_tier_num": FeatureDefinition(
        name="destination_trust_tier_num",
        feature_type=FeatureType.NUMERICAL,
        description="Ordinal trust: 0=trusted_internal, 1=partner_approved, 2=untrusted_external",
        missing_strategy="Default to 2 (untrusted/conservative)",
        available_in_synthetic=True,
        available_in_external_benchmark=True,
    ),
    "log_record_count": FeatureDefinition(
        name="log_record_count",
        feature_type=FeatureType.NUMERICAL,
        description="Log(1 + record_count) accessed or requested",
        missing_strategy="Default to 0.0 (1 record -> log(2) ~ 0.693)",
        available_in_synthetic=True,
        available_in_external_benchmark=False,
    ),
    "log_volume_bytes": FeatureDefinition(
        name="log_volume_bytes",
        feature_type=FeatureType.NUMERICAL,
        description="Log(1 + data_volume_bytes)",
        missing_strategy="Default to 0.0",
        available_in_synthetic=True,
        available_in_external_benchmark=True,
    ),
    # 3. Policy & Scope Indicators
    "is_in_permission_scope": FeatureDefinition(
        name="is_in_permission_scope",
        feature_type=FeatureType.BOOLEAN,
        description="Whether the requested tool is explicitly in the agent's permission scope",
        missing_strategy="Default to False",
        available_in_synthetic=True,
        available_in_external_benchmark=False,
    ),
    "is_allowed_by_policy": FeatureDefinition(
        name="is_allowed_by_policy",
        feature_type=FeatureType.BOOLEAN,
        description="Result of deterministic hard policy evaluation",
        missing_strategy="Default to True (policy assumed enforced separately)",
        available_in_synthetic=True,
        available_in_external_benchmark=True,
    ),
    # 4. Provenance & Taint
    "untrusted_content_in_context": FeatureDefinition(
        name="untrusted_content_in_context",
        feature_type=FeatureType.BOOLEAN,
        description="Indicator that prompt or context contains untrusted third-party inputs",
        missing_strategy="Default to False",
        available_in_synthetic=True,
        available_in_external_benchmark=True,
    ),
    "sensitive_data_accessed_in_session": FeatureDefinition(
        name="sensitive_data_accessed_in_session",
        feature_type=FeatureType.BOOLEAN,
        description="Whether sensitive/restricted data has been read during this session",
        missing_strategy="Default to False",
        available_in_synthetic=True,
        available_in_external_benchmark=False,
    ),
    "sensitive_egress_indicator": FeatureDefinition(
        name="sensitive_egress_indicator",
        feature_type=FeatureType.BOOLEAN,
        description="True if sensitive data was read AND destination is untrusted_external",
        missing_strategy="Default to False",
        available_in_synthetic=True,
        available_in_external_benchmark=False,
    ),
    # 5. Temporal & Frequency
    "step_index": FeatureDefinition(
        name="step_index",
        feature_type=FeatureType.NUMERICAL,
        description="0-indexed step number within the agent's current session",
        missing_strategy="Default to 0",
        available_in_synthetic=True,
        available_in_external_benchmark=False,
    ),
    "action_rate": FeatureDefinition(
        name="action_rate",
        feature_type=FeatureType.NUMERICAL,
        description="Actions per second (step_index / max(1.0, session_age_seconds))",
        missing_strategy="Default to 0.0",
        available_in_synthetic=True,
        available_in_external_benchmark=False,
    ),
    # 6. Sequence & History
    "prev_tool": FeatureDefinition(
        name="prev_tool",
        feature_type=FeatureType.CATEGORICAL,
        description="Tool name of immediately preceding action in session",
        missing_strategy="Default to 'START_OF_SESSION'",
        available_in_synthetic=True,
        available_in_external_benchmark=False,
    ),
    "prev_operation": FeatureDefinition(
        name="prev_operation",
        feature_type=FeatureType.CATEGORICAL,
        description="Operation category of immediately preceding action",
        missing_strategy="Default to 'NONE'",
        available_in_synthetic=True,
        available_in_external_benchmark=False,
    ),
    "history_length": FeatureDefinition(
        name="history_length",
        feature_type=FeatureType.NUMERICAL,
        description="Number of past actions available in session history deque",
        missing_strategy="Default to 0",
        available_in_synthetic=True,
        available_in_external_benchmark=False,
    ),
    "failed_attempt_count": FeatureDefinition(
        name="failed_attempt_count",
        feature_type=FeatureType.NUMERICAL,
        description="Count of consecutively blocked or failed attempts in recent history",
        missing_strategy="Default to 0",
        available_in_synthetic=True,
        available_in_external_benchmark=False,
    ),
    "is_cold_start": FeatureDefinition(
        name="is_cold_start",
        feature_type=FeatureType.BOOLEAN,
        description="True if history_length == 0 or session_age_seconds == 0",
        missing_strategy="Default to True when history is absent",
        available_in_synthetic=True,
        available_in_external_benchmark=True,
    ),
}
