export type AgentStatus = 'active' | 'suspended' | 'disabled';

export type RiskTier = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

export type DecisionStatus =
  | 'allowed'
  | 'observed'
  | 'held_for_approval'
  | 'denied'
  | 'restricted'
  | 'isolated';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  policy_id: string;
  policy_version?: string;
  declared_task?: string | null;
  delegation_parent_id?: string | null;
  last_seen_at?: string | null;
  current_risk_tier?: RiskTier;
  action_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RiskAssessment {
  id: string;
  action_event_id: string;
  anomaly_score: number;
  calibrated_probability: number | null;
  tier: RiskTier;
  dimension_scores: Record<string, number>;
  reasons: string[];
  uncertainty: string;
  model_version: string;
  policy_version: string;
  baseline_version?: string;
}

export interface ActionEvent {
  id: string;
  agent_id: string;
  session_id: string;
  task_id?: string | null;
  timestamp: string;
  tool: string;
  resource?: string | null;
  destination?: string | null;
  decision: DecisionStatus;
  tier: RiskTier;
  reason_codes: string[];
  parameters_summary?: Record<string, any>;
  payload_size?: number;
  provenance_tags?: Record<string, any>;
  executed?: boolean;
}

export interface ActionDetail extends ActionEvent {
  risk_assessment?: RiskAssessment | null;
  decision_details?: {
    id: string;
    status: DecisionStatus;
    tier: RiskTier;
    executed: boolean;
    reason_codes: string[];
    policy_version: string;
    model_version: string;
    execution_outcome?: any;
    decided_at?: string;
    approval_id?: string | null;
    approval_status?: string | null;
  } | null;
  audit_events?: Array<{
    id: string;
    event_type: string;
    actor: string;
    timestamp: string;
    event_hash: string;
    prev_hash: string;
  }>;
}

export interface Policy {
  id: string;
  version: string;
  name: string;
  role: string;
  allowed_tools: string[];
  allowed_resources: string[];
  allowed_destinations: string[];
  hard_denies: Array<{
    field: string;
    pattern: string;
    reason: string;
  }>;
  thresholds: {
    L1: number;
    L2: number;
    L3: number;
    L4: number;
  };
  is_active: boolean;
  effective_from: string;
  created_at: string;
}

export interface Approval {
  id: string;
  decision_id: string;
  action_event_id: string;
  agent_id: string;
  agent_name?: string;
  agent_role?: string;
  action_summary: Record<string, any>;
  bound_parameters_hash: string;
  bound_policy_version: string;
  status: ApprovalStatus;
  reviewer_id?: string | null;
  comment?: string | null;
  resolved_at?: string | null;
  created_at: string;
  expires_at: string;
  reasons?: string[];
  risk_tier?: RiskTier;
}

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  agent_id: string;
  agent_name?: string;
  action_event_id?: string | null;
  tier: RiskTier;
  timestamp: string;
  status: 'open' | 'acknowledged' | 'resolved';
}

export interface DashboardSummary {
  total_agents: number;
  active_agents: number;
  suspended_agents: number;
  disabled_agents: number;
  total_actions_evaluated: number;
  allowed_count: number;
  denied_count: number;
  held_for_approval_count: number;
  isolated_count: number;
  risk_tier_distribution: Record<string, number>;
  recent_high_risk_events: Array<{
    id: string;
    action_id: string;
    agent_id: string;
    agent_name: string;
    agent_role: string;
    tool: string;
    resource: string;
    destination: string;
    status: DecisionStatus;
    tier: RiskTier;
    reasons: string[];
    timestamp: string;
  }>;
  system_health: {
    gateway_status: string;
    database_status: string;
    risk_service: string;
    shadow_mode: boolean;
  };
  latency_summary: {
    p50_ms: number;
    p95_ms: number;
  };
}

export interface ModelVersion {
  id: string;
  version_tag: string;
  description?: string;
  is_active: boolean;
  dataset_id: string;
  is_synthetic: boolean;
  metrics: {
    dataset_name?: string;
    total_scenarios?: number;
    sample_size?: number;
    precision: number;
    recall: number;
    false_positive_rate: number;
    true_positive_rate: number;
    f1_score: number;
    p50_latency_ms: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
    confusion_matrix: {
      true_positive: number;
      false_positive: number;
      true_negative: number;
      false_negative: number;
    };
  };
  rule_only_metrics?: {
    precision: number;
    recall: number;
    false_positive_rate: number;
    true_positive_rate: number;
    f1_score: number;
    p50_latency_ms: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
    confusion_matrix?: {
      true_positive: number;
      false_positive: number;
      true_negative: number;
      false_negative: number;
    };
  };
  trained_at: string;
}
