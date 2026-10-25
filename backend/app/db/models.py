from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, JSON, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, index=True)
    status = Column(String, default="active", index=True)  # active, suspended, disabled
    declared_task = Column(String, nullable=True)
    policy_id = Column(String, nullable=False)
    policy_version = Column(String, default="v1")
    delegation_parent_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    last_seen_at = Column(DateTime, nullable=True)

    action_events = relationship("ActionEvent", back_populates="agent", cascade="all, delete-orphan")
    credentials = relationship("AgentCredential", back_populates="agent", cascade="all, delete-orphan")

class AgentCredential(Base):
    __tablename__ = "agent_credentials"

    id = Column(String, primary_key=True, default=generate_uuid)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False, index=True)
    credential_type = Column(String, default="api_key")
    token_hash = Column(String, nullable=False)
    scopes = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    agent = relationship("Agent", back_populates="credentials")

class Policy(Base):
    __tablename__ = "policies"

    id = Column(String, primary_key=True, default=generate_uuid)
    version = Column(String, default="v1")
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, index=True)
    allowed_tools = Column(JSON, default=list)
    allowed_resources = Column(JSON, default=list)
    allowed_destinations = Column(JSON, default=list)
    hard_denies = Column(JSON, default=list)  # rules like: [{"field": "resource", "pattern": "hr_salary*", "reason": "SENSITIVE_RESOURCE_ACCESS"}]
    thresholds = Column(JSON, default=dict)   # {"L1": 3.0, "L2": 5.5, "L3": 7.5, "L4": 9.0}
    is_active = Column(Boolean, default=True)
    effective_from = Column(DateTime, default=utc_now)
    created_at = Column(DateTime, default=utc_now)

class ActionEvent(Base):
    __tablename__ = "action_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False, index=True)
    session_id = Column(String, nullable=False, index=True)
    task_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    tool = Column(String, nullable=False, index=True)
    resource = Column(String, nullable=True, index=True)
    destination = Column(String, nullable=True, index=True)
    parameters_summary = Column(JSON, default=dict)  # Redacted
    payload_size = Column(Integer, default=0)
    provenance_tags = Column(JSON, default=dict)     # {"tainted": bool, "untrusted_source": bool, "delegated": bool}
    created_at = Column(DateTime, default=utc_now)

    agent = relationship("Agent", back_populates="action_events")
    risk_assessment = relationship("RiskAssessment", back_populates="action_event", uselist=False, cascade="all, delete-orphan")
    decision = relationship("Decision", back_populates="action_event", uselist=False, cascade="all, delete-orphan")

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(String, primary_key=True, default=generate_uuid)
    action_event_id = Column(String, ForeignKey("action_events.id"), nullable=False, index=True)
    anomaly_score = Column(Float, nullable=False)
    calibrated_probability = Column(Float, nullable=True)
    tier = Column(String, nullable=False, index=True)  # L0, L1, L2, L3, L4
    dimension_scores = Column(JSON, default=dict)       # tool_unusualness, resource_sensitivity, destination_risk, sequence_anomaly, slow_drift
    reasons = Column(JSON, default=list)
    uncertainty = Column(String, default="low")         # low, medium, high
    model_version = Column(String, default="baseline-v1")
    policy_version = Column(String, default="v1")
    baseline_version = Column(String, default="role-baseline-v1")
    created_at = Column(DateTime, default=utc_now)

    action_event = relationship("ActionEvent", back_populates="risk_assessment")

class Decision(Base):
    __tablename__ = "decisions"

    id = Column(String, primary_key=True, default=generate_uuid)
    action_event_id = Column(String, ForeignKey("action_events.id"), nullable=False, index=True)
    risk_assessment_id = Column(String, nullable=True)
    status = Column(String, nullable=False, index=True)  # allowed, observed, held_for_approval, denied, restricted, isolated
    tier = Column(String, nullable=False, index=True)    # L0, L1, L2, L3, L4
    executed = Column(Boolean, default=False)
    reason_codes = Column(JSON, default=list)
    policy_version = Column(String, default="v1")
    model_version = Column(String, default="baseline-v1")
    auth_token = Column(String, nullable=True)
    execution_outcome = Column(JSON, nullable=True)
    decided_at = Column(DateTime, default=utc_now)
    expires_at = Column(DateTime, nullable=True)

    action_event = relationship("ActionEvent", back_populates="decision")

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String, primary_key=True, default=generate_uuid)
    decision_id = Column(String, nullable=False, index=True)
    action_event_id = Column(String, nullable=False, index=True)
    agent_id = Column(String, nullable=False, index=True)
    action_summary = Column(JSON, default=dict)
    bound_parameters_hash = Column(String, nullable=False)
    bound_policy_version = Column(String, nullable=False)
    status = Column(String, default="pending", index=True)  # pending, approved, rejected, expired
    reviewer_id = Column(String, nullable=True)
    comment = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    expires_at = Column(DateTime, nullable=False)

class AgentBaseline(Base):
    __tablename__ = "agent_baselines"

    id = Column(String, primary_key=True, default=generate_uuid)
    agent_id = Column(String, nullable=True, index=True)
    role = Column(String, nullable=False, index=True)
    window = Column(String, default="30d")
    feature_stats = Column(JSON, default=dict)
    reference_version = Column(String, default="v1.0")
    is_frozen = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=utc_now)

class AnalystFeedback(Base):
    __tablename__ = "analyst_feedback"

    id = Column(String, primary_key=True, default=generate_uuid)
    risk_assessment_id = Column(String, nullable=True)
    action_event_id = Column(String, nullable=False, index=True)
    label = Column(String, nullable=False)  # true_positive, false_positive, benign_rare, suspicious
    notes = Column(Text, nullable=True)
    reviewer_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=utc_now)

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_type = Column(String, nullable=False, index=True)
    actor = Column(String, nullable=False)
    entity_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    action_summary = Column(JSON, default=dict)
    prev_hash = Column(String, default="0" * 64)
    event_hash = Column(String, nullable=False)

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String, primary_key=True, default=generate_uuid)
    version_tag = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    dataset_id = Column(String, default="synthetic-drift-v1")
    is_synthetic = Column(Boolean, default=True)
    metrics = Column(JSON, default=dict)
    rule_only_metrics = Column(JSON, default=dict)
    trained_at = Column(DateTime, default=utc_now)
