# Identity Drift Detection in Autonomous AI Agents (Decoy)
### Runtime Behavioral Drift & Anomaly Detection Gateway with Operations Dashboard

Runtime behavioral drift and anomaly detection system for autonomous AI agents in tool-calling and Model Context Protocol (MCP) environments. Combines deterministic hard-policy enforcement (RBAC/ABAC) with an ML-powered probabilistic drift detection engine, human-in-the-loop approval escalations, cryptographic action-binding HMACs, and append-only hash-chained audit logging.

---

## 🏛️ System Architecture

```text
Incoming Agent Action Request (Tool / Resource / Destination / Arguments)
       │
       ▼
1. Security Gateway (POST /api/v1/gateway/actions)
       │── Authenticate Agent Identity & Verify Status (active / suspended / disabled)
       │
       ▼
2. Mandatory Hard Policy Gate (Deterministic Check)
       ├── Check Explicit Hard Denies (e.g. *salary*, *payroll*, *credentials*)
       ├── Check Tool / Resource / Destination Role Allowlists
       └── [VIOLATION] ──> Reject immediately (Decision: Denied / Isolated) — ML NEVER overrides hard deny.
       │
       ▼ [PASS]
3. Feature Extraction & Decoy ML Risk Engine
       ├── Extract Resource Sensitivity, Destination Trust, Payload Volume, Sequence Anomaly
       ├── Evaluates against Baseline Artifacts (`tuned_composite_detector.joblib` / `isolation_forest.joblib`)
       └── Computes Multi-Dimensional Drift Scores:
           • Tool Unusualness
           • Resource Sensitivity
           • Destination Risk
           • Sequence / Behavior Anomaly
           • Slow Drift Accumulation
       │
       ▼
4. Decision Engine & Response Tiers
       ├── L0 (Allow)           ──> Cryptographic Action Binding ──> Registered Adapter Execution
       ├── L1 (Observe)         ──> Action Binding ──> Adapter Execution with Enhanced Telemetry
       ├── L2 (Step-Up)         ──> Held in Quarantine ──> Human Approval Queue (Pending Review)
       ├── L3 (Restrict / Block)──> Deny Action ──> Record Policy & Audit Event
       └── L4 (Isolate)         ──> Suspend Agent Identity ──> Revoke Credentials ──> Critical Alert
       │
       ▼
5. Cryptographic Audit Log & Live Operations Dashboard
       └── Append-only SHA-256 hash chaining (prev_hash -> event_hash), real-time SOC monitoring
```

---

## 📁 Repository Overview

```text
├── docs/                               # Architecture, technical specs, cards, and contracts
│   ├── DATASET_CARD.md                 # Dataset provenance, schema, and split documentation
│   ├── MODEL_CARD.md                   # Model evaluation, fairness, and governance card
│   ├── MODEL_INTEGRATION_CONTRACT.md   # Integration contract between ML and Backend
│   ├── Identity_Drift_Detection_PRD.docx
│   └── Probabilistic Per-Dimension Drift Scoring.docx
├── ML_Model_Technical_Spec.md          # Technical specification for ML model and pipeline
├── model/                              # ML engineering package (scikit-learn / joblib artifacts)
│   ├── requirements.txt
│   ├── README.md
│   ├── artifacts/                      # Serialized models (tuned_composite_detector, isolation_forest, etc.)
│   ├── data/
│   │   ├── raw/                        # External benchmarks (AgentShield-Bench)
│   │   └── processed/                  # Leakage-resistant parquet & jsonl splits
│   ├── reports/                        # Model comparison, error analysis, and evaluation reports
│   ├── src/identity_drift/             # Core ML package (data, features, models, inference)
│   └── tests/                          # ML test suite
├── backend/                            # FastAPI Security Gateway & Control Plane
│   ├── requirements.txt
│   ├── app/
│   │   ├── api/                        # REST endpoints (gateway, agents, policies, approvals, alerts, audit)
│   │   ├── core/                       # Config, database setup, cryptographic HMAC signing
│   │   ├── db/                         # SQLAlchemy models
│   │   ├── schemas/                    # Pydantic validation schemas
│   │   ├── services/                   # Gateway, Policy Engine, Decision Engine, Risk/ML Service
│   │   └── adapters/                   # Sandboxed tool adapters (read_file, query_db, call_api, etc.)
│   └── tests/                          # Backend gateway & security integration tests
├── frontend/                           # React 19 + TypeScript + Tailwind CSS Dashboard
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── pages/                      # Dashboard, Agents, Actions, Approvals, Policies, Simulator
│       ├── components/                 # UI components, layout shell, risk tier badges
│       ├── hooks/                      # TanStack React Query data hooks
│       └── api/                        # Typed REST clients
├── Identity_Drift_ML_Prompt_Pack/      # Source prompt pack and documentation templates
└── run_dev.ps1                         # One-click local development launcher
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+** and npm

### 2. Automated One-Click Launch (PowerShell)
```powershell
.\run_dev.ps1
```
This automatically starts:
- **Backend API**: `http://127.0.0.1:8000` (Swagger docs at `http://127.0.0.1:8000/docs`)
- **Frontend Dashboard**: `http://localhost:5173`

---

### 3. Manual Step-by-Step Setup

#### Backend Setup
```powershell
# Create and activate virtual environment
python -m venv backend_venv
.\backend_venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
pip install -r model/requirements.txt

# Run FastAPI server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

---

## 🧪 Running Automated Tests

### Backend Security Gateway Tests
```powershell
$env:PYTHONPATH="."
pytest backend/tests/test_gateway.py -v
```

### ML Package Tests
```powershell
$env:PYTHONPATH="model/src"
pytest model/tests/ -v
```

---

## 🔒 Key Security Features

1. **Deterministic Pre-Execution Hard Policies (Gate 1):**
   - Enforces strict allowlists on agent roles, tools, and destination domains.
   - Machine learning **never overrides** a hard policy rejection.
2. **Explainable ML Drift Detection (Gate 2):**
   - Evaluates actions against historical behavioral baselines.
   - Calculates fine-grained dimension scores (`tool_unusualness`, `resource_sensitivity`, `destination_risk`, `sequence_anomaly`, `slow_drift`).
3. **Multi-Tier Decision Engine:**
   - `L0 Allow`: Routine within-profile actions execute immediately.
   - `L1 Observe`: Allowed with heightened audit logging.
   - `L2 Step-Up Approval`: Quarantined pending authorized human operator review.
   - `L3 Restrict / Block`: Action denied, incident logged.
   - `L4 Isolate`: Agent identity suspended, access tokens revoked, SOC alert dispatched.
4. **Cryptographic Action Binding:**
   - Decisions generate short-lived HMAC-SHA256 authorization tokens bound to exact agent IDs, tools, parameters, and timestamps.
5. **Tamper-Evident Audit Ledger:**
   - Every gateway event is linked into an append-only SHA-256 hash chain (`prev_hash -> event_hash`).
