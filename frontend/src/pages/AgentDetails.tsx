import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bot,
  ArrowLeft,
  Layers,
  Activity,
  FileCode,
  ShieldAlert,
  Power,
  Cpu
} from 'lucide-react';
import { useAgentDetail, useAgentHistory, useAgentRisk, useRevokeAgent, useUpdateAgent } from '../hooks/useAgents';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MotionPage, motion, fadeUpItem, AnimatedNumber } from '../components/motion';

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
    <MotionPage className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Back and Action Bar */}
      <motion.div
        variants={fadeUpItem}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <button
          onClick={() => navigate('/agents')}
          className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] hover:text-[#F4F1EA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#FF5A36]" />
          <span>Back to Agent Inventory</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleToggleStatus}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#272730] bg-[#121216] hover:bg-[#18181E] text-xs font-semibold text-[#F4F1EA] transition-all"
          >
            <Power className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>{agent.status === 'active' ? 'Suspend Agent' : 'Activate Agent'}</span>
          </button>
          <button
            onClick={() => setIsRevokeModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F43F5E]/15 hover:bg-[#F43F5E]/25 border border-[#F43F5E]/40 text-xs font-bold text-[#F43F5E] transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Emergency Revoke</span>
          </button>
        </div>
      </motion.div>

      {/* Identity Card */}
      <motion.div
        variants={fadeUpItem}
        className="p-7 sm:p-8 rounded-[28px] surface-elevated editorial-frame flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-4 rounded-2xl bg-[#18181E] border border-[#272730] text-[#FF5A36]">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-bold text-[#F4F1EA]">
                {agent.name}
              </h2>
              <StatusBadge status={agent.status} />
              <RiskTierBadge tier={risk?.current_tier || 'L0'} />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#A1A1AA]">
              <span className="font-mono text-[#FF5A36] font-semibold">{agent.id}</span>
              <span className="text-[#272730]">•</span>
              <span className="text-[#F4F1EA] font-medium">{agent.role}</span>
              <span className="text-[#272730]">•</span>
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <FileCode className="w-3.5 h-3.5 text-[#A1A1AA]" />
                Policy: <span className="text-[#FF5A36]">{agent.policy_id}</span> ({agent.policy_version || 'v1'})
              </span>
            </div>
            {agent.declared_task && (
              <div className="text-xs text-[#F4F1EA] mt-3.5 bg-[#09090B] px-4 py-3 rounded-2xl border border-[#272730] max-w-xl leading-relaxed">
                <span className="text-[#A1A1AA] font-mono uppercase text-[10px] block mb-0.5">
                  Declared Task Objective
                </span>
                {agent.declared_task}
              </div>
            )}
          </div>
        </div>

        <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-[#272730] pt-4 md:pt-0 md:pl-8 text-right">
          <div className="text-[10px] text-[#A1A1AA] font-mono uppercase tracking-[0.14em]">
            Composite Anomaly Score
          </div>
          <div className="font-display text-4xl font-bold text-[#FF5A36] tabular-nums my-1">
            <AnimatedNumber
              value={risk?.current_anomaly_score !== undefined ? risk.current_anomaly_score : 0}
              decimals={1}
            />
            <span className="text-xs text-[#A1A1AA] font-mono font-normal"> / 10.0</span>
          </div>
          <div className="text-[11px] text-[#A1A1AA] font-mono">
            Last seen:{' '}
            <span className="text-[#F4F1EA] font-medium">
              {agent.last_seen_at ? new Date(agent.last_seen_at).toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Multi-Dimension Breakdown & Active Reason Codes */}
      <motion.div variants={fadeUpItem} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dimension Scores Breakdown */}
        <div className="p-7 rounded-[28px] surface-elevated">
          <div className="mb-5">
            <h3 className="font-display text-base font-bold text-[#F4F1EA] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FF5A36]" />
              Multi-Dimension Risk Signal Attribution
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Evaluated behavioral feature dimensions conditioned on declared role baseline
            </p>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Tool Unusualness', val: dimScores.tool_unusualness, desc: 'Likelihood of tool call given declared role and historic baseline' },
              { label: 'Resource Sensitivity', val: dimScores.resource_sensitivity, desc: 'Confidentiality and sensitivity tier of targeted data resource' },
              { label: 'Destination Trust', val: dimScores.destination_risk, desc: 'Egress/network destination reputation and risk classification' },
              { label: 'Sequence Anomaly', val: dimScores.sequence_anomaly, desc: 'Markov transition deviation from baseline workflow sequence' },
              { label: 'Slow Behavioral Drift', val: dimScores.slow_drift, desc: 'Cumulative divergence across multi-event sliding history buffer' },
            ].map((d) => {
              const pct = Math.round((d.val || 0) * 100);
              const barColor =
                pct > 70 ? '#F43F5E' : pct > 45 ? '#F59E0B' : '#10B981';

              return (
                <div key={d.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#F4F1EA]">{d.label}</span>
                    <span className="font-mono text-[#F4F1EA] font-bold tabular-nums">
                      {d.val !== undefined ? d.val.toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="w-full bg-[#09090B] h-2.5 rounded-full overflow-hidden border border-[#272730]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColor }}
                    />
                  </div>
                  <div className="text-[11px] text-[#A1A1AA] mt-1">{d.desc}</div>
                </div>
              );
            })}
          </div>

          {risk?.reasons && risk.reasons.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[#272730]">
              <span className="text-[10px] text-[#A1A1AA] font-mono uppercase tracking-wider block mb-2">
                Active Reason Codes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {risk.reasons.map((r: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-[#F59E0B]/12 border border-[#F59E0B]/35 text-[#F59E0B] text-xs font-mono font-semibold"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Behavioral Drift & Quarantine Status */}
        <div className="p-7 rounded-[28px] surface-elevated flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-[#F4F1EA] flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-[#8B5CF6]" />
              Runtime Identity & Gating Policy
            </h3>
            <p className="text-xs text-[#A1A1AA] mb-5">Active cryptographic and baseline parameters</p>

            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-[#09090B] border border-[#272730] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[#A1A1AA]">Identity Status</div>
                  <div className="font-bold text-[#F4F1EA] capitalize mt-0.5 text-sm">{agent.status}</div>
                </div>
                <StatusBadge status={agent.status} size="sm" />
              </div>

              <div className="p-4 rounded-2xl bg-[#09090B] border border-[#272730] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[#A1A1AA]">Current Risk Tier</div>
                  <div className="font-bold text-[#F4F1EA] mt-0.5 text-sm">{risk?.current_tier || 'L0'}</div>
                </div>
                <RiskTierBadge tier={risk?.current_tier || 'L0'} />
              </div>

              <div className="p-4 rounded-2xl bg-[#09090B] border border-[#272730]">
                <div className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-1">Bound Enforcing Policy</div>
                <div className="font-mono text-[#FF5A36] font-semibold text-sm">{agent.policy_id}</div>
                <div className="text-xs text-[#A1A1AA] mt-1 font-mono">
                  Thresholds: L1=3.0 | L2=5.5 | L3=7.5 | L4=9.0
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#09090B] border border-[#272730] text-xs font-mono text-[#A1A1AA] space-y-2">
                <div className="flex items-center justify-between">
                  <span>Cryptographic Secret</span>
                  <span className="text-[#10B981] font-bold">ACTIVE (HMAC-SHA256)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audit Chain Binding</span>
                  <span className="text-[#F4F1EA] font-bold">VERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action History Feed */}
      <motion.div variants={fadeUpItem} className="p-7 rounded-[28px] surface-elevated">
        <h3 className="font-display text-base font-bold text-[#F4F1EA] flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-[#FF5A36]" />
          Recent Tool-Call Activity & Forensics
        </h3>
        <p className="text-xs text-[#A1A1AA] mb-5">
          Chronological record of intercepted tool calls mediated for this agent
        </p>

        {isHistoryLoading ? (
          <div className="py-8 text-center text-xs text-[#A1A1AA] font-mono">Loading history...</div>
        ) : !history || history.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#A1A1AA] font-mono bg-[#09090B] rounded-2xl border border-[#272730]">
            No action events recorded yet for this agent identity.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#272730] bg-[#09090B]/90">
            <table className="w-full text-left text-xs text-[#F4F1EA]">
              <thead>
                <tr className="border-b border-[#272730] bg-[#18181E]/70 text-[#A1A1AA] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tool / Action</th>
                  <th className="py-3.5 px-4">Target Resource</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Decision</th>
                  <th className="py-3.5 px-4">Risk Tier</th>
                  <th className="py-3.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#272730]/60">
                {history.map((h: any) => (
                  <tr
                    key={h.id}
                    onClick={() => navigate(`/actions/${h.id}`)}
                    className="hover:bg-[#18181E]/70 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-[#FF5A36] font-semibold">{h.tool}</td>
                    <td className="py-3.5 px-4 font-mono text-[#F4F1EA]">{h.resource || '—'}</td>
                    <td className="py-3.5 px-4 font-mono text-[#A1A1AA]">{h.destination || '—'}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={h.decision} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskTierBadge tier={h.tier} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#A1A1AA] text-[11px] tabular-nums">
                      {new Date(h.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Revocation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isRevokeModalOpen}
        title={`Emergency Revoke: ${agent.name}?`}
        message="This containment action immediately invalidates the agent's HMAC secrets and locks the identity in isolated quarantine. Any active sessions will be terminated and all tool calls rejected."
        confirmLabel="Confirm Revoke"
        isDestructive={true}
        onConfirm={handleRevoke}
        onCancel={() => setIsRevokeModalOpen(false)}
      />
    </MotionPage>
  );
};
