"""
Integration tests for the complete IdentityDriftDataPipeline.
"""

from pathlib import Path
import json
import pandas as pd
from model.src.identity_drift.data.pipeline import IdentityDriftDataPipeline


def test_end_to_end_data_pipeline(tmp_path):
    pipeline = IdentityDriftDataPipeline(output_dir=tmp_path, seed=42)
    summary = pipeline.run(synthetic_replications=5, include_external_benchmark=False)

    assert summary["total_synthetic_records"] > 0
    assert summary["train_records"] > 0
    assert summary["val_records"] > 0
    assert summary["test_synthetic_records"] > 0

    # Check parquet output files
    assert (tmp_path / "train.parquet").exists()
    assert (tmp_path / "val.parquet").exists()
    assert (tmp_path / "test_synthetic.parquet").exists()
    assert (tmp_path / "data_summary.json").exists()

    # Verify parquet can be loaded and matches counts
    df_train = pd.read_parquet(tmp_path / "train.parquet")
    assert len(df_train) == summary["train_records"]

    # Verify data_summary content
    with open(tmp_path / "data_summary.json", "r", encoding="utf-8") as f:
        saved_summary = json.load(f)
    assert saved_summary["random_seed"] == 42
    assert saved_summary["synthetic_health_audit"]["is_healthy"] is True
