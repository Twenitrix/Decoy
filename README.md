# Identity Drift Detection in Autonomous AI Agents

Runtime behavioral drift and anomaly detection system for autonomous AI agents in tool-calling and Model Context Protocol (MCP) environments.

## Repository Overview

```text
├── docs/                               # Architecture, technical specs, cards, and contracts
│   ├── DATASET_CARD.md                 # Dataset provenance, schema, and split documentation
│   ├── MODEL_CARD.md                   # Model evaluation, fairness, and governance card
│   ├── MODEL_INTEGRATION_CONTRACT.md   # Integration contract between ML and Backend
│   ├── Identity_Drift_Detection_PRD.docx
│   └── Probabilistic Per-Dimension Drift Scoring.docx
├── ML_Model_Technical_Spec.md          # Technical specification for ML model and pipeline
├── model/                              # ML engineering workstream (Python / scikit-learn)
│   ├── requirements.txt
│   ├── README.md
│   ├── configs/
│   ├── data/
│   │   ├── raw/                        # Cached external benchmarks (AgentShield-Bench)
│   │   └── processed/                  # Leakage-resistant processed parquet & jsonl splits
│   ├── src/identity_drift/             # Core ML package (data, features, models, inference)
│   └── tests/                          # ML test suite
├── backend/                            # Backend API and gateway engine (owned by Backend teammate)
├── frontend/                           # UI dashboard and visualization (owned by Frontend teammate)
└── Identity_Drift_ML_Prompt_Pack/      # Source prompt pack and documentation templates
```

## Workstream Responsibilities

- **ML & Data Workstream:** Responsible for dataset research, pipeline reproducibility, feature engineering, baseline & anomaly model implementation, evaluation, error analysis, and inference packaging.
- **Backend Workstream:** Responsible for API gateway, identity & authentication, deterministic hard-policy enforcement (RBAC/ABAC), tool execution sandbox, and database persistence.
- **Frontend Workstream:** Responsible for dashboard UI, real-time agent observability, alert visualization, and human-in-the-loop review screens.
