"""
Phase 2 Baseline Experiment Runner.
Fits baseline detectors on train.parquet and evaluates performance on val.parquet
and the external benchmark partition.
Generates genuine empirical metrics without fabricating statistics.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Dict, Any, List
import pandas as pd
import numpy as np

from ..features.extractor import IdentityDriftFeatureExtractor
from .baselines import (
    PolicyRuleBaseline,
    SmoothedLikelihoodBaseline,
    MarkovSequenceBaseline,
    CompositeBaselineDetector,
)


def compute_metrics(y_true: List[bool], y_pred: List[bool]) -> Dict[str, Any]:
    """
    Computes exact binary classification metrics.
    """
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt and yp)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if not yt and yp)
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if not yt and not yp)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt and not yp)

    total = len(y_true)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    tpr = recall

    return {
        "total_samples": total,
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "false_positive_rate": round(fpr, 4),
        "true_positive_rate": round(tpr, 4),
    }


def run_baseline_experiment() -> Dict[str, Any]:
    data_dir = Path(__file__).resolve().parents[3] / "data" / "processed"
    reports_dir = Path(__file__).resolve().parents[3] / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load Datasets
    df_train = pd.read_parquet(data_dir / "train.parquet")
    df_val = pd.read_parquet(data_dir / "val.parquet")
    df_ext = pd.read_parquet(data_dir / "test_external_benchmark.parquet")

    # 2. Fit Feature Extractor strictly on Train
    extractor = IdentityDriftFeatureExtractor().fit(df_train)
    feat_train = extractor.extract_dataframe(df_train)
    feat_val = extractor.extract_dataframe(df_val)
    feat_ext = extractor.extract_dataframe(df_ext)

    # Merge ground truth labels back based on event_id
    val_merged = pd.merge(feat_val, df_val[["event_id", "is_drift", "drift_type", "scenario_category"]], on="event_id")
    ext_merged = pd.merge(feat_ext, df_ext[["event_id", "is_drift", "drift_type", "scenario_category"]], on="event_id")

    # 3. Fit Baselines on Training Features
    rule_baseline = PolicyRuleBaseline()
    likelihood_baseline = SmoothedLikelihoodBaseline(alpha=1.0).fit(feat_train)
    markov_baseline = MarkovSequenceBaseline(beta=1.0).fit(feat_train)
    composite_detector = CompositeBaselineDetector(anomaly_threshold=6.5).fit(feat_train)

    # 4. Evaluate on Validation Set (Synthetic Trajectories)
    y_true_val = val_merged["is_drift"].tolist()

    # Model 1: Rules only
    y_pred_rules = [rule_baseline.predict_record(row)[0] for _, row in val_merged.iterrows()]

    # Model 2: Likelihood only (threshold > 4.5)
    y_pred_like = [likelihood_baseline.score_record(row)["likelihood_anomaly_score"] >= 4.5 for _, row in val_merged.iterrows()]

    # Model 3: Markov sequence only (threshold > 2.5)
    y_pred_markov = [markov_baseline.score_transition(row)["sequence_anomaly_score"] >= 2.5 for _, row in val_merged.iterrows()]

    # Model 4: Composite baseline
    comp_outputs = [composite_detector.predict_record(row) for _, row in val_merged.iterrows()]
    y_pred_composite = [out["predicted_drift"] for out in comp_outputs]

    # Metrics
    metrics_rules = compute_metrics(y_true_val, y_pred_rules)
    metrics_like = compute_metrics(y_true_val, y_pred_like)
    metrics_markov = compute_metrics(y_true_val, y_pred_markov)
    metrics_composite = compute_metrics(y_true_val, y_pred_composite)

    # Error analysis on composite
    error_cases = []
    for idx, (row, out, yt, yp) in enumerate(zip(val_merged.to_dict(orient="records"), comp_outputs, y_true_val, y_pred_composite)):
        if yt != yp:
            error_cases.append({
                "event_id": row["event_id"],
                "drift_type": row["drift_type"],
                "scenario_category": row["scenario_category"],
                "ground_truth": yt,
                "predicted": yp,
                "anomaly_score": out["anomaly_score"],
                "reasons": out["reasons"],
            })

    # 5. Evaluate on External Benchmark (AgentShield-Bench)
    y_true_ext = ext_merged["is_drift"].tolist()
    ext_comp_outputs = [composite_detector.predict_record(row) for _, row in ext_merged.iterrows()]
    y_pred_ext = [out["predicted_drift"] for out in ext_comp_outputs]
    metrics_ext = compute_metrics(y_true_ext, y_pred_ext)

    report = {
        "experiment_name": "Phase 2 Baseline Detector Evaluation",
        "validation_samples": len(df_val),
        "external_benchmark_samples": len(df_ext),
        "validation_metrics": {
            "Baseline_0_Hard_Rules_Only": metrics_rules,
            "Baseline_A_Smoothed_Likelihood": metrics_like,
            "Baseline_B_Markov_Sequence": metrics_markov,
            "Baseline_Composite": metrics_composite,
        },
        "external_benchmark_metrics": {
            "Baseline_Composite": metrics_ext,
        },
        "composite_error_analysis": {
            "total_errors": len(error_cases),
            "false_positives": metrics_composite["false_positives"],
            "false_negatives": metrics_composite["false_negatives"],
            "sample_errors": error_cases[:6],
        }
    }

    report_path = reports_dir / "phase2_baseline_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report


if __name__ == "__main__":
    report = run_baseline_experiment()
    print("Baseline Experiment Completed Successfully!")
    print(json.dumps(report["validation_metrics"], indent=2))
