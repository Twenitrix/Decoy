from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

AgentStatus = Literal["active", "suspended", "disabled"]
RiskTier = Literal["L0", "L1", "L2", "L3", "L4"]
DecisionStatus = Literal["allowed", "observed", "held_for_approval", "denied", "restricted", "isolated"]
ApprovalStatus = Literal["pending", "approved", "rejected", "expired"]

# --- AGENT SCHEMAS ---
class AgentBase(BaseModel):
    name: str
    role: str
    declared_task: Optional[str] = None
    policy_id: str
    delegation_parent_id: Optional[str] = None

class AgentCreate(AgentBase):
    id: Optional[str] = None
    policy_version: Optional[str] = "v1"

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[AgentStatus] = None
    declared_task: Optional[str] = None
    policy_id: Optional[str] = None
    policy_version: Optional[str] = None

class AgentResponse(AgentBase):
    id: str
    status: AgentStatus
    policy_version: str
    created_at: datetime
    updated_at: datetime
    last_seen_at: Optional[datetime] = None
    current_risk_tier: Optional[RiskTier] = "L0"
    action_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

# --- POLICY SCHEMAS ---
class HardDenyRule(BaseModel):
    field: str  # e.g., "resource", "tool", "destination"
    pattern: str  # e.g., "hr_*", "exec_shell"
    reason: str  # e.g., "SENSITIVE_RESOURCE_ACCESS"

class PolicyBase(BaseModel):
    name: str
    role: str
    allowed_tools: List[str] = []
    allowed_resources: List[str] = []
    allowed_destinations: List[str] = []
    hard_denies: List[Dict[str, Any]] = []
    thresholds: Dict[str, float] = {
        "L1": 3.0,
        "L2": 5.5,
        "L3": 7.5,
        "L4": 9.0
    }
    is_active: bool = True

class PolicyCreate(PolicyBase):
    id: Optional[str] = None
    version: Optional[str] = "v1"

class PolicyUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    allowed_tools: Optional[List[str]] = None
    allowed_resources: Optional[List[str]] = None
    allowed_destinations: Optional[List[str]] = None
    hard_denies: Optional[List[Dict[str, Any]]] = None
    thresholds: Optional[Dict[str, float]] = None
    is_active: Optional[bool] = None

class PolicyResponse(PolicyBase):
    id: str
    version: str
    effective_from: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PolicyTestRequest(BaseModel):
    tool: str
    resource: Optional[str] = None
    destination: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = {}

class PolicyTestResponse(BaseModel):
    policy_id: str
    policy_version: str
    allowed: bool
    reasons: List[str] = []
    hard_deny_triggered: bool = False
    violating_rules: List[Dict[str, Any]] = []

# --- GATEWAY & ACTION SCHEMAS ---
class ActionPayload(BaseModel):
    tool: str
    resource: Optional[str] = None
    destination: Optional[str] = None
    parameters: Dict[str, Any] = {}
    provenance_tags: Optional[Dict[str, Any]] = None

class GatewayActionRequest(BaseModel):
    agent_id: str
    session_id: str
    task_id: Optional[str] = None
    action: ActionPayload
    dry_run: Optional[bool] = False

class RiskSummary(BaseModel):
    anomaly_score: float
    calibrated_probability: Optional[float] = None
    dimension_scores: Optional[Dict[str, float]] = None
    reasons: Optional[List[str]] = None
    model_version: Optional[str] = None
    uncertainty: Optional[str] = None

class GatewayActionResponse(BaseModel):
    action_id: str
    decision_id: str
    status: DecisionStatus
    tier: RiskTier
    executed: bool
    risk: RiskSummary
    reasons: List[str]
    policy_version: str
    model_version: str
    execution_result: Optional[Any] = None
    approval_id: Optional[str] = None

class ActionEventResponse(BaseModel):
    id: str
    agent_id: str
    session_id: str
    task_id: Optional[str] = None
    timestamp: datetime
    tool: str
    resource: Optional[str] = None
    destination: Optional[str] = None
    parameters_summary: Dict[str, Any]
    payload_size: int
    provenance_tags: Dict[str, Any]
    decision: Optional[DecisionStatus] = None
    tier: Optional[RiskTier] = None
    reason_codes: Optional[List[str]] = []
    executed: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)

class ActionDetailResponse(ActionEventResponse):
    risk_assessment: Optional[Dict[str, Any]] = None
    decision_details: Optional[Dict[str, Any]] = None
    audit_events: Optional[List[Dict[str, Any]]] = None

