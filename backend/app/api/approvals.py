from datetime import timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.db.models import Approval, Agent, Decision, ActionEvent
from backend.app.schemas.models import ApprovalResponse, ApprovalResolveRequest
from backend.app.services.approval_service import approval_service

def to_utc(dt):
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

router = APIRouter(prefix="/approvals", tags=["Approvals"])

@router.get("", response_model=List[ApprovalResponse])
def list_approvals(status: Optional[str] = None, db: Session = Depends(get_db)):
    approvals = approval_service.list_approvals(db, status=status)
    results = []
    for a in approvals:
        agent = db.query(Agent).filter(Agent.id == a.agent_id).first()
        decision = db.query(Decision).filter(Decision.id == a.decision_id).first()
        reasons = decision.reason_codes if decision else []
        tier = decision.tier if decision else "L2"

        results.append(ApprovalResponse(
            id=a.id,
            decision_id=a.decision_id,
            action_event_id=a.action_event_id,
            agent_id=a.agent_id,
            agent_name=agent.name if agent else "Unknown Agent",
            agent_role=agent.role if agent else "Unknown Role",
            action_summary=a.action_summary or {},
            bound_parameters_hash=a.bound_parameters_hash,
            bound_policy_version=a.bound_policy_version,
            status=a.status,
            reviewer_id=a.reviewer_id,
            comment=a.comment,
            resolved_at=to_utc(a.resolved_at),
            created_at=to_utc(a.created_at),
            expires_at=to_utc(a.expires_at),
            reasons=reasons,
            risk_tier=tier
        ))
    return results

@router.post("/{approval_id}/resolve", response_model=ApprovalResponse)
def resolve_approval(
    approval_id: str,
    payload: ApprovalResolveRequest,
    db: Session = Depends(get_db)
):
    resolved = approval_service.resolve_approval(
        db=db,
        approval_id=approval_id,
        status=payload.status,
        reviewer_id=payload.reviewer_id,
        comment=payload.comment
    )
    agent = db.query(Agent).filter(Agent.id == resolved.agent_id).first()
    decision = db.query(Decision).filter(Decision.id == resolved.decision_id).first()

    return ApprovalResponse(
        id=resolved.id,
        decision_id=resolved.decision_id,
        action_event_id=resolved.action_event_id,
        agent_id=resolved.agent_id,
        agent_name=agent.name if agent else "Unknown Agent",
        agent_role=agent.role if agent else "Unknown Role",
        action_summary=resolved.action_summary or {},
        bound_parameters_hash=resolved.bound_parameters_hash,
        bound_policy_version=resolved.bound_policy_version,
        status=resolved.status,
        reviewer_id=resolved.reviewer_id,
        comment=resolved.comment,
        resolved_at=to_utc(resolved.resolved_at),
        created_at=to_utc(resolved.created_at),
        expires_at=to_utc(resolved.expires_at),
        reasons=decision.reason_codes if decision else [],
        risk_tier=decision.tier if decision else "L2"
    )
