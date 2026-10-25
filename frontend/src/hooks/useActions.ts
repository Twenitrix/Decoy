import { useQuery } from '@tanstack/react-query';
import { actionsApi } from '../api/actions';

export const useActions = (params?: {
  agent_id?: string;
  decision?: string;
  tier?: string;
  tool?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ['actions', params],
    queryFn: () => actionsApi.list(params),
    refetchInterval: 10000,
  });
};

export const useActionDetail = (actionId: string) => {
  return useQuery({
    queryKey: ['actionDetail', actionId],
    queryFn: () => actionsApi.get(actionId),
    enabled: Boolean(actionId),
  });
};
