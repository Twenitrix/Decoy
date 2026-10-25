import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Search,
  Filter,
  Plus,
  ShieldAlert,
  Power,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useAgents, useRevokeAgent, useUpdateAgent } from '../hooks/useAgents';
import { usePolicies } from '../hooks/usePolicies';
import { Agent, AgentStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { agentsApi } from '../api/agents';
import { useQueryClient } from '@tanstack/react-query';

export const Agents: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Confirmation dialog state for Revoke / Suspend
  const [revokeModalAgent, setRevokeModalAgent] = useState<Agent | null>(null);

  // New Agent Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('Support Agent');
  const [newAgentTask, setNewAgentTask] = useState('');
  const [newAgentPolicy, setNewAgentPolicy] = useState('pol-support-v1');

  const { data: agents, isLoading, error, refetch } = useAgents({
    role: roleFilter || undefined,
    status: statusFilter || undefined,
  });
  const { data: policies } = usePolicies();

  const revokeMutation = useRevokeAgent();
  const updateMutation = useUpdateAgent();

  const handleRevokeConfirm = () => {
    if (!revokeModalAgent) return;
    revokeMutation.mutate(revokeModalAgent.id, {
      onSuccess: () => {
        setRevokeModalAgent(null);
      },
    });
  };

  const handleToggleStatus = (agent: Agent) => {
    const nextStatus: AgentStatus = agent.status === 'active' ? 'suspended' : 'active';
    updateMutation.mutate({
      id: agent.id,
      updates: { status: nextStatus },
    });
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await agentsApi.create({
        name: newAgentName,
        role: newAgentRole,
        declared_task: newAgentTask,
        policy_id: newAgentPolicy,
      });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setIsCreateOpen(false);
      setNewAgentName('');
      setNewAgentTask('');
    } catch (err: any) {
      alert(`Error creating agent: ${err.message}`);
    }
  };

  if (isLoading) return <LoadingState message="Loading agent inventory..." />;
  if (error) return <ErrorState onRetry={() => refetch()} />;

  const filteredAgents = (agents || []).filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = a.name.toLowerCase().includes(q);
      const matchId = a.id.toLowerCase().includes(q);
      const matchRole = a.role.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchRole) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            Agent Registry & Identity Inventory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registered autonomous processes, assigned security policies, risk state, and identity revocation.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-cyan-950 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Register New Agent
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by agent name, ID, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Roles</option>
            <option value="Procurement Specialist">Procurement Specialist</option>
            <option value="Support Agent">Support Agent</option>
            <option value="Financial Auditor">Financial Auditor</option>
            <option value="DevOps Automation">DevOps Automation</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Agents Table */}
      {filteredAgents.length === 0 ? (
        <EmptyState
          title="No agents match query"
          description="Try clearing search filters or registering a new agent."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                <th className="px-4 py-3.5">Agent Details</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Policy / Version</th>
                <th className="px-4 py-3.5">Risk Indicator</th>
                <th className="px-4 py-3.5">Actions Evaluated</th>
                <th className="px-4 py-3.5">Last Seen</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-slate-850/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-100 flex items-center gap-2">
                      <span>{agent.name}</span>
                    </div>
                    <div className="text-[11px] font-mono text-cyan-400/80">{agent.id}</div>
                    {agent.declared_task && (
                      <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                        {agent.declared_task}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-300">{agent.role}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={agent.status} size="sm" />
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs">
                    <span className="text-slate-300">{agent.policy_id}</span>
                    <span className="ml-1 text-[11px] text-slate-500">({agent.policy_version || 'v1'})</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <RiskTierBadge tier={agent.current_risk_tier || 'L0'} />
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-300">
                    {agent.action_count ?? 0}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-400">
                    {agent.last_seen_at
                      ? new Date(agent.last_seen_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/agents/${agent.id}`)}
                        title="View Detailed Telemetry & Risk Trend"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(agent)}
                        title={agent.status === 'active' ? 'Suspend Agent' : 'Activate Agent'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          agent.status === 'active'
                            ? 'text-slate-400 hover:text-amber-300 hover:bg-amber-950/40'
                            : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setRevokeModalAgent(agent)}
                        title="Revoke Credentials with Confirmation"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Revocation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(revokeModalAgent)}
        title="Revoke Agent Credentials & Suspend"
        message={`Are you sure you want to revoke credentials and suspend '${revokeModalAgent?.name}' (${revokeModalAgent?.id})? Any pending authorization tokens will be invalidated and future tool calls will be immediately rejected.`}
        confirmLabel="Revoke Credentials"
        isDestructive={true}
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeModalAgent(null)}
      />

      {/* Register Agent Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-1">Register New AI Agent</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add an autonomous agent process to the security gateway registry.
            </p>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Invoicing Assistant"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={newAgentRole}
                  onChange={(e) => setNewAgentRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Procurement Specialist">Procurement Specialist</option>
                  <option value="Support Agent">Support Agent</option>
                  <option value="Financial Auditor">Financial Auditor</option>
                  <option value="DevOps Automation">DevOps Automation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Policy</label>
                <select
                  value={newAgentPolicy}
                  onChange={(e) => setNewAgentPolicy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {policies?.map((pol) => (
                    <option key={pol.id} value={pol.id}>
                      {pol.name} ({pol.id})
                    </option>
                  )) || (
                    <option value="pol-support-v1">pol-support-v1</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Declared Task Scope</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verify pending invoices against purchase orders"
                  value={newAgentTask}
                  onChange={(e) => setNewAgentTask(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg shadow-sm"
                >
                  Register Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
