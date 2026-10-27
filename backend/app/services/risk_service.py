import os
import sys
import httpx
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.db.models import RiskAssessment, generate_uuid, ModelVersion

# Dynamically link the Decoy ML package if present
repo_root = Path(__file__).resolve().parents[3]
decoy_root = repo_root if (repo_root / "model").exists() else (repo_root / "decoy_repo")
if decoy_root.exists() and str(decoy_root) not in sys.path:
    sys.path.insert(0, str(decoy_root))

ml_engine = None
try:
    from model.src.identity_drift.inference.engine import IdentityDriftInferenceEngine
    artifacts_dir = decoy_root / "model" / "artifacts"
    if artifacts_dir.exists():
        ml_engine = IdentityDriftInferenceEngine(artifacts_dir=artifacts_dir)
        print("[RiskService] Successfully loaded trained IdentityDriftInferenceEngine from Decoy repository!")
except Exception as e:
    print(f"[RiskService] Note: Running with integrated baseline (ML model import: {e})")

ROLE_TOOL_MAP = {
    "financial_analyst": {
        "read_file": ("export_summary", "export"),
        "query_database": ("export_summary", "export"),
        "edit_file": ("write_financial_summary", "write"),
        "send_email": ("export_summary", "export"),
        "execute_workflow": ("write_financial_summary", "write"),
    },
    "customer_support": {
        "read_file": ("get_customer_profile", "read"),
        "query_database": ("search_knowledgebase", "query"),
        "send_email": ("send_customer_reply", "write"),
        "edit_file": ("send_customer_reply", "write"),
    },
    "procurement": {
        "read_file": ("read_vendor_quote", "read"),
        "query_database": ("search_suppliers", "query"),
        "execute_workflow": ("bulk_export_vendor_contracts", "export"),
        "send_email": ("read_vendor_quote", "read"),
    },
    "devops_engineer": {
        "read_file": ("delegate_task", "execute"),
        "execute_workflow": ("delegate_task", "execute"),
        "call_external_api": ("modify_cloud_iam", "write"),
        "edit_file": ("modify_cloud_iam", "write"),
    }
}

