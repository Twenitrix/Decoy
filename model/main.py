"""
FastAPI entrypoint for the internal Identity Drift ML model service on Vercel.
Exposes `/api/v1/risk/score` for internal service-to-service calls from `backend`
via the `ML_SERVICE_URL` Vercel service binding.
"""

from __future__ import annotations

import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

# Ensure `src` is importable when `model/` is the service root
SERVICE_ROOT = Path(__file__).resolve().parent
SRC_ROOT = SERVICE_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from identity_drift.inference.engine import IdentityDriftInferenceEngine  # noqa: E402

ARTIFACTS_DIR = SERVICE_ROOT / "artifacts"
ml_engine = IdentityDriftInferenceEngine(artifacts_dir=ARTIFACTS_DIR)

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
    },
}


class RiskScoreRequest(BaseModel):
    agent_id: str
    role: str
    tool: str
    resource: Optional[str] = None
    destination: Optional[str] = None
    features: Dict[str, Any] = Field(default_factory=dict)
    thresholds: Dict[str, float] = Field(default_factory=dict)


app = FastAPI(
    title="Identity Drift ML Inference Service",
    description="Internal ML scoring service for DECOY SOC",
    version="1.0.0",
)


@app.get("/health")
@app.get("/api/v1/health")
def health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "identity-drift-model",
        "artifacts_loaded": ml_engine.is_loaded,
    }


@app.post("/api/v1/risk/score")
def score_risk(payload: RiskScoreRequest) -> Dict[str, Any]:
    norm_role = payload.role.lower().replace(" ", "_")
    if "support" in norm_role:
        norm_role = "customer_support"
    elif "procure" in norm_role:
        norm_role = "procurement"
    elif "devops" in norm_role:
        norm_role = "devops_engineer"
    elif "financ" in norm_role or "audit" in norm_role:
        norm_role = "financial_analyst"

    ml_tool = payload.tool
    op = "read" if "read" in payload.tool else ("query" if "query" in payload.tool else "write")
    if norm_role in ROLE_TOOL_MAP and payload.tool in ROLE_TOOL_MAP[norm_role]:
        ml_tool, mapped_op = ROLE_TOOL_MAP[norm_role][payload.tool]
        op = mapped_op

    features = payload.features or {}
    is_tainted = bool(features.get("tainted", False))
    is_policy_allowed = bool(features.get("is_allowed_by_policy", True))

    sens = "restricted" if (features.get("is_sensitive") or is_tainted) else "internal"
    dest_trust = (
        "untrusted_external"
        if (features.get("is_untrusted_dest") or is_tainted)
        else "trusted_internal"
    )

    valid_scope = [
        ml_tool,
        payload.tool,
        "export_summary",
        "write_financial_summary",
        "query_database",
        "search_knowledgebase",
        "get_customer_profile",
        "send_customer_reply",
        "search_suppliers",
        "read_vendor_quote",
        "bulk_export_vendor_contracts",
        "delegate_task",
        "modify_cloud_iam",
    ]

    step_idx = len(features.get("recent_tools", [])) % 10
    session_age = max(30.0, float(max(1, step_idx) * 45.0))
    req_sess_id = features.get("session_id") or f"sess-{payload.agent_id}"

    req_payload = {
        "event_id": f"evt-{uuid.uuid4().hex[:8]}",
        "session_id": req_sess_id,
        "agent_id": payload.agent_id,
        "agent_role": norm_role,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "step_index": step_idx,
        "action": {
            "tool": ml_tool,
            "operation": op,
            "resource": payload.resource or "general_resource",
            "resource_sensitivity": sens,
            "destination": payload.destination or "internal_service",
            "destination_trust_tier": dest_trust,
            "record_count": 1,
            "data_volume_bytes": features.get("payload_size", 0),
            "is_allowed_by_policy": is_policy_allowed,
        },
        "context": {
            "task_id": f"task-{payload.agent_id}",
            "task_category": norm_role,
            "policy_version": "v1.0",
            "permission_scope": valid_scope if is_policy_allowed else [],
            "session_age_seconds": session_age,
            "sensitive_data_accessed_in_session": is_tainted,
            "untrusted_content_in_context": is_tainted,
        },
    }

    ml_res = ml_engine.evaluate(req_payload)
    tier_str = str(ml_res.risk_summary.recommended_tier).replace("DecisionTier.", "")
    short_tier = tier_str.split("_")[0] if "_" in tier_str else tier_str
    anomaly_score = round(float(ml_res.composite_anomaly.anomaly_score), 2)
    reasons = list(ml_res.risk_summary.reasons)

    l1_thresh = payload.thresholds.get("L1", 3.0)
    if is_policy_allowed and not is_tainted and anomaly_score < l1_thresh:
        short_tier = "L0"
        reasons = [r for r in reasons if r != "BEHAVIORAL_MODEL_ELEVATED_RISK"]

    return {
        "anomaly_score": anomaly_score,
        "calibrated_probability": ml_res.behavioral_risk.calibrated_probability,
        "tier": short_tier,
        "dimension_scores": {
            k: round(float(v), 2)
            for k, v in ml_res.composite_anomaly.dimension_scores.items()
        },
        "reasons": reasons,
        "uncertainty": "low" if short_tier == "L0" else ml_res.risk_summary.uncertainty,
        "model_version": "decoy-composite-v1.0",
        "baseline_version": f"role-{norm_role}-v1",
    }
