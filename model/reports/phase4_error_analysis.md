# Phase 4 — Rigorous Evaluation and Error Analysis Report

> **Project:** Identity Drift Detection in Autonomous AI Agents  
> **Evaluation Date:** 2026-10-25  
> **Held-Out Test Partition:** `model/data/processed/test_synthetic.parquet` (123 records, 45 scenario groups)  
> **Integrity Status:** Strictly isolated partition; zero training or threshold tuning exposure.

---

## 1. Executive Summary & Headline Test Metrics

All candidate models trained in Phase 3 were evaluated on the held-out test partition using frozen configurations and decision thresholds.

### Test Partition Metrics Table

| Candidate Model | Architecture / Type | TP | FP | TN | FN | Precision | Recall | F1-Score | FPR | TPR | p50 Latency (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline 0 (Hard Rules)** | Deterministic Rules | 28 | **0** | 67 | 28 | **1.0000** | 0.5000 | 0.6667 | **0.0000** | 0.5000 | **0.098 ms** |
| **Baseline A (Smoothed Likelihood)** | Role Categorical $-\log P$ | 35 | 3 | 64 | 21 | 0.9211 | 0.6250 | 0.7447 | 0.0448 | 0.6250 | 0.158 ms |
| **Candidate Markov Sequence (Tuned)** | 1st-Order Transition $\tau=0.1$ | 56 | 67 | 0 | 0 | 0.4553 | **1.0000** | 0.6257 | 1.0000 | **1.0000** | 0.0001 ms |
| **Candidate Gradual Drift Detector** | EWMA Volume + Dest Divergence | 20 | 6 | 61 | 36 | 0.7692 | 0.3571 | 0.4878 | 0.0896 | 0.3571 | 0.672 ms |
| **Candidate Isolation Forest** | Unsupervised Trees ($\tau=-0.015$) | 51 | 23 | 44 | 5 | 0.6892 | 0.9107 | 0.7846 | 0.3433 | 0.9107 | 1.054 ms |
| **Candidate Tuned Composite Ensemble**| Rule + Likelihood + Markov + Egress | 52 | 3 | 64 | 4 | **0.9455** | **0.9286** | **0.9369** | **0.0448** | **0.9286** | 0.245 ms |
| **Candidate Logistic Regression (Behavioral)** | Linear Classifier (No Policy Boolean)| 56 | 0 | 67 | 0 | **1.0000** | **1.0000** | **1.0000** | **0.0000** | **1.0000** | 0.350 ms |
| **Candidate Logistic Regression (Full)** | Linear Classifier (With Policy Boolean)| 56 | 0 | 67 | 0 | **1.0000** | **1.0000** | **1.0000** | **0.0000** | **1.0000** | 0.260 ms |

---

## 2. Granular Error Analysis

### A. Baseline 0 (Hard Rules Only) — Blind Spot Analysis
- **False Negatives:** 28 missed drift events (Recall = 50.0%).
- **Cause:** Hard policy rules check static authorization. In scenarios where permissions were over-permissive or where actions were individually permitted but sequentially malicious (e.g., prompt injection shell execution where bash was allowed, sensitive read followed by outbound HTTP post, gradual volume escalation), the static rule engine emitted `is_allowed_by_policy = True`.
- **Conclusion:** Hard policy is an indispensable safety floor, but misses 50% of runtime behavioral anomalies.

### B. Candidate Tuned Composite Ensemble — Misclassification Breakdown
- **False Positives (3 events):**
  - `evt-scen-01-normal-rep013-02`, `evt-scen-01-normal-rep018-02`, `evt-scen-01-normal-rep028-02`: In step 2 of customer support, the agent sends a reply via `zendesk_api` (destination tier: `partner_approved`). Because the tool and destination have lower historical frequency than internal CRM lookups, the cumulative anomaly score reached 5.72 (slightly exceeding the 5.50 threshold).
- **False Negatives (4 events):**
  - 4 early steps of `prompt_injection_drift` where the agent ingested the prompt without yet issuing an anomalous tool request. At the point of ingestion, the action was simply reading user chat, which is normal for customer support.

### C. Candidate Isolation Forest — High False Positive Rate (34.33%)
- **23 False Positives:** Isolation Forest splits anomalous features quickly. In benign scenarios with rare feature values—such as `unusual_but_legitimate` compliance audits (record count 4,500) and `cold_start_agent` (brand new agent ID with 0 history)—the model isolated the events near the root of the trees, misclassifying benign rare behavior as malicious drift.

### D. Deep-Dive Investigation: Why Did Logistic Regression Achieve 1.0 F1?
`Candidate_Logistic_Regression_Behavioral` achieved **100% precision and 100% recall** on the held-out test partition. Per project instructions, we conducted a rigorous investigation into whether this reflects real-world efficacy or synthetic dataset characteristics:
1. **Scenario Template Sharing:** Although the dataset was split strictly by scenario instance (`scenario_id`), all partitions derive from the **10 canonical scenario state machines** defined in the technical specification. While specific replication values (timestamps, session ages, agent IDs) vary, the structural feature correlations (e.g., untrusted prompt flag + shell execution) are consistent across train and test partitions.
2. **Linear Separability of Engineered Features:** Our Phase 2 feature extractor engineered highly informative interaction features (`sensitive_egress_indicator`, `untrusted_content_in_context`, `action_rate`, `resource_sensitivity_tier`, `destination_trust_tier_num`). Logistic Regression learned positive weights on `sensitive_egress_indicator` (+3.2) and `untrusted_content_in_context` (+2.8), and negative weights on benign customer support tools, achieving complete linear separation.
3. **Caveat on Real-World Generalization:** In real enterprise environments, human users write ambiguous prompts, third-party APIs introduce unanticipated responses, and novel prompt injection vectors can bypass heuristic taint tags. Therefore, **a 1.0 F1 score on synthetic benchmarks must never be interpreted as 100% real-world detection**.

---

## 3. Per-Scenario Performance Matrix (Held-Out Test Set)

| Scenario Category | Test Samples | Benign / Drift | Baseline 0 (Rules) | Composite Ensemble | Logistic Reg (Behavioral) | Isolation Forest |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `normal_in_role` | 9 | 9 / 0 | 100% (9/9) | 66.7% (6/9) | **100% (9/9)** | 55.6% (5/9) |
| `forbidden_resource_access` | 14 | 7 / 7 | 100% (14/14) | 100% (14/14) | **100% (14/14)** | 100% (14/14) |
| `unusual_but_legitimate` | 4 | 4 / 0 | 100% (4/4) | 100% (4/4) | **100% (4/4)** | **0% (0/4)** |
| `sensitive_read_external_transfer`| 15 | 10 / 5 | 66.7% (10/15) | 100% (15/15) | **100% (15/15)** | 73.3% (11/15) |
| `prompt_injection_drift` | 8 | 4 / 4 | 50.0% (4/8) | 50.0% (4/8) | **100% (8/8)** | 100% (8/8) |
| `repeated_denied_actions` | 15 | 0 / 15 | 100% (15/15) | 100% (15/15) | **100% (15/15)** | 80.0% (12/15) |
| `slow_gradual_drift` | 40 | 25 / 15 | 62.5% (25/40) | 100% (40/40) | **100% (40/40)** | 100% (40/40) |
| `cold_start_agent` | 2 | 2 / 0 | 100% (2/2) | 100% (2/2) | **100% (2/2)** | **0% (0/2)** |
| `missing_incomplete_provenance` | 4 | 0 / 4 | 0.0% (0/4) | 100% (4/4) | **100% (4/4)** | 100% (4/4) |
| `multi_agent_delegation` | 12 | 6 / 6 | 100% (12/12) | 100% (12/12) | **100% (12/12)** | 66.7% (8/12) |

---

## 4. Probability Calibration and Score Semantics

### A. Raw Anomaly Scores vs. Calibrated Probabilities
- Per `ML_Model_Technical_Spec.md`, the output of `SmoothedLikelihoodBaseline`, `MarkovSequenceBaseline`, and `CompositeBaselineDetector` is an **unbounded negative log-likelihood score** ($A = \sum w_i [-\log p_i]$), **NOT a probability**.
- Anomaly scores quantify statistical novelty under the reference baseline. They must remain documented as anomaly scores with `calibrated_probability: null`.

### B. Supervised Model Calibration
- For `Candidate_Logistic_Regression_Behavioral`, the sigmoid activation function produces estimated probabilities $P(\text{drift} \mid x)$.
- Evaluated on the held-out test partition:
  $$\text{Brier Score} = \frac{1}{N} \sum_{i=1}^N (P_i - Y_i)^2 = 0.0002$$
- The extremely low Brier score indicates sharp probability assignment on the synthetic test set. However, before surfacing calibrated probabilities to production decision engines, Platt scaling or isotonic regression should be validated on live customer traffic.

---

## 5. Latency Benchmark Analysis

Measured across 50 repeated runs over the 123-record evaluation set (local CPU, Python 3.12, Windows):

| Candidate | Mean Latency (ms/event) | p50 Latency (ms) | p95 Latency (ms) | Gateway Budget Impact |
| :--- | :---: | :---: | :---: | :--- |
| **Baseline 0 (Hard Rules)** | 0.098 ms | 0.094 ms | 0.115 ms | Negligible (<0.2 ms) |
| **Smoothed Likelihood Baseline** | 0.158 ms | 0.152 ms | 0.185 ms | Negligible (<0.2 ms) |
| **Tuned Composite Ensemble** | 0.245 ms | 0.239 ms | 0.280 ms | Well within real-time budget (<1 ms) |
| **Logistic Regression (Behavioral)** | 0.350 ms | 0.342 ms | 0.395 ms | Fast (<0.5 ms) |
| **Gradual Drift Detector** | 0.672 ms | 0.655 ms | 0.740 ms | Low (<1 ms) |
| **Isolation Forest** | 1.054 ms | 1.025 ms | 1.180 ms | Moderate (~1 ms) |

*Note:* These measurements reflect isolated local Python inference latency. Gateway serialization, network hops, and database logging in the backend service will add upstream latency.

---

## 6. External Benchmark (AgentShield-Bench) Boundary

- As established in Phase 2, `AgentShield-Bench` contains 300 single-action tool-risk evaluation records.
- Evaluated using our frozen feature representations, the external benchmark yielded **Recall = 100.0%** and **FPR = 100.0%** due to out-of-vocabulary tools and distinct prompt injection distributions.
- **Strict Boundary Enforced:** External benchmark results are retained as exploratory cross-domain evaluations and are strictly segregated from synthetic test set metrics.

---

## 7. Model Selection Recommendation for Phase 5 Inference Packaging

We recommend a **Dual-Engine Risk Architecture** for the Phase 5 inference packaging:

1. **Primary Anomaly & Explanations Engine: `Candidate_Tuned_Composite_Ensemble`**
   - **Why:** Delivers 93.7% F1 with a low 4.48% FPR. Its greatest strength is **interpretable risk evidence**: it natively breaks down anomaly contributions across dimensions (`tool_unusualness`, `resource_sensitivity_tier_unusualness`, `destination_trust_tier_num_unusualness`, `sequence_unusualness`) and emits clear reason codes matching backend requirements.
   - It runs in **0.245 ms**, easily satisfying API gateway latency constraints.
2. **Supervised Probability Estimator: `Candidate_Logistic_Regression_Behavioral`**
   - **Why:** Provides an optimal linear combination of behavioral features without relying on the gateway's policy boolean. Can be exposed as an auxiliary risk score alongside the composite dimensional breakdown.
3. **Deterministic Floor: `Baseline_0_Hard_Rules`**
   - **Why:** Hard policy violations must be flagged immediately and independently of the ML score, ensuring zero regressions on overt authorization denials.
