import fnmatch
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.db.models import Policy, generate_uuid
from backend.app.services.audit_service import audit_service

class PolicyEngine:
    @staticmethod
    def evaluate_action(
        policy: Policy,
        tool: str,
        resource: Optional[str] = None,
        destination: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, List[str], List[Dict[str, Any]]]:
        """
        Evaluates mandatory hard policy rules.
        Returns:
            (allowed: bool, reason_codes: List[str], violating_rules: List[Dict])
        """
        reason_codes: List[str] = []
        violating_rules: List[Dict[str, Any]] = []

        # 1. Evaluate explicit hard-deny rules first
        for rule in (policy.hard_denies or []):
            field = rule.get("field", "")
            pattern = rule.get("pattern", "")
            reason = rule.get("reason", "MANDATORY_HARD_DENY")

            val_to_check = None
            if field == "tool":
                val_to_check = tool
            elif field == "resource":
                val_to_check = resource
            elif field == "destination":
                val_to_check = destination
            elif field.startswith("parameters.") and parameters:
                param_key = field.split(".", 1)[1]
                val_to_check = str(parameters.get(param_key, ""))

            if val_to_check and fnmatch.fnmatch(str(val_to_check).lower(), pattern.lower()):
                reason_codes.append(reason)
                violating_rules.append(rule)

        # 2. Check Tool Allowlist (if non-empty)
        if policy.allowed_tools and "*" not in policy.allowed_tools:
            if not any(fnmatch.fnmatch(tool.lower(), allowed.lower()) for allowed in policy.allowed_tools):
                reason_codes.append("TOOL_NOT_PERMITTED_FOR_ROLE")
                violating_rules.append({"field": "tool", "pattern": tool, "reason": "TOOL_NOT_PERMITTED_FOR_ROLE"})

        # 3. Check Resource Allowlist (if specified on policy and action accesses a resource)
        if resource and policy.allowed_resources and "*" not in policy.allowed_resources:
            if not any(fnmatch.fnmatch(resource.lower(), allowed.lower()) for allowed in policy.allowed_resources):
                reason_codes.append("RESOURCE_NOT_ALLOWED_FOR_ROLE")
                violating_rules.append({"field": "resource", "pattern": resource, "reason": "RESOURCE_NOT_ALLOWED_FOR_ROLE"})

        # 4. Check Destination Allowlist (if specified on policy and action defines a destination)
        if destination and policy.allowed_destinations and "*" not in policy.allowed_destinations:
            if not any(fnmatch.fnmatch(destination.lower(), allowed.lower()) for allowed in policy.allowed_destinations):
                reason_codes.append("DESTINATION_NOT_PERMITTED")
                violating_rules.append({"field": "destination", "pattern": destination, "reason": "DESTINATION_NOT_PERMITTED"})

        is_allowed = len(reason_codes) == 0
        return is_allowed, reason_codes, violating_rules

    @staticmethod
    def get_policy(db: Session, policy_id: str) -> Optional[Policy]:
        return db.query(Policy).filter(Policy.id == policy_id).first()

    @staticmethod
    def list_policies(db: Session) -> List[Policy]:
        return db.query(Policy).order_by(Policy.created_at.desc()).all()

    @staticmethod
    def create_policy(db: Session, policy_data: Dict[str, Any]) -> Policy:
        policy_id = policy_data.get("id") or f"pol-{generate_uuid()[:8]}"
        policy = Policy(
            id=policy_id,
            version=policy_data.get("version", "v1"),
            name=policy_data["name"],
            role=policy_data["role"],
            allowed_tools=policy_data.get("allowed_tools", []),
            allowed_resources=policy_data.get("allowed_resources", []),
            allowed_destinations=policy_data.get("allowed_destinations", []),
            hard_denies=policy_data.get("hard_denies", []),
            thresholds=policy_data.get("thresholds", {"L1": 3.0, "L2": 5.5, "L3": 7.5, "L4": 9.0}),
            is_active=policy_data.get("is_active", True)
        )
        db.add(policy)
        db.commit()
        db.refresh(policy)

        audit_service.log_event(
            db=db,
            event_type="POLICY_CREATED",
            actor="SECURITY_ENGINEER",
            entity_id=policy.id,
            action_summary={"name": policy.name, "role": policy.role, "version": policy.version}
        )
        return policy

    @staticmethod
    def update_policy(db: Session, policy_id: str, updates: Dict[str, Any]) -> Policy:
        policy = db.query(Policy).filter(Policy.id == policy_id).first()
        if not policy:
            raise ValueError(f"Policy '{policy_id}' not found.")

        # Increment version on edit
        curr_ver = policy.version or "v1"
        try:
            num = int(curr_ver.replace("v", "")) + 1
            new_ver = f"v{num}"
        except Exception:
            new_ver = f"{curr_ver}.1"
        policy.version = new_ver

        for key, value in updates.items():
            if value is not None and hasattr(policy, key) and key not in ("id", "created_at"):
                setattr(policy, key, value)

        policy.effective_from = datetime.now(timezone.utc)
        db.commit()
        db.refresh(policy)

        audit_service.log_event(
            db=db,
            event_type="POLICY_UPDATED",
            actor="SECURITY_ENGINEER",
            entity_id=policy.id,
            action_summary={"new_version": policy.version, "updates": list(updates.keys())}
        )
        return policy

policy_engine = PolicyEngine()
