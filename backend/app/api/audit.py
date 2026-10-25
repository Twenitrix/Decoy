from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.models import AuditEventResponse
from backend.app.services.audit_service import audit_service

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/events", response_model=List[AuditEventResponse])
def get_audit_events(
    event_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    return audit_service.get_events(db=db, limit=limit, event_type=event_type, entity_id=entity_id)
