"""
Baseline Detectors for Identity Drift Detection.
Aligned with ML_Model_Technical_Spec.md Sections 4, 5, and 8.
Includes:
1. PolicyRuleBaseline (deterministic hard-policy baseline)
2. SmoothedLikelihoodBaseline (role-conditioned categorical probabilities)
3. MarkovSequenceBaseline (first-order Markov tool transitions)
4. CompositeBaselineDetector (fused baseline with structured evidence output)
"""

from __future__ import annotations
import math
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
import pandas as pd
import numpy as np


def _dd_int() -> Dict[Any, int]:
    return defaultdict(int)


def _dd_dd_int() -> Dict[str, Dict[Any, int]]:
    return defaultdict(_dd_int)


def _dd_dd_dd_int() -> Dict[str, Dict[str, Dict[str, int]]]:
    return defaultdict(_dd_dd_int)


class PolicyRuleBaseline:
    """
    Deterministic rule baseline evaluating static hard-policy and permission boundaries.
    Runs independently of ML/anomaly scoring.
    """

    def predict_record(self, feat: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Returns (is_violation, reason_codes).
        """
        reasons = []
        is_allowed = feat.get("is_allowed_by_policy", True)
        if not is_allowed:
            reasons.append("HARD_POLICY_DISALLOWED")

        in_scope = feat.get("is_in_permission_scope", True)
        if not in_scope:
            reasons.append("OUT_OF_PERMISSION_SCOPE")

        is_violation = len(reasons) > 0
        return is_violation, reasons


class SmoothedLikelihoodBaseline:
    """
    Role-conditioned smoothed categorical probability baseline (Technical Spec Section 4).
    Estimates P(x | role) = (N_x,r + alpha) / (N_r + alpha * K)
    Computes anomaly score A = sum_i w_i * [-log(p_i)]
    """

    def __init__(self, alpha: float = 1.0):
        self.alpha = alpha
        self.is_fitted: bool = False
        
        # Dimensions: tool, operation, resource_sensitivity_tier, destination_trust_tier_num
        self.counts: Dict[str, Dict[str, Dict[Any, int]]] = {
            "tool": _dd_dd_int(),
            "operation": _dd_dd_int(),
            "resource_sensitivity_tier": _dd_dd_int(),
            "destination_trust_tier_num": _dd_dd_int(),
        }
        self.role_totals: Dict[str, Dict[str, int]] = {
            "tool": _dd_int(),
            "operation": _dd_int(),
            "resource_sensitivity_tier": _dd_int(),
            "destination_trust_tier_num": _dd_int(),
        }
        self.vocabularies: Dict[str, set] = {
            "tool": set(),
            "operation": set(),
            "resource_sensitivity_tier": set(),
            "destination_trust_tier_num": set(),
        }
        self.default_weights = {
            "tool": 1.0,
            "operation": 0.5,
            "resource_sensitivity_tier": 1.2,
            "destination_trust_tier_num": 1.5,
        }

    def fit(self, df_features: pd.DataFrame) -> "SmoothedLikelihoodBaseline":
        """
        Fits role-conditioned frequency counts strictly on training feature records.
        """
        for _, row in df_features.iterrows():
            role = str(row.get("agent_role", "__UNKNOWN_ROLE__"))
            for dim in self.counts.keys():
                val = row.get(dim)
                self.counts[dim][role][val] += 1
                self.role_totals[dim][role] += 1
                self.vocabularies[dim].add(val)

        self.is_fitted = True
        return self

    def score_record(self, feat: Dict[str, Any]) -> Dict[str, Any]:
        """
        Computes per-dimension negative log likelihood and weighted sum.
        """
        assert self.is_fitted, "Model must be fitted before scoring."
        role = str(feat.get("agent_role", "__UNKNOWN_ROLE__"))

        dim_scores: Dict[str, float] = {}
        total_anomaly: float = 0.0
        reasons: List[str] = []

        for dim, weight in self.default_weights.items():
            val = feat.get(dim)
            k = max(len(self.vocabularies[dim]), 2)
            n_xr = self.counts[dim][role].get(val, 0)
            n_r = self.role_totals[dim].get(role, 0)

            # Laplace smoothing: P(x | r) = (N_x,r + alpha) / (N_r + alpha * K)
            p = (n_xr + self.alpha) / (n_r + self.alpha * k)
            neg_log_p = -math.log(p)
            dim_scores[f"{dim}_unusualness"] = round(neg_log_p, 4)
            total_anomaly += weight * neg_log_p

            if neg_log_p > 3.0:
                reasons.append(f"UNUSUAL_{dim.upper()}_FOR_ROLE")

        # Taint egress penalty
        if feat.get("sensitive_egress_indicator", False):
            total_anomaly += 4.0
            dim_scores["sensitive_egress_penalty"] = 4.0
            reasons.append("SENSITIVE_DATA_EGRESS_TO_UNTRUSTED_DESTINATION")

        return {
            "likelihood_anomaly_score": round(total_anomaly, 4),
            "dimension_scores": dim_scores,
            "reasons": reasons,
        }


class MarkovSequenceBaseline:
    """
    First-order Markov transition baseline (Technical Spec Section 5).
    Tracks P(tool_t | tool_{t-1}, role).
    """

    def __init__(self, beta: float = 1.0):
        self.beta = beta
        self.is_fitted: bool = False
        self.transitions: Dict[str, Dict[str, Dict[str, int]]] = _dd_dd_dd_int()
        self.from_totals: Dict[str, Dict[str, int]] = _dd_dd_int()
        self.known_tools: set = {"START_OF_SESSION"}

    def fit(self, df_features: pd.DataFrame) -> "MarkovSequenceBaseline":
        """
        Fits transition counts on training features.
        """
        for _, row in df_features.iterrows():
            role = str(row.get("agent_role", "__UNKNOWN_ROLE__"))
            curr_tool = str(row.get("tool", "__UNKNOWN_TOOL__"))
            prev_tool = str(row.get("prev_tool", "START_OF_SESSION"))

            self.transitions[role][prev_tool][curr_tool] += 1
            self.from_totals[role][prev_tool] += 1
            self.known_tools.add(curr_tool)
            self.known_tools.add(prev_tool)

        self.is_fitted = True
        return self

    def score_transition(self, feat: Dict[str, Any]) -> Dict[str, Any]:
        """
        Scores transition anomaly -log P(tool_t | tool_{t-1}, role).
        """
        assert self.is_fitted, "Markov model must be fitted before scoring."
        role = str(feat.get("agent_role", "__UNKNOWN_ROLE__"))
        curr_tool = str(feat.get("tool", "__UNKNOWN_TOOL__"))
        prev_tool = str(feat.get("prev_tool", "START_OF_SESSION"))

        m = max(len(self.known_tools), 2)
        n_trans = self.transitions[role][prev_tool].get(curr_tool, 0)
        n_prev = self.from_totals[role].get(prev_tool, 0)

        p = (n_trans + self.beta) / (n_prev + self.beta * m)
        neg_log_p = -math.log(p)

        reasons = []
        if neg_log_p > 2.5:
            reasons.append("UNUSUAL_ACTION_SEQUENCE_TRANSITION")

        return {
            "sequence_anomaly_score": round(neg_log_p, 4),
            "transition_probability": round(p, 4),
            "reasons": reasons,
        }


class CompositeBaselineDetector:
    """
    Unified Baseline Anomaly Detector combining Rule, Likelihood, and Markov detectors.
    Conforms to MODEL_INTEGRATION_CONTRACT.md and ML_Model_Technical_Spec.md Section 8.
    """

    def __init__(self, anomaly_threshold: float = 6.0):
        self.rule_baseline = PolicyRuleBaseline()
        self.likelihood_baseline = SmoothedLikelihoodBaseline(alpha=1.0)
        self.markov_baseline = MarkovSequenceBaseline(beta=1.0)
        self.anomaly_threshold = anomaly_threshold
        self.is_fitted: bool = False

    def fit(self, df_features: pd.DataFrame) -> "CompositeBaselineDetector":
        self.likelihood_baseline.fit(df_features)
        self.markov_baseline.fit(df_features)
        self.is_fitted = True
        return self

    def predict_record(self, feat: Dict[str, Any]) -> Dict[str, Any]:
        """
        Scores an extracted feature record and returns structured risk evidence.
        """
        assert self.is_fitted, "CompositeBaselineDetector must be fitted."

        # 1. Deterministic Rule Check
        is_violation, rule_reasons = self.rule_baseline.predict_record(feat)

        # 2. Likelihood and Markov Anomaly Scores
        like_out = self.likelihood_baseline.score_record(feat)
        seq_out = self.markov_baseline.score_transition(feat)

        total_anomaly = round(like_out["likelihood_anomaly_score"] + seq_out["sequence_anomaly_score"], 4)
        
        # Combine reasons
        all_reasons = rule_reasons + like_out["reasons"] + seq_out["reasons"]
        if total_anomaly >= self.anomaly_threshold and "HIGH_ANOMALY_SCORE" not in all_reasons:
            all_reasons.append("HIGH_ANOMALY_SCORE")

        is_cold_start = bool(feat.get("is_cold_start", False))
        uncertainty = "high" if is_cold_start else ("medium" if total_anomaly > 4.0 else "low")

        # Predicted drift indicator
        pred_drift = is_violation or (total_anomaly >= self.anomaly_threshold)

        return {
            "policy_violation": is_violation,
            "anomaly_score": total_anomaly,
            "calibrated_probability": None,  # Must remain null until validation
            "predicted_drift": pred_drift,
            "dimension_scores": {
                **like_out["dimension_scores"],
                "sequence_unusualness": seq_out["sequence_anomaly_score"],
            },
            "reasons": list(set(all_reasons)),
            "is_cold_start": is_cold_start,
            "uncertainty": uncertainty,
            "model_version": "baseline-v1.0",
        }
