import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Search,
  RotateCcw,
  Bot
} from 'lucide-react';
import { useActions } from '../hooks/useActions';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { MotionPage, motion, fadeUpItem } from '../components/motion';

export const Actions: React.FC = () => {
  const navigate = useNavigate();

  const [agentId, setAgentId] = useState('');
  const [decision, setDecision] = useState('');
  const [tier, setTier] = useState('');
  const [tool, setTool] = useState('');
  const [search, setSearch] = useState('');

  const { data: actions, isLoading, error, refetch } = useActions({
    agent_id: agentId || undefined,
    decision: decision || undefined,
    tier: tier || undefined,
    tool: tool || undefined,
    search: search || undefined,
  });

  const handleResetFilters = () => {
    setAgentId('');
    setDecision('');
    setTier('');
    setTool('');
    setSearch('');
  };

  if (isLoading) return <LoadingState message="Querying mediated action events..." />;
  if (error) return <ErrorState onRetry={() => refetch()} />;

  return (
    <MotionPage className="space-y-7 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <motion.div
        variants={fadeUpItem}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 p-7 sm:p-8 rounded-[28px] surface-elevated editorial-frame"
      >
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-[#FF5A36]/15 text-[#FF5A36] border border-[#FF5A36]/35 font-semibold flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[#FF5A36]" />
              EVENT FORENSICS
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F4F1EA]">
            Action Explorer &{' '}
            <span className="font-editorial italic font-normal text-[#FF5A36]">
              Telemetry Stream
            </span>
          </h2>
          <p className="text-sm text-[#A1A1AA] mt-2 max-w-2xl leading-relaxed">
            Forensic stream of every tool execution request mediated by the gateway control plane, with policy evaluation outcomes and cryptographic binding signatures.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#18181E] border border-[#272730] hover:border-[#FF5A36]/50 text-[#F4F1EA] rounded-full text-xs font-bold transition-all self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#FF5A36]" />
          <span>Refresh Stream</span>
        </motion.button>
      </motion.div>

      {/* Filter Toolbar */}
      <motion.div
        variants={fadeUpItem}
        className="p-4 rounded-2xl surface-elevated space-y-3"
      >
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by tool, resource, or agent identifier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] placeholder-[#A1A1AA]/60 focus:outline-none focus:border-[#FF5A36]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
            >
              <option value="">All Decisions</option>
              <option value="allowed">Allowed</option>
              <option value="observed">Observed</option>
              <option value="held_for_approval">Held for Approval</option>
              <option value="denied">Denied</option>
              <option value="restricted">Restricted</option>
              <option value="isolated">Isolated</option>
            </select>

            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
            >
              <option value="">All Tiers</option>
              <option value="L0">L0 (Allow)</option>
              <option value="L1">L1 (Observe)</option>
              <option value="L2">L2 (Step-up)</option>
              <option value="L3">L3 (Restrict)</option>
              <option value="L4">L4 (Isolate)</option>
            </select>

            <select
              value={tool}
              onChange={(e) => setTool(e.target.value)}
              className="px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
            >
              <option value="">All Tools</option>
              <option value="read_file">read_file</option>
              <option value="query_database">query_database</option>
              <option value="edit_file">edit_file</option>
              <option value="send_email">send_email</option>
              <option value="call_external_api">call_external_api</option>
              <option value="execute_workflow">execute_workflow</option>
            </select>

            {(decision || tier || tool || search) && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs text-[#A1A1AA] hover:text-[#F4F1EA] transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Events Stream Table */}
      {!actions || actions.length === 0 ? (
        <motion.div variants={fadeUpItem}>
          <EmptyState
            icon={Activity}
            title="No action events found"
            description="No tool actions match the active query filters."
          />
        </motion.div>
      ) : (
        <motion.div
          variants={fadeUpItem}
          className="overflow-x-auto rounded-[28px] surface-elevated"
        >
          <table className="w-full text-left text-xs text-[#F4F1EA]">
            <thead>
              <tr className="border-b border-[#272730] bg-[#18181E]/70 text-[#A1A1AA] font-mono text-[11px] uppercase tracking-wider">
                <th className="py-4 px-5">Agent Identity</th>
                <th className="py-4 px-5">Tool / Action</th>
                <th className="py-4 px-5">Target Resource</th>
                <th className="py-4 px-5">Destination</th>
                <th className="py-4 px-5">Enforcement Decision</th>
                <th className="py-4 px-5">Risk Tier</th>
                <th className="py-4 px-5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#272730]/60">
              {actions.map((act) => (
                <tr
                  key={act.id}
                  onClick={() => navigate(`/actions/${act.id}`)}
                  className="hover:bg-[#18181E]/80 cursor-pointer transition-colors"
                >
                  <td className="py-4 px-5">
                    <div className="font-semibold text-[#F4F1EA] flex items-center gap-2 font-mono">
                      <Bot className="w-3.5 h-3.5 text-[#FF5A36]" />
                      <span>{act.agent_id}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="px-2.5 py-1 rounded-lg bg-[#18181E] border border-[#272730] font-mono text-[#FF5A36] font-semibold">
                      {act.tool}
                    </span>
                  </td>
                  <td className="py-4 px-5 font-mono text-[#F4F1EA]">{act.resource || '—'}</td>
                  <td className="py-4 px-5 font-mono text-[#A1A1AA]">{act.destination || '—'}</td>
                  <td className="py-4 px-5">
                    <StatusBadge status={act.decision} size="sm" />
                  </td>
                  <td className="py-4 px-5">
                    <RiskTierBadge tier={act.tier} />
                  </td>
                  <td className="py-4 px-5 text-right font-mono text-[#A1A1AA] text-[11px] tabular-nums">
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </MotionPage>
  );
};
