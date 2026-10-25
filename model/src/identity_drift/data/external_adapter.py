"""
Adapter for the public AgentShield-Bench benchmark dataset
(Hugging Face: alirezaaminzadeh/agentshield-bench, Apache-2.0 License).
Loads, validates, and normalizes external agent security benchmark records.
"""

from __future__ import annotations
import os
import re
import io
import urllib.request
import urllib.error
from typing import List, Optional, Dict, Any
from pathlib import Path
import pandas as pd

from .schemas import (
    AgentActionEvent,
    ResourceSensitivity,
    DestinationTrustTier,
    OperationType,
    DriftType,
)


class AgentShieldBenchAdapter:
    """
    Adapter to ingest and normalize AgentShield-Bench benchmark records.
    Keeps external benchmark data strictly segregated from synthetic data.
    """

    REMOTE_BASE_URL = "https://huggingface.co/datasets/alirezaaminzadeh/agentshield-bench/resolve/main"

    def __init__(self, raw_cache_dir: Optional[Path] = None):
        self.raw_cache_dir = raw_cache_dir or Path(__file__).resolve().parents[3] / "data" / "raw" / "agentshield_bench"
        self.raw_cache_dir.mkdir(parents=True, exist_ok=True)

    def fetch_or_load_subset(self, subset_name: str = "tool_risk", max_records: Optional[int] = 500) -> pd.DataFrame:
        """
        Loads the specified parquet subset, caching locally for offline reproducibility.
        """
        cached_file = self.raw_cache_dir / f"{subset_name}.parquet"
        if cached_file.exists():
            df = pd.read_parquet(cached_file)
            return df.iloc[:max_records] if max_records else df

        url = f"{self.REMOTE_BASE_URL}/{subset_name}/train-00000-of-00001.parquet"
        req = urllib.request.Request(url, headers={"User-Agent": "IdentityDriftResearch/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                content = resp.read()
                with open(cached_file, "wb") as f:
                    f.write(content)
                df = pd.read_parquet(io.BytesIO(content))
                return df.iloc[:max_records] if max_records else df
        except (urllib.error.URLError, TimeoutError, Exception) as exc:
            # Fallback to local offline fixtures if network is unavailable
            if cached_file.exists():
                return pd.read_parquet(cached_file)
            raise RuntimeError(f"Unable to download or access AgentShield-Bench subset '{subset_name}': {exc}") from exc

    def parse_tool_from_text(self, text: str) -> str:
        """
        Extracts tool name from text format 'Task: ...\nTool: <name>\nContext: ...'
        """
        match = re.search(r"Tool:\s*([a-zA-Z0-9_\-]+)", text)
        if match:
            return match.group(1).strip()
        return "generic_tool"

    def parse_task_from_text(self, text: str) -> str:
        """
        Extracts task prompt from text format.
        """
        match = re.search(r"Task:\s*(.*?)(?=\nTool:|$)", text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return "unspecified_task"

    def to_agent_action_events(self, df: pd.DataFrame, limit: Optional[int] = None) -> List[AgentActionEvent]:
        """
        Converts raw AgentShield-Bench tool_risk records into normalized AgentActionEvent structures.
        """
        events: List[AgentActionEvent] = []
        subset = df.iloc[:limit] if limit else df

        for idx, row in subset.iterrows():
            text = str(row.get("text", ""))
            label = int(row.get("label", 0))  # 1 = tool risk / misuse, 0 = benign
            scenario_id = str(row.get("scenario_id", f"agentshield-{idx:05d}"))

            tool_name = self.parse_tool_from_text(text)
            task_desc = self.parse_task_from_text(text)

            # Determine operations and sensitivity based on tool semantics
            is_exec = any(k in tool_name for k in ["shell", "exec", "delete", "eval", "system"])
            is_sensitive = any(k in text.lower() for k in ["secret", "password", "token", "payroll", "confidential"])

            op = OperationType.EXECUTE if is_exec else OperationType.QUERY
            sens = ResourceSensitivity.RESTRICTED if is_sensitive else ResourceSensitivity.INTERNAL
            dest_tier = DestinationTrustTier.UNTRUSTED_EXTERNAL if label == 1 else DestinationTrustTier.TRUSTED_INTERNAL

            event = AgentActionEvent(
                event_id=f"evt-asb-{idx:05d}",
                session_id=f"sess-asb-{scenario_id}",
                timestamp="2026-10-25T12:00:00Z",
                step_index=0,
                agent_id=f"agent-bench-{scenario_id}",
                agent_role="benchmark_agent",
                task_id=f"task-{scenario_id}",
                task_category="benchmark_evaluation",
                policy_version="v1.0-benchmark",
                permission_scope=["query_database", "search", "generic_tool"],
                session_age_seconds=0.0,
                tool=tool_name,
                operation=op,
                resource="benchmark_resource",
                resource_sensitivity=sens,
                destination="benchmark_target",
                destination_trust_tier=dest_tier,
                record_count=1,
                data_volume_bytes=len(text.encode("utf-8")),
                is_allowed_by_policy=(label == 0),
                untrusted_content_in_context=("[tool_output]" in text or "prompt" in text.lower()),
                sensitive_data_accessed_in_session=is_sensitive,
                taint_lineage=["external_benchmark_context"],
                is_drift=(label == 1),
                drift_type=DriftType.EXTERNAL_BENCHMARK_MISUSE if label == 1 else DriftType.NONE,
                scenario_id=scenario_id,
                scenario_category="agentshield_benchmark",
                is_synthetic=False,  # External benchmark data!
                label_justification=f"AgentShield-Bench tool_risk ground truth label={label}."
            )
            events.append(event)

        return events
