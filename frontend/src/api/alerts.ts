import { apiClient } from './client';
import { Alert } from '../types';

export const alertsApi = {
  list: () => apiClient<Alert[]>('/alerts'),
};
