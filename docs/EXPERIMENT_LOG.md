# Experiment Log — Identity Drift Detection

> Chronological log of ML experiments, configurations, and verified evaluations.  
> Status: Updated through Phase 4. Zero fabricated metrics.

---

## Experiment 1: Phase 1 Data Pipeline & Splitting Integrity
- **Date:** 2026-10-25
- **Goal:** Build reproducible data pipeline for 10 canonical scenarios and ingest external AgentShield-Bench benchmark.
- **Input Datasets:**
  - Synthetic State Machine Generator (seed=42, replications=30)
  - External Benchmark: Hugging Face `alirezaaminzadeh/agentshield-bench` (tool_risk partition, Apache-2.0)
- **Artifacts Generated:**
  - `model/data/processed/train.parquet` (546 rows, 210 scenarios)
  - `model/data/processed/val.parquet` (111 rows, 45 scenarios)
  - `model/data/processed/test_synthetic.parquet` (123 rows, 45 scenarios)
  - `model/data/processed/test_external_benchmark.parquet` (300 rows)
  - `model/data/processed/data_summary.json`
- **Verification:**
  - Scenario overlap check: 0 scenarios shared between train, val, and test.
  - Test suite: 9/9 tests passed.

---

## Experiment 2: Phase 2 Baseline Detectors
- **Date:** 2026-10-25
- **Goal:** Implement feature extraction pipeline and establish baseline detectors.
- **Models Evaluated:**
  - Baseline 0: Deterministic hard policy check
  - Baseline A: Role-conditioned smoothed categorical likelihood ($\alpha=1.0$)
  - Baseline B: First-order Markov tool transitions ($\beta=1.0$, static threshold 2.5)
  - Baseline Composite: Fused rule + likelihood + sequence detector (threshold 6.5)
- **Evaluation Partition:** `val.parquet` (111 rows)
- **Key Outcomes:**
  - Hard Rules: Precision 1.0, Recall 0.4348, F1 0.6061. Missed 56.5% of drift events.
  - Composite Baseline: Precision 0.8913, Recall 0.8913, F1 0.8913. Lifts recall by 45.65 percentage points over rules.
  - Markov sequence had 0 recall due to static threshold 2.5 exceeding the maximum smoothed probability range (~1.45).

---

## Experiment 3: Phase 3 Candidate Model Training & Comparison
- **Date:** 2026-10-25
- **Goal:** Train and compare supervised, unsupervised, and gradual drift candidate models on `train.parquet` and tune thresholds on `val.parquet`.
- **Candidates Trained & Saved:**
  - `Baseline_0_Hard_Rules`
  - `Baseline_A_Smoothed_Likelihood` (threshold 4.5)
  - `Candidate_Markov_Sequence_Tuned` (threshold 0.10)
  - `Candidate_Gradual_Drift_Detector` (EWMA volume + destination divergence, threshold 0.50)
  - `Candidate_Isolation_Forest` (unsupervised, contamination 0.40, threshold -0.0149)
  - `Candidate_Logistic_Regression_Behavioral` (without policy feature, threshold 0.10)
  - `Candidate_Logistic_Regression_Full` (with policy feature, threshold 0.10)
  - `Candidate_Tuned_Composite_Ensemble` (threshold 5.50)
- **Validation Results (`val.parquet`, 111 rows):**
  - Logistic Regression (Behavioral): F1 = 1.0, Precision = 1.0, Recall = 1.0, FPR = 0.0.
  - Tuned Composite Ensemble: F1 = 0.8913, Precision = 0.8913, Recall = 0.8913, FPR = 0.0769.
  - Isolation Forest: F1 = 0.7478, Precision = 0.6232, Recall = 0.9348, FPR = 0.4000.
- **Purity Check:** Held-out test set (`test_synthetic.parquet`) remained completely untouched.

---

## Experiment 4: Phase 4 Held-Out Test Evaluation & Error Analysis
- **Date:** 2026-10-25
- **Goal:** Rigorous evaluation of all 8 frozen Phase 3 candidate models on the held-out test partition (`test_synthetic.parquet`, 123 rows).
- **Execution Script:** `python -m model.src.identity_drift.models.evaluate_test`
- **Official Test Partition Results (123 samples: 67 benign, 56 drift):**
  - **Baseline 0 (Hard Rules):** Precision = 1.0, Recall = 0.5000, F1 = 0.6667, FPR = 0.0, Latency = 0.098 ms.
  - **Baseline A (Smoothed Likelihood):** Precision = 0.9211, Recall = 0.6250, F1 = 0.7447, FPR = 0.0448, Latency = 0.158 ms.
  - **Candidate Markov Sequence (Tuned):** Precision = 0.4553, Recall = 1.0000, F1 = 0.6257, FPR = 1.0000, Latency = 0.0001 ms.
  - **Candidate Gradual Drift Detector:** Precision = 0.7692, Recall = 0.3571, F1 = 0.4878, FPR = 0.0896, Latency = 0.672 ms.
  - **Candidate Isolation Forest:** Precision = 0.6892, Recall = 0.9107, F1 = 0.7846, FPR = 0.3433, Latency = 1.054 ms.
  - **Candidate Tuned Composite Ensemble:** Precision = 0.9455, Recall = 0.9286, **F1 = 0.9369**, **FPR = 0.0448**, Latency = 0.245 ms.
  - **Candidate Logistic Regression (Behavioral):** Precision = 1.0, Recall = 1.0, **F1 = 1.0**, FPR = 0.0, Brier Score = 0.0002, Latency = 0.350 ms.
- **Reports Produced:**
  - `model/reports/phase4_test_evaluation.json`
  - `model/reports/phase4_error_analysis.md`
- **Key Finding & Recommendation:**
  - Tuned Composite Ensemble provides the highest interpretability with low false positives (4.48%) and robust dimensional breakdown.
  - Logistic Regression demonstrates that behavioral features alone can separate all canonical synthetic drift categories.
  - Recommend dual-engine inference packaging for Phase 5.
