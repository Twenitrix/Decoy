import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Search,
  Plus,
  ShieldAlert,
  Power,
  ArrowUpRight
} from 'lucide-react';
import { useAgents, useRevokeAgent, useUpdateAgent } from '../hooks/useAgents';
import { usePolicies } from '../hooks/usePolicies';
import { Agent, AgentStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { agentsApi } from '../api/agents';
import { useQueryClient } from '@tanstack/react-query';
import {
  MotionPage,
  motion,
  AnimatePresence,
  fadeUpItem,
  modalBackdropVariant,
  modalPanelVariant
} from '../components/motion';

export const Agents: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [revokeModalAgent, setRevokeModalAgent] = useState<Agent | null>(null);

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

  if (isLoading) return <LoadingState message="Loading autonomous agent inventory..." />;
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
    <MotionPage className="space-y-7 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <motion.div
        variants={fadeUpItem}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 p-7 sm:p-8 rounded-[28px] surface-elevated editorial-frame"
      >
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-[#FF5A36]/15 text-[#FF5A36] border border-[#FF5A36]/35 font-semibold flex items-center gap-1.5">
              <Bot className="w-3 h-3 text-[#FF5A36]" />
              IDENTITY REGISTRY
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F4F1EA]">
            Autonomous Agent{' '}
            <span className="font-editorial italic font-normal text-[#FF5A36]">
              Fleet & Baselines
            </span>
          </h2>
          <p className="text-sm text-[#A1A1AA] mt-2 max-w-2xl leading-relaxed">
            Registry of autonomous agent identities governed by pre-execution policy gating, role-conditioned behavioral baselines, and credential isolation.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#F4F1EA] hover:bg-white text-[#09090B] rounded-full text-xs font-bold shadow-lg transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Agent</span>
        </motion.button>
      </motion.div>

      {/* Filter and Search Bar */}
      <motion.div
        variants={fadeUpItem}
        className="p-4 rounded-2xl surface-elevated flex flex-col md:flex-row items-center justify-between gap-3"
      >
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#A1A1AA] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search agents by name, ID, or declared role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] placeholder-[#A1A1AA]/60 focus:outline-none focus:border-[#FF5A36]"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
          >
            <option value="">All Roles</option>
            <option value="Financial Auditor">Financial Auditor</option>
            <option value="Procurement Specialist">Procurement Specialist</option>
            <option value="Support Agent">Support Agent</option>
            <option value="DevOps Automation">DevOps Automation</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </motion.div>

      {/* Agents List Grid */}
      {filteredAgents.length === 0 ? (
        <motion.div variants={fadeUpItem}>
          <EmptyState
            icon={Bot}
            title="No agents found"
            description="No agent identities match the current search filters."
          />
        </motion.div>
      ) : (
        <motion.div
          variants={fadeUpItem}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filteredAgents.map((agent, idx) => (
            <motion.div
              key={agent.id}
              whileHover={{ y: -3 }}
              className="p-6 rounded-3xl surface-elevated surface-interactive flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#18181E] border border-[#272730] flex items-center justify-center font-mono text-xs font-bold text-[#FF5A36]">
                      0{idx + 1}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-[#F4F1EA]">
                        {agent.name}
                      </h3>
                      <p className="text-xs text-[#A1A1AA] font-medium mt-0.5">{agent.role}</p>
                    </div>
                  </div>
                  <StatusBadge status={agent.status} size="sm" />
                </div>

                <div className="space-y-2 py-4 border-y border-[#272730] text-xs">
                  <div className="flex items-center justify-between text-[#A1A1AA] font-mono text-[11px]">
                    <span>Identity ID</span>
                    <span className="text-[#F4F1EA] font-semibold">{agent.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#A1A1AA] text-[11px]">
                    <span>Bound Policy</span>
                    <span className="font-mono text-[#FF5A36]">
                      {agent.policy_id} ({agent.policy_version || 'v1'})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#A1A1AA] text-[11px]">
                    <span>Evaluated Actions</span>
                    <span className="font-mono text-[#F4F1EA] tabular-nums font-bold">
                      {agent.action_count || 0}
                    </span>
                  </div>
                  {agent.declared_task && (
                    <div className="pt-2 text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">
                      <span className="text-[#F4F1EA]/80 font-medium">Objective: </span>
                      {agent.declared_task}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-5">
                <button
                  onClick={() => navigate(`/agents/${agent.id}`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#18181E] hover:bg-[#22222A] border border-[#272730] text-xs font-bold text-[#F4F1EA] transition-all"
                >
                  <span>Telemetry Profile</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#FF5A36]" />
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(agent)}
                    title={agent.status === 'active' ? 'Suspend Agent' : 'Activate Agent'}
                    className={`p-2 rounded-xl border transition-colors ${
                      agent.status === 'active'
                        ? 'border-[#F59E0B]/35 text-[#F59E0B] hover:bg-[#F59E0B]/10'
                        : 'border-[#10B981]/35 text-[#10B981] hover:bg-[#10B981]/10'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setRevokeModalAgent(agent)}
                    title="Emergency Revoke Credentials"
                    className="p-2 rounded-xl border border-[#F43F5E]/35 text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Revocation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!revokeModalAgent}
        title={`Revoke Credentials: ${revokeModalAgent?.name}?`}
        message="This is a critical containment action (L4). It immediately invalidates the agent's HMAC signing secrets and transitions the identity to isolated status. Any subsequent tool calls will be immediately blocked."
        confirmLabel="Confirm Emergency Revoke"
        isDestructive={true}
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeModalAgent(null)}
      />

      {/* Register Agent Modal */}
      <AnimatePresence>
        {isCreateOpen && (
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
              className="surface-elevated rounded-3xl p-7 max-w-lg w-full shadow-2xl"
            >
              <h3 className="font-display text-lg font-bold text-[#F4F1EA] flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-[#FF5A36]" />
                Register Autonomous Agent Identity
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-1.5 mb-5 leading-relaxed">
                Registers an agent identity with a declared role and bound policy. Baseline behavioral models are automatically conditioned on the declared role.
              </p>

              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Procurement Negotiator Agent"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] focus:outline-none focus:border-[#FF5A36]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                    Declared Functional Role
                  </label>
                  <select
                    value={newAgentRole}
                    onChange={(e) => setNewAgentRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
                  >
                    <option value="Procurement Specialist">Procurement Specialist</option>
                    <option value="Support Agent">Support Agent</option>
                    <option value="Financial Auditor">Financial Auditor</option>
                    <option value="DevOps Automation">DevOps Automation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                    Enforcement Policy Binding
                  </label>
                  <select
                    value={newAgentPolicy}
                    onChange={(e) => setNewAgentPolicy(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
                  >
                    {policies?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                    Declared Task Context
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Processing vendor invoice matching and order queries."
                    value={newAgentTask}
                    onChange={(e) => setNewAgentTask(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] focus:outline-none focus:border-[#FF5A36] leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#272730]">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F1EA] hover:bg-[#18181E] rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-[#09090B] bg-[#FF5A36] hover:bg-[#ff6b4a] rounded-full shadow-md transition-all"
                  >
                    Confirm Registration
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionPage>
  );
};
