import React, { useState, useEffect } from 'react';
import {
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Activity,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAgents } from '../hooks/useAgents';
import { gatewayApi, ActionSimulationResponse } from '../api/gateway';
import { approvalsApi } from '../api/approvals';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';

export const GatewaySimulator: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: agents } = useAgents();

  // Preset scenarios for instant testing
  const presets = [
    {
      name: 'Normal In-Role Action (L0 Allow)',
      tool: 'read_file',
      resource: 'supplier_catalog',
      destination: 'internal_erp',
      parameters: '{\n  "file_id": "catalog_2026.json"\n}',
      tainted: false,
    },
    {
      name: 'Mandatory Hard Policy Violation (L3 Deny)',
      tool: 'read_file',
      resource: 'hr_salary_records',
      destination: 'internal_erp',
      parameters: '{\n  "file_id": "executive_payroll.xlsx"\n}',
      tainted: false,
    },
    {
      name: 'High-Impact Operation (L2 Step-Up Approval)',
      tool: 'execute_workflow',
      resource: 'general_ledger',
      destination: 'internal_compliance_vault',
      parameters: '{\n  "workflow_id": "wf-q1-tax-close"\n}',
      tainted: false,
    },
    {
      name: 'Suspicious Tainted Exfiltration (L4 Isolate)',
      tool: 'call_external_api',
      resource: 'credentials_vault',
      destination: 'external_anon_pastebin',
      parameters: '{\n  "endpoint": "https://pastebin.com/api/post",\n  "key": "secret_token_abc"\n}',
      tainted: true,
    },
  ];

  const [agentId, setAgentId] = useState('');
  const [tool, setTool] = useState('read_file');
  const [resource, setResource] = useState('account_statements');
  const [destination, setDestination] = useState('internal bank account');
  const [paramsStr, setParamsStr] = useState('{\n  "file_id": "statement_october.pdf"\n}');
  const [isTainted, setIsTainted] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simulationResult, setSimulationResult] = useState<ActionSimulationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Synchronize agentId with loaded agents
  useEffect(() => {
    if (agents && agents.length > 0) {
      const active = agents.find((a) => a.id === agentId) || agents[0];
      if (!agentId || !agents.some((a) => a.id === agentId)) {
        setAgentId(active.id);
      }
      const roleLower = active.role.toLowerCase();
      if ((roleLower.includes('financ') || roleLower.includes('audit')) && resource === 'supplier_catalog') {
        setResource('account_statements');
        setDestination('internal bank account');
        setParamsStr('{\n  "file_id": "statement_october.pdf"\n}');
      }
    }
  }, [agents, agentId, resource]);

  const applyPreset = (p: typeof presets[0]) => {
    let targetResource = p.resource;
    let targetDest = p.destination;
    let targetParams = p.parameters;

    const currentAgent = agents?.find((a) => a.id === agentId);
    const isFinance = currentAgent && (currentAgent.role.toLowerCase().includes('financ') || currentAgent.role.toLowerCase().includes('audit'));

    // Adapt normal in-role action to the active agent
    if (p.name.includes('Normal In-Role Action') && isFinance) {
      targetResource = 'account_statements';
      targetDest = 'internal bank account';
      targetParams = '{\n  "file_id": "statement_october.pdf"\n}';
    }

    setTool(p.tool);
    setResource(targetResource);
    setDestination(targetDest);
    setParamsStr(targetParams);
    setIsTainted(p.tainted);
    setSimulationResult(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSimulationResult(null);

    if (!agentId) {
      setErrorMsg('No agent selected. Please register or select an active agent.');
      setIsSubmitting(false);
      return;
    }

    let parsedParams = {};
    try {
      parsedParams = JSON.parse(paramsStr);
    } catch {
      setErrorMsg('Invalid JSON in parameters field.');
      setIsSubmitting(false);
      return;
    }

    try {
      const resp = await gatewayApi.submitAction({
        agent_id: agentId,
        session_id: `sim-sess-${Date.now().toString(36)}`,
        task_id: 'simulator-manual-task',
        action: {
          tool,
          resource: resource || undefined,
          destination: destination || undefined,
          parameters: parsedParams,
          provenance_tags: {
            tainted: isTainted,
            source_untrusted: isTainted,
          },
        },
        dry_run: isDryRun,
      });

      setSimulationResult(resp);
      // Invalidate queries so dashboard, actions, and approvals update immediately!
      queryClient.invalidateQueries();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gateway communication failure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isResolving, setIsResolving] = useState(false);

  const handleResolveApproval = async (approvalId: string, status: 'approved' | 'rejected') => {
    setIsResolving(true);
    try {
      await approvalsApi.resolve(approvalId, {
        status,
        reviewer_id: 'secops-operator',
        comment: `Directly resolved via Gateway Simulator (${status})`,
      });

      // Update the local simulation card to reflect approval!
      setSimulationResult((prev) =>
        prev
          ? {
              ...prev,
              status: status === 'approved' ? 'allowed' : 'denied',
              executed: status === 'approved',
              execution_result:
                status === 'approved'
                  ? { status: 'success', message: 'Action approved and tool successfully executed by gateway adapter.' }
                  : null,
            }
          : null
      );
      queryClient.invalidateQueries();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resolve approval.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-cyan-400" />
          Interactive Pre-Execution Gateway Simulator
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Submit live tool requests to the pre-execution security gateway to inspect policy gating,
          multi-dimension risk evaluation, tier assignment, and adapter execution.
        </p>
      </div>

      {/* Preset Quick Scenarios */}
      <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Quick Test Presets (Click to load):
        </span>
        <div className="flex flex-wrap gap-2">
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/60 text-xs text-slate-300 font-medium transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-200">Proposed Action Request Payload</h3>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-400">Target Agent</label>
              <span className="text-[11px] text-slate-500 font-mono">
                {agents?.length || 0} registered agents
              </span>
            </div>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {agents && agents.length > 0 ? (
                agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.role}) — {ag.id}
                  </option>
                ))
              ) : (
                <option value="">No registered agents found</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tool</label>
              <select
                value={tool}
                onChange={(e) => setTool(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="read_file">read_file</option>
                <option value="edit_file">edit_file</option>
                <option value="query_database">query_database</option>
                <option value="call_external_api">call_external_api</option>
                <option value="send_email">send_email</option>
                <option value="execute_workflow">execute_workflow</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Resource</label>
              <input
                type="text"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                placeholder="e.g. supplier_catalog"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Egress / Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. internal_erp or external_anon_pastebin"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Parameters JSON (Sensitive values auto-redacted in audit)
            </label>
            <textarea
              rows={4}
              value={paramsStr}
              onChange={(e) => setParamsStr(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isTainted}
                onChange={(e) => setIsTainted(e.target.checked)}
                className="rounded border-slate-700 text-cyan-600 focus:ring-0"
              />
              <span>Tainted Provenance (Untrusted Source)</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-950 transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {isSubmitting ? 'Processing Gateway...' : 'Submit to Security Gateway'}
            </button>
          </div>
        </form>

        {/* Right: Live Gateway Mediation Lifecycle & Result */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Gateway Mediation & Enforcement Result
          </h3>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2.5">
              <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!simulationResult && !errorMsg && (
            <div className="h-72 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
              <Zap className="w-8 h-8 text-slate-600 mb-2" />
              Submit an action request or choose a preset on the left to observe live pre-execution mediation.
            </div>
          )}

          {simulationResult && (
            <div className="space-y-4 text-xs">
              {/* Primary Status Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Final Decision</span>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={simulationResult.status} />
                    <RiskTierBadge tier={simulationResult.tier} />
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Adapter Status</span>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                      simulationResult.executed
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {simulationResult.executed ? 'TOOL EXECUTED' : 'EXECUTION WITHHELD'}
                  </span>
                </div>
              </div>

              {/* Instant Approval Action Banner if held */}
              {simulationResult.approval_id && simulationResult.status === 'held_for_approval' && (
                <div className="p-3.5 bg-amber-950/40 border border-amber-800/80 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-amber-200 block text-xs">
                        Action Withheld — Step-Up Approval Required
                      </span>
                      <span className="text-[10px] text-amber-400/80 font-mono">
                        Approval ID: {simulationResult.approval_id}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleResolveApproval(simulationResult.approval_id!, 'approved')}
                      disabled={isResolving}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isResolving ? 'Executing...' : 'Approve & Execute Now'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveApproval(simulationResult.approval_id!, 'rejected')}
                      disabled={isResolving}
                      className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Anomaly & Risk Breakdown */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-300">Risk Anomaly Score</span>
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    {simulationResult.risk.anomaly_score.toFixed(1)} / 10
                  </span>
                </div>

                {simulationResult.risk.dimension_scores && (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {Object.entries(simulationResult.risk.dimension_scores).map(([dim, val]) => (
                      <div key={dim} className="flex justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                        <span className="text-slate-400 capitalize">{dim.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-slate-200">{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reason Codes */}
              {simulationResult.reasons && simulationResult.reasons.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-slate-300 block">Evaluated Reason Codes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {simulationResult.reasons.map((r, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800/80 text-amber-300 font-mono text-[11px]"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Downstream Execution Output */}
              {simulationResult.execution_result && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-emerald-400 block">Tool Execution Result:</span>
                  <pre className="p-2.5 bg-slate-900/80 rounded-lg text-emerald-300 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(simulationResult.execution_result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
