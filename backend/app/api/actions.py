from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.db.models import ActionEvent, RiskAssessment, Decision, AuditEvent
from backend.app.schemas.models import ActionEventResponse, ActionDetailResponse

router = APIRouter(prefix="/actions", tags=["Actions"])

@router.get("", response_model=List[ActionEventResponse])
def list_actions(
    agent_id: Optional[str] = None,
    decision: Optional[str] = None,
    tier: Optional[str] = None,
    tool: Optional[str] = None,
    resource: Optional[str] = None,
    destination: Optional[str] = None,
    session_id: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(ActionEvent)
    if agent_id:
        query = query.filter(ActionEvent.agent_id == agent_id)
    if tool:
        query = query.filter(ActionEvent.tool.ilike(f"%{tool}%"))
    if resource:
        query = query.filter(ActionEvent.resource.ilike(f"%{resource}%"))
    if destination:
        query = query.filter(ActionEvent.destination.ilike(f"%{destination}%"))
    if session_id:
        query = query.filter(ActionEvent.session_id == session_id)
    if search:
        search_filter = (
            ActionEvent.tool.ilike(f"%{search}%") |
            ActionEvent.resource.ilike(f"%{search}%") |
            ActionEvent.agent_id.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    events = query.order_by(ActionEvent.timestamp.desc()).offset(skip).limit(limit).all()

    results = []
    for e in events:
        dec_status = e.decision.status if e.decision else "pending"
        dec_tier = e.risk_assessment.tier if e.risk_assessment else "L0"
        reasons = e.decision.reason_codes if e.decision else []
        executed = e.decision.executed if e.decision else False

        # If decision or tier query filters were passed
        if decision and dec_status != decision:
            continue
        if tier and dec_tier != tier:
            continue

        results.append(ActionEventResponse(
            id=e.id,
            agent_id=e.agent_id,
            session_id=e.session_id,
            task_id=e.task_id,
            timestamp=e.timestamp,
            tool=e.tool,
            resource=e.resource,
            destination=e.destination,
            parameters_summary=e.parameters_summary or {},
            payload_size=e.payload_size,
            provenance_tags=e.provenance_tags or {},
            decision=dec_status,
            tier=dec_tier,
            reason_codes=reasons,
            executed=executed
        ))
    return results

@router.get("/{action_id}", response_model=ActionDetailResponse)
def get_action_detail(action_id: str, db: Session = Depends(get_db)):
    e = db.query(ActionEvent).filter(ActionEvent.id == action_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Action event not found.")

    dec_status = e.decision.status if e.decision else "pending"
    dec_tier = e.risk_assessment.tier if e.risk_assessment else "L0"
    reasons = e.decision.reason_codes if e.decision else []
    executed = e.decision.executed if e.decision else False

    risk_info = None
    if e.risk_assessment:
        ra = e.risk_assessment
        risk_info = {
            "id": ra.id,
            "anomaly_score": ra.anomaly_score,
            "calibrated_probability": ra.calibrated_probability,
            "tier": ra.tier,
            "dimension_scores": ra.dimension_scores,
            "reasons": ra.reasons,
            "uncertainty": ra.uncertainty,
            "model_version": ra.model_version,
            "policy_version": ra.policy_version,
            "baseline_version": ra.baseline_version
        }

    decision_info = None
    if e.decision:
        d = e.decision
        appr = db.query(Approval).filter(Approval.action_event_id == e.id).first()
        decision_info = {
            "id": d.id,
            "status": d.status,
            "tier": d.tier,
            "executed": d.executed,
            "reason_codes": d.reason_codes,
            "policy_version": d.policy_version,
            "model_version": d.model_version,
            "execution_outcome": d.execution_outcome,
            "decided_at": d.decided_at.isoformat() if d.decided_at else None,
            "approval_id": appr.id if appr else None,
            "approval_status": appr.status if appr else None,
        }

    # Fetch corresponding audit records
    audits = (
        db.query(AuditEvent)
        .filter(AuditEvent.entity_id == e.id)
        .order_by(AuditEvent.timestamp.asc())
        .all()
    )
    audit_list = [
        {
            "id": a.id,
            "event_type": a.event_type,
            "actor": a.actor,
            "timestamp": a.timestamp.isoformat(),
            "event_hash": a.event_hash,
            "prev_hash": a.prev_hash
        }
        for a in audits
    ]

    return ActionDetailResponse(
        id=e.id,
        agent_id=e.agent_id,
        session_id=e.session_id,
        task_id=e.task_id,
        timestamp=e.timestamp,
        tool=e.tool,
        resource=e.resource,
        destination=e.destination,
        parameters_summary=e.parameters_summary or {},
        payload_size=e.payload_size,
        provenance_tags=e.provenance_tags or {},
        decision=dec_status,
        tier=dec_tier,
        reason_codes=reasons,
        executed=executed,
        risk_assessment=risk_info,
        decision_details=decision_info,
        audit_events=audit_list
    )