class RiskService:
    def __init__(self):
        self.ml_service_url = settings.ML_SERVICE_URL
        self.local_ml_engine = ml_engine

    async def score_action(
        self,
        db: Session,
        agent_id: str,
        role: str,
        tool: str,
        resource: Optional[str],
        destination: Optional[str],
        features: Dict[str, Any],
        thresholds: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        1. If ML_SERVICE_URL is set (including via Vercel internal service binding), queries the internal FastAPI ML service.
        2. Otherwise, if the trained IdentityDriftInferenceEngine from the Decoy repo is loaded,
           evaluates action using the real trained Phase 5 model artifacts.
        3. Falls back to baseline multi-dimension scoring if neither is available.
        """
        # 1. Internal/External ML Microservice via ML_SERVICE_URL binding (if configured)
        ml_service_url = (os.getenv("ML_SERVICE_URL") or self.ml_service_url or "").rstrip("/")
        if ml_service_url:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    resp = await client.post(
                        f"{ml_service_url}/api/v1/risk/score",
                        json={
                            "agent_id": agent_id,
                            "role": role,
                            "tool": tool,
                            "resource": resource,
                            "destination": destination,
                            "features": features,
                            "thresholds": thresholds
                        }
                    )
                    if resp.status_code == 200:
                        return resp.json()
            except Exception:
                pass

        # 2. Local Trained ML Model from Decoy Repository
        if self.local_ml_engine:
            try:
                norm_role = role.lower().replace(" ", "_")
                if "support" in norm_role:
                    norm_role = "customer_support"
                elif "procure" in norm_role:
                    norm_role = "procurement"
                elif "devops" in norm_role:
                    norm_role = "devops_engineer"
                elif "financ" in norm_role or "audit" in norm_role:
                    norm_role = "financial_analyst"

                # Map gateway tool to ML vocabulary if applicable
                ml_tool = tool
                op = "read" if "read" in tool else ("query" if "query" in tool else "write")
                if norm_role in ROLE_TOOL_MAP and tool in ROLE_TOOL_MAP[norm_role]:
                    ml_tool, mapped_op = ROLE_TOOL_MAP[norm_role][tool]
                    op = mapped_op

                is_tainted = bool(features.get("tainted", False))
                is_policy_allowed = bool(features.get("is_allowed_by_policy", True))

                sens = "restricted" if (features.get("is_sensitive") or is_tainted) else "internal"
                dest_trust = "untrusted_external" if (features.get("is_untrusted_dest") or is_tainted) else "trusted_internal"

                valid_scope = [
                    ml_tool,
                    tool,
                    "export_summary", "write_financial_summary", "query_database",
                    "search_knowledgebase", "get_customer_profile", "send_customer_reply",
                    "search_suppliers", "read_vendor_quote", "bulk_export_vendor_contracts",
                    "delegate_task", "modify_cloud_iam"
                ]

                step_idx = len(features.get("recent_tools", [])) % 10
                session_age = max(30.0, float(max(1, step_idx) * 45.0))
                req_sess_id = features.get("session_id") or f"sess-{agent_id}"

                req_payload = {
                    "event_id": f"evt-{generate_uuid()[:8]}",
                    "session_id": req_sess_id,
                    "agent_id": agent_id,
                    "agent_role": norm_role,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "step_index": step_idx,
                    "action": {
                        "tool": ml_tool,
                        "operation": op,
                        "resource": resource or "general_resource",
                        "resource_sensitivity": sens,
                        "destination": destination or "internal_service",
                        "destination_trust_tier": dest_trust,
                        "record_count": 1,
                        "data_volume_bytes": features.get("payload_size", 0),
                        "is_allowed_by_policy": is_policy_allowed
                    },
                    "context": {
                        "task_id": f"task-{agent_id}",
                        "task_category": norm_role,
                        "policy_version": "v1.0",
                        "permission_scope": valid_scope if is_policy_allowed else [],
                        "session_age_seconds": session_age,
                        "sensitive_data_accessed_in_session": is_tainted,
                        "untrusted_content_in_context": is_tainted
                    }
                }

                ml_res = self.local_ml_engine.evaluate(req_payload)
                tier_str = str(ml_res.risk_summary.recommended_tier).replace("DecisionTier.", "")
                # Map e.g. L0_ALLOW -> L0, L3_BLOCK -> L3
                short_tier = tier_str.split("_")[0] if "_" in tier_str else tier_str
                anomaly_score = round(float(ml_res.composite_anomaly.anomaly_score), 2)
                reasons = list(ml_res.risk_summary.reasons)

                # Calibrated policy threshold alignment:
                # If composite anomaly is below the L1 threshold and policy allows it with no taint,
                # the action is within normal operational boundaries -> L0 Allow.
                l1_thresh = thresholds.get("L1", 3.0)
                if is_policy_allowed and not is_tainted and anomaly_score < l1_thresh:
                    short_tier = "L0"
                    reasons = [r for r in reasons if r != "BEHAVIORAL_MODEL_ELEVATED_RISK"]

                return {
                    "anomaly_score": anomaly_score,
                    "calibrated_probability": ml_res.behavioral_risk.calibrated_probability,
                    "tier": short_tier,
                    "dimension_scores": {k: round(float(v), 2) for k, v in ml_res.composite_anomaly.dimension_scores.items()},
                    "reasons": reasons,
                    "uncertainty": "low" if short_tier == "L0" else ml_res.risk_summary.uncertainty,
                    "model_version": "decoy-composite-v1.0",
                    "baseline_version": f"role-{norm_role}-v1"
                }
            except Exception as ml_err:
                print(f"[RiskService] Local ML model execution exception: {ml_err}. Falling back to baseline.")

        # 3. Baseline fallback
        return self._compute_baseline_assessment(role, tool, resource, destination, features, thresholds)

    def _compute_baseline_assessment(
        self,
        role: str,
        tool: str,
        resource: Optional[str],
        destination: Optional[str],
        features: Dict[str, Any],
        thresholds: Dict[str, float]
    ) -> Dict[str, Any]:
        role_lower = role.lower()
        tool_unusualness = 0.1
        if "support" in role_lower and tool in ["execute_workflow", "modify_credentials"]:
            tool_unusualness = 0.85
        elif "procure" in role_lower and "hr" in (resource or "").lower():
            tool_unusualness = 0.75

        res_sens = features.get("resource_sensitivity", 0.1)
        dest_risk = features.get("destination_risk", 0.05)
        seq_anomaly = features.get("sequence_anomaly", 0.1)
        prov_risk = features.get("provenance_risk", 0.05)
        slow_drift = 0.15

        dim_scores = {
            "tool_unusualness": round(tool_unusualness, 2),
            "resource_sensitivity": round(res_sens, 2),
            "destination_risk": round(dest_risk, 2),
            "sequence_anomaly": round(seq_anomaly, 2),
            "slow_drift": round(slow_drift, 2)
        }

        weights = {
            "tool_unusualness": 0.25,
            "resource_sensitivity": 0.30,
            "destination_risk": 0.25,
            "sequence_anomaly": 0.15,
            "slow_drift": 0.05
        }

        raw_anomaly = sum(dim_scores[k] * weights[k] for k in dim_scores) * 10.0
        if prov_risk > 0.5:
            raw_anomaly += 2.0
        anomaly_score = round(min(10.0, raw_anomaly), 2)

        reasons = []
        if res_sens >= 0.7:
            reasons.append("RESOURCE_SENSITIVE")
        if dest_risk >= 0.6:
            reasons.append("UNUSUAL_DESTINATION")
        if seq_anomaly >= 0.6:
            reasons.append("SUSPICIOUS_ACTION_SEQUENCE")
        if tool_unusualness >= 0.6:
            reasons.append("UNUSUAL_TOOL_FOR_ROLE")
        if prov_risk >= 0.5:
            reasons.append("TAINTED_DATA_FLOW")

        l4_thresh = thresholds.get("L4", 9.0)
        l3_thresh = thresholds.get("L3", 7.5)
        l2_thresh = thresholds.get("L2", 5.5)
        l1_thresh = thresholds.get("L1", 3.0)

        if anomaly_score >= l4_thresh:
            tier = "L4"
        elif anomaly_score >= l3_thresh:
            tier = "L3"
        elif anomaly_score >= l2_thresh:
            tier = "L2"
        elif anomaly_score >= l1_thresh:
            tier = "L1"
        else:
            tier = "L0"

        uncertainty = "low"
        if 4.5 <= anomaly_score <= 6.5:
            uncertainty = "medium"

        return {
            "anomaly_score": anomaly_score,
            "calibrated_probability": None,
            "tier": tier,
            "dimension_scores": dim_scores,
            "reasons": reasons,
            "uncertainty": uncertainty,
            "model_version": "baseline-v1",
            "baseline_version": f"role-{role.lower()}-v1"
        }

risk_service = RiskService()
