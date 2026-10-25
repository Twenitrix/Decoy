import { apiClient } from './client';
import { ModelVersion } from '../types';

export const modelsApi = {
  listVersions: () => apiClient<ModelVersion[]>('/models/versions'),

  evaluate: (data?: { dataset_id?: string; version_tag?: string }) =>
    apiClient<ModelVersion>('/models/evaluate', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
};
