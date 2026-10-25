"""
Unified Data Preparation Pipeline.
Coordinates data generation, benchmark ingestion, schema validation,
leakage-free splitting, and artifact export.
"""

from __future__ import annotations
import argparse
import json
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd

from .schemas import AgentActionEvent
from .synthetic_generator import SyntheticScenarioGenerator
from .external_adapter import AgentShieldBenchAdapter
from .validation import DataValidator
from .splitter import GroupScenarioSplitter


class IdentityDriftDataPipeline:
    """
    End-to-end data pipeline managing synthetic scenario generation,
    external benchmark ingestion, validation, and split generation.
    """

    def __init__(self, output_dir: Optional[Path] = None, seed: int = 42):
        self.output_dir = output_dir or Path(__file__).resolve().parents[3] / "data" / "processed"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.seed = seed

    def run(
        self,
        synthetic_replications: int = 25,
        include_external_benchmark: bool = True,
        benchmark_limit: int = 300,
    ) -> Dict[str, Any]:
        """
        Executes complete pipeline:
        1. Generates synthetic multi-step scenarios across all 10 canonical patterns.
        2. Ingests and normalizes external AgentShield-Bench records if available.
        3. Validates and audits schemas.
        4. Splits data by scenario groups to prevent cross-split leakage.
        5. Saves processed outputs and summary metrics.
        """
        # 1. Generate Synthetic Data
        synth_gen = SyntheticScenarioGenerator(seed=self.seed)
        synthetic_events = synth_gen.generate_all_scenarios(replications_per_scenario=synthetic_replications)
        synth_dicts = [e.model_dump() for e in synthetic_events]
        df_synthetic = pd.DataFrame(synth_dicts)

        # 2. Ingest External Benchmark Data
        df_external = pd.DataFrame()
        external_events_count = 0
        if include_external_benchmark:
            try:
                adapter = AgentShieldBenchAdapter()
                raw_subset = adapter.fetch_or_load_subset("tool_risk", max_records=benchmark_limit)
                external_events = adapter.to_agent_action_events(raw_subset)
                external_events_count = len(external_events)
                df_external = pd.DataFrame([e.model_dump() for e in external_events])
            except Exception as e:
                print(f"[Warning] External benchmark ingestion skipped/fallback: {e}")

        # 3. Validate and Deduplicate
        valid_synthetic, synth_errors = DataValidator.validate_records(synth_dicts)
        assert len(synth_errors) == 0, f"Found {len(synth_errors)} invalid synthetic records!"
        df_synthetic = DataValidator.deduplicate(df_synthetic)

        # 4. Leakage-Resistant Splitting (for synthetic trajectories)
        splitter = GroupScenarioSplitter(train_ratio=0.70, val_ratio=0.15, test_ratio=0.15, seed=self.seed)
        df_train, df_val, df_test_synth, split_meta = splitter.split(df_synthetic, group_col="scenario_id")

        # 5. External Benchmark is kept as a separate dedicated external test set
        # to ensure external results are never commingled with synthetic metrics.
        df_test_external = pd.DataFrame()
        if not df_external.empty:
            df_test_external = DataValidator.deduplicate(df_external)

        # 6. Save Artifacts
        df_train.to_parquet(self.output_dir / "train.parquet", index=False)
        df_val.to_parquet(self.output_dir / "val.parquet", index=False)
        df_test_synth.to_parquet(self.output_dir / "test_synthetic.parquet", index=False)

        # Also write JSONL for inspection and human review
        df_train.to_json(self.output_dir / "train.jsonl", orient="records", lines=True)
        df_val.to_json(self.output_dir / "val.jsonl", orient="records", lines=True)
        df_test_synth.to_json(self.output_dir / "test_synthetic.jsonl", orient="records", lines=True)

        if not df_test_external.empty:
            df_test_external.to_parquet(self.output_dir / "test_external_benchmark.parquet", index=False)
            df_test_external.to_json(self.output_dir / "test_external_benchmark.jsonl", orient="records", lines=True)

        # 7. Quality and Health Audit
        audit_synth = DataValidator.audit_dataframe(df_synthetic)
        audit_external = DataValidator.audit_dataframe(df_test_external) if not df_test_external.empty else {}

        summary = {
            "synthetic_replications": synthetic_replications,
            "random_seed": self.seed,
            "total_synthetic_records": len(df_synthetic),
            "train_records": len(df_train),
            "val_records": len(df_val),
            "test_synthetic_records": len(df_test_synth),
            "external_benchmark_records": len(df_test_external),
            "split_metadata": split_meta,
            "synthetic_health_audit": audit_synth,
            "external_health_audit": audit_external,
            "files_written": [
                str(self.output_dir / "train.parquet"),
                str(self.output_dir / "val.parquet"),
                str(self.output_dir / "test_synthetic.parquet"),
                str(self.output_dir / "test_external_benchmark.parquet") if not df_test_external.empty else None,
            ]
        }

        with open(self.output_dir / "data_summary.json", "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, default=str)

        return summary


def main():
    parser = argparse.ArgumentParser(description="Reproducible Data Pipeline for Identity Drift Detection")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--replications", type=int, default=25, help="Number of replications per canonical scenario")
    parser.add_argument("--no-external", action="store_true", help="Disable fetching external AgentShield-Bench records")
    parser.add_argument("--benchmark-limit", type=int, default=300, help="Max external benchmark records to load")
    args = parser.parse_args()

    pipeline = IdentityDriftDataPipeline(seed=args.seed)
    summary = pipeline.run(
        synthetic_replications=args.replications,
        include_external_benchmark=(not args.no_external),
        benchmark_limit=args.benchmark_limit,
    )
    print("Data Pipeline Completed Successfully!")
    print(f"Total synthetic records: {summary['total_synthetic_records']}")
    print(f"Train records: {summary['train_records']}, Val records: {summary['val_records']}, Test records: {summary['test_synthetic_records']}")
    print(f"External benchmark records: {summary['external_benchmark_records']}")
    print(f"Summary saved to: {pipeline.output_dir / 'data_summary.json'}")


if __name__ == "__main__":
    main()