# --- RISK SCHEMAS ---
class RiskScoreRequest(BaseModel):
    agent_id: str
    role: str
    tool: str
    resource: Optional[str] = None
    destination: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = {}
    provenance_tags: Optional[Dict[str, Any]] = None
    recent_sequence: Optional[List[str]] = []

class RiskAssessmentResponse(BaseModel):
    id: str
    action_event_id: str
    anomaly_score: float
    calibrated_probability: Optional[float] = None
    tier: RiskTier
    dimension_scores: Dict[str, float]
    reasons: List[str]
    uncertainty: str
    model_version: str
    policy_version: str
    baseline_version: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- DECISION SCHEMAS ---
class DecisionResponse(BaseModel):
    id: str
    action_event_id: str
    risk_assessment_id: Optional[str] = None
    status: DecisionStatus
    tier: RiskTier
    executed: bool
    reason_codes: List[str]
    policy_version: str
    model_version: str
    decided_at: datetime
    expires_at: Optional[datetime] = None
    execution_outcome: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

# --- APPROVAL SCHEMAS ---
class ApprovalResponse(BaseModel):
    id: str
    decision_id: str
    action_event_id: str
    agent_id: str
    agent_name: Optional[str] = None
    agent_role: Optional[str] = None
    action_summary: Dict[str, Any]
    bound_parameters_hash: str
    bound_policy_version: str
    status: ApprovalStatus
    reviewer_id: Optional[str] = None
    comment: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    expires_at: datetime
    reasons: Optional[List[str]] = []
    risk_tier: Optional[RiskTier] = None

    model_config = ConfigDict(from_attributes=True)

class ApprovalResolveRequest(BaseModel):
    status: Literal["approved", "rejected"]
    reviewer_id: str
    comment: Optional[str] = None

# --- ALERT SCHEMAS ---
class AlertResponse(BaseModel):
    id: str
    severity: Literal["low", "medium", "high", "critical"]
    title: str
    message: str
    agent_id: str
    agent_name: Optional[str] = None
    action_event_id: Optional[str] = None
    tier: RiskTier
    timestamp: datetime
    status: Literal["open", "acknowledged", "resolved"] = "open"

# --- DASHBOARD & METRICS SCHEMAS ---
class DashboardSummaryResponse(BaseModel):
    total_agents: int
    active_agents: int
    suspended_agents: int
    disabled_agents: int
    total_actions_evaluated: int
    allowed_count: int
    denied_count: int
    held_for_approval_count: int
    isolated_count: int
    risk_tier_distribution: Dict[str, int]
    recent_high_risk_events: List[Dict[str, Any]]
    system_health: Dict[str, Any]
    latency_summary: Dict[str, float]

class LatencyMetricsResponse(BaseModel):
    p50_ms: float
    p95_ms: float
    p99_ms: float
    hard_check_p50_ms: float
    scoring_p50_ms: float
    sample_size: int

class DetectionMetricsResponse(BaseModel):
    model_version: str
    dataset_id: str
    is_synthetic: bool
    true_positive_rate: float
    false_positive_rate: float
    precision: float
    recall: float
    f1_score: float
    confusion_matrix: Dict[str, int]
    rule_only_comparison: Dict[str, Any]
    rule_plus_model_comparison: Dict[str, Any]

class AuditEventResponse(BaseModel):
    id: str
    event_type: str
    actor: str
    entity_id: str
    timestamp: datetime
    action_summary: Dict[str, Any]
    prev_hash: str
    event_hash: str

    model_config = ConfigDict(from_attributes=True)

# --- MODEL VERSION SCHEMAS ---
class ModelVersionResponse(BaseModel):
    id: str
    version_tag: str
    description: Optional[str] = None
    is_active: bool
    dataset_id: str
    is_synthetic: bool
    metrics: Dict[str, Any]
    rule_only_metrics: Dict[str, Any]
    trained_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ModelEvaluateRequest(BaseModel):
    dataset_id: Optional[str] = "synthetic-drift-v1"
    version_tag: Optional[str] = None

class FeedbackCreate(BaseModel):
    risk_assessment_id: Optional[str] = None
    action_event_id: str
    label: Literal["true_positive", "false_positive", "benign_rare", "suspicious"]
    notes: Optional[str] = None
    reviewer_id: str
