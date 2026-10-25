"""
Supervised Logistic Regression Candidate for Identity Drift Detection.
Utilizes ColumnTransformer for categorical and numerical features.
"""

from __future__ import annotations
import math
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline


class LogisticRegressionDriftModel:
    """
    Supervised Logistic Regression model with calibrated decision threshold.
    Fitted exclusively on training data.
    """

    CATEGORICAL_COLS = [
        "agent_role",
        "tool",
        "operation",
        "prev_tool",
        "prev_operation",
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
        "is_in_permission_scope",
        "is_cold_start",
    ]

    def __init__(self, include_policy_feature: bool = False, random_state: int = 42):
        self.include_policy_feature = include_policy_feature
        self.random_state = random_state
        self.decision_threshold = 0.5
        self.is_fitted: bool = False

        bool_cols = list(self.BOOLEAN_COLS)
        if self.include_policy_feature:
            bool_cols.append("is_allowed_by_policy")
        self.active_bool_cols = bool_cols

        self.preprocessor = ColumnTransformer(
            transformers=[
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), self.CATEGORICAL_COLS),
                ("num", StandardScaler(), self.NUMERICAL_COLS),
                ("bool", "passthrough", self.active_bool_cols),
            ],
            remainder="drop",
        )

        self.classifier = LogisticRegression(
            class_weight="balanced",
            max_iter=1000,
            C=1.0,
            random_state=self.random_state,
        )

        self.pipeline = Pipeline([
            ("preprocessor", self.preprocessor),
            ("clf", self.classifier),
        ])

    def fit(self, df_features: pd.DataFrame, y_train: List[bool]) -> "LogisticRegressionDriftModel":
        """
        Fits preprocessing pipeline and logistic regression strictly on training set.
        """
        X = self._prepare_dataframe(df_features)
        y = np.array(y_train, dtype=int)
        self.pipeline.fit(X, y)
        self.is_fitted = True
        return self

    def _prepare_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Ensures all expected columns exist with proper types.
        """
        df_copy = df.copy()
        for col in self.CATEGORICAL_COLS:
            if col not in df_copy.columns:
                df_copy[col] = "__MISSING__"
            df_copy[col] = df_copy[col].astype(str)

        for col in self.NUMERICAL_COLS:
            if col not in df_copy.columns:
                df_copy[col] = 0.0
            df_copy[col] = df_copy[col].astype(float)

        for col in self.active_bool_cols:
            if col not in df_copy.columns:
                df_copy[col] = False
            df_copy[col] = df_copy[col].astype(float)

        return df_copy

    def tune_threshold(self, df_val_features: pd.DataFrame, y_val: List[bool]) -> float:
        """
        Finds optimal decision threshold on validation set to maximize F1 score.
        """
        probs = self.predict_proba(df_val_features)
        y_true = np.array(y_val, dtype=int)

        best_th = 0.5
        best_f1 = -1.0

        for th in np.linspace(0.1, 0.9, 17):
            y_pred = (probs >= th).astype(int)
            tp = int(((y_pred == 1) & (y_true == 1)).sum())
            fp = int(((y_pred == 1) & (y_true == 0)).sum())
            fn = int(((y_pred == 0) & (y_true == 1)).sum())

            prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

            if f1 > best_f1:
                best_f1 = f1
                best_th = float(th)

        self.decision_threshold = round(best_th, 4)
        return self.decision_threshold

    def predict_proba(self, df_features: pd.DataFrame) -> np.ndarray:
        """
        Returns estimated positive class probabilities.
        """
        assert self.is_fitted, "Model must be fitted."
        X = self._prepare_dataframe(df_features)
        return self.pipeline.predict_proba(X)[:, 1]

    def predict(self, df_features: pd.DataFrame) -> List[bool]:
        """
        Predicts binary drift labels using tuned decision threshold.
        """
        probs = self.predict_proba(df_features)
        return (probs >= self.decision_threshold).tolist()
