from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.core.database import get_db
from backend.app.db.models import AnalystFeedback, generate_uuid
from backend.app.schemas.models import FeedbackCreate
from backend.app.services.audit_service import audit_service

router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.post("")
def submit_feedback(payload: FeedbackCreate, db: Session = Depends(get_db)):
    fb = AnalystFeedback(
        id=f"fb-{generate_uuid()[:8]}",
        risk_assessment_id=payload.risk_assessment_id,
        action_event_id=payload.action_event_id,
        label=payload.label,
        notes=payload.notes,
        reviewer_id=payload.reviewer_id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    audit_service.log_event(
        db=db,
        event_type="ANALYST_FEEDBACK_SUBMITTED",
        actor=payload.reviewer_id,
        entity_id=fb.id,
        action_summary={
            "action_event_id": payload.action_event_id,
            "label": payload.label
        }
    )

    return {
        "status": "success",
        "id": fb.id,
        "label": fb.label
    }
