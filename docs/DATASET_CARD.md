# Dataset Card — Identity Drift Detection

> Status: Verified and documented for Phase 1. Zero placeholder data or fabricated statistics.

## Project and task
- **Project:** Identity Drift Detection in Autonomous AI Agents
- **Intended task:** Detect behavioral, sequential, and contextual anomalies indicating agent compromise, goal hijacking, permission creep, or identity drift.
- **Unit of prediction:** Atomic action event (`AgentActionEvent`) enriched with session trajectory context, sliding-window statistics, and data provenance.
- **Intended use:** Behavioral anomaly scoring at runtime to feed into a backend authorization and decision engine (L0–L4 risk tiers).
- **Out-of-scope uses:** Autonomous policy denial (must remain deterministic), standalone user identification, or direct inference of LLM latent reasoning.

## Dataset sources

### 1. Synthetic Canonical Trajectories (Internal Benchmark)
- **Official URL:** Generated internally via `model.src.identity_drift.data.synthetic_generator`
- **Dataset version/release:** v1.0-synthetic
- **Access date:** 2026-10-25
- **Licence and permitted use:** Internal project proprietary / MIT
- **Download/import method:** Python generator using deterministic NumPy RandomState (`seed=42`)
- **Original task and label definitions:** 10 canonical scenarios defined in `ML_Model_Technical_Spec.md` Section 11.
- **Actual files/tables used:** Multi-step action trajectories across customer support, procurement, financial analysis, devops, and research roles.
- **Actual record count loaded:** 780 atomic action events across 300 multi-step scenario groups (30 replications per scenario).
- **Features retained:** `event_id`, `session_id`, `timestamp`, `step_index`, `agent_id`, `agent_role`, `task_id`, `task_category`, `policy_version`, `permission_scope`, `delegation_chain`, `session_age_seconds`, `tool`, `operation`, `resource`, `resource_sensitivity`, `destination`, `destination_trust_tier`, `record_count`, `data_volume_bytes`, `is_allowed_by_policy`, `untrusted_content_in_context`, `sensitive_data_accessed_in_session`, `taint_lineage`.
- **Labels retained/mapped:** `is_drift` (binary: 0 = benign, 1 = drift), `drift_type` (taxonomy enum: `none`, `hard_policy_violation`, `unusual_legitimate`, `sensitive_egress`, `prompt_injection_drift`, `repeated_denied`, `slow_drift`, `cold_start`, `incomplete_provenance`, `delegation_mismatch`).
- **Known restrictions:** Represents simulated agent action environments.

### 2. AgentShield-Bench (External Benchmark)
- **Official URL:** `https://huggingface.co/datasets/alirezaaminzadeh/agentshield-bench`
- **Dataset version/release:** v1.0 (Aria AI Security Research)
- **Access date:** 2026-10-25
- **Licence and permitted use:** Apache-2.0
- **Download/import method:** Hugging Face Parquet download via `model.src.identity_drift.data.external_adapter.AgentShieldBenchAdapter`
- **Original task and label definitions:** AI agent tool-risk and privilege misuse evaluation benchmark. Binary label: `0` = safe tool invocation, `1` = risky/unauthorized tool invocation under adversarial injection/compromise.
- **Actual files/tables used:** `tool_risk/train-00000-of-00001.parquet`
- **Actual record count loaded:** 300 benchmark records ingested and cached locally.
- **Features retained:** Parsed tool name, task description, context text, execution category, sensitive data indicators.
- **Labels retained/mapped:** `label` (0 -> `is_drift=False`, 1 -> `is_drift=True`), `attack_category` -> `drift_type="external_benchmark_misuse"`.
- **Known restrictions:** Single-turn action scenarios; does not contain long multi-step temporal sequences. Reserved exclusively as an external test evaluation partition.

## Data quality
- **Missing values:** 0 missing values across all required fields in both synthetic and external datasets.
- **Duplicate records:** 0 duplicate `event_id` records; 0 duplicate action tuples within scenario groups.
- **Label imbalance:**
  - Synthetic dataset: 450 negative (57.69%), 330 positive (42.31%).
  - External benchmark dataset: 127 negative (42.33%), 173 positive (57.67%).
