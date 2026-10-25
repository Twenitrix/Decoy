import { apiClient } from './client';
import { DashboardSummary } from '../types';

export const metricsApi = {
  getDashboardSummary: () => apiClient<DashboardSummary>('/dashboard/summary'),
  getLatency: () => apiClient<any>('/metrics/latency'),
  getDetection: () => apiClient<any>('/metrics/detection'),
  getHealth: () => apiClient<any>('/health'),
};
