import { apiClient } from './client';
import { Approval } from '../types';

export const approvalsApi = {
  list: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return apiClient<Approval[]>(`/approvals${qs}`);
  },

  resolve: (
    approvalId: string,
    data: {
      status: 'approved' | 'rejected';
      reviewer_id: string;
      comment?: string;
    }
  ) =>
    apiClient<Approval>(`/approvals/${approvalId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
