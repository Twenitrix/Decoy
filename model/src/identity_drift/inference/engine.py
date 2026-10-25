"""
Standalone Inference Engine for Identity Drift Detection.
Loads frozen model artifacts once, maintains per-session history buffers,
and provides robust, fail-safe evaluation of incoming tool-call events.
"""

from __future__ import annotations
from pathlib import Path
from typing import Dict, Any, Optional, List
import pandas as pd
import joblib
from pydantic import ValidationError

from .schemas import (
    InferenceRequest,
    InferenceResponse,
    DeterministicPolicyOutcome,
    CompositeAnomalyOutcome,
    BehavioralRiskOutcome,
    RiskSummary,
    DecisionTier,
)
from ..features.extractor import IdentityDriftFeatureExtractor
from ..features.history_buffer import AgentHistoryBuffer
from ..models.baselines import PolicyRuleBaseline, CompositeBaselineDetector
from ..models.supervised import LogisticRegressionDriftModel


class IdentityDriftInferenceEngine:
    """
    Production-ready inference engine for the ML model workstream.
    Integrates the deterministic safety floor, composite anomaly engine,
    and behavioral logistic regression estimator.
    """

    def __init__(self, artifacts_dir: Optional[Path] = None):
        self.artifacts_dir = artifacts_dir or Path(__file__).resolve().parents[3] / "artifacts"
        self.is_loaded: bool = False
        self.session_buffers: Dict[str, AgentHistoryBuffer] = {}
        
        # Loaded model references
        self.extractor: Optional[IdentityDriftFeatureExtractor] = None
        self.rule_baseline: PolicyRuleBaseline = PolicyRuleBaseline()
        self.composite_detector: Optional[CompositeBaselineDetector] = None
        self.lr_behavioral: Optional[LogisticRegressionDriftModel] = None
        
        # Load artifacts once
        self._load_artifacts()

    def _load_artifacts(self) -> None:
        """
        Loads all frozen Phase 3 artifacts from disk.
        """
        if not self.artifacts_dir.exists():
            raise FileNotFoundError(f"Artifacts directory not found: {self.artifacts_dir}")

        ext_path = self.artifacts_dir / "feature_extractor.joblib"
        comp_path = self.artifacts_dir / "tuned_composite_detector.joblib"
        lr_path = self.artifacts_dir / "logistic_regression_behavioral.joblib"

        for p in [ext_path, comp_path, lr_path]:
            if not p.exists():
                raise FileNotFoundError(f"Required model artifact not found: {p}")

        self.extractor = joblib.load(ext_path)
        self.composite_detector = joblib.load(comp_path)
        self.lr_behavioral = joblib.load(lr_path)
        self.is_loaded = True

    def reset_session(self, session_id: str) -> None:
        """
        Clears the in-memory history buffer for a specific session.
        """
        if session_id in self.session_buffers:
            self.session_buffers[session_id].clear()
            del self.session_buffers[session_id]

    def reset_all(self) -> None:
        """
        Clears all in-memory session buffers. Useful between isolated test executions.
        """
        for buf in self.session_buffers.values():
            buf.clear()
        self.session_buffers.clear()

    def evaluate(self, request_payload: Dict[str, Any] | InferenceRequest) -> InferenceResponse:
        """
        Evaluates an incoming tool-call action request.
        Validates schema, extracts features with historical context,
        evaluates deterministic rules and ML anomaly detectors, and returns a structured response.
        """
        # 1. Schema Validation
        try:
            if isinstance(request_payload, InferenceRequest):
                req = request_payload
            else:
                req = InferenceRequest(**request_payload)
        except (ValidationError, Exception) as val_err:
            return self._build_fail_safe_response(
                event_id=str(request_payload.get("event_id", "UNKNOWN_EVENT") if isinstance(request_payload, dict) else "UNKNOWN_EVENT"),
                session_id=str(request_payload.get("session_id", "UNKNOWN_SESSION") if isinstance(request_payload, dict) else "UNKNOWN_SESSION"),
                agent_id=str(request_payload.get("agent_id", "UNKNOWN_AGENT") if isinstance(request_payload, dict) else "UNKNOWN_AGENT"),
                error_msg=f"Invalid inference request schema: {val_err}",
            )

        if not self.is_loaded or self.extractor is None or self.composite_detector is None or self.lr_behavioral is None:
            return self._build_fail_safe_response(
                event_id=req.event_id,
                session_id=req.session_id,
                agent_id=req.agent_id,
                error_msg="Inference engine artifacts are not loaded.",
            )

        try:
            # 2. Session History Management (Strict Agent / Session Isolation)
            if req.session_id not in self.session_buffers:
                self.session_buffers[req.session_id] = AgentHistoryBuffer(max_capacity=20)
            buffer = self.session_buffers[req.session_id]

            # Snapshot prior history BEFORE current action to prevent future-step leakage
            snapshot = buffer.get_snapshot()

            # 3. Transform to Raw Event Dict for Feature Extractor
            raw_event = {
                "event_id": req.event_id,
                "session_id": req.session_id,
                "agent_id": req.agent_id,
                "agent_role": req.agent_role,
                "timestamp": req.timestamp,
                "step_index": req.step_index,
                "task_id": req.context.task_id,
                "task_category": req.context.task_category,
                "policy_version": req.context.policy_version,
                "permission_scope": req.context.permission_scope,
                "delegation_chain": req.context.delegation_chain,
                "session_age_seconds": req.context.session_age_seconds,
                "untrusted_content_in_context": req.context.untrusted_content_in_context,
                "sensitive_data_accessed_in_session": req.context.sensitive_data_accessed_in_session,
                "taint_lineage": req.context.taint_lineage,
                "tool": req.action.tool,
                "operation": req.action.operation,
                "resource": req.action.resource,
                "resource_sensitivity": req.action.resource_sensitivity,
                "destination": req.action.destination,
                "destination_trust_tier": req.action.destination_trust_tier,
                "record_count": req.action.record_count,
                "data_volume_bytes": req.action.data_volume_bytes,
                "is_allowed_by_policy": req.action.is_allowed_by_policy,
            }

            features = self.extractor.extract_single_event(raw_event, history_snapshot=snapshot)

            # 4. Independent Deterministic Safety Floor
            is_rule_violation, rule_reasons = self.rule_baseline.predict_record(features)
            policy_outcome = DeterministicPolicyOutcome(
                is_violation=is_rule_violation,
                reasons=rule_reasons,
            )

            # 5. Composite Anomaly Evaluation
            comp_res = self.composite_detector.predict_record(features)
            anomaly_score = float(comp_res["anomaly_score"])
            comp_threshold = float(self.composite_detector.anomaly_threshold)
            is_anomaly = bool(comp_res["predicted_drift"])
            composite_outcome = CompositeAnomalyOutcome(
                anomaly_score=anomaly_score,
                threshold=comp_threshold,
                is_anomaly=is_anomaly,
                dimension_scores=comp_res["dimension_scores"],
            )

            # 6. Behavioral Logistic Regression Risk Probability
            feat_df = pd.DataFrame([features])
            prob = float(self.lr_behavioral.predict_proba(feat_df)[0])
            lr_threshold = float(self.lr_behavioral.decision_threshold)
            is_high_risk = bool(prob >= lr_threshold)
            behavioral_outcome = BehavioralRiskOutcome(
                risk_probability=round(prob, 4),
                threshold=lr_threshold,
                is_high_risk=is_high_risk,
                calibrated_probability=None,  # Remains null per specification
            )

            # 7. Decision Tier Synthesis & Safety Boundary Enforcement
            # Rule: ML must NEVER override a deterministic policy denial
            reasons = list(set(rule_reasons + comp_res["reasons"]))
            if is_high_risk and "BEHAVIORAL_MODEL_ELEVATED_RISK" not in reasons:
                reasons.append("BEHAVIORAL_MODEL_ELEVATED_RISK")

            if is_rule_violation:
                tier = DecisionTier.L3_BLOCK
            elif features.get("sensitive_egress_indicator", False) or anomaly_score >= 8.5:
                tier = DecisionTier.L3_BLOCK
            elif is_anomaly or is_high_risk:
                tier = DecisionTier.L2_STEP_UP
            elif anomaly_score >= 3.5:
                tier = DecisionTier.L1_OBSERVE
            else:
                tier = DecisionTier.L0_ALLOW

            uncertainty = "high" if snapshot.is_cold_start else ("medium" if is_anomaly else "low")
            risk_summary = RiskSummary(
                recommended_tier=tier,
                reasons=reasons,
                uncertainty=uncertainty,
                is_cold_start=snapshot.is_cold_start,
            )

            # 8. Update Session History for Sequential Tracking
            buffer.push(raw_event)

            return InferenceResponse(
                event_id=req.event_id,
                session_id=req.session_id,
                agent_id=req.agent_id,
                timestamp=req.timestamp,
                deterministic_policy=policy_outcome,
                composite_anomaly=composite_outcome,
                behavioral_risk=behavioral_outcome,
                risk_summary=risk_summary,
                model_versions={
                    "composite_detector": "v1.0-tuned",
                    "logistic_regression": "v1.0-behavioral",
                    "schema_version": "v1.0",
                },
                inference_status="SUCCESS",
            )

        except Exception as exc:
            return self._build_fail_safe_response(
                event_id=req.event_id,
                session_id=req.session_id,
                agent_id=req.agent_id,
                error_msg=f"Runtime inference exception: {exc}",
            )

    def _build_fail_safe_response(
        self,
        event_id: str,
        session_id: str,
        agent_id: str,
        error_msg: str,
    ) -> InferenceResponse:
        """
        Constructs a fail-safe response when validation or inference fails.
        Never defaults to an implicit L0_ALLOW.
        """
        return InferenceResponse(
            event_id=event_id,
            session_id=session_id,
            agent_id=agent_id,
            timestamp="UNKNOWN",
            deterministic_policy=DeterministicPolicyOutcome(
                is_violation=True,
                reasons=["FAIL_SAFE_ERROR_POLICY_DENIED"],
            ),
            composite_anomaly=CompositeAnomalyOutcome(
                anomaly_score=999.0,
                threshold=5.5,
                is_anomaly=True,
                dimension_scores={},
            ),
            behavioral_risk=BehavioralRiskOutcome(
                risk_probability=1.0,
                threshold=0.1,
                is_high_risk=True,
                calibrated_probability=None,
            ),
            risk_summary=RiskSummary(
                recommended_tier=DecisionTier.L2_STEP_UP,
                reasons=["INFERENCE_EXECUTION_FAILURE", "FAIL_SAFE_ACTIVE"],
                uncertainty="high",
                is_cold_start=False,
            ),
            model_versions={
                "engine": "fail_safe_fallback",
            },
            inference_status="FAIL_SAFE_ERROR",
            error_message=error_msg,
        )
