import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Search,
  Filter,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  RotateCcw
} from 'lucide-react';
import { useActions } from '../hooks/useActions';
import { ActionEvent } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Action Explorer & Event Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, and inspect every tool request intercepted by the pre-execution security gateway.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Refresh Feed
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by tool, resource, or agent ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
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
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
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
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Tools</option>
              <option value="read_file">read_file</option>
              <option value="query_database">query_database</option>
              <option value="call_external_api">call_external_api</option>
              <option value="send_email">send_email</option>
              <option value="execute_workflow">execute_workflow</option>
            </select>

            {(decision || tier || tool || search || agentId) && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Table */}
      {!actions || actions.length === 0 ? (
        <EmptyState
          title="No action events match criteria"
          description="Adjust your search filters or simulate a tool request via Gateway Simulator."
          actionLabel="Simulate Action"
          onAction={() => navigate('/simulator')}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Agent ID</th>
                <th className="px-4 py-3.5">Tool / Action</th>
                <th className="px-4 py-3.5">Resource / Destination</th>
                <th className="px-4 py-3.5">Decision</th>
                <th className="px-4 py-3.5">Risk Tier</th>
                <th className="px-4 py-3.5">Reason Codes</th>
                <th className="px-4 py-3.5">Executed?</th>
                <th className="px-4 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {actions.map((act) => (
                <tr
                  key={act.id}
                  onClick={() => navigate(`/actions/${act.id}`)}
                  className="hover:bg-slate-850/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-400">
                    {new Date(act.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-cyan-400">{act.agent_id}</td>
                  <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-100">
                    {act.tool}
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    <span className="text-slate-200">{act.resource || '—'}</span>
                    {act.destination && (
                      <span className="text-slate-500 block text-[11px]">→ {act.destination}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={act.decision} size="sm" />
                  </td>
                  <td className="px-4 py-3.5">
                    <RiskTierBadge tier={act.tier} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {act.reason_codes && act.reason_codes.length > 0 ? (
                        act.reason_codes.slice(0, 2).map((r, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]"
                          >
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        act.executed
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                          : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                      }`}
                    >
                      {act.executed ? 'YES' : 'NO'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/actions/${act.id}`);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
