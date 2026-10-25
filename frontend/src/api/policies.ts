import { apiClient } from './client';
import { Policy } from '../types';

export const policiesApi = {
  list: () => apiClient<Policy[]>('/policies'),

  get: (id: string) => apiClient<Policy>(`/policies/${id}`),

  create: (data: Partial<Policy>) =>
    apiClient<Policy>('/policies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, updates: Partial<Policy>) =>
    apiClient<Policy>(`/policies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  test: (
    id: string,
    sample: {
      tool: string;
      resource?: string;
      destination?: string;
      parameters?: Record<string, any>;
    }
  ) =>
    apiClient<{
      policy_id: string;
      policy_version: string;
      allowed: boolean;
      reasons: string[];
      hard_deny_triggered: boolean;
      violating_rules: any[];
    }>(`/policies/${id}/test`, {
      method: 'POST',
      body: JSON.stringify(sample),
    }),
};
