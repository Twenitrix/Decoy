from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.db.models import Policy
from backend.app.schemas.models import (
    PolicyResponse, PolicyCreate, PolicyUpdate, PolicyTestRequest, PolicyTestResponse
)
from backend.app.services.policy_engine import policy_engine

router = APIRouter(prefix="/policies", tags=["Policies"])

@router.post("", response_model=PolicyResponse)
def create_policy(payload: PolicyCreate, db: Session = Depends(get_db)):
    policy = policy_engine.create_policy(db, payload.model_dump())
    return policy

@router.get("", response_model=List[PolicyResponse])
def list_policies(db: Session = Depends(get_db)):
    return policy_engine.list_policies(db)

@router.get("/{policy_id}", response_model=PolicyResponse)
def get_policy(policy_id: str, db: Session = Depends(get_db)):
    policy = policy_engine.get_policy(db, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found.")
    return policy

@router.patch("/{policy_id}", response_model=PolicyResponse)
def update_policy(policy_id: str, payload: PolicyUpdate, db: Session = Depends(get_db)):
    try:
        policy = policy_engine.update_policy(db, policy_id, payload.model_dump(exclude_unset=True))
        return policy
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{policy_id}/test", response_model=PolicyTestResponse)
def test_policy(policy_id: str, payload: PolicyTestRequest, db: Session = Depends(get_db)):
    policy = policy_engine.get_policy(db, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found.")

    allowed, reasons, violating = policy_engine.evaluate_action(
        policy=policy,
        tool=payload.tool,
        resource=payload.resource,
        destination=payload.destination,
        parameters=payload.parameters
    )

    return PolicyTestResponse(
        policy_id=policy.id,
        policy_version=policy.version,
        allowed=allowed,
        reasons=reasons,
        hard_deny_triggered=not allowed,
        violating_rules=violating
    )
