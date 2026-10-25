from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.db.models import ActionEvent

SENSITIVE_RESOURCE_PATTERNS = ["salary", "payroll", "credentials", "secret", "token", "ssn", "private_keys", "master_key"]
HIGH_RISK_TOOLS = ["execute_workflow", "delete_records", "modify_credentials", "send_external_data"]
UNTRUSTED_DESTINATIONS = ["external_anon", "untrusted_s3", "pastebin", "public_webhook", "unknown_ip"]

class FeatureService:
    @staticmethod
    def extract_features(
        db: Session,
        agent_id: str,
        tool: str,
        resource: Optional[str],
        destination: Optional[str],
        parameters: Dict[str, Any],
        provenance_tags: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Extracts runtime features for risk assessment."""
        # 1. Resource sensitivity
        res_str = (resource or "").lower()
        is_sensitive = any(pat in res_str for pat in SENSITIVE_RESOURCE_PATTERNS)
        resource_sensitivity = 0.9 if is_sensitive else 0.1

        # 2. Destination risk
        dest_str = (destination or "").lower()
        is_untrusted_dest = any(pat in dest_str for pat in UNTRUSTED_DESTINATIONS)
        if is_untrusted_dest:
            destination_risk = 0.95
        elif dest_str.startswith("external"):
            destination_risk = 0.65
        elif dest_str:
            destination_risk = 0.2
        else:
            destination_risk = 0.05

        # 3. Tool unusualness / impact
        is_high_impact_tool = tool in HIGH_RISK_TOOLS
        tool_impact = 0.85 if is_high_impact_tool else 0.2

        # 4. Taint & Provenance
        prov = provenance_tags or {}
        tainted = prov.get("tainted", False) or prov.get("untrusted_source", False)
        provenance_risk = 0.8 if tainted else 0.05

        # 5. Sequence features from recent agent history
        recent_events = (
            db.query(ActionEvent)
            .filter(ActionEvent.agent_id == agent_id)
            .order_by(ActionEvent.timestamp.desc())
            .limit(5)
            .all()
        )
        recent_tools = [e.tool for e in recent_events]
        recent_resources = [e.resource for e in recent_events if e.resource]

        # Sensitive read followed by external transfer sequence check
        sequence_anomaly = 0.1
        if dest_str and (destination_risk > 0.5):
            had_sensitive_read = any(
                any(p in (r or "").lower() for p in SENSITIVE_RESOURCE_PATTERNS)
                for r in recent_resources
            )
            if had_sensitive_read:
                sequence_anomaly = 0.88

        # Rapid repeated actions or unusual chain
        if len(recent_tools) >= 3 and recent_tools[0] == tool and recent_tools[1] == tool and recent_tools[2] == tool:
            sequence_anomaly = max(sequence_anomaly, 0.6)

        return {
            "tool": tool,
            "tool_impact": tool_impact,
            "resource": resource,
            "resource_sensitivity": resource_sensitivity,
            "destination": destination,
            "destination_risk": destination_risk,
            "is_sensitive": is_sensitive,
            "is_untrusted_dest": is_untrusted_dest,
            "tainted": tainted,
            "provenance_risk": provenance_risk,
            "recent_tools": recent_tools,
            "sequence_anomaly": sequence_anomaly,
            "payload_size": len(str(parameters))
        }

feature_service = FeatureService()
