"""
Sliding-Window and EWMA Gradual Drift Detector.
Implements Technical Spec Section 6:
Maintains two references:
1. Stable role-defined reference baseline (learned from training data).
2. Recent behavioural sliding window (rolling session events).
Detects sustained changes in volume, request frequency, and destination divergence.
"""

from __future__ import annotations
import math
from typing import Dict, Any, List, Optional
from collections import defaultdict
import pandas as pd
import numpy as np


def _dd_float() -> Dict[int, float]:
    return defaultdict(float)


def _dd_dd_float() -> Dict[str, Dict[int, float]]:
    return defaultdict(_dd_float)


class SlidingWindowDriftDetector:
    """
    Detects gradual behavioral drift across a rolling window of events.
    Tracks Exponentially Weighted Moving Average (EWMA) of data volume
    and destination trust divergence against frozen role references.
    """

    def __init__(self, ewma_alpha: float = 0.3, volume_z_threshold: float = 2.5):
        self.ewma_alpha = ewma_alpha
        self.volume_z_threshold = volume_z_threshold
        self.is_fitted: bool = False
        
        # Stable reference distributions per role (fitted on train)
        self.role_volume_mean: Dict[str, float] = {}
        self.role_volume_std: Dict[str, float] = {}
        self.role_dest_distribution: Dict[str, Dict[int, float]] = _dd_dd_float()

    def fit(self, df_features: pd.DataFrame) -> "SlidingWindowDriftDetector":
        """
        Learns stable reference baselines from training data.
        """
        for role, group in df_features.groupby("agent_role"):
            role_str = str(role)
            vols = group["log_volume_bytes"].tolist()
            mean_v = float(np.mean(vols)) if vols else 0.0
            std_v = float(np.std(vols)) if vols and np.std(vols) > 1e-4 else 1.0

            self.role_volume_mean[role_str] = mean_v
            self.role_volume_std[role_str] = std_v

            # Destination tier distribution
            tiers = group["destination_trust_tier_num"].value_counts(normalize=True).to_dict()
            self.role_dest_distribution[role_str] = {int(k): float(v) for k, v in tiers.items()}

        self.is_fitted = True
        return self

    def score_window(
        self,
        event_feature: Dict[str, Any],
        recent_history_volumes: List[float],
        recent_dest_tiers: List[int],
    ) -> Dict[str, Any]:
        """
        Computes gradual drift anomaly score comparing recent window to role reference.
        """
        assert self.is_fitted, "Detector must be fitted."
        role = str(event_feature.get("agent_role", "__UNKNOWN_ROLE__"))
        ref_mean = self.role_volume_mean.get(role, 0.0)
        ref_std = self.role_volume_std.get(role, 1.0)

        # 1. EWMA Volume Shift
        curr_vol = float(event_feature.get("log_volume_bytes", 0.0))
        all_vols = recent_history_volumes + [curr_vol]
        
        ewma_vol = all_vols[0]
        for v in all_vols[1:]:
            ewma_vol = self.ewma_alpha * v + (1.0 - self.ewma_alpha) * ewma_vol

        vol_z = (ewma_vol - ref_mean) / max(0.1, ref_std)
        volume_anomaly = max(0.0, vol_z)

        # 2. Destination Divergence (untrusted destination ratio in recent window)
        all_tiers = recent_dest_tiers + [int(event_feature.get("destination_trust_tier_num", 0))]
        untrusted_ratio = sum(1 for t in all_tiers if t == 2) / max(1, len(all_tiers))
        
        ref_untrusted_p = self.role_dest_distribution[role].get(2, 0.05)
        dest_divergence = max(0.0, (untrusted_ratio - ref_untrusted_p) * 5.0)

        drift_score = round(volume_anomaly + dest_divergence, 4)
        reasons = []
        if volume_anomaly >= self.volume_z_threshold:
            reasons.append("SUSTAINED_HIGH_VOLUME_DRIFT")
        if dest_divergence >= 2.0:
            reasons.append("DESTINATION_DISTRIBUTION_DIVERGENCE")

        return {
            "gradual_drift_score": drift_score,
            "volume_z_score": round(volume_anomaly, 4),
            "destination_divergence": round(dest_divergence, 4),
            "reasons": reasons,
        }
