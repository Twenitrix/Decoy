import React, { useState, useEffect } from 'react';
import {
  PlayCircle,
  CheckCircle2,
  Clock,
  Terminal,
  Sparkles,
  Zap
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAgents } from '../hooks/useAgents';
import { gatewayApi, ActionSimulationResponse } from '../api/gateway';
import { approvalsApi } from '../api/approvals';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { MotionPage, motion, fadeUpItem } from '../components/motion';

export const GatewaySimulator: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: agents } = useAgents();

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

  const handleApplyPreset = (preset: typeof presets[0]) => {
    let targetResource = preset.resource;
    let targetDest = preset.destination;
    let targetParams = preset.parameters;

    const current = agents?.find((a) => a.id === agentId);
    const isFinance = current && (current.role.toLowerCase().includes('financ') || current.role.toLowerCase().includes('audit'));

    if (preset.name.includes('Normal In-Role Action') && isFinance) {
      targetResource = 'account_statements';
      targetDest = 'internal bank account';
      targetParams = '{\n  "file_id": "statement_october.pdf"\n}';
    }

    setTool(preset.tool);
    setResource(targetResource);
    setDestination(targetDest);
    setParamsStr(targetParams);
    setIsTainted(preset.tainted);
    setSimulationResult(null);
    setErrorMsg(null);
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId) {
      setErrorMsg('Please select an agent identity.');
      return;
    }

    let parsedParams: Record<string, any> = {};
    try {
      parsedParams = JSON.parse(paramsStr || '{}');
    } catch (err: any) {
      setErrorMsg(`Invalid JSON parameters: ${err.message}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSimulationResult(null);

    try {
      const res = await gatewayApi.submitAction({
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
      setSimulationResult(res);
      queryClient.invalidateQueries();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with security gateway.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveQuarantined = async (approvalId: string) => {
    try {
      await approvalsApi.resolve(approvalId, {
        status: 'approved',
        reviewer_id: 'secops-simulator-operator',
        comment: 'Verified and authorized through live simulator pane.',
      });
      if (simulationResult) {
        setSimulationResult({
          ...simulationResult,
          status: 'allowed',
          tier: 'L0',
        });
      }
      queryClient.invalidateQueries();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const currentAgent = agents?.find((a) => a.id === agentId);

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
              <Sparkles className="w-3 h-3 text-[#FF5A36]" />
              INTERACTIVE DEMO SANDBOX
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F4F1EA]">
            Gateway Interception &{' '}
            <span className="font-editorial italic font-normal text-[#FF5A36]">
              Policy Simulator
            </span>
          </h2>
          <p className="text-sm text-[#A1A1AA] mt-2 max-w-2xl leading-relaxed">
            Dispatch tool-call requests directly against the pre-execution security gateway to observe real-time hard-policy checks, multi-dimensional ML anomaly scoring, and cryptographic action binding.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-full bg-[#09090B] border border-[#272730] flex items-center gap-2 self-start sm:self-auto font-mono text-xs text-[#F4F1EA]">
          <Zap className="w-3.5 h-3.5 text-[#FF5A36]" />
          <span>Full Mediation Enforced</span>
        </div>
      </motion.div>

      {/* Preset Scenarios Buttons */}
      <motion.div variants={fadeUpItem} className="p-5 rounded-3xl surface-elevated space-y-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#A1A1AA] block">
          Live Demonstration Scenarios
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {presets.map((preset, idx) => (
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="p-4 rounded-2xl bg-[#09090B] border border-[#272730] hover:border-[#FF5A36]/60 hover:bg-[#18181E] text-left transition-all group"
            >
              <div className="text-xs font-bold text-[#F4F1EA] group-hover:text-[#FF5A36] transition-colors">
                {preset.name}
              </div>
              <div className="text-[11px] text-[#A1A1AA] font-mono mt-1">
                {preset.tool} → {preset.resource}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Simulator Workspace: Left Form, Right Live Telemetry Output */}
      <motion.div variants={fadeUpItem} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Request Form (5 cols) */}
        <div className="lg:col-span-5 p-7 rounded-[28px] surface-elevated">
          <h3 className="font-display text-base font-bold text-[#F4F1EA] flex items-center gap-2 mb-1">
            <Terminal className="w-4 h-4 text-[#FF5A36]" />
            Agent Tool-Call Request Dispatcher
          </h3>
          <p className="text-xs text-[#A1A1AA] mb-5">
            Simulate an intercepted Model Context Protocol (MCP) or tool-execution event
          </p>

          <form onSubmit={handleSimulate} className="space-y-4">
            {/* Target Agent Selector */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                Target Agent Identity
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
              >
                {agents?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role}) — {a.status}
                  </option>
                ))}
              </select>
              {currentAgent && (
                <div className="mt-1.5 text-[11px] text-[#A1A1AA] flex items-center gap-2 font-mono">
                  <span>
                    Policy: <span className="text-[#FF5A36]">{currentAgent.policy_id}</span>
                  </span>
                  <span>•</span>
                  <span>
                    Status: <span className="text-[#F4F1EA] capitalize">{currentAgent.status}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Tool Selection */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                Invoked Tool Name
              </label>
              <select
                value={tool}
                onChange={(e) => setTool(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
              >
                <option value="read_file">read_file</option>
                <option value="query_database">query_database</option>
                <option value="execute_workflow">execute_workflow</option>
                <option value="send_email">send_email</option>
                <option value="call_external_api">call_external_api</option>
                <option value="edit_file">edit_file</option>
              </select>
            </div>

            {/* Target Resource */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                Target Resource
              </label>
              <input
                type="text"
                placeholder="e.g. general_ledger, salary_records, supplier_catalog"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
              />
            </div>

            {/* Target Destination */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                Network / Egress Destination
              </label>
              <input
                type="text"
                placeholder="e.g. internal_erp, external_anon_pastebin"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
              />
            </div>

            {/* JSON Parameters */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                Tool Call JSON Arguments
              </label>
              <textarea
                rows={4}
                value={paramsStr}
                onChange={(e) => setParamsStr(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl font-mono text-xs text-[#F4F1EA] focus:outline-none focus:border-[#FF5A36] leading-relaxed"
              />
            </div>

            {/* Checkboxes: Tainted & Dry-Run */}
            <div className="flex items-center gap-6 pt-1 text-xs">
              <label className="flex items-center gap-2 text-[#F4F1EA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTainted}
                  onChange={(e) => setIsTainted(e.target.checked)}
                  className="rounded border-[#272730] bg-[#09090B] text-[#F43F5E] focus:ring-0"
                />
                <span className="font-semibold text-[#F43F5E]">Tainted / Injected Context</span>
              </label>

              <label className="flex items-center gap-2 text-[#A1A1AA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDryRun}
                  onChange={(e) => setIsDryRun(e.target.checked)}
                  className="rounded border-[#272730] bg-[#09090B] text-[#FF5A36] focus:ring-0"
                />
                <span>Dry Run (No Adapter Exec)</span>
              </label>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/40 text-[#F43F5E] text-xs">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#FF5A36] hover:bg-[#ff6b4a] disabled:opacity-50 text-[#09090B] rounded-full text-xs font-bold shadow-[0_0_24px_-4px_rgba(255,90,54,0.45)] transition-all flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Evaluating via Security Gateway...' : 'Transmit Action Request'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Gateway Live Telemetry Response (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!simulationResult ? (
            <div className="h-full min-h-[460px] flex flex-col items-center justify-center p-8 rounded-[28px] surface-elevated text-center relative overflow-hidden">
              <div className="p-4 rounded-2xl bg-[#18181E] border border-[#272730] text-[#FF5A36] mb-4">
                <PlayCircle className="w-10 h-10 opacity-85" />
              </div>
              <h4 className="font-display text-base font-bold text-[#F4F1EA]">
                Gateway Telemetry Standby
              </h4>
              <p className="text-xs text-[#A1A1AA] max-w-sm mt-1.5 leading-relaxed">
                Configure an action on the left or select a preset to trigger pre-execution evaluation and observe decision tiers, drift attribution, and HMAC signatures.
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-7 rounded-[28px] surface-elevated space-y-5"
            >
              {/* Decision Outcome Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#272730]">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#A1A1AA] tracking-wider font-semibold block mb-1.5">
                    Gateway Enforcement Decision
                  </span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <StatusBadge status={simulationResult.status} />
                    <RiskTierBadge tier={simulationResult.tier} />
                    <span className="font-mono text-xs text-[#A1A1AA]">
                      Action ID:{' '}
                      <span className="text-[#FF5A36] font-semibold">{simulationResult.action_id}</span>
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono text-xs">
                  <div className="text-[#A1A1AA] text-[10px] uppercase">Execution</div>
                  <div
                    className={`font-bold mt-0.5 ${
                      simulationResult.executed ? 'text-[#10B981]' : 'text-[#F59E0B]'
                    }`}
                  >
                    {simulationResult.executed ? 'EXECUTED' : 'HELD / BLOCKED'}
                  </div>
                </div>
              </div>

              {/* L2 Step-Up Approval Prompt directly in Simulator */}
              {simulationResult.status === 'held_for_approval' && simulationResult.approval_id && (
                <div className="p-4 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#F59E0B] flex-shrink-0 animate-pulse" />
                    <div>
                      <div className="text-xs font-bold text-[#F4F1EA]">
                        Action Quarantined in Step-Up Approval Queue
                      </div>
                      <div className="text-[11px] text-[#A1A1AA]">
                        Authorized reviewer verification required
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      simulationResult.approval_id &&
                      handleApproveQuarantined(simulationResult.approval_id)
                    }
                    className="px-4 py-2 bg-[#10B981] hover:bg-[#0ea572] text-[#09090B] rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Simulate Human Approval
                  </button>
                </div>
              )}

              {/* Anomaly Score and Attribution Gauges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#09090B] border border-[#272730]">
                  <div className="text-[10px] font-mono uppercase text-[#A1A1AA]">
                    Composite Drift Anomaly Score
                  </div>
                  <div className="font-display text-3xl font-bold text-[#FF5A36] mt-1 tabular-nums">
                    {simulationResult.risk?.anomaly_score !== undefined
                      ? simulationResult.risk.anomaly_score.toFixed(2)
                      : '0.00'}{' '}
                    <span className="text-xs text-[#A1A1AA] font-mono font-normal">/ 10</span>
                  </div>
                  <div className="text-[11px] text-[#A1A1AA] mt-1 font-mono">
                    Model:{' '}
                    <span className="text-[#F4F1EA]">
                      {simulationResult.risk?.model_version || simulationResult.model_version}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#09090B] border border-[#272730] space-y-1.5">
                  <span className="text-[10px] font-mono text-[#A1A1AA] uppercase block">
                    Triggered Reason Codes
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(simulationResult.reasons || simulationResult.risk?.reasons || []).length > 0 ? (
                      (simulationResult.reasons || simulationResult.risk?.reasons || []).map((r, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-md bg-[#F59E0B]/12 border border-[#F59E0B]/35 text-[#F59E0B] font-mono text-[10px]"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#A1A1AA] font-mono text-[11px]">
                        Normal in-role baseline
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Multi-Dimensional Breakdown */}
              {simulationResult.risk?.dimension_scores && (
                <div className="p-4 rounded-2xl bg-[#09090B] border border-[#272730] space-y-3">
                  <span className="text-[10px] font-mono text-[#A1A1AA] uppercase block">
                    Feature Dimension Breakdown
                  </span>
                  <div className="space-y-2.5">
                    {Object.entries(simulationResult.risk.dimension_scores).map(
                      ([k, val]: [string, any]) => {
                        const num = Number(val) || 0;
                        const pct = Math.round(num * 100);
                        const barCol =
                          pct > 70 ? '#F43F5E' : pct > 45 ? '#F59E0B' : '#10B981';

                        return (
                          <div key={k} className="text-xs">
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-[#F4F1EA] capitalize">
                                {k.replace(/_/g, ' ')}
                              </span>
                              <span className="font-mono text-[#F4F1EA] font-semibold">
                                {num.toFixed(2)}
                              </span>
                            </div>
                            <div className="w-full bg-[#121216] h-2 rounded-full overflow-hidden border border-[#272730]">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                  backgroundColor: barCol,
                                }}
                              />
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {/* Policy & Model Metadata */}
              <div className="p-4 rounded-2xl bg-[#09090B] border border-[#272730] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#A1A1AA]">
                <div>
                  <span>Enforcement Policy:</span>{' '}
                  <span className="text-[#FF5A36] font-semibold">
                    {simulationResult.policy_version}
                  </span>
                </div>
                <div>
                  <span>Decision ID:</span>{' '}
                  <span className="text-[#F4F1EA]">{simulationResult.decision_id}</span>
                </div>
              </div>

              {/* Execution Adapter Output */}
              {simulationResult.execution_result && (
                <div className="p-4 rounded-2xl bg-[#09090B] border border-[#272730]">
                  <span className="text-[10px] font-mono text-[#A1A1AA] uppercase block mb-1.5">
                    Adapter Execution Dispatch Result
                  </span>
                  <pre className="p-3 bg-[#121216] rounded-xl border border-[#272730] font-mono text-[#10B981] text-[11px] overflow-x-auto max-h-36">
                    {JSON.stringify(simulationResult.execution_result, null, 2)}
                  </pre>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </MotionPage>
  );
};
