"""
Data validation, cleaning, deduplication, and quality audit utilities.
Ensures zero malformed records and maintains strict schema integrity.
"""

from __future__ import annotations
from typing import List, Dict, Any, Tuple
import pandas as pd
from pydantic import ValidationError

from .schemas import AgentActionEvent


class DataValidator:
    """
    Validates collections of records, detects duplicates, checks class balance,
    and produces data health reports.
    """

    @staticmethod
    def validate_records(records: List[Dict[str, Any]]) -> Tuple[List[AgentActionEvent], List[Dict[str, Any]]]:
        """
        Validates raw dicts against AgentActionEvent Pydantic schema.
        Returns (valid_events, errors).
        """
        valid_events: List[AgentActionEvent] = []
        errors: List[Dict[str, Any]] = []

        for idx, rec in enumerate(records):
            try:
                event = AgentActionEvent(**rec)
                valid_events.append(event)
            except (ValidationError, Exception) as exc:
                errors.append({"record_index": idx, "error": str(exc), "raw": rec})

        return valid_events, errors

    @staticmethod
    def audit_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Computes a comprehensive data quality and health audit on a DataFrame of events.
        """
        total_rows = len(df)
        if total_rows == 0:
            return {"total_rows": 0, "status": "empty"}

        # Missing values
        missing_counts = df.isnull().sum().to_dict()
        columns_with_missing = {k: v for k, v in missing_counts.items() if v > 0}

        # Deduplication check
        duplicate_events = df.duplicated(subset=["event_id"]).sum()
        duplicate_content = df.duplicated(subset=["agent_id", "session_id", "step_index", "tool", "destination"]).sum()

        # Class balance
        drift_counts = df["is_drift"].value_counts().to_dict() if "is_drift" in df.columns else {}
        drift_positive_rate = float(df["is_drift"].mean()) if "is_drift" in df.columns else 0.0

        # Scenario distribution
        scenario_counts = df["scenario_category"].value_counts().to_dict() if "scenario_category" in df.columns else {}

        # Synthetic vs External
        synthetic_counts = df["is_synthetic"].value_counts().to_dict() if "is_synthetic" in df.columns else {}

        return {
            "total_rows": total_rows,
            "columns_with_missing": columns_with_missing,
            "duplicate_event_ids": int(duplicate_events),
            "duplicate_action_tuples": int(duplicate_content),
            "drift_counts": {str(k): int(v) for k, v in drift_counts.items()},
            "drift_positive_rate": round(drift_positive_rate, 4),
            "scenario_counts": {str(k): int(v) for k, v in scenario_counts.items()},
            "synthetic_breakdown": {str(k): int(v) for k, v in synthetic_counts.items()},
            "is_healthy": bool(len(columns_with_missing) == 0 and duplicate_events == 0)
        }

    @staticmethod
    def deduplicate(df: pd.DataFrame) -> pd.DataFrame:
        """
        Deduplicates records based on unique event_id, keeping first occurrence.
        """
        return df.drop_duplicates(subset=["event_id"], keep="first").reset_index(drop=True)
