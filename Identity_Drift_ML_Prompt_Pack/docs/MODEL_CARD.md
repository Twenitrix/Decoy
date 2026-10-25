# Model Card — Identity Drift Detection

> Status: Draft. Complete with actual experiment outputs only.

## Model details
- Model name/version:
- Model type/algorithm:
- Code version/commit:
- Artifact location/checksum:
- Feature-schema version:
- Training date/environment:

## Intended use
- Intended prediction target:
- Expected caller:
- Intended operating context:
- Out-of-scope uses:

## Training data
- Dataset source/version:
- Dataset-card reference:
- Actual training records:
- Label definitions:
- Synthetic versus external data:
- Train/validation/test split method:
- Leakage safeguards:

## Features
Describe input fields, preprocessing, history representation, missing-value handling and cold-start behaviour.

## Evaluation
Record actual test results with the metric definitions and test dataset/split:
- Precision:
- Recall:
- F1:
- False-positive rate:
- True-positive rate:
- PR-AUC, if appropriate:
- Per-scenario results:
- Inference latency and measurement conditions:
- Calibration results, only if valid:

Do not populate these fields with estimates or target values.

## Baselines and comparison
List evaluated baselines and candidates, actual results and fair-comparison conditions.

## Error analysis
Describe actual false positives, false negatives, failure modes and scenario-level weaknesses.

## Limitations
Document dataset mismatch, synthetic data, class imbalance, distribution shift, insufficient history, untested environments and known blind spots.

## Score semantics
Explain whether output is an anomaly score, ranking score or calibrated probability. State score range and interpretation. Do not call a score a probability without evidence.

## Security and governance
- Versioning and artifact integrity:
- Monitoring requirements:
- Retraining/change controls:
- Human review requirements:
- Policy enforcement boundary:

The model provides risk evidence; deterministic identity/authorization checks and hard policy denials must remain independent of the ML score.

## Reproduction
- Environment:
- Training command:
- Evaluation command:
- Inference command:
- Configuration and random seeds:
