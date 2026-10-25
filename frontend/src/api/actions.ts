import { apiClient } from './client';
import { ActionEvent, ActionDetail } from '../types';

export const actionsApi = {
  list: (params?: {
    agent_id?: string;
    decision?: string;
    tier?: string;
    tool?: string;
    resource?: string;
    destination?: string;
    session_id?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.agent_id) searchParams.set('agent_id', params.agent_id);
    if (params?.decision) searchParams.set('decision', params.decision);
    if (params?.tier) searchParams.set('tier', params.tier);
    if (params?.tool) searchParams.set('tool', params.tool);
    if (params?.resource) searchParams.set('resource', params.resource);
    if (params?.destination) searchParams.set('destination', params.destination);
    if (params?.session_id) searchParams.set('session_id', params.session_id);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return apiClient<ActionEvent[]>(`/actions${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => apiClient<ActionDetail>(`/actions/${id}`),
};
