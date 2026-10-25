from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from backend.app.db.models import (
    Policy, AgentBaseline, ModelVersion
)

def seed_database_if_empty(db: Session):
    if db.query(Policy).first():
        return  # Already seeded

    # 1. Base Policies
    policies = [
        Policy(
            id="pol-procurement-v1",
            version="v1",
            name="Procurement Standard Policy",
            role="Procurement Specialist",
            allowed_tools=["read_file", "query_database", "send_email"],
            allowed_resources=["supplier_catalog", "purchase_orders", "invoices", "item_pricing"],
            allowed_destinations=["internal_erp", "vendor_portal"],
            hard_denies=[
                {"field": "resource", "pattern": "*salary*", "reason": "SENSITIVE_RESOURCE_ACCESS"},
                {"field": "resource", "pattern": "*payroll*", "reason": "SENSITIVE_RESOURCE_ACCESS"},
                {"field": "destination", "pattern": "*external_anon*", "reason": "UNTRUSTED_DESTINATION"}
            ],
            thresholds={"L1": 3.0, "L2": 5.5, "L3": 7.5, "L4": 9.0},
            is_active=True
        ),
        Policy(
            id="pol-support-v1",
            version="v1",
            name="Customer Support Policy",
            role="Support Agent",
            allowed_tools=["read_file", "send_email", "call_external_api"],
            allowed_resources=["faq_docs", "knowledge_base", "ticket_history"],
            allowed_destinations=["customer_email_gw", "zendesk_api"],
            hard_denies=[
                {"field": "tool", "pattern": "execute_workflow", "reason": "TOOL_NOT_PERMITTED_FOR_ROLE"},
                {"field": "resource", "pattern": "*credential*", "reason": "CREDENTIAL_ACCESS_DENIED"}
            ],
            thresholds={"L1": 3.0, "L2": 5.0, "L3": 7.0, "L4": 8.5},
            is_active=True
        ),
        Policy(
            id="pol-finance-v1",
            version="v1",
            name="Financial Auditor Policy",
            role="Financial Auditor",
            allowed_tools=["read_file", "query_database", "execute_workflow"],
            allowed_resources=["general_ledger", "tax_filings", "invoices", "audit_reports", "passbook", "account_statements"],
            allowed_destinations=["internal_compliance_vault", "irs_gateway", "internal bank account"],
            hard_denies=[
                {"field": "destination", "pattern": "*pastebin*", "reason": "EXFILTRATION_PREVENTION"},
                {"field": "destination", "pattern": "*external*", "reason": "EXTERNAL_PAYMENT_TRANSFER_FORBIDDEN"}
            ],
            thresholds={"L1": 3.5, "L2": 6.0, "L3": 8.0, "L4": 9.2},
            is_active=True
        ),
        Policy(
            id="pol-devops-v1",
            version="v1",
            name="Infrastructure DevOps Policy",
            role="DevOps Automation",
            allowed_tools=["read_file", "execute_workflow", "call_external_api", "edit_file"],
            allowed_resources=["deploy_configs", "server_logs", "cluster_metrics", "*.css"],
            allowed_destinations=["k8s_api", "grafana_cloud", "internal"],
            hard_denies=[
                {"field": "parameters.command", "pattern": "*rm -rf*", "reason": "DESTRUCTIVE_COMMAND_BLOCKED"}
            ],
            thresholds={"L1": 3.0, "L2": 5.5, "L3": 7.5, "L4": 9.0},
            is_active=True
        ),
        Policy(
            id="pol-account-v1",
            version="v1",
            name="Account Statement Policy",
            role="Financial Auditor",
            allowed_tools=["query_database", "read_file"],
            allowed_resources=["passbook", "account_statements", "invoices", "general_ledger"],
            allowed_destinations=["internal bank account", "internal_erp", "compliance_vault"],
            hard_denies=[
                {"field": "destination", "pattern": "*external*", "reason": "EXTERNAL_PAYMENT_TRANSFER_FORBIDDEN"},
                {"field": "destination", "pattern": "*anon*", "reason": "UNTRUSTED_DESTINATION"}
            ],
            thresholds={"L1": 3.0, "L2": 5.5, "L3": 7.5, "L4": 9.0},
            is_active=True
        )
    ]
    db.add_all(policies)

    # 2. Model Version Reference
    now = datetime.now(timezone.utc)
    model_v1 = ModelVersion(
        id="mv-baseline-v1",
        version_tag="decoy-composite-v1.0",
        description="Phase 5 Trained Composite Drift Detector + Logistic Regression Behavioral Estimator",
        is_active=True,
        dataset_id="synthetic-drift-v1",
        is_synthetic=True,
        metrics={
            "precision": 0.941,
            "recall": 0.912,
            "false_positive_rate": 0.038,
            "true_positive_rate": 0.912,
            "f1_score": 0.926,
            "p50_latency_ms": 1.85,
            "p95_latency_ms": 3.92,
            "p99_latency_ms": 6.15,
            "confusion_matrix": {
                "true_positive": 104,
                "false_positive": 5,
                "true_negative": 126,
                "false_negative": 15
            }
        },
        rule_only_metrics={
            "precision": 0.985,
            "recall": 0.623,
            "false_positive_rate": 0.008,
            "true_positive_rate": 0.623,
            "f1_score": 0.763,
            "p50_latency_ms": 0.42,
            "p95_latency_ms": 0.89,
            "p99_latency_ms": 1.45
        },
        trained_at=now
    )
    db.add(model_v1)

    # 3. Reference Baselines
    baselines = [
        AgentBaseline(
            id="base-procure-v1",
            role="Procurement Specialist",
            window="30d",
            reference_version="role-procurement-v1",
            is_frozen=True,
            feature_stats={
                "allowed_tool_freq": {"read_file": 0.60, "query_database": 0.35, "send_email": 0.05},
                "destination_entropy": 0.22,
                "avg_payload_bytes": 1420
            },
            updated_at=now
        ),
        AgentBaseline(
            id="base-finance-v1",
            role="Financial Auditor",
            window="30d",
            reference_version="role-financial-v1",
            is_frozen=True,
            feature_stats={
                "allowed_tool_freq": {"query_database": 0.70, "read_file": 0.30},
                "destination_entropy": 0.15,
                "avg_payload_bytes": 2100
            },
            updated_at=now
        )
    ]
    db.add_all(baselines)
    db.commit()
