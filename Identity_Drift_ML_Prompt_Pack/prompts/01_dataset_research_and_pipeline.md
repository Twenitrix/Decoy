# Prompt 1 — Dataset research and reproducible data pipeline

**Attach:** `ML_Model_Technical_Spec.md` and this pack's `docs/DATASET_CARD.md`. Also provide the existing PRD if available.

```text
Act as an ML research engineer. My responsibility is ONLY the dataset and ML model. Do not implement frontend or backend features.

Read:
- ML_Model_Technical_Spec.md
- docs/DATASET_CARD.md
- model/README.md, if present

Build the dataset research and preparation pipeline under model/src/identity_drift/data/.

1. Research candidate public datasets. Start with agent-focused security benchmarks such as AgentShield-Bench, but verify the live dataset card, schema, access method, licence and allowed use before relying on it. Consider generic network intrusion datasets only as separate experiments unless there is a defensible label/task mapping.
2. Implement reproducible import/download adapters, schema validation, cleaning, deduplication, label mapping and dataset preparation.
3. Record source URLs, access date, licence, dataset version, fields, label definitions, loaded row counts, missing values, class balance, limitations and suitability in docs/DATASET_CARD.md.
4. Create documented synthetic agent-action scenarios only where necessary. Include normal permitted behaviour, unusual-but-legitimate behaviour, prohibited actions, suspicious sequences, unexpected destinations, gradual drift and cold-start histories. Synthetic labels must come from explicit scenario rules and must be identified as synthetic.
5. Avoid data leakage. Split by scenario/agent/group and/or time where appropriate so near-duplicate histories or scenario templates cannot leak across train/validation/test. Fit learned preprocessing only on training data.
6. Keep incompatible datasets separate. Never pretend network-intrusion labels are ground truth for agent identity drift.
7. Add tests for schema validation, label mapping, split integrity and reproducibility.
8. Add commands to rebuild processed data from documented sources.

Do not train the final model in this phase. Do not invent source access, licence permissions, row counts or statistics. If a dataset is unavailable or unsuitable, document the actual issue and proceed only with valid alternatives.

Run the data tests and report the commands, actual results, files changed and unresolved issues. Stop after the pipeline and dataset documentation are ready.
```
