# Prompt 6 — Final ML documentation and audit

**Attach:** `ML_Model_Technical_Spec.md`, `docs/DATASET_CARD.md`, actual reports, chosen model metadata and `docs/MODEL_INTEGRATION_CONTRACT.md`.

```text
Perform a final audit of ONLY the dataset and ML work for Identity Drift Detection. Do not take ownership of frontend/backend implementation.

Verify:
- dataset sources, current schema, licences and access methods
- reproducible data preparation
- documented labels and synthetic-data boundaries
- leakage-resistant splits
- feature definitions and train/inference consistency
- actual model artifacts and metadata
- reproducible training and evaluation commands
- held-out evaluation and error analysis
- baseline comparisons and limitations
- model loading and inference tests
- model/input/output schema versioning
- no fabricated data statistics or metrics
- no secrets or restricted raw datasets committed to Git

Update docs/DATASET_CARD.md with verified data provenance and limitations. Update docs/MODEL_CARD.md using actual training/evaluation results only. Update model/README.md with setup, data preparation, training, evaluation, artifact loading and inference commands. Add docs/EXPERIMENT_LOG.md if absent.

Run the available ML tests and at least one reproducibility check. Report commands and actual outcomes, failed checks, known limitations, files changed, and exactly what the backend teammate needs to integrate the model.

Do not claim production readiness or real-world effectiveness unless the evidence supports it.
```
