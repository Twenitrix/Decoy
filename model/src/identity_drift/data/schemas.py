"""
Standard schemas, taxonomies, and validation models for Identity Drift Detection.
Aligned with ML_Model_Technical_Spec.md.
"""

from __future__ import annotations
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class ResourceSensitivity(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class DestinationTrustTier(str, Enum):
    TRUSTED_INTERNAL = "trusted_internal"
    PARTNER_APPROVED = "partner_approved"
    UNTRUSTED_EXTERNAL = "untrusted_external"
    UNKNOWN = "unknown"


class OperationType(str, Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    EXECUTE = "execute"
    EXPORT = "export"
    QUERY = "query"


class DriftType(str, Enum):
    NONE = "none"
    HARD_POLICY_VIOLATION = "hard_policy_violation"
    UNUSUAL_LEGITIMATE = "unusual_legitimate"
    SENSITIVE_EGRESS = "sensitive_egress"
    PROMPT_INJECTION_DRIFT = "prompt_injection_drift"
    REPEATED_DENIED = "repeated_denied"
    SLOW_DRIFT = "slow_drift"
    COLD_START = "cold_start"
    INCOMPLETE_PROVENANCE = "incomplete_provenance"
    DELEGATION_MISMATCH = "delegation_mismatch"
    EXTERNAL_BENCHMARK_MISUSE = "external_benchmark_misuse"


class AgentRole(str, Enum):
    CUSTOMER_SUPPORT = "customer_support"
    PROCUREMENT = "procurement"
    FINANCIAL_ANALYST = "financial_analyst"
    DEVOPS_ENGINEER = "devops_engineer"
    HR_ASSISTANT = "hr_assistant"
    RESEARCH_ASSISTANT = "research_assistant"


class AgentActionEvent(BaseModel):
    """
    Single atomic action event representing an agent proposing or executing a tool call.
    """
    event_id: str = Field(..., description="Unique event identifier")
    session_id: str = Field(..., description="Session identifier for multi-step trajectory grouping")
    timestamp: str = Field(..., description="ISO 8601 timestamp of the action")
    step_index: int = Field(0, description="0-indexed step number within the session")

    # Identity and Role Context
    agent_id: str = Field(..., description="Unique agent identifier")
    agent_role: str = Field(..., description="Declared role of the agent")
    task_id: str = Field(..., description="Unique task identifier")
    task_category: str = Field(..., description="High-level task category")
    policy_version: str = Field("v1.0", description="Policy version governing the agent")
    permission_scope: List[str] = Field(default_factory=list, description="Permitted tools/scopes")
    delegation_chain: List[str] = Field(default_factory=list, description="Chain of parent agent IDs if delegated")
    session_age_seconds: float = Field(0.0, description="Elapsed seconds since session start")

    # Action Features
    tool: str = Field(..., description="Tool or API name invoked")
    operation: OperationType = Field(..., description="Operation category")
    resource: str = Field(..., description="Target resource or entity")
    resource_sensitivity: ResourceSensitivity = Field(..., description="Data sensitivity tier")
    destination: str = Field(..., description="Destination endpoint or system")
    destination_trust_tier: DestinationTrustTier = Field(..., description="Destination trust tier")
    record_count: int = Field(1, description="Number of records accessed/affected")
    data_volume_bytes: int = Field(0, description="Volume of data transferred or processed")
    is_allowed_by_policy: bool = Field(True, description="Deterministic hard-policy evaluation result")

    # Provenance / Taint
    untrusted_content_in_context: bool = Field(False, description="Whether untrusted external prompt/data is in context")
    sensitive_data_accessed_in_session: bool = Field(False, description="Whether sensitive data has been accessed in this session")
    taint_lineage: List[str] = Field(default_factory=list, description="Lineage tags of data being handled")

    # Ground Truth Annotations (for research, training, and evaluation)
    is_drift: bool = Field(False, description="Ground truth drift indicator: 1 = drift/anomaly, 0 = normal")
    drift_type: DriftType = Field(DriftType.NONE, description="Specific taxonomy classification of the event")
    scenario_id: str = Field(..., description="Scenario identifier for grouping and leak prevention")
    scenario_category: str = Field(..., description="Scenario category description")
    is_synthetic: bool = Field(True, description="True if synthetically generated; False if external benchmark")
    label_justification: str = Field("", description="Clear rationale explaining the ground truth assignment")

    @field_validator("event_id", "session_id", "agent_id", "scenario_id")
    @classmethod
    def check_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty")
        return v.strip()


class DatasetSplitMetadata(BaseModel):
    """
    Metadata recording split configuration, counts, and integrity checks.
    """
    total_records: int
    train_records: int
    val_records: int
    test_records: int
    train_scenarios: List[str]
    val_scenarios: List[str]
    test_scenarios: List[str]
    synthetic_count: int
    external_count: int
    drift_positive_rate: float
    split_strategy: str
    random_seed: int
    created_at: str
