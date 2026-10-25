from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from backend.app.db.models import AuditEvent, generate_uuid
from backend.app.core.security import compute_audit_hash, redact_sensitive_data

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        event_type: str,
        actor: str,
        entity_id: str,
        action_summary: Dict[str, Any]
    ) -> AuditEvent:
        """Persists an append-only audit event with cryptographic hash chaining."""
        last_event = db.query(AuditEvent).order_by(AuditEvent.timestamp.desc()).first()
        prev_hash = last_event.event_hash if last_event else "0" * 64

        redacted_summary = redact_sensitive_data(action_summary)
        ts = datetime.now(timezone.utc)

        event_dict = {
            "event_type": event_type,
            "actor": actor,
            "entity_id": entity_id,
            "timestamp": ts.isoformat(),
            "action_summary": redacted_summary
        }
        event_hash = compute_audit_hash(prev_hash, event_dict)

        audit_entry = AuditEvent(
            id=generate_uuid(),
            event_type=event_type,
            actor=actor,
            entity_id=entity_id,
            timestamp=ts,
            action_summary=redacted_summary,
            prev_hash=prev_hash,
            event_hash=event_hash
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry

    @staticmethod
    def get_events(
        db: Session,
        limit: int = 50,
        event_type: Optional[str] = None,
        entity_id: Optional[str] = None
    ) -> List[AuditEvent]:
        query = db.query(AuditEvent)
        if event_type:
            query = query.filter(AuditEvent.event_type == event_type)
        if entity_id:
            query = query.filter(AuditEvent.entity_id == entity_id)
        return query.order_by(AuditEvent.timestamp.desc()).limit(limit).all()

audit_service = AuditService()
