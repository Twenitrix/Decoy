import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Layers,
  FileCode,
  Hash,
  Database,
  Terminal,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useActionDetail } from '../hooks/useActions';
import { approvalsApi } from '../api/approvals';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/actions')}
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Action Explorer
        </button>

        <span className="text-xs font-mono text-slate-500">Event ID: {action.id}</span>
      </div>

      {/* Decision Outcome Banner */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
              Gateway Enforcement Decision
            </span>
            <StatusBadge status={action.decision} />
            <RiskTierBadge tier={action.tier} />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300 flex items-center gap-2">
            <span>{action.tool}</span>
            <span className="text-slate-500 font-normal text-sm">
              on {action.resource || 'unspecified resource'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
            <span>Agent: <span className="font-mono text-cyan-400">{action.agent_id}</span></span>
            <span>•</span>
            <span>Session: <span className="font-mono text-slate-300">{action.session_id}</span></span>
            <span>•</span>
            <span>{new Date(action.timestamp).toLocaleString()}</span>
          </div>
        </div>

        <div className="text-right border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="text-[11px] font-mono text-slate-500 uppercase">Execution Adapter</div>
          <div className="mt-1">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                action.executed
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {action.executed ? 'TOOL EXECUTED' : 'EXECUTION WITHHELD'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            Policy: {dec?.policy_version || 'v1'} | Model: {dec?.model_version || 'baseline-v1'}
          </div>
        </div>
      </div>

      {/* Step-Up Approval Banner if held */}
      {action.decision === 'held_for_approval' && dec?.approval_id && (
        <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-amber-200 block text-sm">
                Quarantined in Approval Queue
              </span>
              <span className="text-xs text-amber-400/80 font-mono">
                Approval ID: {dec.approval_id} • Status: {dec.approval_status || 'pending'}
              </span>
            </div>
          </div>
          {dec.approval_status === 'pending' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleResolve(dec.approval_id!, 'approved')}
                disabled={isResolving}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isResolving ? 'Executing...' : 'Approve & Execute Now'}
              </button>
              <button
                type="button"
                onClick={() => handleResolve(dec.approval_id!, 'rejected')}
                disabled={isResolving}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid: Reason Codes & Risk Feature Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reasons and Policy Attribution */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Decision Reason Codes & Policy Attribution
          </h3>

          {action.reason_codes && action.reason_codes.length > 0 ? (
            <div className="space-y-2">
              {action.reason_codes.map((r, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-mono text-xs font-bold text-amber-300">{r}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Evaluated by pre-execution policy gating and risk fusion engine.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950 text-xs text-slate-400 border border-slate-800">
              No anomaly or policy violation flags triggered. Low-risk in-role action.
            </div>
          )}

          <div className="pt-2 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Destination Egress:</span>
              <span className="font-mono text-slate-300">{action.destination || 'Internal'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payload Volume:</span>
              <span className="font-mono text-slate-300">{action.payload_size || 0} bytes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Provenance Tainted:</span>
              <span className="font-mono text-slate-300">
                {action.provenance_tags?.tainted ? 'YES (Untrusted Source)' : 'NO (Clean)'}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Assessment Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Risk Engine Dimensions
            </h3>
            <span className="text-xs font-mono font-bold text-cyan-400">
              Score: {ra?.anomaly_score?.toFixed(1) ?? '0.0'} / 10
            </span>
          </div>

          {ra?.dimension_scores ? (
            <div className="space-y-2.5">
              {Object.entries(ra.dimension_scores).map(([k, v]) => {
                const val = Number(v) || 0;
                const pct = Math.round(val * 100);
                const color = pct > 70 ? 'bg-red-500' : pct > 45 ? 'bg-amber-500' : 'bg-cyan-500';
                return (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-slate-300">{val.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-500">No dimensional breakdown available.</div>
          )}

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Calibrated Probability:</span>
            <span className="font-mono text-slate-300">
              {ra?.calibrated_probability !== null && ra?.calibrated_probability !== undefined
                ? `${(ra.calibrated_probability * 100).toFixed(1)}%`
                : 'null (uncalibrated model)'}
            </span>
          </div>
        </div>
      </div>

      {/* Redacted Parameters Summary */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-slate-400" />
          Submitted Action Parameters (Redacted)
        </h3>
        <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto">
          {JSON.stringify(action.parameters_summary || {}, null, 2)}
        </pre>
      </div>

      {/* Execution Outcome Details */}
      {dec?.execution_outcome && (
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Downstream Tool Adapter Execution Outcome
          </h3>
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
            {JSON.stringify(dec.execution_outcome, null, 2)}
          </pre>
        </div>
      )}

      {/* Cryptographic Audit Trail */}
      {action.audit_events && action.audit_events.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-purple-400" />
            Append-Only Audit Hash Chain Verification
          </h3>
          <div className="space-y-2">
            {action.audit_events.map((ae) => (
              <div
                key={ae.id}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1 font-mono"
              >
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold text-purple-300">{ae.event_type}</span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(ae.timestamp).toLocaleTimeString()} by {ae.actor}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Hash: <span className="text-slate-300">{ae.event_hash}</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Prev: {ae.prev_hash}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
