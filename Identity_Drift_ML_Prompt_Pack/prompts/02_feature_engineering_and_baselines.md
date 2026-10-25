# Prompt 2 — Feature engineering and baseline detectors

**Attach:** `ML_Model_Technical_Spec.md`, completed `docs/DATASET_CARD.md`, and the actual prepared-data schema/report.

```text
Act as an ML engineer working ONLY on the dataset and model for Identity Drift Detection. Do not build frontend or backend functionality.

Inspect the existing model code, dataset card, prepared-data schema and ML specification before editing.

Implement and test feature engineering under model/src/identity_drift/features/ for the available data:
- agent identity and role context
- requested tool/action
- resource and destination
- permission mismatch or policy-context indicators, where labels/features genuinely exist
- provenance/taint metadata, only where available or explicitly simulated
- action frequency and recency
- sequence/order and recent-history features
- temporal changes relative to a versioned behavioural baseline

Document feature definitions, types, missing-value handling and which features are unavailable in each dataset. Do not invent columns that do not exist; use explicit adapters or documented synthetic fields when appropriate.

Implement simple, reproducible baselines:
1. deterministic rule baseline for explicit policy violations, separate from ML;
2. smoothed role-conditioned action-frequency/probability scoring where the data supports it;
3. a simple sequence or history baseline if suitable sequences exist.

Ensure preprocessing is fitted on training data only. Preserve the split boundaries from Phase 1. Add unit tests for feature schemas, missing/cold-start histories, deterministic outputs and no leakage.

Do not claim a baseline detects real-world identity drift unless supported by appropriate evidence. Do not fabricate metrics. Run tests and a small smoke experiment, record actual outputs, and summarize changed files and next steps.
```
