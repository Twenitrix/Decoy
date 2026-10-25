from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.app.db.models import Agent, AgentCredential, Policy, generate_uuid
from backend.app.services.audit_service import audit_service

class IdentityService:
    @staticmethod
    def validate_agent(db: Session, agent_id: str) -> Agent:
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found in registry.")
        if agent.status == "suspended":
            raise HTTPException(status_code=403, detail=f"Agent '{agent_id}' is SUSPENDED. Actions cannot proceed.")
        if agent.status == "disabled":
            raise HTTPException(status_code=403, detail=f"Agent '{agent_id}' is DISABLED. Actions cannot proceed.")
        return agent

    @staticmethod
    def get_agent(db: Session, agent_id: str) -> Optional[Agent]:
        return db.query(Agent).filter(Agent.id == agent_id).first()

    @staticmethod
    def list_agents(db: Session, skip: int = 0, limit: int = 50, role: Optional[str] = None, status: Optional[str] = None) -> List[Agent]:
        query = db.query(Agent)
        if role:
            query = query.filter(Agent.role == role)
        if status:
            query = query.filter(Agent.status == status)
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def create_agent(db: Session, agent_data: Dict[str, Any]) -> Agent:
        agent_id = agent_data.get("id") or f"agent-{generate_uuid()[:8]}"
        agent = Agent(
            id=agent_id,
            name=agent_data["name"],
            role=agent_data["role"],
            status=agent_data.get("status", "active"),
            declared_task=agent_data.get("declared_task"),
            policy_id=agent_data["policy_id"],
            policy_version=agent_data.get("policy_version", "v1"),
            delegation_parent_id=agent_data.get("delegation_parent_id")
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)

        audit_service.log_event(
            db=db,
            event_type="AGENT_REGISTERED",
            actor="SYSTEM_OPERATOR",
            entity_id=agent.id,
            action_summary={"agent_name": agent.name, "role": agent.role, "policy_id": agent.policy_id}
        )
        return agent

    @staticmethod
    def update_agent(db: Session, agent_id: str, updates: Dict[str, Any]) -> Agent:
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found.")

        for key, value in updates.items():
            if value is not None and hasattr(agent, key):
                setattr(agent, key, value)

        agent.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(agent)

        audit_service.log_event(
            db=db,
            event_type="AGENT_UPDATED",
            actor="OPERATOR",
            entity_id=agent.id,
            action_summary=updates
        )
        return agent

    @staticmethod
    def revoke_credentials(db: Session, agent_id: str, operator_id: str = "OPERATOR") -> Agent:
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found.")

        agent.status = "suspended"
        agent.updated_at = datetime.now(timezone.utc)

        # Deactivate all active credentials
        creds = db.query(AgentCredential).filter(AgentCredential.agent_id == agent_id, AgentCredential.is_active == True).all()
        for cred in creds:
            cred.is_active = False
            cred.revoked_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(agent)

        audit_service.log_event(
            db=db,
            event_type="AGENT_CREDENTIALS_REVOKED",
            actor=operator_id,
            entity_id=agent.id,
            action_summary={"action": "revoke_and_suspend", "credentials_deactivated": len(creds)}
        )
        return agent

    @staticmethod
    def touch_last_seen(db: Session, agent: Agent):
        agent.last_seen_at = datetime.now(timezone.utc)
        db.commit()

identity_service = IdentityService()
