"""
Inference Request and Response Schemas.
Conforms to MODEL_INTEGRATION_CONTRACT.md and ML_Model_Technical_Spec.md Section 8.
"""

from __future__ import annotations
from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, field_validator


class DecisionTier(str, Enum):
    L0_ALLOW = "L0_ALLOW"
    L1_OBSERVE = "L1_OBSERVE"
    L2_STEP_UP = "L2_STEP_UP"
    L3_BLOCK = "L3_BLOCK"
    L4_ISOLATE = "L4_ISOLATE"


class ActionPayload(BaseModel):
    tool: str = Field(..., description="Tool or API invoked")
    operation: str = Field("query", description="Operation category: query, read, write, delete, execute, export")
    resource: str = Field("general_resource", description="Target resource or entity")
    resource_sensitivity: str = Field("internal", description="public, internal, confidential, restricted")
    destination: str = Field("internal_service", description="Target endpoint or host")
    destination_trust_tier: str = Field("trusted_internal", description="trusted_internal, partner_approved, untrusted_external")
    record_count: int = Field(1, ge=0, description="Record count affected")
    data_volume_bytes: int = Field(0, ge=0, description="Volume transferred in bytes")
    is_allowed_by_policy: bool = Field(True, description="Hard-policy evaluation result from gateway")

    @field_validator("tool")
    @classmethod
    def check_tool_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("tool field must not be empty")
        return v.strip()


class ContextPayload(BaseModel):
    task_id: str = Field(..., description="Unique task identifier")
    task_category: str = Field("general_task", description="High-level task category")
    policy_version: str = Field("v1.0", description="Policy version governing the agent")
    permission_scope: List[str] = Field(default_factory=list, description="Permitted tools/scopes")
    delegation_chain: List[str] = Field(default_factory=list, description="Parent agent IDs if delegated")
    session_age_seconds: float = Field(0.0, ge=0.0, description="Elapsed seconds in session")
    untrusted_content_in_context: bool = Field(False, description="Whether untrusted prompt is in context")
    sensitive_data_accessed_in_session: bool = Field(False, description="Whether sensitive data has been accessed")
    taint_lineage: List[str] = Field(default_factory=list, description="Taint lineage tags")


class InferenceRequest(BaseModel):
    event_id: str = Field(..., description="Unique event identifier")
    session_id: str = Field(..., description="Session identifier for multi-step grouping")
    agent_id: str = Field(..., description="Unique agent identifier")
    agent_role: str = Field(..., description="Declared role of agent")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    step_index: int = Field(0, ge=0, description="0-indexed step number in session")
    action: ActionPayload
    context: ContextPayload

    @field_validator("event_id", "session_id", "agent_id", "agent_role", "timestamp")
    @classmethod
    def check_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Required identifier must not be empty")
        return v.strip()


class DeterministicPolicyOutcome(BaseModel):
    is_violation: bool
    reasons: List[str]


class CompositeAnomalyOutcome(BaseModel):
    anomaly_score: float
    threshold: float
    is_anomaly: bool
    dimension_scores: Dict[str, float]


class BehavioralRiskOutcome(BaseModel):
    risk_probability: float
    threshold: float
    is_high_risk: bool
    calibrated_probability: Optional[float] = None


class RiskSummary(BaseModel):
    recommended_tier: DecisionTier
    reasons: List[str]
    uncertainty: str  # "low", "medium", "high"
    is_cold_start: bool


class InferenceResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    event_id: str
    session_id: str
    agent_id: str
    timestamp: str
    deterministic_policy: DeterministicPolicyOutcome
    composite_anomaly: CompositeAnomalyOutcome
    behavioral_risk: BehavioralRiskOutcome
    risk_summary: RiskSummary
    model_versions: Dict[str, str]
    inference_status: str  # "SUCCESS", "FAIL_SAFE_ERROR"
    error_message: Optional[str] = None
