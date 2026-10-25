from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.app.core.config import settings
from backend.app.core.security import (
    redact_sensitive_data,
    compute_parameters_hash,
    verify_action_binding_token
)
from backend.app.db.models import (
    ActionEvent, RiskAssessment, Decision, Agent, Policy, generate_uuid
)
from backend.app.adapters.demo_tools import tool_registry
from backend.app.services.identity_service import identity_service
from backend.app.services.policy_engine import policy_engine
from backend.app.services.feature_service import feature_service
from backend.app.services.risk_service import risk_service
from backend.app.services.decision_service import decision_service
from backend.app.services.approval_service import approval_service
from backend.app.services.audit_service import audit_service
from backend.app.schemas.models import GatewayActionRequest, GatewayActionResponse, RiskSummary

class GatewayService:
    @staticmethod
    async def process_action(
        db: Session,
        request: GatewayActionRequest
    ) -> GatewayActionResponse:
        agent_id = request.agent_id
        session_id = request.session_id
        action = request.action
        tool = action.tool
        resource = action.resource
        destination = action.destination
        parameters = action.parameters or {}
        provenance = action.provenance_tags or {}
        dry_run = request.dry_run or False

        # 1. Authenticate and validate agent
        agent = identity_service.validate_agent(db, agent_id)

        # 2. Verify tool registration
        if not tool_registry.is_registered(tool):
            raise HTTPException(
                status_code=400,
                detail=f"Tool '{tool}' is not registered in the gateway execution adapter."
            )

        # 3. Load Agent Policy
        policy = policy_engine.get_policy(db, agent.policy_id)
        if not policy:
            raise HTTPException(
                status_code=500,
                detail=f"Agent '{agent_id}' has assigned policy '{agent.policy_id}' which does not exist."
            )

        # 4. Mandatory Hard Policy Check (Prior to ML)
        policy_allowed, policy_reasons, violating_rules = policy_engine.evaluate_action(
            policy=policy,
            tool=tool,
            resource=resource,
            destination=destination,
            parameters=parameters
        )

        # 5. Extract context & sequence features
        features = feature_service.extract_features(
            db=db,
            agent_id=agent_id,
            tool=tool,
            resource=resource,
            destination=destination,
            parameters=parameters,
            provenance_tags=provenance
        )
        features["is_allowed_by_policy"] = policy_allowed
        features["session_id"] = session_id
        features["tainted"] = bool(provenance.get("tainted", False) or provenance.get("untrusted_source", False))

        # 6. Risk Scoring (ML Microservice / Baseline client)
        risk_output = await risk_service.score_action(
            db=db,
            agent_id=agent_id,
            role=agent.role,
            tool=tool,
            resource=resource,
            destination=destination,
            features=features,
            thresholds=policy.thresholds or {}
        )

        # 7. Decision Engine
        status, tier, reason_codes, auth_token, token_expires_at = decision_service.evaluate_decision(
            agent_id=agent_id,
            policy_allowed=policy_allowed,
            policy_reasons=policy_reasons,
            policy_version=policy.version,
            risk_tier=risk_output["tier"],
            risk_score=risk_output["anomaly_score"],
            risk_reasons=risk_output["reasons"],
            tool=tool,
            parameters=parameters,
            shadow_mode=settings.SHADOW_MODE or dry_run
        )

        # 8. Persist Action Event
        redacted_params = redact_sensitive_data(parameters)
        action_event = ActionEvent(
            id=f"act-{generate_uuid()[:8]}",
            agent_id=agent_id,
            session_id=session_id,
            task_id=request.task_id,
            timestamp=datetime.now(timezone.utc),
            tool=tool,
            resource=resource,
            destination=destination,
            parameters_summary=redacted_params,
            payload_size=features["payload_size"],
            provenance_tags=provenance
        )
        db.add(action_event)
        db.flush()

        # 9. Persist Risk Assessment
        risk_assessment = RiskAssessment(
            id=f"risk-{generate_uuid()[:8]}",
            action_event_id=action_event.id,
            anomaly_score=risk_output["anomaly_score"],
            calibrated_probability=risk_output["calibrated_probability"],
            tier=tier,
            dimension_scores=risk_output["dimension_scores"],
            reasons=risk_output["reasons"],
            uncertainty=risk_output["uncertainty"],
            model_version=risk_output["model_version"],
            policy_version=policy.version,
            baseline_version=risk_output.get("baseline_version", "role-v1")
        )
        db.add(risk_assessment)
        db.flush()

        # 10. Persist Decision
        decision = Decision(
            id=f"dec-{generate_uuid()[:8]}",
            action_event_id=action_event.id,
            risk_assessment_id=risk_assessment.id,
            status=status,
            tier=tier,
            executed=False,
            reason_codes=reason_codes,
            policy_version=policy.version,
            model_version=risk_output["model_version"],
            auth_token=auth_token,
            decided_at=datetime.now(timezone.utc),
            expires_at=token_expires_at
        )
        db.add(decision)
        db.flush()

        approval_id = None
        execution_result = None

        # 11. Enforcement Actions
        if dry_run or settings.SHADOW_MODE:
            # Shadow mode: logs hypothetical decision without blocking
            pass
        elif status == "held_for_approval":
            # Create Approval Entry
            approval = approval_service.create_approval_request(
                db=db,
                decision_id=decision.id,
                action_event_id=action_event.id,
                agent_id=agent_id,
                action_summary={
                    "tool": tool,
                    "resource": resource,
                    "destination": destination,
                    "parameters": redacted_params
                },
                parameters=parameters,
                policy_version=policy.version
            )
            approval_id = approval.id

        elif status == "isolated":
            # Suspend agent identity immediately
            identity_service.revoke_credentials(db, agent_id, operator_id="GATEWAY_AUTOMATED_ISOLATION")

        elif status in ["allowed", "observed"]:
            # Re-check action-bound authorization token immediately before execution
            params_hash = compute_parameters_hash(parameters)
            is_valid_auth = verify_action_binding_token(
                token=auth_token,
                agent_id=agent_id,
                tool=tool,
                parameters_hash=params_hash,
                policy_version=policy.version,
                secret_key=settings.SECRET_KEY,
                expires_at=token_expires_at.isoformat()
            )

            if not is_valid_auth:
                decision.status = "denied"
                decision.reason_codes.append("ACTION_BOUND_AUTHORIZATION_VERIFICATION_FAILED")
            else:
                # Invoke registered adapter
                adapter = tool_registry.get(tool)
                execution_result = adapter.execute(
                    parameters=parameters,
                    agent_context={"agent_id": agent.id, "role": agent.role}
                )
                decision.executed = True
                decision.execution_outcome = execution_result

        # Update last seen timestamp on agent
        identity_service.touch_last_seen(db, agent)

        db.commit()
        db.refresh(action_event)
        db.refresh(decision)

        # Audit Event Logging
        audit_service.log_event(
            db=db,
            event_type="GATEWAY_ACTION_EVALUATED",
            actor=agent_id,
            entity_id=action_event.id,
            action_summary={
                "tool": tool,
                "status": decision.status,
                "tier": tier,
                "executed": decision.executed,
                "reasons": reason_codes
            }
        )

        return GatewayActionResponse(
            action_id=action_event.id,
            decision_id=decision.id,
            status=decision.status,
            tier=tier,
            executed=decision.executed,
            risk=RiskSummary(
                anomaly_score=risk_output["anomaly_score"],
                calibrated_probability=risk_output["calibrated_probability"],
                dimension_scores=risk_output["dimension_scores"],
                reasons=risk_output["reasons"],
                model_version=risk_output["model_version"],
                uncertainty=risk_output["uncertainty"]
            ),
            reasons=reason_codes,
            policy_version=policy.version,
            model_version=risk_output["model_version"],
            execution_result=execution_result,
            approval_id=approval_id
        )

gateway_service = GatewayService()
