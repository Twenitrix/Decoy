# Identity Drift Detection — Model & Research Workstream

This subpackage contains the complete data pipeline, feature engineering, baseline detectors, candidate models, held-out evaluation, and inference packaging for the **Identity Drift Detection in Autonomous AI Agents** project.

## Directory Layout

```text
model/
├── README.md               # Workstream overview and execution guide
├── requirements.txt        # Python dependency manifest
├── configs/                # Pipeline configurations
├── data/
│   ├── raw/                # Cached external benchmarks (e.g., AgentShield-Bench)
│   └── processed/          # Processed parquet/jsonl splits (train, val, test_synthetic, test_external)
├── src/
│   └── identity_drift/
│       ├── data/           # Schemas, adapters, generators, validation, splitters (Phase 1)
│       ├── features/       # Feature schema, history buffer deque, feature extractor (Phase 2)
│       ├── models/         # Baselines, Logistic Regression, Isolation Forest, EWMA (Phase 3)
│       └── inference/      # Standalone inference engine, Pydantic schemas (Phase 5)
├── artifacts/              # Frozen model weights & preprocessors (.joblib & metadata.json)
├── reports/                # Genuine empirical evaluation reports (.json & .md)
└── tests/                  # 26 unit and integration tests
```

---

## Reproducible Pipeline Commands

### 1. Data Pipeline Execution (Phase 1)
Generates 10 canonical synthetic multi-step scenarios, ingests external AgentShield-Bench records, validates schemas, and generates disjoint scenario-group partitions:

```powershell
python -m model.src.identity_drift.data.pipeline --replications 30 --seed 42 --benchmark-limit 300
```

### 2. Candidate Model Training & Comparison (Phase 3)
Fits preprocessors and models strictly on `train.parquet`, tunes decision thresholds on `val.parquet`, and saves frozen artifacts into `model/artifacts/`:

```powershell
python -m model.src.identity_drift.models.train_and_compare
```

### 3. Held-Out Test Partition Evaluation (Phase 4)
Evaluates frozen candidates strictly on the untouched test partition (`test_synthetic.parquet`, 123 rows) and benchmarks inference latency over 50 repetitions:

```powershell
python -m model.src.identity_drift.models.evaluate_test
```

### 4. Run Complete Test Suite
Executes all 26 unit and integration tests across data schemas, feature extractors, history deques, model artifacts, inference safety, and split integrity:

```powershell
python -m pytest model/tests -v
```

---

## Inference Engine Usage Example (Phase 5)

The inference engine is packaged under `model/src/identity_drift/inference/`:

```python
from model.src.identity_drift.inference.engine import IdentityDriftInferenceEngine

# Initialize engine once at application startup
engine = IdentityDriftInferenceEngine()

# Evaluate incoming action request
response = engine.evaluate({
    "event_id": "evt-runtime-001",
    "session_id": "sess-support-10",
    "agent_id": "agent-support-01",
    "agent_role": "customer_support",
    "timestamp": "2026-10-25T14:30:00Z",
    "step_index": 0,
    "action": {
        "tool": "search_knowledgebase",
        "operation": "query",
        "resource": "public_faq",
        "resource_sensitivity": "public",
        "destination": "internal_search_service",
        "destination_trust_tier": "trusted_internal",
        "record_count": 5,
        "data_volume_bytes": 2048,
        "is_allowed_by_policy": True,
    },
    "context": {
        "task_id": "task-support-101",
        "task_category": "customer_support",
        "policy_version": "v1.0",
        "permission_scope": ["search_knowledgebase", "get_customer_profile"],
    }
})

print("Recommended Tier:", response.risk_summary.recommended_tier)  # L0_ALLOW
print("Composite Anomaly Score:", response.composite_anomaly.anomaly_score)
print("Behavioral Probability:", response.behavioral_risk.risk_probability)
print("Dimension Breakdown:", response.composite_anomaly.dimension_scores)
```