- **Invalid/malformed rows:** 0 malformed records (100% passed strict Pydantic `AgentActionEvent` validation).
- **Potential sensitive information:** Zero real-world PII or production credentials. All tokens, secrets, and customer names are synthetic mocks.
- **Cleaning steps:** Pydantic enum normalization, whitespace trimming, ISO-8601 timestamp validation, deduplication by `event_id`.

## Label definitions
- `is_drift = 0` (Benign): Authorized, role-appropriate tool usage, including cold-start benign actions and rare-but-authorized compliance actions (`unusual_legitimate`).
- `is_drift = 1` (Drift): Role deviations, prompt-injection triggered commands, sensitive data egress to untrusted destinations, repeated denied destructive operations, and gradual volume/destination drift.
- Mapped labels are distinguished from source labels via `is_synthetic` flag and `label_justification`.

## Synthetic data
- **Is synthetic data used?** Yes, for multi-step temporal trajectories across all 10 canonical scenarios.
- **Scenario-generation rules:** Generated via `SyntheticScenarioGenerator` using deterministic state machines modeling role constraints, taint propagation, sliding-window drift, and permission boundaries.
- **Label-generation rules:** Ground truth is strictly derived from scenario definitions (e.g., whether sensitive taint flows to untrusted destination, or whether tool deviates from declared role).
- **How synthetic data is separated from real/external data:** Maintained in separate parquet/jsonl files (`test_synthetic.parquet` vs. `test_external_benchmark.parquet`) and identified by `is_synthetic: bool`.
- **Limitations and possible generator bias:** Synthetic scenarios cannot capture every real-world human-agent edge case or novel zero-day prompt injection variation.

## Splitting and leakage prevention
- **Train split method:** Group-based split by `scenario_id` (70% train = 210 scenarios, 546 rows).
- **Validation split method:** Group-based split by `scenario_id` (15% validation = 45 scenarios, 111 rows).
- **Test split method:** Group-based split by `scenario_id` (15% test = 45 scenarios, 123 rows).
- **Group/agent/scenario separation:** 100% disjoint scenario sets: `set(train_scenarios) ∩ set(val_scenarios) ∩ set(test_scenarios) = ∅`. Steps from the same agent trajectory never cross split boundaries.
- **Temporal separation:** Sequence order (`step_index` and `session_age_seconds`) preserved within each trajectory.
- **Duplicate/near-duplicate checks:** Verified 0 duplicate event IDs across all partitions.
- **Preprocessing fit only on training data?:** Yes, transformers and scalers in Phase 2/3 will be fitted exclusively on `train.parquet`.

## Suitability and limitations
- **AgentShield-Bench:** Highly suitable for evaluating single-action tool misuse and privilege violations under prompt injection in MCP environments, but lacks multi-step temporal sequence logs.
- **Synthetic Trajectories:** Highly suitable for multi-step sequence analysis (Markov transitions), gradual sliding-window drift, and cold-start verification.
- **Generic Intrusion Datasets (Excluded):** Datasets such as KDD99 / CIC-IDS are excluded as primary sources because network packet flows and TCP connections do not represent agent identity drift or LLM tool invocations.

## Reproducibility
- **Preparation command:** `python -m model.src.identity_drift.data.pipeline --replications 30 --seed 42 --benchmark-limit 300`
- **Config file:** Default CLI parameters encapsulated in `model/src/identity_drift/data/pipeline.py`
- **Random seed:** `42`
- **Output files:**
  - `model/data/processed/train.parquet` (546 records)
  - `model/data/processed/val.parquet` (111 records)
  - `model/data/processed/test_synthetic.parquet` (123 records)
  - `model/data/processed/test_external_benchmark.parquet` (300 records)
  - `model/data/processed/data_summary.json`
- **Date last rebuilt:** 2026-10-25

## Known risks and caveats
- **Distribution shift:** Real production agents may exhibit different tool vocabularies or frequency distributions.
- **Synthetic-data limitations:** Synthetic evaluations test algorithmic validity under specified threat models; production deployment requires ongoing monitoring and shadow-mode evaluation.
- **Licence/privacy caveats:** External benchmark AgentShield-Bench is Apache-2.0 licensed; internal synthetic scenarios contain no private or sensitive enterprise data.
