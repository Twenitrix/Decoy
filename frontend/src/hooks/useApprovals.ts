import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalsApi } from '../api/approvals';

export const useApprovals = (status?: string) => {
  return useQuery({
    queryKey: ['approvals', status],
    queryFn: () => approvalsApi.list(status),
    refetchInterval: 8000,
  });
};

export const useResolveApproval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      approvalId,
      status,
      reviewerId,
      comment,
    }: {
      approvalId: string;
      status: 'approved' | 'rejected';
      reviewerId: string;
      comment?: string;
    }) =>
      approvalsApi.resolve(approvalId, {
        status,
        reviewer_id: reviewerId,
        comment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });
};
