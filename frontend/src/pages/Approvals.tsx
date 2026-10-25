import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bot,
  Terminal,
  FileCheck,
  ShieldAlert
} from 'lucide-react';
import { useApprovals, useResolveApproval } from '../hooks/useApprovals';
import { Approval } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

const parseUtc = (s: string | undefined | null) => {
  if (!s) return new Date();
  const hasTz = s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s);
  return new Date(hasTz ? s : `${s}Z`);
};

export const Approvals: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [activeApproval, setActiveApproval] = useState<Approval | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewerId, setReviewerId] = useState('OPERATOR_SECURITY_ANALYST');
  const [comment, setComment] = useState('');

  const { data: approvals, isLoading, error, refetch } = useApprovals(
    filterStatus || undefined
  );

  const resolveMutation = useResolveApproval();

  const handleOpenResolve = (appr: Approval, action: 'approved' | 'rejected') => {
    setActiveApproval(appr);
    setResolutionAction(action);
    setComment('');
  };

  const handleConfirmResolve = () => {
    if (!activeApproval) return;

    resolveMutation.mutate(
      {
        approvalId: activeApproval.id,
        status: resolutionAction,
        reviewerId: reviewerId || 'OPERATOR',
        comment: comment || undefined,
      },
      {
        onSuccess: () => {
          setActiveApproval(null);
        },
        onError: (err: any) => {
          alert(`Failed to resolve approval: ${err.message}`);
        },
      }
    );
  };

  if (isLoading) return <LoadingState message="Loading step-up human approval queue..." />;
  if (error) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            Human Step-Up Approvals Queue
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Actions held in quarantine due to L2 threshold or high-impact operational policy binding.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {['pending', 'approved', 'rejected', ''].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === st
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === '' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals List */}
      {!approvals || approvals.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Approval queue is empty"
          description={
            filterStatus === 'pending'
              ? 'No actions currently held for step-up human authorization.'
              : 'No resolved approvals match the selected filter.'
          }
        />
      ) : (
        <div className="space-y-4">
          {approvals.map((appr) => {
            const isPending = appr.status === 'pending';
            const expiresDate = parseUtc(appr.expires_at);
            const isExpired = new Date() > expiresDate;

            return (
              <div
                key={appr.id}
                className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-100 text-sm">
                          {appr.action_summary?.tool}
                        </span>
                        <RiskTierBadge tier={appr.risk_tier || 'L2'} />
                        <StatusBadge status={isPending && isExpired ? 'expired' : appr.status} size="sm" />
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span className="font-medium text-cyan-400">{appr.agent_name}</span>
                        <span>({appr.agent_role})</span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">ID: {appr.agent_id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions / Timestamps */}
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <div className="text-slate-400">
                        Requested: {parseUtc(appr.created_at).toLocaleTimeString()}
                      </div>
                      <div className="text-amber-400/90 font-mono text-[11px]">
                        Expires: {expiresDate.toLocaleTimeString()}
                      </div>
                    </div>

                    {isPending && !isExpired && (
                      <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
                        <button
                          onClick={() => handleOpenResolve(appr, 'approved')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleOpenResolve(appr, 'rejected')}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bound Parameters & Reason codes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block mb-1.5">
                      Exact Action Parameters (Cryptographically Bound):
                    </span>
                    <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-cyan-300 text-[11px] overflow-x-auto">
                      {JSON.stringify(appr.action_summary?.parameters || {}, null, 2)}
                    </pre>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-400 font-medium block mb-1">
                        Triggered Step-up Reasons:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {appr.reasons && appr.reasons.length > 0 ? (
                          appr.reasons.map((r, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/80 text-amber-300 font-mono text-[11px]"
                            >
                              {r}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-xs">
                            High-impact operation step-up policy
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
                      <div className="truncate">
                        Params Hash: <span className="text-slate-300">{appr.bound_parameters_hash}</span>
                      </div>
                      <div>
                        Policy Binding Version: <span className="text-cyan-400">{appr.bound_policy_version}</span>
                      </div>
                    </div>

                    {appr.resolved_at && (
                      <div className="text-[11px] text-slate-400">
                        Resolved by <span className="text-slate-200 font-medium">{appr.reviewer_id}</span> at{' '}
                        {new Date(appr.resolved_at).toLocaleString()}
                        {appr.comment && <div className="italic text-slate-300 mt-0.5">"{appr.comment}"</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reviewer Resolution Modal */}
      {activeApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {resolutionAction === 'approved' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400" />
              )}
              {resolutionAction === 'approved' ? 'Approve Tool Execution' : 'Reject & Block Action'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              {resolutionAction === 'approved'
                ? 'Approving will verify cryptographic parameter binding and immediately execute the registered tool adapter.'
                : 'Rejecting will deny the action and update audit telemetry.'}
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reviewer Operator ID
                </label>
                <input
                  type="text"
                  value={reviewerId}
                  onChange={(e) => setReviewerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Audit Comment / Justification
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Verified legitimate supplier query within valid business context."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveApproval(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm ${
                  resolutionAction === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirm {resolutionAction === 'approved' ? 'Approval & Execute' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
