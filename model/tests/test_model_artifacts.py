"""
Unit tests for Model Artifact Loading and Inference Compatibility.
"""

from pathlib import Path
import joblib
import pandas as pd
from model.src.identity_drift.features.extractor import IdentityDriftFeatureExtractor
from model.src.identity_drift.models.supervised import LogisticRegressionDriftModel
from model.src.identity_drift.models.isolation_forest import IsolationForestDriftModel
from model.src.identity_drift.models.baselines import CompositeBaselineDetector


def test_saved_artifacts_load_and_predict():
    artifacts_dir = Path(__file__).resolve().parents[1] / "artifacts"
    
    # Check artifact files exist
    assert (artifacts_dir / "feature_extractor.joblib").exists()
    assert (artifacts_dir / "logistic_regression_behavioral.joblib").exists()
    assert (artifacts_dir / "isolation_forest.joblib").exists()
    assert (artifacts_dir / "tuned_composite_detector.joblib").exists()

    # Load artifacts
    extractor: IdentityDriftFeatureExtractor = joblib.load(artifacts_dir / "feature_extractor.joblib")
    lr_model: LogisticRegressionDriftModel = joblib.load(artifacts_dir / "logistic_regression_behavioral.joblib")
    iso_model: IsolationForestDriftModel = joblib.load(artifacts_dir / "isolation_forest.joblib")
    comp_model: CompositeBaselineDetector = joblib.load(artifacts_dir / "tuned_composite_detector.joblib")

    # Mock incoming runtime event
    mock_event = {
        "event_id": "test-eval-01",
        "agent_role": "customer_support",
        "task_category": "support",
        "tool": "search_knowledgebase",
        "operation": "query",
        "resource_sensitivity": "public",
        "destination_trust_tier": "trusted_internal",
        "record_count": 1,
        "data_volume_bytes": 512,
        "is_allowed_by_policy": True,
        "session_age_seconds": 15.0,
        "step_index": 1,
    }

    # Extract features
    features = extractor.extract_single_event(mock_event)
    feat_df = pd.DataFrame([features])

    # Test LR prediction
    prob = lr_model.predict_proba(feat_df)
    assert len(prob) == 1
    assert 0.0 <= prob[0] <= 1.0

    # Test Isolation Forest prediction
    iso_scores = iso_model.score_samples(feat_df)
    assert len(iso_scores) == 1

    # Test Composite Detector prediction
    comp_out = comp_model.predict_record(features)
    assert "anomaly_score" in comp_out
    assert "dimension_scores" in comp_out
    assert comp_out["calibrated_probability"] is None  # Uncalibrated per spec


def test_synthetic_test_partition_untouched():
    data_dir = Path(__file__).resolve().parents[1] / "data" / "processed"
    test_file = data_dir / "test_synthetic.parquet"
    assert test_file.exists()
    df_test = pd.read_parquet(test_file)
    assert len(df_test) == 123, "Synthetic test partition was modified or corrupted!"
