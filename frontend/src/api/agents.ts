import { apiClient } from './client';
import { Agent } from '../types';

export const agentsApi = {
  list: (params?: { role?: string; status?: string; skip?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.set('role', params.role);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return apiClient<Agent[]>(`/agents${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => apiClient<Agent>(`/agents/${id}`),

  create: (data: Partial<Agent>) =>
    apiClient<Agent>('/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, updates: Partial<Agent>) =>
    apiClient<Agent>(`/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  getHistory: (id: string, limit = 20) =>
    apiClient<any[]>(`/agents/${id}/history?limit=${limit}`),

  getRisk: (id: string) => apiClient<any>(`/agents/${id}/risk`),

  revoke: (id: string) =>
    apiClient<Agent>(`/agents/${id}/revoke`, {
      method: 'POST',
    }),
};
