"""
Phase 4 Rigorous Test Evaluation and Error Analysis.
Evaluates frozen Phase 3 candidate models on the held-out test partition (test_synthetic.parquet).
Guarantees zero re-fitting or threshold tuning on test data.
"""

from __future__ import annotations
import time
import json
from pathlib import Path
from typing import Dict, Any, List
import pandas as pd
import numpy as np
import joblib

from ..features.extractor import IdentityDriftFeatureExtractor
from .baselines import (
    PolicyRuleBaseline,
    SmoothedLikelihoodBaseline,
    MarkovSequenceBaseline,
    CompositeBaselineDetector,
)
from .gradual_drift import SlidingWindowDriftDetector
from .supervised import LogisticRegressionDriftModel
from .isolation_forest import IsolationForestDriftModel


def compute_metrics(y_true: List[bool], y_pred: List[bool]) -> Dict[str, Any]:
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt and yp)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if not yt and yp)
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if not yt and not yp)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt and not yp)

    total = len(y_true)
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    tpr = rec

    return {
        "total_samples": total,
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "false_positive_rate": round(fpr, 4),
        "true_positive_rate": round(tpr, 4),
    }


def compute_brier_score(y_true: List[bool], y_prob: List[float]) -> float:
    """
    Computes Brier score: mean squared error of predicted probabilities.
    Lower is better; 0.0 is perfect calibration.
    """
    y_t = np.array(y_true, dtype=float)
    y_p = np.array(y_prob, dtype=float)
    return float(np.mean((y_p - y_t) ** 2))


def compute_per_scenario_performance(df_merged: pd.DataFrame, y_pred: List[bool]) -> Dict[str, Dict[str, Any]]:
    results = {}
    df_eval = df_merged.copy()
    df_eval["pred"] = y_pred

    for scen_cat, grp in df_eval.groupby("scenario_category"):
        y_t = grp["is_drift"].tolist()
        y_p = grp["pred"].tolist()
        tp = sum(1 for yt, yp in zip(y_t, y_p) if yt and yp)
        fp = sum(1 for yt, yp in zip(y_t, y_p) if not yt and yp)
        tn = sum(1 for yt, yp in zip(y_t, y_p) if not yt and not yp)
        fn = sum(1 for yt, yp in zip(y_t, y_p) if yt and not yp)
        acc = sum(1 for yt, yp in zip(y_t, y_p) if yt == yp) / len(grp)

        results[str(scen_cat)] = {
            "samples": len(grp),
            "drift_positive_count": sum(y_t),
            "predicted_positive_count": sum(y_p),
            "true_positives": tp,
            "false_positives": fp,
            "true_negatives": tn,
            "false_negatives": fn,
            "accuracy": round(acc, 4),
        }
    return results


