import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  FileCode,
  Hash,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useActionDetail } from '../hooks/useActions';
import { approvalsApi } from '../api/approvals';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { MotionPage, motion, fadeUpItem } from '../components/motion';

export const ActionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isResolving, setIsResolving] = useState(false);

  const { data: action, isLoading, error, refetch } = useActionDetail(id || '');

  const handleResolve = async (approvalId: string, status: 'approved' | 'rejected') => {
    setIsResolving(true);
    try {
      await approvalsApi.resolve(approvalId, {
        status,
        reviewer_id: 'secops-operator',
        comment: `Resolved via Action Details view (${status})`,
      });
      refetch();
      queryClient.invalidateQueries();
    } catch (err: any) {
      alert(`Failed to resolve approval: ${err.message}`);
    } finally {
      setIsResolving(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading action event and cryptographic audit trail..." />;
  if (error || !action) return <ErrorState message="Could not find action event." onRetry={() => refetch()} />;

  const ra = action.risk_assessment;
  const dec = action.decision_details;

  return (
    <MotionPage className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Back button */}
      <motion.div variants={fadeUpItem} className="flex items-center justify-between">
        <button
          onClick={() => navigate('/actions')}
          className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] hover:text-[#F4F1EA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#FF5A36]" />
          <span>Back to Action Explorer</span>
        </button>

        <span className="text-xs font-mono text-[#FF5A36] font-semibold bg-[#121216] px-3.5 py-1.5 rounded-full border border-[#272730]">
          Event: {action.id}
        </span>
      </motion.div>

      {/* Decision Outcome Banner */}
      <motion.div
        variants={fadeUpItem}
        className="p-7 sm:p-8 rounded-[28px] surface-elevated editorial-frame flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2.5">
            <span className="text-[10px] uppercase font-mono tracking-[0.16em] text-[#A1A1AA] font-semibold">
              Gateway Enforcement Decision
            </span>
            <StatusBadge status={action.decision} />
            <RiskTierBadge tier={action.tier} />
          </div>
          <div className="font-display text-2xl font-bold font-mono text-[#FF5A36] flex flex-wrap items-center gap-2">
            <span>{action.tool}</span>
            <span className="text-[#A1A1AA] font-normal text-sm font-sans">
              on <span className="font-mono text-[#F4F1EA]">{action.resource || 'unspecified resource'}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#A1A1AA] mt-2.5 font-mono">
            <span>
              Agent: <span className="text-[#F4F1EA] font-semibold">{action.agent_id}</span>
            </span>
            <span className="text-[#272730]">•</span>
            <span>
              Session: <span className="text-[#F4F1EA]">{action.session_id}</span>
            </span>
            <span className="text-[#272730]">•</span>
            <span className="tabular-nums">{new Date(action.timestamp).toLocaleString()}</span>
          </div>
        </div>

        <div className="text-left md:text-right border-t md:border-t-0 md:border-l border-[#272730] pt-4 md:pt-0 md:pl-6 flex-shrink-0">
          <div className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-wider">
            Execution Outcome
          </div>
          <div className="mt-1.5">
            <span
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-mono border ${
                action.executed
                  ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
                  : 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/40'
              }`}
            >
              {action.executed ? 'TOOL EXECUTED' : 'EXECUTION WITHHELD'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Pending Step-Up Resolution Prompt if held */}
      {action.decision === 'held_for_approval' && dec?.approval_id && (
        <motion.div
          variants={fadeUpItem}
          className="p-5 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <Clock className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="font-display text-sm font-bold text-[#F4F1EA]">
                Action Quarantined in Step-Up Approval Queue
              </h4>
              <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">
                This action requires authorized operator verification before execution adapter dispatch.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              disabled={isResolving}
              onClick={() => dec.approval_id && handleResolve(dec.approval_id, 'approved')}
              className="px-4 py-2 bg-[#10B981] hover:bg-[#0ea572] disabled:opacity-50 text-[#09090B] rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Execution
            </button>
            <button
              disabled={isResolving}
              onClick={() => dec.approval_id && handleResolve(dec.approval_id, 'rejected')}
              className="px-4 py-2 bg-[#F43F5E] hover:bg-[#e11d48] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              Deny & Block
            </button>
          </div>
        </motion.div>
      )}

      {/* Policy Evaluation vs ML Anomaly Attribution */}
      <motion.div variants={fadeUpItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Policy Engine Evaluation */}
        <div className="p-7 rounded-[28px] surface-elevated">
          <h3 className="font-display text-base font-bold text-[#F4F1EA] flex items-center gap-2 mb-1">
            <FileCode className="w-4 h-4 text-[#FF5A36]" />
            Deterministic Policy Gate
          </h3>
          <p className="text-xs text-[#A1A1AA] mb-5">Mandatory hard-policy boundary check (RBAC/ABAC)</p>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#09090B] border border-[#272730]">
              <span className="text-[#A1A1AA]">Policy Version Binding</span>
              <span className="font-mono text-[#FF5A36] font-semibold">
                {dec?.policy_version || 'v1'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#09090B] border border-[#272730]">
              <span className="text-[#A1A1AA]">Enforcement Tier</span>
              <RiskTierBadge tier={action.tier} />
            </div>

            <div className="p-4 rounded-2xl bg-[#09090B] border border-[#272730]">
              <span className="text-[10px] font-mono text-[#A1A1AA] uppercase block mb-1.5">
                Reason Codes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(dec?.reason_codes || action.reason_codes || []).length > 0 ? (
                  (dec?.reason_codes || action.reason_codes).map((r: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-md bg-[#F59E0B]/12 border border-[#F59E0B]/35 text-[#F59E0B] font-mono text-[11px]"
                    >
                      {r}
                    </span>
                  ))
                ) : (
                  <span className="text-[#A1A1AA] font-mono text-[11px]">Normal in-policy execution</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ML Risk Engine Evaluation */}
        <div className="p-7 rounded-[28px] surface-elevated">
          <h3 className="font-display text-base font-bold text-[#F4F1EA] flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-[#8B5CF6]" />
            Decoy ML Probabilistic Drift Engine
          </h3>
          <p className="text-xs text-[#A1A1AA] mb-5">Multi-dimensional behavioral anomaly inference</p>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#09090B] border border-[#272730]">
              <span className="text-[#A1A1AA]">Composite Anomaly Score</span>
              <span className="font-mono text-base font-bold text-[#FF5A36] tabular-nums">
                {ra?.anomaly_score !== undefined ? ra.anomaly_score.toFixed(2) : '0.00'}{' '}
                <span className="text-xs text-[#A1A1AA] font-normal">/ 10</span>
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#09090B] border border-[#272730]">
              <span className="text-[#A1A1AA]">ML Model Version</span>
              <span className="font-mono text-[#F4F1EA]">{ra?.model_version || 'tuned_composite_detector'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#09090B] border border-[#272730] space-y-2">
              <span className="text-[10px] font-mono text-[#A1A1AA] uppercase block mb-1">
                Dimension Attribution
              </span>
              {ra?.dimension_scores ? (
                Object.entries(ra.dimension_scores).map(([dim, val]: [string, any]) => (
                  <div key={dim} className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A1A1AA] capitalize">{dim.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-[#F4F1EA] font-semibold tabular-nums">
                      {Number(val).toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-[#A1A1AA] font-mono text-[11px]">No dimension data</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Redacted Parameters Summary */}
      <motion.div variants={fadeUpItem} className="p-7 rounded-[28px] surface-elevated">
        <h3 className="font-display text-sm font-bold text-[#F4F1EA] flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-[#FF5A36]" />
          Submitted Action Parameters (Redacted)
        </h3>
        <pre className="p-4 bg-[#09090B] rounded-2xl border border-[#272730] font-mono text-[#F4F1EA] text-xs overflow-x-auto leading-relaxed">
          {JSON.stringify(action.parameters_summary || {}, null, 2)}
        </pre>
      </motion.div>

      {/* Execution Outcome Details */}
      {dec?.execution_outcome && (
        <motion.div variants={fadeUpItem} className="p-7 rounded-[28px] surface-elevated">
          <h3 className="font-display text-sm font-bold text-[#F4F1EA] flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            Downstream Tool Adapter Execution Outcome
          </h3>
          <pre className="p-4 bg-[#09090B] rounded-2xl border border-[#272730] font-mono text-[#10B981] text-xs overflow-x-auto leading-relaxed">
            {JSON.stringify(dec.execution_outcome, null, 2)}
          </pre>
        </motion.div>
      )}

      {/* Cryptographic Append-Only Audit Chain */}
      {action.audit_events && action.audit_events.length > 0 && (
        <motion.div variants={fadeUpItem} className="p-7 rounded-[28px] surface-elevated">
          <h3 className="font-display text-sm font-bold text-[#F4F1EA] flex items-center gap-2 mb-4">
            <Hash className="w-4 h-4 text-[#8B5CF6]" />
            Append-Only SHA-256 Audit Hash Chain Verification
          </h3>
          <div className="space-y-2.5">
            {action.audit_events.map((ae) => (
              <div
                key={ae.id}
                className="p-4 bg-[#09090B] rounded-2xl border border-[#272730] text-xs space-y-1.5 font-mono"
              >
                <div className="flex items-center justify-between text-[#F4F1EA]">
                  <span className="font-bold text-[#8B5CF6]">{ae.event_type}</span>
                  <span className="text-[11px] text-[#A1A1AA] tabular-nums">
                    {new Date(ae.timestamp).toLocaleTimeString()} by {ae.actor}
                  </span>
                </div>
                <div className="text-[11px] text-[#A1A1AA] truncate">
                  <span>Hash:</span> <span className="text-[#F4F1EA]">{ae.event_hash}</span>
                </div>
                <div className="text-[11px] text-[#A1A1AA]/70 truncate">
                  <span>Prev:</span> <span>{ae.prev_hash}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </MotionPage>
  );
};
