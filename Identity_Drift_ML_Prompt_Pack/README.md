# Identity Drift Detection — ML Work Prompt Pack

This pack is for the **ML/dataset contributor only**. Frontend and backend implementation belong to teammates.

## Existing specification files to keep alongside this pack

Use these existing project files as source-of-truth documents:
- `ML_Model_Technical_Spec.md` — required for every ML phase.
- `Identity_Drift_Detection_PRD.docx` — useful for project intent and constraints.
- `Probabilistic Per-Dimension Drift Scoring.docx` — use if this scoring approach is part of the agreed design.

Do not give Antigravity the frontend/backend implementation prompts. You do not own those workstreams.

## Prompt order

1. `prompts/01_dataset_research_and_pipeline.md`
2. `prompts/02_feature_engineering_and_baselines.md`
3. `prompts/03_train_and_compare_models.md`
4. `prompts/04_evaluation_and_error_analysis.md`
5. `prompts/05_inference_packaging_and_contract.md`
6. `prompts/06_final_documentation_and_audit.md`

Run one phase at a time. Review the actual changed files and test output before moving to the next phase. If a phase fails, fix it before continuing.

## Companion documentation templates

- `docs/DATASET_CARD.md`: complete during Phase 1, then update when the dataset changes.
- `docs/MODEL_CARD.md`: complete after actual evaluation, not before.
- `docs/MODEL_INTEGRATION_CONTRACT.md`: agree with the backend teammate early, then update to match the actual model inference interface.

## Suggested placement inside the full monorepo

```text
identity-drift-detection/
├── docs/
│   ├── PRD.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── API_CONTRACTS.md
│   ├── DATASET_CARD.md
│   ├── MODEL_CARD.md
│   └── MODEL_INTEGRATION_CONTRACT.md
├── model/
│   ├── README.md
│   ├── requirements.txt
│   ├── configs/
│   ├── data/
│   ├── notebooks/
│   ├── src/identity_drift/
│   ├── tests/
│   ├── artifacts/
│   └── reports/
└── ...
```

Keep raw data, private data, secrets, and large generated artifacts out of ordinary Git commits unless the data licence, privacy requirements, and repository storage strategy explicitly permit them.

## Important research rules

- Verify the current dataset schema, licence, access method, and labels before use.
- Agent-security benchmark scenarios and generic network intrusion datasets do not automatically represent the same prediction task.
- Do not claim real-world efficacy based only on synthetic scenarios.
- Do not fabricate metrics, sample counts, dataset access, or trained artifacts.
- Treat anomaly scores as scores, not calibrated probabilities, unless calibration is actually validated.
- A model score must never override a deterministic hard policy denial. That enforcement belongs to the gateway/backend teammate.
