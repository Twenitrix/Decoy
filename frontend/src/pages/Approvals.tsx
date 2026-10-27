import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Terminal,
  Hash,
  Shield
} from 'lucide-react';
import { useApprovals, useResolveApproval } from '../hooks/useApprovals';
import { Approval } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import {
  MotionPage,
  motion,
  AnimatePresence,
  fadeUpItem,
  modalBackdropVariant,
  modalPanelVariant
} from '../components/motion';

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
    <MotionPage className="space-y-7 max-w-7xl mx-auto pb-10">
      {/* Editorial Header */}
      <motion.div
        variants={fadeUpItem}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 p-7 sm:p-8 rounded-[28px] surface-elevated editorial-frame"
      >
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40 font-semibold flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#F59E0B]" />
              HUMAN-IN-THE-LOOP QUARANTINE
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F4F1EA]">
            L2 Step-Up{' '}
            <span className="font-editorial italic font-normal text-[#F59E0B]">
              Approval
            </span>{' '}
            Command Queue
          </h2>
          <p className="text-sm text-[#A1A1AA] mt-2 max-w-2xl leading-relaxed">
            Actions held in pre-execution containment due to L2 risk thresholds or sensitive operational policies. Execution adapter remains locked until cryptographic human authorization.
          </p>
        </div>

        {/* Shared-Layout Animated Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1.5 bg-[#09090B] border border-[#272730] rounded-2xl self-start lg:self-auto">
          {[
            { id: 'pending', label: 'Pending Review' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
            { id: '', label: 'All History' },
          ].map((tab) => {
            const active = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  active ? 'text-[#09090B]' : 'text-[#A1A1AA] hover:text-[#F4F1EA]'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="approvals-filter-tab"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    className="absolute inset-0 rounded-xl bg-[#F4F1EA]"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Approvals List */}
      {!approvals || approvals.length === 0 ? (
        <motion.div variants={fadeUpItem}>
          <EmptyState
            icon={CheckSquare}
            title="Approval queue is clear"
            description={
              filterStatus === 'pending'
                ? 'No agent actions are currently quarantined for step-up human authorization.'
                : 'No resolved approval records match the selected filter.'
            }
          />
        </motion.div>
      ) : (
        <motion.div variants={fadeUpItem} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {approvals.map((appr) => {
              const isPending = appr.status === 'pending';
              const expiresDate = parseUtc(appr.expires_at);
              const isExpired = new Date() > expiresDate;

              return (
                <motion.div
                  key={appr.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`p-6 sm:p-7 rounded-[24px] transition-all ${
                    isPending
                      ? 'surface-elevated border border-[#F59E0B]/45 shadow-[0_16px_40px_-12px_rgba(245,158,11,0.15)]'
                      : 'surface-elevated opacity-90'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#272730]">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3.5 rounded-2xl flex-shrink-0 ${
                          isPending
                            ? 'bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B]'
                            : appr.status === 'approved'
                            ? 'bg-[#10B981]/15 border border-[#10B981]/35 text-[#10B981]'
                            : 'bg-[#F43F5E]/15 border border-[#F43F5E]/35 text-[#F43F5E]'
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono font-bold text-[#F4F1EA] text-base">
                            {appr.action_summary?.tool}
                          </span>
                          <RiskTierBadge tier={appr.risk_tier || 'L2'} />
                          <StatusBadge status={isPending && isExpired ? 'expired' : appr.status} size="sm" />
                        </div>
                        <div className="text-xs text-[#A1A1AA] mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#FF5A36]">{appr.agent_name}</span>
                          <span>({appr.agent_role})</span>
                          <span className="text-[#272730]">•</span>
                          <span className="font-mono text-[11px]">ID: {appr.agent_id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions & Timestamps */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-left sm:text-right text-xs">
                        <div className="text-[#A1A1AA] font-mono tabular-nums text-[11px]">
                          Requested: {parseUtc(appr.created_at).toLocaleTimeString()}
                        </div>
                        <div className="text-[#F59E0B] font-mono text-[11px] tabular-nums mt-0.5">
                          Expires: {expiresDate.toLocaleTimeString()}
                        </div>
                      </div>

                      {isPending && !isExpired && (
                        <div className="flex items-center gap-2.5 pl-0 sm:pl-4 sm:border-l border-[#272730]">
                          <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleOpenResolve(appr, 'approved')}
                            className="px-4 py-2.5 bg-[#10B981] hover:bg-[#0ea572] text-[#09090B] rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve & Execute
                          </motion.button>
                          <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleOpenResolve(appr, 'rejected')}
                            className="px-4 py-2.5 bg-[#F43F5E]/15 hover:bg-[#F43F5E]/25 text-[#F43F5E] border border-[#F43F5E]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bound Parameters & Reason codes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 text-xs">
                    <div>
                      <span className="text-[#A1A1AA] font-medium mb-2 flex items-center gap-1.5 text-xs">
                        <Terminal className="w-3.5 h-3.5 text-[#FF5A36]" />
                        Cryptographically Bound Parameters
                      </span>
                      <pre className="p-4 bg-[#09090B] rounded-2xl border border-[#272730] font-mono text-[#F4F1EA] text-[11px] overflow-x-auto max-h-40 leading-relaxed">
                        {JSON.stringify(appr.action_summary?.parameters || {}, null, 2)}
                      </pre>
                    </div>

                    <div className="space-y-3.5">
                      <div>
                        <span className="text-[#A1A1AA] font-medium mb-1.5 text-xs flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                          Triggered Step-Up Reason Codes
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {appr.reasons && appr.reasons.length > 0 ? (
                            appr.reasons.map((r, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-lg bg-[#F59E0B]/12 border border-[#F59E0B]/35 text-[#F59E0B] font-mono text-[11px]"
                              >
                                {r}
                              </span>
                            ))
                          ) : (
                            <span className="text-[#A1A1AA] text-xs font-mono">
                              High-impact operation step-up policy
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#09090B] border border-[#272730] text-[11px] font-mono text-[#A1A1AA] space-y-1.5">
                        <div className="truncate flex items-center gap-2">
                          <Hash className="w-3.5 h-3.5 text-[#A1A1AA] flex-shrink-0" />
                          <span>Params Hash:</span>
                          <span className="text-[#F4F1EA] truncate">{appr.bound_parameters_hash}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-[#FF5A36] flex-shrink-0" />
                          <span>Policy Binding:</span>
                          <span className="text-[#FF5A36] font-semibold">{appr.bound_policy_version}</span>
                        </div>
                      </div>

                      {appr.resolved_at && (
                        <div className="p-3.5 rounded-2xl bg-[#18181E] border border-[#272730] text-xs text-[#A1A1AA]">
                          Resolved by <span className="text-[#F4F1EA] font-semibold font-mono">{appr.reviewer_id}</span> at{' '}
                          <span className="tabular-nums font-mono">{new Date(appr.resolved_at).toLocaleString()}</span>
                          {appr.comment && (
                            <div className="italic text-[#F4F1EA] mt-1.5 pl-2.5 border-l-2 border-[#FF5A36]">
                              "{appr.comment}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Reviewer Resolution Modal */}
      <AnimatePresence>
        {activeApproval && (
          <motion.div
            variants={modalBackdropVariant}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              variants={modalPanelVariant}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="surface-elevated rounded-3xl p-7 max-w-md w-full shadow-2xl"
            >
              <h3 className="font-display text-lg font-bold text-[#F4F1EA] flex items-center gap-2.5">
                {resolutionAction === 'approved' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                ) : (
                  <XCircle className="w-5 h-5 text-[#F43F5E]" />
                )}
                {resolutionAction === 'approved' ? 'Approve Tool Execution' : 'Reject & Block Action'}
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-2 mb-5 leading-relaxed">
                {resolutionAction === 'approved'
                  ? 'Approving validates the cryptographic parameter binding HMAC and immediately dispatches the registered adapter for tool execution.'
                  : 'Rejecting halts tool execution, logs a blocked decision in the immutable audit ledger, and alerts SOC telemetry.'}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                    Authorized Reviewer ID
                  </label>
                  <input
                    type="text"
                    value={reviewerId}
                    onChange={(e) => setReviewerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                    Audit Justification Comment
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Verified legitimate supplier query within valid business context."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] focus:outline-none focus:border-[#FF5A36] leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#272730]">
                <button
                  type="button"
                  onClick={() => setActiveApproval(null)}
                  className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F1EA] hover:bg-[#18181E] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResolve}
                  className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all ${
                    resolutionAction === 'approved'
                      ? 'bg-[#10B981] hover:bg-[#0ea572] text-[#09090B]'
                      : 'bg-[#F43F5E] hover:bg-[#e11d48] text-white'
                  }`}
                >
                  Confirm {resolutionAction === 'approved' ? 'Approval & Execute' : 'Rejection'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionPage>
  );
};
