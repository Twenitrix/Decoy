import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bot,
  ArrowLeft,
  Shield,
  Clock,
  Layers,
  Activity,
  AlertTriangle,
  FileCode,
  ShieldAlert,
  Power
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useAgentDetail, useAgentHistory, useAgentRisk, useRevokeAgent, useUpdateAgent } from '../hooks/useAgents';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const AgentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);

  const { data: agent, isLoading: isAgentLoading, error: agentError, refetch: refetchAgent } = useAgentDetail(id || '');
  const { data: history, isLoading: isHistoryLoading } = useAgentHistory(id || '');
  const { data: risk, isLoading: isRiskLoading } = useAgentRisk(id || '');

  const revokeMutation = useRevokeAgent();
  const updateMutation = useUpdateAgent();

  if (isAgentLoading || isRiskLoading) return <LoadingState message="Loading agent telemetry and risk indicators..." />;
  if (agentError || !agent) return <ErrorState message="Could not find or load agent details." onRetry={() => refetchAgent()} />;

  const handleToggleStatus = () => {
    const nextStatus = agent.status === 'active' ? 'suspended' : 'active';
    updateMutation.mutate({ id: agent.id, updates: { status: nextStatus } });
  };

  const handleRevoke = () => {
    revokeMutation.mutate(agent.id, {
      onSuccess: () => setIsRevokeModalOpen(false),
    });
  };

  const dimScores = risk?.dimension_scores || {
    tool_unusualness: 0.1,
    resource_sensitivity: 0.1,
    destination_risk: 0.05,
    sequence_anomaly: 0.1,
    slow_drift: 0.1,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/agents')}
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Agent Inventory
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStatus}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
            {agent.status === 'active' ? 'Suspend Agent' : 'Activate Agent'}
          </button>
          <button
            onClick={() => setIsRevokeModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-xs font-semibold text-rose-200 shadow-sm transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Revoke Credentials
          </button>
        </div>
      </div>

      {/* Identity Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-cyan-950/80 border border-cyan-800 text-cyan-400">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-100">{agent.name}</h2>
              <StatusBadge status={agent.status} />
              <RiskTierBadge tier={risk?.current_tier || 'L0'} />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="font-mono text-cyan-400">{agent.id}</span>
              <span>•</span>
              <span className="text-slate-300 font-medium">{agent.role}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FileCode className="w-3.5 h-3.5 text-slate-500" />
                Policy: <span className="text-slate-200 font-mono">{agent.policy_id}</span> ({agent.policy_version || 'v1'})
              </span>
            </div>
            {agent.declared_task && (
              <p className="text-xs text-slate-400 mt-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800/80 inline-block">
                <span className="text-slate-500 font-medium">Declared Task: </span>
                {agent.declared_task}
              </p>
            )}
          </div>
        </div>

        <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 text-right">
          <div className="text-[11px] text-slate-500 font-mono uppercase">Anomaly Score</div>
          <div className="text-3xl font-bold text-cyan-400 font-mono">
            {risk?.current_anomaly_score !== undefined ? risk.current_anomaly_score.toFixed(1) : '0.0'}
            <span className="text-xs text-slate-500 font-normal"> / 10</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Last seen:{' '}
            {agent.last_seen_at ? new Date(agent.last_seen_at).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Multi-Dimension Breakdown & Risk Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dimension Scores Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Multi-Dimension Risk Signal Attribution
              </h3>
              <p className="text-xs text-slate-400">
                Evaluated feature dimensions conditioned on role baseline
              </p>
            </div>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="space-y-3.5">
            {[
              { label: 'Tool Unusualness', val: dimScores.tool_unusualness, desc: 'Likelihood of tool call given declared role' },
              { label: 'Resource Sensitivity', val: dimScores.resource_sensitivity, desc: 'Confidentiality tier of target resource' },
              { label: 'Destination Trust', val: dimScores.destination_risk, desc: 'Egress/network destination risk tier' },
              { label: 'Sequence Anomaly', val: dimScores.sequence_anomaly, desc: 'Markov transition deviation from baseline order' },
              { label: 'Slow Behavioural Drift', val: dimScores.slow_drift, desc: 'Long-window divergence from frozen reference' },
            ].map((d) => {
              const pct = Math.round((d.val || 0) * 100);
              const barColor =
                pct > 70 ? 'bg-red-500' : pct > 45 ? 'bg-amber-500' : 'bg-cyan-500';

              return (
                <div key={d.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-300">{d.label}</span>
                    <span className="font-mono text-slate-400">{d.val}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full ${barColor} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{d.desc}</div>
                </div>
              );
            })}
          </div>

          {risk?.reasons && risk.reasons.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Active Reason Codes:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {risk.reasons.map((r: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs font-mono"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Risk Trend Chart */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">Historical Risk Trend</h3>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Anomaly score timeline across recent tool requests
            </p>
          </div>

          <div className="h-60 w-full">
            {risk?.risk_trend && risk.risk_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={risk.risk_trend}>
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    stroke="#64748b"
                    fontSize={11}
                  />
                  <YAxis domain={[0, 10]} stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${val} / 10`, 'Anomaly Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="anomaly_score"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ fill: '#06b6d4', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Insufficient historical points for trend chart.
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span>Model Version: {risk?.baseline_version || 'role-v1'}</span>
            <span>Uncertainty: {risk?.uncertainty || 'low'}</span>
          </div>
        </div>
      </div>

      {/* Action History Timeline */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">Recent Mediated Actions</h3>
        <p className="text-xs text-slate-400 mb-4">
          Complete execution and gating record for this agent
        </p>

        {isHistoryLoading ? (
          <div className="text-xs text-slate-500">Loading action history...</div>
        ) : !history || history.length === 0 ? (
          <div className="text-xs text-slate-500 p-4 bg-slate-950/60 rounded-xl">
            No action events recorded yet for this agent.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-mono">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Tool</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Destination</th>
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Risk Tier</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3">Execution Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-normal">
                {history.map((h: any) => (
                  <tr
                    key={h.id}
                    onClick={() => navigate(`/actions/${h.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {new Date(h.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-300 font-semibold">{h.tool}</td>
                    <td className="py-3 px-3">{h.resource || '—'}</td>
                    <td className="py-3 px-3">{h.destination || '—'}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={h.decision} size="sm" />
                    </td>
                    <td className="py-3 px-3">
                      <RiskTierBadge tier={h.tier} />
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200">
                      {h.anomaly_score?.toFixed(1) ?? '0.0'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          h.executed
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {h.executed ? 'EXECUTED' : 'BLOCKED / HELD'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isRevokeModalOpen}
        title="Revoke Agent Credentials"
        message={`Are you sure you want to revoke credentials and suspend '${agent.name}' (${agent.id})?`}
        confirmLabel="Revoke Credentials"
        isDestructive={true}
        onConfirm={handleRevoke}
        onCancel={() => setIsRevokeModalOpen(false)}
      />
    </div>
  );
};
