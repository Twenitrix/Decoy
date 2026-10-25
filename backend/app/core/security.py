import hashlib
import hmac
import json
from typing import Any, Dict
from datetime import datetime, timezone

SENSITIVE_KEY_SUBSTRINGS = {
    "password", "secret", "token", "key", "authorization", "bearer",
    "credit_card", "ssn", "api_key", "credential", "private"
}

def redact_sensitive_data(obj: Any) -> Any:
    """Recursively redacts values for keys matching sensitive keywords."""
    if isinstance(obj, dict):
        redacted = {}
        for k, v in obj.items():
            if any(s in k.lower() for s in SENSITIVE_KEY_SUBSTRINGS):
                redacted[k] = "[REDACTED]"
            else:
                redacted[k] = redact_sensitive_data(v)
        return redacted
    elif isinstance(obj, list):
        return [redact_sensitive_data(item) for item in obj]
    elif isinstance(obj, str):
        if any(prefix in obj.lower() for prefix in ["bearer ", "eyj"]):
            return "[REDACTED_TOKEN]"
        return obj
    return obj

def compute_parameters_hash(params: Dict[str, Any]) -> str:
    """Deterministic hash of action parameters."""
    normalized = json.dumps(params, sort_keys=True, default=str)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

def create_action_binding_token(
    agent_id: str,
    tool: str,
    parameters_hash: str,
    policy_version: str,
    secret_key: str,
    expires_at: str
) -> str:
    """Creates a cryptographic HMAC binding authorization to exact action parameters and policy."""
    message = f"{agent_id}:{tool}:{parameters_hash}:{policy_version}:{expires_at}"
    return hmac.new(secret_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()

def verify_action_binding_token(
    token: str,
    agent_id: str,
    tool: str,
    parameters_hash: str,
    policy_version: str,
    secret_key: str,
    expires_at: str
) -> bool:
    """Verifies that the action-bound token matches the exact parameters and has not expired."""
    expected = create_action_binding_token(
        agent_id, tool, parameters_hash, policy_version, secret_key, expires_at
    )
    is_valid_hmac = hmac.compare_digest(token, expected)
    try:
        exp_time = datetime.fromisoformat(expires_at)
        if datetime.now(timezone.utc) > exp_time:
            return False
    except Exception:
        return False
    return is_valid_hmac

def compute_audit_hash(prev_hash: str, event_data: Dict[str, Any]) -> str:
    """Tamper-evident audit chain hash computation."""
    content = json.dumps(event_data, sort_keys=True, default=str)
    combined = f"{prev_hash}::{content}"
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()
