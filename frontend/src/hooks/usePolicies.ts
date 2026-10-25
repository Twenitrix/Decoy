import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesApi } from '../api/policies';
import { Policy } from '../types';

export const usePolicies = () => {
  return useQuery({
    queryKey: ['policies'],
    queryFn: () => policiesApi.list(),
  });
};

export const usePolicyDetail = (policyId: string) => {
  return useQuery({
    queryKey: ['policy', policyId],
    queryFn: () => policiesApi.get(policyId),
    enabled: Boolean(policyId),
  });
};

export const useCreatePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Policy>) => policiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
};

export const useUpdatePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Policy> }) =>
      policiesApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy'] });
    },
  });
};
