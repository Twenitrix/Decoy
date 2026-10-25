from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.db.models import Agent, ActionEvent, RiskAssessment, Decision
from backend.app.schemas.models import AgentResponse, AgentCreate, AgentUpdate, ActionEventResponse
from backend.app.services.identity_service import identity_service

router = APIRouter(prefix="/agents", tags=["Agents"])

@router.post("", response_model=AgentResponse)
def create_agent(payload: AgentCreate, db: Session = Depends(get_db)):
    agent = identity_service.create_agent(db, payload.model_dump())
    return agent

@router.get("", response_model=List[AgentResponse])
def list_agents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    role: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    agents = identity_service.list_agents(db, skip=skip, limit=limit, role=role, status=status)
    results = []
    for a in agents:
        # Determine latest risk tier and action count
        latest_event = (
            db.query(ActionEvent)
            .filter(ActionEvent.agent_id == a.id)
            .order_by(ActionEvent.timestamp.desc())
            .first()
        )
        tier = "L0"
        if latest_event and latest_event.risk_assessment:
            tier = latest_event.risk_assessment.tier

        action_count = db.query(ActionEvent).filter(ActionEvent.agent_id == a.id).count()

        resp = AgentResponse(
            id=a.id,
            name=a.name,
            role=a.role,
            status=a.status,
            declared_task=a.declared_task,
            policy_id=a.policy_id,
            policy_version=a.policy_version,
            delegation_parent_id=a.delegation_parent_id,
            created_at=a.created_at,
            updated_at=a.updated_at,
            last_seen_at=a.last_seen_at,
            current_risk_tier=tier,
            action_count=action_count
        )
        results.append(resp)
    return results

@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent_detail(agent_id: str, db: Session = Depends(get_db)):
    agent = identity_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found.")

    latest_event = (
        db.query(ActionEvent)
        .filter(ActionEvent.agent_id == agent.id)
        .order_by(ActionEvent.timestamp.desc())
        .first()
    )
    tier = latest_event.risk_assessment.tier if latest_event and latest_event.risk_assessment else "L0"
    action_count = db.query(ActionEvent).filter(ActionEvent.agent_id == agent.id).count()

    return AgentResponse(
        id=agent.id,
        name=agent.name,
        role=agent.role,
        status=agent.status,
        declared_task=agent.declared_task,
        policy_id=agent.policy_id,
        policy_version=agent.policy_version,
        delegation_parent_id=agent.delegation_parent_id,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        last_seen_at=agent.last_seen_at,
        current_risk_tier=tier,
        action_count=action_count
    )

@router.patch("/{agent_id}", response_model=AgentResponse)
def update_agent(agent_id: str, payload: AgentUpdate, db: Session = Depends(get_db)):
    agent = identity_service.update_agent(db, agent_id, payload.model_dump(exclude_unset=True))
    action_count = db.query(ActionEvent).filter(ActionEvent.agent_id == agent.id).count()
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        role=agent.role,
        status=agent.status,
        declared_task=agent.declared_task,
        policy_id=agent.policy_id,
        policy_version=agent.policy_version,
        delegation_parent_id=agent.delegation_parent_id,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        last_seen_at=agent.last_seen_at,
        current_risk_tier="L0",
        action_count=action_count
    )

@router.get("/{agent_id}/history")
def get_agent_history(
    agent_id: str,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    events = (
        db.query(ActionEvent)
        .filter(ActionEvent.agent_id == agent_id)
        .order_by(ActionEvent.timestamp.desc())
        .limit(limit)
        .all()
    )
    history = []
    for e in events:
        history.append({
            "id": e.id,
            "timestamp": e.timestamp.isoformat(),
            "tool": e.tool,
            "resource": e.resource,
            "destination": e.destination,
            "decision": e.decision.status if e.decision else "pending",
            "tier": e.risk_assessment.tier if e.risk_assessment else "L0",
            "anomaly_score": e.risk_assessment.anomaly_score if e.risk_assessment else 0.0,
            "executed": e.decision.executed if e.decision else False,
            "reasons": e.decision.reason_codes if e.decision else []
        })
    return history

@router.get("/{agent_id}/risk")
def get_agent_risk(agent_id: str, db: Session = Depends(get_db)):
    agent = identity_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found.")

    recent = (
        db.query(ActionEvent)
        .filter(ActionEvent.agent_id == agent_id)
        .order_by(ActionEvent.timestamp.desc())
        .limit(10)
        .all()
    )
    history_scores = []
    for r in reversed(recent):
        if r.risk_assessment:
            history_scores.append({
                "timestamp": r.timestamp.isoformat(),
                "anomaly_score": r.risk_assessment.anomaly_score,
                "tier": r.risk_assessment.tier,
                "tool": r.tool
            })

    latest_assessment = recent[0].risk_assessment if recent and recent[0].risk_assessment else None

    return {
        "agent_id": agent_id,
        "role": agent.role,
        "status": agent.status,
        "current_tier": latest_assessment.tier if latest_assessment else "L0",
        "current_anomaly_score": latest_assessment.anomaly_score if latest_assessment else 0.0,
        "dimension_scores": latest_assessment.dimension_scores if latest_assessment else {
            "tool_unusualness": 0.1,
            "resource_sensitivity": 0.1,
            "destination_risk": 0.05,
            "sequence_anomaly": 0.1,
            "slow_drift": 0.1
        },
        "reasons": latest_assessment.reasons if latest_assessment else [],
        "risk_trend": history_scores
    }

@router.post("/{agent_id}/revoke", response_model=AgentResponse)
def revoke_agent_credentials(agent_id: str, db: Session = Depends(get_db)):
    agent = identity_service.revoke_credentials(db, agent_id, operator_id="DASHBOARD_OPERATOR")
    action_count = db.query(ActionEvent).filter(ActionEvent.agent_id == agent.id).count()
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        role=agent.role,
        status=agent.status,
        declared_task=agent.declared_task,
        policy_id=agent.policy_id,
        policy_version=agent.policy_version,
        delegation_parent_id=agent.delegation_parent_id,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        last_seen_at=agent.last_seen_at,
        current_risk_tier="L4",
        action_count=action_count
    )