def run_test_evaluation() -> Dict[str, Any]:
    base_dir = Path(__file__).resolve().parents[3]
    data_dir = base_dir / "data" / "processed"
    artifacts_dir = base_dir / "artifacts"
    reports_dir = base_dir / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load Frozen Artifacts
    extractor: IdentityDriftFeatureExtractor = joblib.load(artifacts_dir / "feature_extractor.joblib")
    lr_beh: LogisticRegressionDriftModel = joblib.load(artifacts_dir / "logistic_regression_behavioral.joblib")
    lr_full: LogisticRegressionDriftModel = joblib.load(artifacts_dir / "logistic_regression_full.joblib")
    iso_model: IsolationForestDriftModel = joblib.load(artifacts_dir / "isolation_forest.joblib")
    comp_model: CompositeBaselineDetector = joblib.load(artifacts_dir / "tuned_composite_detector.joblib")
    drift_detector: SlidingWindowDriftDetector = joblib.load(artifacts_dir / "sliding_window_drift_detector.joblib")

    # Load frozen Phase 3 thresholds from reports
    with open(reports_dir / "phase3_model_comparison.json", "r", encoding="utf-8") as f:
        p3_report = json.load(f)
    p3_metrics = p3_report["validation_metrics"]

    th_markov = p3_metrics["Candidate_Markov_Sequence_Tuned"]["tuned_threshold"]
    th_drift = p3_metrics["Candidate_Gradual_Drift_Detector"]["tuned_threshold"]
    th_iso = p3_metrics["Candidate_Isolation_Forest"]["tuned_threshold"]
    th_lr_beh = p3_metrics["Candidate_Logistic_Regression_Behavioral"]["tuned_threshold"]
    th_lr_full = p3_metrics["Candidate_Logistic_Regression_Full"]["tuned_threshold"]
    th_comp = p3_metrics["Candidate_Tuned_Composite_Ensemble"]["tuned_threshold"]

    # 2. Load Held-Out Test Set
    df_test = pd.read_parquet(data_dir / "test_synthetic.parquet")
    assert len(df_test) == 123, f"Expected 123 test rows, found {len(df_test)}"
    y_test = df_test["is_drift"].tolist()

    # 3. Extract Features using Frozen Extractor
    feat_test = extractor.extract_dataframe(df_test)
    test_merged = pd.merge(
        feat_test,
        df_test[["event_id", "session_id", "is_drift", "drift_type", "scenario_category"]],
        on="event_id",
    )

    metrics_test: Dict[str, Any] = {}
    per_scenario_test: Dict[str, Any] = {}
    latency_stats: Dict[str, Any] = {}
    error_analyses: Dict[str, List[Dict[str, Any]]] = {}

    # --- 1. Baseline 0: Hard Rules ---
    rule_base = PolicyRuleBaseline()
    latencies = []
    y_pred_rules = []
    for _ in range(50):
        t0 = time.perf_counter()
        preds = [rule_base.predict_record(row)[0] for _, row in test_merged.iterrows()]
        latencies.append((time.perf_counter() - t0) / len(test_merged) * 1000.0)
        y_pred_rules = preds
    metrics_test["Baseline_0_Hard_Rules"] = compute_metrics(y_test, y_pred_rules)
    per_scenario_test["Baseline_0_Hard_Rules"] = compute_per_scenario_performance(test_merged, y_pred_rules)
    latency_stats["Baseline_0_Hard_Rules"] = {
        "p50_ms": round(float(np.percentile(latencies, 50)), 4),
        "p95_ms": round(float(np.percentile(latencies, 95)), 4),
        "mean_ms": round(float(np.mean(latencies)), 4),
    }

    # --- 2. Baseline A: Smoothed Likelihood ---
    like_base = comp_model.likelihood_baseline
    latencies = []
    y_pred_like = []
    for _ in range(50):
        t0 = time.perf_counter()
        preds = [like_base.score_record(row)["likelihood_anomaly_score"] >= 4.5 for _, row in test_merged.iterrows()]
        latencies.append((time.perf_counter() - t0) / len(test_merged) * 1000.0)
        y_pred_like = preds
    metrics_test["Baseline_A_Smoothed_Likelihood"] = compute_metrics(y_test, y_pred_like)
    per_scenario_test["Baseline_A_Smoothed_Likelihood"] = compute_per_scenario_performance(test_merged, y_pred_like)
    latency_stats["Baseline_A_Smoothed_Likelihood"] = {
        "p50_ms": round(float(np.percentile(latencies, 50)), 4),
        "p95_ms": round(float(np.percentile(latencies, 95)), 4),
        "mean_ms": round(float(np.mean(latencies)), 4),
    }

    # --- 3. Candidate Markov Sequence (Tuned) ---
    markov_base = comp_model.markov_baseline
    latencies = []
    y_pred_markov = []
    for _ in range(50):
        t0 = time.perf_counter()
        preds = [markov_base.score_transition(row)["sequence_anomaly_score"] >= th_markov for _, row in test_merged.iterrows()]
        latencies.append((time.perf_counter() - t0) / len(test_merged) * 1000.0)
        y_pred_markov = preds
    metrics_test["Candidate_Markov_Sequence_Tuned"] = {
        **compute_metrics(y_test, y_pred_markov),
        "threshold": th_markov,
    }
    per_scenario_test["Candidate_Markov_Sequence_Tuned"] = compute_per_scenario_performance(test_merged, y_pred_markov)
    latency_stats["Candidate_Markov_Sequence_Tuned"] = {
        "p50_ms": round(float(np.percentile(latencies, 50)), 4),
        "p95_ms": round(float(np.percentile(latencies, 95)), 4),
        "mean_ms": round(float(np.mean(latencies)), 4),
    }

    # --- 4. Candidate Gradual Drift Detector ---
    drift_scores = []
    latencies = []
    for _ in range(50):
        t0 = time.perf_counter()
        run_scores = []
        for session_id, grp in test_merged.groupby("session_id", sort=False):
            vols: List[float] = []
            tiers: List[int] = []
            for _, row in grp.iterrows():
                res = drift_detector.score_window(row, vols, tiers)
                run_scores.append(res["gradual_drift_score"])
                vols.append(float(row.get("log_volume_bytes", 0.0)))
                tiers.append(int(row.get("destination_trust_tier_num", 0)))
        latencies.append((time.perf_counter() - t0) / len(test_merged) * 1000.0)
        drift_scores = run_scores

    y_pred_drift = [s >= th_drift for s in drift_scores]
    metrics_test["Candidate_Gradual_Drift_Detector"] = {
        **compute_metrics(y_test, y_pred_drift),
        "threshold": th_drift,
    }
    per_scenario_test["Candidate_Gradual_Drift_Detector"] = compute_per_scenario_performance(test_merged, y_pred_drift)
    latency_stats["Candidate_Gradual_Drift_Detector"] = {
        "p50_ms": round(float(np.percentile(latencies, 50)), 4),
        "p95_ms": round(float(np.percentile(latencies, 95)), 4),
        "mean_ms": round(float(np.mean(latencies)), 4),
    }

    # --- 5. Candidate Isolation Forest ---
    iso_model.decision_threshold = th_iso
    latencies = []
    y_pred_iso = []
    for _ in range(50):
        t0 = time.perf_counter()
        preds = iso_model.predict(feat_test)
        latencies.append((time.perf_counter() - t0) / len(test_merged) * 1000.0)
        y_pred_iso = preds
    metrics_test["Candidate_Isolation_Forest"] = {
        **compute_metrics(y_test, y_pred_iso),
        "threshold": th_iso,
    }
    per_scenario_test["Candidate_Isolation_Forest"] = compute_per_scenario_performance(test_merged, y_pred_iso)
    latency_stats["Candidate_Isolation_Forest"] = {
        "p50_ms": round(float(np.percentile(latencies, 50)), 4),
        "p95_ms": round(float(np.percentile(latencies, 95)), 4),
        "mean_ms": round(float(np.mean(latencies)), 4),
    }

    # --- 6. Candidate Logistic Regression (Behavioral Only) ---
    lr_beh.decision_threshold = th_lr_beh
    latencies = []
    y_pred_lr_beh = []
    probs_lr_beh = []
    for _ in range(50):
        t0 = time.perf_counter()
        probs = lr_beh.predict_proba(feat_test)
        preds = (probs >= th_lr_beh).tolist()
        latencies.append((time.perf_counter() - t0) / len(test_merged) * 1000.0)
        y_pred_lr_beh = preds
        probs_lr_beh = probs.tolist()
    
    brier_beh = compute_brier_score(y_test, probs_lr_beh)
    metrics_test["Candidate_Logistic_Regression_Behavioral"] = {
        **compute_metrics(y_test, y_pred_lr_beh),
        "threshold": th_lr_beh,
        "brier_score": round(brier_beh, 4),
    }
    per_scenario_test["Candidate_Logistic_Regression_Behavioral"] = compute_per_scenario_performance(test_merged, y_pred_lr_beh)
    latency_stats["Candidate_Logistic_Regression_Behavioral"] = {
        "p50_ms": round(float(np.percentile(latencies, 50)), 4),
        "p95_ms": round(float(np.percentile(latencies, 95)), 4),
        "mean_ms": round(float(np.mean(latencies)), 4),
    }

    # --- 7. Candidate Logistic Regression (Full Features) ---
    lr_full.decision_threshold = th_lr_full
    latencies = []
    y_pred_lr_full = []
    probs_lr_full = []
    for _ in range(50):
        t0 = time.perf_counter()
        probs = lr_full.predict_proba(feat_test)
        preds = (probs >= th_lr_full).tolist()
        latencies.append((time.perf_counter() - t0) / len(test_merged) * 1000.0)
        y_pred_lr_full = preds
        probs_lr_full = probs.tolist()
    
    brier_full = compute_brier_score(y_test, probs_lr_full)
    metrics_test["Candidate_Logistic_Regression_Full"] = {
        **compute_metrics(y_test, y_pred_lr_full),
        "threshold": th_lr_full,
        "brier_score": round(brier_full, 4),
    }
    per_scenario_test["Candidate_Logistic_Regression_Full"] = compute_per_scenario_performance(test_merged, y_pred_lr_full)
    latency_stats["Candidate_Logistic_Regression_Full"] = {
        "p50_ms": round(float(np.percentile(latencies, 50)), 4),
        "p95_ms": round(float(np.percentile(latencies, 95)), 4),
        "mean_ms": round(float(np.mean(latencies)), 4),
    }

    # --- 8. Candidate Tuned Composite Ensemble ---
    comp_model.anomaly_threshold = th_comp
    latencies = []
    comp_outputs = []
    for _ in range(50):
        t0 = time.perf_counter()
        outs = [comp_model.predict_record(row) for _, row in test_merged.iterrows()]
        latencies.append((time.perf_counter() - t0) / len(test_merged) * 1000.0)
        comp_outputs = outs
    y_pred_comp = [out["predicted_drift"] for out in comp_outputs]
    metrics_test["Candidate_Tuned_Composite_Ensemble"] = {
        **compute_metrics(y_test, y_pred_comp),
        "threshold": th_comp,
    }
    per_scenario_test["Candidate_Tuned_Composite_Ensemble"] = compute_per_scenario_performance(test_merged, y_pred_comp)
    latency_stats["Candidate_Tuned_Composite_Ensemble"] = {
        "p50_ms": round(float(np.percentile(latencies, 50)), 4),
        "p95_ms": round(float(np.percentile(latencies, 95)), 4),
        "mean_ms": round(float(np.mean(latencies)), 4),
    }

    # Detailed Error Extraction for Composite & LR
    comp_errors = []
    for row, out, yt, yp in zip(test_merged.to_dict(orient="records"), comp_outputs, y_test, y_pred_comp):
        if yt != yp:
            comp_errors.append({
                "event_id": row["event_id"],
                "scenario_category": row["scenario_category"],
                "drift_type": row["drift_type"],
                "ground_truth": yt,
                "predicted": yp,
                "tool": row.get("tool"),
                "anomaly_score": out["anomaly_score"],
                "reasons": out["reasons"],
            })
    error_analyses["Tuned_Composite_Ensemble"] = comp_errors

    report = {
        "evaluation_name": "Phase 4 Held-Out Test Set Evaluation",
        "test_dataset": "model/data/processed/test_synthetic.parquet",
        "sample_count": len(df_test),
        "ground_truth_drift_positive_count": sum(y_test),
        "ground_truth_benign_count": len(y_test) - sum(y_test),
        "test_metrics": metrics_test,
        "per_scenario_performance": per_scenario_test,
        "latency_stats": latency_stats,
        "error_analyses": error_analyses,
    }

    report_path = reports_dir / "phase4_test_evaluation.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report


if __name__ == "__main__":
    report = run_test_evaluation()
    print("Held-out Test Evaluation Complete!")
    print(json.dumps(report["test_metrics"], indent=2))
