from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.db.models import Decision, ActionEvent, Agent
from backend.app.schemas.models import AlertResponse

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def list_alerts(db: Session = Depends(get_db)):
    # Fetch recent L3 / L4 decisions and held-for-approval decisions
    high_risk_decisions = (
        db.query(Decision)
        .filter(Decision.tier.in_(["L2", "L3", "L4"]))
        .order_by(Decision.decided_at.desc())
        .limit(30)
        .all()
    )

    alerts = []
    for d in high_risk_decisions:
        event = db.query(ActionEvent).filter(ActionEvent.id == d.action_event_id).first()
        agent = db.query(Agent).filter(Agent.id == event.agent_id).first() if event else None

        severity = "critical" if d.tier == "L4" else ("high" if d.tier == "L3" else "medium")
        title = (
            f"Agent Isolated - Identity Drift [{d.tier}]"
            if d.status == "isolated"
            else f"Suspicious Activity Detected [{d.tier}] - {d.status.upper()}"
        )
        msg = f"Tool '{event.tool if event else 'unknown'}' on resource '{event.resource if event else 'none'}' triggered reasons: {', '.join(d.reason_codes or [])}"

        alerts.append(AlertResponse(
            id=f"alert-{d.id}",
            severity=severity,
            title=title,
            message=msg,
            agent_id=agent.id if agent else "unknown",
            agent_name=agent.name if agent else "Unknown Agent",
            action_event_id=event.id if event else None,
            tier=d.tier,
            timestamp=d.decided_at,
            status="open"
        ))
    return alerts
