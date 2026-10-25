# Prompt 4 — Rigorous evaluation and error analysis

**Attach:** `ML_Model_Technical_Spec.md`, dataset card, model artifacts/metadata and actual training logs.

```text
Act as an ML evaluation specialist for the Identity Drift Detection model. Work ONLY on model evaluation and supporting ML code. Do not implement frontend/backend.

Inspect the actual trained models, data split definitions and logs. Implement evaluation scripts that use the held-out test set only after model selection is complete.

Report appropriate metrics, including:
- confusion matrix
- precision, recall and F1
- false-positive rate and true-positive rate
- PR-AUC where meaningful
- per-class and per-scenario performance
- cold-start and unusual-but-legitimate behaviour performance
- inference latency and throughput under documented conditions
- calibration metrics only if the model outputs probabilities and calibration is evaluated correctly

Compare candidates against the baseline. Explain class imbalance and threshold choices. Inspect false positives and false negatives; create error-analysis outputs and identify dataset limitations.

Check for leakage, duplicate scenarios, label mismatch and overfitting. Distinguish external benchmark results from synthetic-data results. Do not pool incompatible datasets into one headline metric.

Write actual results to model/reports/ and update docs/EXPERIMENT_LOG.md. Include run configuration, dataset version, model version, environment and commands. Every metric must be generated from actual execution. Never invent a metric or claim that one model is best without a valid comparison.

Add tests for metric calculations and report generation. Run evaluation and report exact commands, outputs, limitations and unresolved issues.
```
