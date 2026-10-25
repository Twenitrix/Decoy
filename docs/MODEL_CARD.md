# Model Card — Identity Drift Detection in Autonomous AI Agents

> **Status:** Finalized for Phase 6. Populated strictly with verified empirical experiment outputs. Zero placeholder data or fabricated statistics.

## Model Details
- **Model Name & Version:** Tuned Composite Ensemble v1.0 (`tuned_composite_detector.joblib`) with Complementary Behavioral Logistic Regression v1.0 (`logistic_regression_behavioral.joblib`).
- **Model Type / Architecture:** 
  - Primary: Multi-dimension negative log-likelihood categorical anomaly scorer + first-order Markov sequence transition model + egress taint penalty.
  - Complementary: Supervised L2-regularized Logistic Regression ($C=1.0$, balanced class weights) fitted on non-policy behavioral features.
  - Safety Floor: Deterministic RBAC/ABAC boundary evaluator (`PolicyRuleBaseline`).
- **Code Version:** Git commit clean state / release v0.1.0
- **Artifact Location:** `model/artifacts/` (`tuned_composite_detector.joblib`, `logistic_regression_behavioral.joblib`, `feature_extractor.joblib`, `sliding_window_drift_detector.joblib`, `model_metadata.json`).
- **Feature Schema Version:** v1.0 (enforced via Pydantic `InferenceRequest` and `InferenceResponse`).
- **Training Environment:** Python 3.12.10, scikit-learn 1.9.0, numpy 2.5.1, pandas 3.0.5, Windows 10/11 x64.

## Intended Use
- **Intended Prediction Target:** Estimate behavioral anomaly score ($A \ge 0$) and drift probability ($P \in [0, 1]$) indicating agent role deviation, prompt injection tool misuse, sensitive data exfiltration, or sliding-window rate escalation.
- **Expected Caller:** Backend API Gateway / Tool Execution Middleware prior to executing proposed agent tool calls.
- **Intended Operating Context:** Real-time pre-execution evaluation in tool-calling and Model Context Protocol (MCP) environments.
- **Out-of-Scope Uses:** Standalone hard authorization decisions (policy denials must remain deterministic), autonomous revocation of agent certificates, latent LLM thought detection, or network packet-level intrusion detection.

## Training Data
- **Dataset Reference:** Internal synthetic canonical state machine (`model/data/processed/train.parquet`, 546 rows, 210 scenario groups).
- **Dataset Card:** Documented in `docs/DATASET_CARD.md`.
- **Actual Training Records:** 546 atomic action events across 5 distinct agent roles (`customer_support`, `procurement`, `devops_engineer`, `financial_analyst`, `research_assistant`).
- **Class Balance (Train):** 318 benign (58.24%), 228 drift (41.76%).
- **Split Methodology:** Group-based split by `scenario_id` (70% train, 15% validation, 15% test).
- **Leakage Safeguards:** Disjoint scenario groups across partitions: $\text{Train} \cap \text{Val} = \emptyset, \text{Train} \cap \text{Test} = \emptyset$. All feature transformations, categorical vocabularies, and scaler statistics fitted strictly on the training partition.

## Features
- **Input Dimensions:** `agent_role`, `task_category`, `has_delegation`, `tool`, `operation`, `resource_sensitivity_tier`, `destination_trust_tier_num`, `log_record_count`, `log_volume_bytes`, `is_in_permission_scope`, `untrusted_content_in_context`, `sensitive_data_accessed_in_session`, `sensitive_egress_indicator`, `step_index`, `action_rate`, `prev_tool`, `prev_operation`, `history_length`, `failed_attempt_count`, `is_cold_start`.
- **History Representation:** Bounded per-session history deque (capacity 20) tracking tool frequencies, previous tool transitions, consecutive denials, and taint access.
- **Cold-Start Handling:** When `history_length == 0`, sequence features default to `'START_OF_SESSION'`, failed attempts to `0`, and an explicit `is_cold_start = True` flag with `uncertainty = "high"` is returned.

## Evaluation
Evaluated strictly on the held-out test partition (`model/data/processed/test_synthetic.parquet`, 123 records, 45 scenario groups; 67 benign, 56 drift) using frozen Phase 3 thresholds:

| Metric | Primary Engine (Tuned Composite Ensemble) | Supervised Engine (Logistic Regression Behavioral) | Safety Floor (Hard Rules Only) |
| :--- | :---: | :---: | :---: |
| **Total Test Samples** | 123 | 123 | 123 |
| **True Positives (TP)** | 52 | 56 | 28 |
| **False Positives (FP)** | 3 | 0 | **0** |
| **True Negatives (TN)** | 64 | 67 | 67 |
| **False Negatives (FN)** | 4 | 0 | 28 |
| **Precision** | **0.9455** | **1.0000** | **1.0000** |
| **Recall / TPR** | **0.9286** | **1.0000** | 0.5000 |
| **F1-Score** | **0.9369** | **1.0000** | 0.6667 |
| **False Positive Rate (FPR)** | **0.0448** | **0.0000** | **0.0000** |
| **Brier Score (Calibration)**| N/A (Uncalibrated score) | **0.0002** | N/A |
| **Inference Latency (p50)** | **0.239 ms** | **0.342 ms** | **0.094 ms** |
| **Inference Latency (p95)** | **0.280 ms** | **0.395 ms** | **0.115 ms** |

## Baselines and Comparison
- **Hard Rules Only:** Precision = 1.0, Recall = 0.5000, F1 = 0.6667. Missed 50% of test drift events that were technically permitted by static permissions.
- **Smoothed Likelihood Only:** Precision = 0.9211, Recall = 0.6250, F1 = 0.7447, FPR = 0.0448.
- **Markov Sequence Alone:** Precision = 0.4553, Recall = 1.0000, F1 = 0.6257, FPR = 1.0000. Fails as a standalone detector due to unconditioned transition noise.
- **Isolation Forest (Unsupervised):** Precision = 0.6892, Recall = 0.9107, F1 = 0.7846, FPR = 0.3433. Flawed on benign outliers (0% accuracy on unusual compliance audits).
- **Tuned Composite Ensemble:** Precision = 0.9455, Recall = 0.9286, F1 = 0.9369, FPR = 0.0448. Best balance of interpretability, high detection, and low false alarms.

## Error Analysis
- **False Positives (Composite):** 3 normal in-role actions at step 2 of customer support sessions where the agent replied via partner-approved Zendesk API. Rarity of partner destinations relative to internal CRM lookups caused an anomaly score of 5.72 (exceeding the 5.50 cutoff).
- **False Negatives (Composite):** 4 step 0 actions of prompt injection scenarios where the agent read user input. At step 0, reading chat is normal behavior; malicious tool deviation occurs at step 1.

## Limitations & Risks
1. **Synthetic-Domain Performance vs. Real-World Generalization:** Logistic Regression achieved 1.0 F1 because the synthetic dataset was generated from 10 structured state-machine templates. In live enterprise deployments, adversarial prompts and tool arguments will have higher noise. **1.0 F1 on synthetic data does NOT imply 100% real-world accuracy.**
2. **External Benchmark Cross-Domain Gap:** On the external `AgentShield-Bench` dataset (300 tool-risk records), recall was 100% but false positive rate was 100% due to out-of-vocabulary benchmark tools. External benchmark results must be treated as exploratory.
3. **Class Imbalance & History Dependency:** Multistep drift detection requires temporal context. For step 0 cold-start actions, sequence anomaly models have zero historical state and return `uncertainty = "high"`.

## Score Semantics
- **Composite Anomaly Score (`anomaly_score`):** Represents an unbounded negative log-likelihood score ($A \ge 0$). Higher scores represent greater statistical unusualness. **It is an anomaly score, NOT a calibrated probability.** `calibrated_probability` remains `null`.
- **Behavioral Risk Probability (`risk_probability`):** Logistic regression sigmoid probability $P(\text{drift} \mid x) \in [0, 1]$. Brier score on synthetic test set is 0.0002.

## Security & Governance
- **Deterministic Policy Safety Invariant:** A model score must **NEVER** override a deterministic hard policy denial (`is_allowed_by_policy == False`). The backend must enforce static denials independently.
- **Fail-Safe Fallback:** If inference fails due to schema errors, missing fields, or corrupt artifacts, the engine returns `inference_status = "FAIL_SAFE_ERROR"`, `recommended_tier = "L2_STEP_UP"`. It never silently defaults to `L0_ALLOW`.
- **Artifact Integrity:** All model files are versioned in `model/artifacts/` with strict input/output Pydantic schemas preventing arbitrary object loading.

## Reproduction
- **Environment:** Windows 10/11 x64, Python 3.12.10.
- **Pipeline Rebuild Command:** `python -m model.src.identity_drift.data.pipeline --replications 30 --seed 42 --benchmark-limit 300`
- **Training Command:** `python -m model.src.identity_drift.models.train_and_compare`
- **Test Evaluation Command:** `python -m model.src.identity_drift.models.evaluate_test`
- **Inference Verification Command:** `python -c "from model.src.identity_drift.inference.engine import IdentityDriftInferenceEngine; print(IdentityDriftInferenceEngine().is_loaded)"`
- **Full Test Suite:** `python -m pytest model/tests -v`
