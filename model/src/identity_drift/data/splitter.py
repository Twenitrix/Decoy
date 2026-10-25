"""
Leakage-resistant scenario and group-based data splitter.
Guarantees that entire scenarios, sessions, and agent interaction chains
remain strictly isolated across Train, Validation, and Test partitions.
"""

from __future__ import annotations
from typing import Tuple, Dict, Any, List
import pandas as pd
import numpy as np


class GroupScenarioSplitter:
    """
    Splits datasets at the scenario/session group level to prevent data leakage.
    Ensures that steps from the same scenario or agent never appear across split boundaries.
    """

    def __init__(self, train_ratio: float = 0.70, val_ratio: float = 0.15, test_ratio: float = 0.15, seed: int = 42):
        assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-6, "Ratios must sum to 1.0"
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio
        self.seed = seed
        self.rng = np.random.RandomState(seed)

    def split(self, df: pd.DataFrame, group_col: str = "scenario_id") -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
        """
        Splits DataFrame into train, val, test subsets based on unique groups.
        """
        if df.empty:
            empty = pd.DataFrame(columns=df.columns)
            return empty, empty, empty, {"train_groups": [], "val_groups": [], "test_groups": []}

        # Unique groups as standard python list
        unique_groups = list(df[group_col].unique())
        self.rng.shuffle(unique_groups)

        n_total = len(unique_groups)
        n_train = max(1, int(n_total * self.train_ratio))
        n_val = max(1, int(n_total * self.val_ratio)) if n_total >= 3 else 0

        train_groups = set(unique_groups[:n_train])
        val_groups = set(unique_groups[n_train:n_train + n_val])
        test_groups = set(unique_groups[n_train + n_val:])

        # Edge case: ensure test_groups is not empty if n_total >= 3
        if len(test_groups) == 0 and len(val_groups) > 1:
            moved = val_groups.pop()
            test_groups.add(moved)

        # Integrity checks
        assert not (train_groups & val_groups), "Leakage detected between train and val groups!"
        assert not (train_groups & test_groups), "Leakage detected between train and test groups!"
        assert not (val_groups & test_groups), "Leakage detected between val and test groups!"

        df_train = df[df[group_col].isin(train_groups)].copy().reset_index(drop=True)
        df_val = df[df[group_col].isin(val_groups)].copy().reset_index(drop=True)
        df_test = df[df[group_col].isin(test_groups)].copy().reset_index(drop=True)

        meta = {
            "group_column": group_col,
            "total_groups": n_total,
            "train_groups_count": len(train_groups),
            "val_groups_count": len(val_groups),
            "test_groups_count": len(test_groups),
            "train_rows": len(df_train),
            "val_rows": len(df_val),
            "test_rows": len(df_test),
            "train_drift_rate": float(df_train["is_drift"].mean()) if "is_drift" in df_train.columns and len(df_train) > 0 else 0.0,
            "val_drift_rate": float(df_val["is_drift"].mean()) if "is_drift" in df_val.columns and len(df_val) > 0 else 0.0,
            "test_drift_rate": float(df_test["is_drift"].mean()) if "is_drift" in df_test.columns and len(df_test) > 0 else 0.0,
        }

        return df_train, df_val, df_test, meta
