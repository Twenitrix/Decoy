"""
Unsupervised Isolation Forest Candidate for Identity Drift Detection.
Evaluates tree-based feature anomaly isolation.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer


class IsolationForestDriftModel:
    """
    Unsupervised Isolation Forest model.
    Learns tree-based partition depths on feature space without labels.
    Threshold is calibrated on validation data.
    """

    CATEGORICAL_COLS = [
        "agent_role",
        "tool",
        "operation",
        "prev_tool",
    ]

    NUMERICAL_COLS = [
        "resource_sensitivity_tier",
        "destination_trust_tier_num",
        "log_record_count",
        "log_volume_bytes",
        "step_index",
        "action_rate",
        "history_length",
        "failed_attempt_count",
    ]

    BOOLEAN_COLS = [
        "untrusted_content_in_context",
        "sensitive_data_accessed_in_session",
        "sensitive_egress_indicator",
        "has_delegation",
        "is_cold_start",
    ]

    def __init__(self, contamination: float = 0.4, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.decision_threshold = 0.0  # -decision_function threshold
        self.is_fitted: bool = False

        self.preprocessor = ColumnTransformer(
            transformers=[
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), self.CATEGORICAL_COLS),
                ("num", StandardScaler(), self.NUMERICAL_COLS),
                ("bool", "passthrough", self.BOOLEAN_COLS),
            ],
            remainder="drop",
        )

        self.model = IsolationForest(
            n_estimators=100,
            contamination=self.contamination,
            random_state=self.random_state,
        )

    def _prepare_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        df_copy = df.copy()
        for col in self.CATEGORICAL_COLS:
            if col not in df_copy.columns:
                df_copy[col] = "__MISSING__"
            df_copy[col] = df_copy[col].astype(str)

        for col in self.NUMERICAL_COLS:
            if col not in df_copy.columns:
                df_copy[col] = 0.0
            df_copy[col] = df_copy[col].astype(float)

        for col in self.BOOLEAN_COLS:
            if col not in df_copy.columns:
                df_copy[col] = False
            df_copy[col] = df_copy[col].astype(float)

        return df_copy

    def fit(self, df_features: pd.DataFrame) -> "IsolationForestDriftModel":
        """
        Fits Isolation Forest on feature representations without target labels.
        """
        X = self._prepare_dataframe(df_features)
        X_trans = self.preprocessor.fit_transform(X)
        self.model.fit(X_trans)
        self.is_fitted = True
        return self

    def score_samples(self, df_features: pd.DataFrame) -> np.ndarray:
        """
        Returns anomaly scores (higher value = more anomalous).
        scikit-learn decision_function returns positive for inliers, negative for outliers.
        We negate decision_function so higher = more anomalous.
        """
        assert self.is_fitted, "Model must be fitted."
        X = self._prepare_dataframe(df_features)
        X_trans = self.preprocessor.transform(X)
        return -self.model.decision_function(X_trans)

    def tune_threshold(self, df_val_features: pd.DataFrame, y_val: List[bool]) -> float:
        """
        Calibrates anomaly score threshold on validation set.
        """
        scores = self.score_samples(df_val_features)
        y_true = np.array(y_val, dtype=int)

        best_th = float(np.median(scores))
        best_f1 = -1.0

        for q in np.linspace(10, 90, 17):
            th = float(np.percentile(scores, q))
            y_pred = (scores >= th).astype(int)
            tp = int(((y_pred == 1) & (y_true == 1)).sum())
            fp = int(((y_pred == 1) & (y_true == 0)).sum())
            fn = int(((y_pred == 0) & (y_true == 1)).sum())

            prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

            if f1 > best_f1:
                best_f1 = f1
                best_th = th

        self.decision_threshold = round(best_th, 4)
        return self.decision_threshold

    def predict(self, df_features: pd.DataFrame) -> List[bool]:
        scores = self.score_samples(df_features)
        return (scores >= self.decision_threshold).tolist()
