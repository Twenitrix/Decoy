from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.db.models import Decision, ActionEvent, Agent
from backend.app.schemas.models import DecisionResponse
from backend.app.services.policy_engine import policy_engine
from backend.app.services.audit_service import audit_service

router = APIRouter(prefix="/decisions", tags=["Decisions"])

@router.get("/{decision_id}", response_model=DecisionResponse)
def get_decision(decision_id: str, db: Session = Depends(get_db)):
    decision = db.query(Decision).filter(Decision.id == decision_id).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found.")
    return decision

@router.post("/{decision_id}/recheck", response_model=DecisionResponse)
def recheck_decision(decision_id: str, db: Session = Depends(get_db)):
    decision = db.query(Decision).filter(Decision.id == decision_id).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found.")

    action_event = db.query(ActionEvent).filter(ActionEvent.id == decision.action_event_id).first()
    agent = db.query(Agent).filter(Agent.id == action_event.agent_id).first()
    policy = policy_engine.get_policy(db, agent.policy_id)

    # Re-evaluate with current policy
    allowed, reasons, violating = policy_engine.evaluate_action(
        policy=policy,
        tool=action_event.tool,
        resource=action_event.resource,
        destination=action_event.destination,
        parameters=action_event.parameters_summary
    )

    prev_status = decision.status
    if not allowed:
        decision.status = "denied"
        decision.reason_codes = reasons
    decision.policy_version = policy.version
    db.commit()
    db.refresh(decision)

    audit_service.log_event(
        db=db,
        event_type="DECISION_RECHECKED",
        actor="OPERATOR",
        entity_id=decision.id,
        action_summary={
            "previous_status": prev_status,
            "new_status": decision.status,
            "policy_version": policy.version
        }
    )

    return decision
