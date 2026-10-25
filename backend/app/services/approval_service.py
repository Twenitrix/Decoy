from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.app.core.config import settings
from backend.app.core.security import compute_parameters_hash
from backend.app.db.models import Approval, Decision, ActionEvent, Agent, Policy, generate_uuid
from backend.app.adapters.demo_tools import tool_registry
from backend.app.services.audit_service import audit_service

class ApprovalService:
    @staticmethod
    def create_approval_request(
        db: Session,
        decision_id: str,
        action_event_id: str,
        agent_id: str,
        action_summary: Dict[str, Any],
        parameters: Dict[str, Any],
        policy_version: str
    ) -> Approval:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.APPROVAL_EXPIRY_MINUTES)
        params_hash = compute_parameters_hash(parameters)

        approval = Approval(
            id=f"appr-{generate_uuid()[:8]}",
            decision_id=decision_id,
            action_event_id=action_event_id,
            agent_id=agent_id,
            action_summary=action_summary,
            bound_parameters_hash=params_hash,
            bound_policy_version=policy_version,
            status="pending",
            created_at=datetime.now(timezone.utc),
            expires_at=expires_at
        )
        db.add(approval)
        db.commit()
        db.refresh(approval)

        audit_service.log_event(
            db=db,
            event_type="APPROVAL_REQUESTED",
            actor="DECISION_ENGINE",
            entity_id=approval.id,
            action_summary={
                "agent_id": agent_id,
                "tool": action_summary.get("tool"),
                "decision_id": decision_id
            }
        )
        return approval

    @staticmethod
    def list_approvals(db: Session, status: Optional[str] = None) -> List[Approval]:
        query = db.query(Approval)
        if status:
            query = query.filter(Approval.status == status)
        return query.order_by(Approval.created_at.desc()).all()

    @staticmethod
    def resolve_approval(
        db: Session,
        approval_id: str,
        status: str,  # "approved" or "rejected"
        reviewer_id: str,
        comment: Optional[str] = None
    ) -> Approval:
        approval = db.query(Approval).filter(Approval.id == approval_id).first()
        if not approval:
            raise HTTPException(status_code=404, detail="Approval request not found.")

        if approval.status != "pending":
            raise HTTPException(status_code=409, detail=f"Approval already resolved as '{approval.status}'.")

        # Check expiry
        if datetime.now(timezone.utc) > approval.expires_at.replace(tzinfo=timezone.utc):
            approval.status = "expired"
            db.commit()
            raise HTTPException(status_code=410, detail="Approval has expired; re-evaluation required.")

        # Load decision and action
        decision = db.query(Decision).filter(Decision.id == approval.decision_id).first()
        action_event = db.query(ActionEvent).filter(ActionEvent.id == approval.action_event_id).first()
        agent = db.query(Agent).filter(Agent.id == approval.agent_id).first()

        # Verify policy version has not shifted since approval was held
        if agent and agent.policy_version != approval.bound_policy_version:
            raise HTTPException(
                status_code=409,
                detail="Policy version changed since approval request was issued. Stale approval rejected."
            )

        approval.status = status
        approval.reviewer_id = reviewer_id
        approval.comment = comment
        approval.resolved_at = datetime.now(timezone.utc)

        if status == "approved":
            # Execute tool safely via registered adapter
            if tool_registry.is_registered(action_event.tool):
                adapter = tool_registry.get(action_event.tool)
                execution_result = adapter.execute(
                    parameters=action_event.parameters_summary,
                    agent_context={"agent_id": agent.id, "role": agent.role}
                )
                decision.executed = True
                decision.execution_outcome = execution_result
                decision.status = "allowed"
            else:
                decision.execution_outcome = {"status": "unregistered_tool_error"}
        else:
            decision.status = "denied"
            decision.executed = False

        db.commit()
        db.refresh(approval)

        audit_service.log_event(
            db=db,
            event_type=f"APPROVAL_{status.upper()}",
            actor=reviewer_id,
            entity_id=approval.id,
            action_summary={"comment": comment, "executed": decision.executed}
        )

        return approval

approval_service = ApprovalService()
