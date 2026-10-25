# Model Integration Contract — Identity Drift Detection

> This is a draft interface contract for agreement with the backend teammate. Finalize it against the actual feature pipeline and trained model.

## Responsibility boundary
The model assesses action/history behaviour. The backend/gateway is responsible for identity verification, authorization, deterministic policies, action execution and enforcement. A model score must never override a hard policy denial.

## Proposed request
```json
{
  "schema_version": "1.0",
  "agent_id": "example-agent",
  "agent_role": "example-role",
  "action": {
    "tool": "search",
    "operation": "query",
    "resource": "public-catalog",
    "destination": "approved-service"
  },
  "context": {
    "task_id": "example-task",
    "provenance": [],
    "timestamp": "2026-01-01T00:00:00Z"
  },
  "recent_history": []
}
```

This is illustrative only. Replace fields with the actual feature schema; do not assume these values are sufficient for the final model.

## Proposed response
```json
{
  "schema_version": "1.0",
  "model_version": "replace-with-actual-version",
  "score_type": "anomaly_score",
  "risk_score": 0.0,
  "risk_level": "unknown",
  "reason_codes": [],
  "insufficient_history": true
}
```

The sample values are placeholders, not a prediction. Document the actual score range and semantics after training/evaluation.

## Required decisions to agree
- Required/optional fields and types
- Timestamp format and timezone
- Recent-history ordering and maximum size
- Feature-schema version
- Score semantics and range
- Threshold ownership and versioning
- Reason-code vocabulary
- Cold-start and insufficient-history behaviour
- Model timeout and failure handling
- Model artifact versioning and rollback
- Compatibility policy for future schema changes

## Security boundary
The backend must perform identity and authorization checks and enforce deterministic hard-deny rules independently of model output. The model does not authorize or execute tools.
