# Prompt 5 — Inference packaging and integration contract

**Attach:** `ML_Model_Technical_Spec.md`, actual chosen model artifact/metadata, feature schema and backend teammate's agreed API contract if available.

```text
Package the chosen Identity Drift Detection model for inference. My responsibility is ONLY the model package and its contract; do not implement the backend, gateway, frontend or database.

Inspect the actual trained artifact, preprocessing pipeline, feature definitions and evaluation report.

Implement:
- a stable Python inference entry point under model/src/identity_drift/inference/
- input schema validation
- feature preprocessing identical to training
- artifact loading and version checks
- output schema validation
- clear errors for malformed inputs, missing required fields, corrupt artifacts and unsupported schema versions
- deterministic handling of cold-start/insufficient history, with uncertainty or insufficient-history status where appropriate
- unit tests and a small CLI prediction demo using a real saved artifact

Define docs/MODEL_INTEGRATION_CONTRACT.md for the backend teammate. Specify:
- required input fields and types
- optional fields and defaults
- history representation and ordering
- output fields and types
- risk/anomaly score semantics and range
- reason codes or supported explanation fields
- model version and feature-schema version
- insufficient-history behaviour
- exceptions, timeout expectations and compatibility/versioning rules
- example request and response payloads

Do not build a FastAPI service unless explicitly requested by the team; provide a callable Python interface and a documented contract first. Do not describe an anomaly score as a calibrated probability unless calibration has been demonstrated.

The backend must enforce identity/permissions and deterministic policy decisions independently. The model must never override hard policy denials.

Run tests and demonstrate inference with an actual trained artifact. If no valid artifact exists, report the blocker instead of creating fake predictions.
```
