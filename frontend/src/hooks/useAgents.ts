import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '../api/agents';
import { Agent } from '../types';

export const useAgents = (params?: { role?: string; status?: string }) => {
  return useQuery({
    queryKey: ['agents', params],
    queryFn: () => agentsApi.list(params),
    refetchInterval: 15000,
  });
};

export const useAgentDetail = (agentId: string) => {
  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => agentsApi.get(agentId),
    enabled: Boolean(agentId),
  });
};

export const useAgentHistory = (agentId: string) => {
  return useQuery({
    queryKey: ['agentHistory', agentId],
    queryFn: () => agentsApi.getHistory(agentId),
    enabled: Boolean(agentId),
    refetchInterval: 10000,
  });
};

export const useAgentRisk = (agentId: string) => {
  return useQuery({
    queryKey: ['agentRisk', agentId],
    queryFn: () => agentsApi.getRisk(agentId),
    enabled: Boolean(agentId),
    refetchInterval: 10000,
  });
};

export const useRevokeAgent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => agentsApi.revoke(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });
};

export const useUpdateAgent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Agent> }) =>
      agentsApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });
};
