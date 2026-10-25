from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.core.database import get_db
from backend.app.db.models import AgentBaseline, generate_uuid
from backend.app.services.audit_service import audit_service

router = APIRouter(prefix="/baselines", tags=["Baselines"])

@router.get("")
def list_baselines(db: Session = Depends(get_db)):
    baselines = db.query(AgentBaseline).all()
    return [
        {
            "id": b.id,
            "agent_id": b.agent_id,
            "role": b.role,
            "window": b.window,
            "reference_version": b.reference_version,
            "is_frozen": b.is_frozen,
            "updated_at": b.updated_at.isoformat() if b.updated_at else None,
            "feature_stats": b.feature_stats
        }
        for b in baselines
    ]

@router.post("/{baseline_id}/rebuild")
def rebuild_baseline(baseline_id: str, db: Session = Depends(get_db)):
    baseline = db.query(AgentBaseline).filter(AgentBaseline.id == baseline_id).first()
    if not baseline:
        raise HTTPException(status_code=404, detail="Baseline not found.")

    baseline.updated_at = datetime.now(timezone.utc)
    db.commit()

    audit_service.log_event(
        db=db,
        event_type="BASELINE_REBUILT",
        actor="ASYNC_WORKER",
        entity_id=baseline.id,
        action_summary={"role": baseline.role, "version": baseline.reference_version}
    )

    return {
        "status": "rebuilt",
        "baseline_id": baseline.id,
        "updated_at": baseline.updated_at.isoformat()
    }
