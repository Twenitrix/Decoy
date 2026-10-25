"""
Unit tests for evaluation metrics calculation and test set integrity.
"""

from pathlib import Path
import pandas as pd
from model.src.identity_drift.models.evaluate_test import compute_metrics, compute_brier_score


def test_compute_metrics_standard():
    y_true = [True, True, False, False]
    y_pred = [True, False, True, False]

    m = compute_metrics(y_true, y_pred)
    assert m["total_samples"] == 4
    assert m["true_positives"] == 1
    assert m["false_positives"] == 1
    assert m["true_negatives"] == 1
    assert m["false_negatives"] == 1
    assert m["precision"] == 0.5
    assert m["recall"] == 0.5
    assert m["f1_score"] == 0.5
    assert m["false_positive_rate"] == 0.5


def test_compute_metrics_edge_cases():
    # All true, all predicted true
    m_perfect = compute_metrics([True, True], [True, True])
    assert m_perfect["precision"] == 1.0
    assert m_perfect["recall"] == 1.0
    assert m_perfect["f1_score"] == 1.0
    assert m_perfect["false_positive_rate"] == 0.0

    # All negative, all predicted negative
    m_neg = compute_metrics([False, False], [False, False])
    assert m_neg["precision"] == 0.0
    assert m_neg["recall"] == 0.0
    assert m_neg["f1_score"] == 0.0
    assert m_neg["false_positive_rate"] == 0.0


def test_brier_score():
    y_true = [True, False]
    # Perfect probabilities
    assert compute_brier_score(y_true, [1.0, 0.0]) == 0.0
    # Completely wrong probabilities
    assert compute_brier_score(y_true, [0.0, 1.0]) == 1.0
    # 50-50 uncertainty
    assert compute_brier_score(y_true, [0.5, 0.5]) == 0.25


def test_held_out_test_set_integrity():
    data_dir = Path(__file__).resolve().parents[1] / "data" / "processed"
    test_file = data_dir / "test_synthetic.parquet"
    assert test_file.exists(), "test_synthetic.parquet is missing!"

    df_test = pd.read_parquet(test_file)
    assert len(df_test) == 123
    assert df_test.isnull().sum().sum() == 0, "Test set contains missing values!"
    assert len(df_test["scenario_id"].unique()) == 45, "Test set must contain exactly 45 scenario groups!"
