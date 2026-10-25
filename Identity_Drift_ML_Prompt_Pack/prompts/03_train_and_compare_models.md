# Prompt 3 — Train and compare candidate models

**Attach:** `ML_Model_Technical_Spec.md`, `docs/DATASET_CARD.md`, feature documentation and the actual prepared-data report.

```text
Act as an applied ML engineer. Work ONLY in the model/dataset area. Do not implement frontend or backend.

Read the ML spec, dataset card, feature schema and existing baseline results before coding.

Implement a reproducible training pipeline that compares only candidates appropriate for the available labels and data representation:
- smoothed probability baseline
- Logistic Regression when valid supervised labels exist
- Isolation Forest for suitable feature-based anomaly experiments
- sequence-based scoring for ordered histories
- gradual behaviour-drift detection against a versioned baseline

Requirements:
1. Make train/validation/test boundaries explicit and leakage-resistant.
2. Use training data to fit transformations and model parameters.
3. Use validation data for model selection and threshold tuning.
4. Keep the test set untouched until final evaluation.
5. Set and record random seeds, config, feature schema, dataset version and code version.
6. Save the fitted preprocessing pipeline and model artifact together where possible.
7. Provide CLI commands to train each candidate and run a reproducible experiment.
8. Make algorithm assumptions and target labels explicit. Do not force every algorithm onto every dataset.
9. Keep deterministic hard-policy rules separate from model scores; the ML model is not the policy enforcement authority.
10. Add tests for training/inference compatibility and artifact loading.

Do not fabricate training results or save placeholder files that look like trained models. If data or labels are insufficient, state that clearly and implement only the defensible baseline.

Run at least one actual training run using valid prepared data, if available. Report actual outputs and failures, not expected results. Stop after candidate models and reproducible training commands are in place.
```
