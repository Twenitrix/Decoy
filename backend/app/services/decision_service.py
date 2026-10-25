from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from backend.app.core.config import settings
from backend.app.core.security import (
    create_action_binding_token,
    compute_parameters_hash
)

HIGH_IMPACT_OPERATIONS = {"execute_workflow", "delete_database_records", "modify_credentials", "send_financial_transaction"}

class DecisionService:
    @staticmethod
    def evaluate_decision(
        agent_id: str,
        policy_allowed: bool,
        policy_reasons: List[str],
        policy_version: str,
        risk_tier: str,
        risk_score: float,
        risk_reasons: List[str],
        tool: str,
        parameters: Dict[str, Any],
        shadow_mode: bool = False
    ) -> Tuple[str, str, List[str], Optional[str], Optional[datetime]]:
        """
        Combines policy gate, risk assessment, and operational impact.
        Returns:
            (status, tier, reason_codes, auth_token, expires_at)
        Status values: 'allowed', 'observed', 'held_for_approval', 'denied', 'restricted', 'isolated'
        """
        all_reasons = list(policy_reasons) + [r for r in risk_reasons if r not in policy_reasons]

        # 1. Mandatory Hard Policy Check
        # Rule: The model must NEVER override a mandatory policy deny.
        if not policy_allowed:
            tier = "L3" if risk_tier in ["L0", "L1", "L2"] else risk_tier
            return "denied", tier, all_reasons, None, None

        # 2. Check High-Impact Operations requiring explicit approval regardless of anomaly score
        if tool in HIGH_IMPACT_OPERATIONS:
            all_reasons.append("HIGH_IMPACT_OPERATION_REQUIRES_APPROVAL")
            # Step-up to approval if not already higher
            if risk_tier in ["L0", "L1"]:
                return "held_for_approval", "L2", all_reasons, None, None

        # 3. Risk Tier Graduated Enforcement
        if risk_tier == "L4":
            all_reasons.append("CRITICAL_IDENTITY_DRIFT_ISOLATION")
            return "isolated", "L4", all_reasons, None, None

        elif risk_tier == "L3":
            all_reasons.append("HIGH_DRIFT_ANOMALY_BLOCKED")
            return "denied", "L3", all_reasons, None, None

        elif risk_tier == "L2":
            all_reasons.append("STEP_UP_HUMAN_APPROVAL_REQUIRED")
            return "held_for_approval", "L2", all_reasons, None, None

        elif risk_tier == "L1":
            status = "observed"
            tier = "L1"

        else: # L0
            status = "allowed"
            tier = "L0"

        # Generate action-bound short-lived authorization token
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.ACTION_AUTH_EXPIRY_SECONDS)
        params_hash = compute_parameters_hash(parameters)
        auth_token = create_action_binding_token(
            agent_id=agent_id,
            tool=tool,
            parameters_hash=params_hash,
            policy_version=policy_version,
            secret_key=settings.SECRET_KEY,
            expires_at=expires_at.isoformat()
        )

        return status, tier, all_reasons, auth_token, expires_at

decision_service = DecisionService()
