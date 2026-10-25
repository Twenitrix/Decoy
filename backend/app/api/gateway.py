from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.models import GatewayActionRequest, GatewayActionResponse
from backend.app.services.gateway_service import gateway_service

router = APIRouter(prefix="/gateway", tags=["Gateway"])

@router.post("/actions", response_model=GatewayActionResponse)
async def intercept_and_process_action(
    payload: GatewayActionRequest,
    db: Session = Depends(get_db)
):
    """
    Main Pre-Execution Security Gateway Endpoint.
    Mediates every supported tool/API call:
    1. Authenticate identity
    2. Enforce hard authorization rules (mandatory policy denies before ML)
    3. Extract runtime features
    4. Call risk scoring
    5. Evaluate decision & tier (L0-L4)
    6. Execute registered tool adapter ONLY if authorized
    7. Record immutable action event, risk assessment, and decision
    """
    return await gateway_service.process_action(db, payload)
