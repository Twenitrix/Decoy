import { apiClient } from './client';

export interface ActionSimulationRequest {
  agent_id: string;
  session_id: string;
  task_id?: string;
  action: {
    tool: string;
    resource?: string;
    destination?: string;
    parameters?: Record<string, any>;
    provenance_tags?: Record<string, any>;
  };
  dry_run?: boolean;
}

export interface ActionSimulationResponse {
  action_id: string;
  decision_id: string;
  status: string;
  tier: string;
  executed: boolean;
  risk: {
    anomaly_score: number;
    calibrated_probability: number | null;
    dimension_scores: Record<string, number>;
    reasons: string[];
    model_version: string;
    uncertainty: string;
  };
  reasons: string[];
  policy_version: string;
  model_version: string;
  execution_result?: any;
  approval_id?: string;
}

export const gatewayApi = {
  submitAction: (payload: ActionSimulationRequest) =>
    apiClient<ActionSimulationResponse>('/gateway/actions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
