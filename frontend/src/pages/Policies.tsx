import React, { useState } from 'react';
import {
  FileCode,
  Plus,
  Play,
  AlertOctagon
} from 'lucide-react';
import { usePolicies, useCreatePolicy } from '../hooks/usePolicies';
import { policiesApi } from '../api/policies';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import {
  MotionPage,
  motion,
  AnimatePresence,
  fadeUpItem,
  modalBackdropVariant,
  modalPanelVariant
} from '../components/motion';

export const Policies: React.FC = () => {
  const { data: policies, isLoading, error, refetch } = usePolicies();
  const createPolicyMutation = useCreatePolicy();

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [testTool, setTestTool] = useState('read_file');
  const [testResource, setTestResource] = useState('hr_salary_records');
  const [testDestination, setTestDestination] = useState('internal_erp');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [allowedToolsStr, setAllowedToolsStr] = useState('read_file, query_database');
  const [allowedResourcesStr, setAllowedResourcesStr] = useState('public_docs, inventory');
  const [allowedDestinationsStr, setAllowedDestinationsStr] = useState('internal_erp');
  const [hardDenyField] = useState('resource');
  const [hardDenyPattern, setHardDenyPattern] = useState('*salary*');
  const [hardDenyReason, setHardDenyReason] = useState('SENSITIVE_RESOURCE_ACCESS');

  const activePolicy =
    policies?.find((p) => p.id === selectedPolicyId) || policies?.[0];

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePolicy) return;
    setIsTesting(true);
    try {
      const res = await policiesApi.test(activePolicy.id, {
        tool: testTool,
        resource: testResource || undefined,
        destination: testDestination || undefined,
      });
      setTestResult(res);
    } catch (err: any) {
      alert(`Policy test error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    const allowed_tools = allowedToolsStr.split(',').map((s) => s.trim()).filter(Boolean);
    const allowed_resources = allowedResourcesStr.split(',').map((s) => s.trim()).filter(Boolean);
    const allowed_destinations = allowedDestinationsStr.split(',').map((s) => s.trim()).filter(Boolean);

    createPolicyMutation.mutate(
      {
        name,
        role,
        allowed_tools,
        allowed_resources,
        allowed_destinations,
        hard_denies: [
          {
            field: hardDenyField,
            pattern: hardDenyPattern,
            reason: hardDenyReason,
          },
        ],
        thresholds: { L1: 3.0, L2: 5.5, L3: 7.5, L4: 9.0 },
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setName('');
          setRole('');
        },
      }
    );
  };

  if (isLoading) return <LoadingState message="Loading policy definitions..." />;
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
              <FileCode className="w-3 h-3 text-[#FF5A36]" />
              DETERMINISTIC SAFETY FLOOR
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F4F1EA]">
            Policy Engine &{' '}
            <span className="font-editorial italic font-normal text-[#FF5A36]">
              Hard Guardrails
            </span>
          </h2>
          <p className="text-sm text-[#A1A1AA] mt-2 max-w-2xl leading-relaxed">
            Role-Based Access Controls (RBAC) and Attribute-Based Access Controls (ABAC). Hard-deny violations reject immediately — ML models never override explicit hard denies.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#F4F1EA] hover:bg-white text-[#09090B] rounded-full text-xs font-bold shadow-lg transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Define New Policy</span>
        </motion.button>
      </motion.div>

      {/* Main Grid: Policy Browser & Real-time Policy Tester */}
      <motion.div variants={fadeUpItem} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Policy Selector & Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Policy Selector Pills */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            {policies?.map((p) => {
              const isSelected = activePolicy?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPolicyId(p.id);
                    setTestResult(null);
                  }}
                  className={`px-4 py-3 rounded-2xl text-xs font-medium border transition-all flex-shrink-0 text-left ${
                    isSelected
                      ? 'bg-[#FF5A36]/15 border-[#FF5A36] text-[#F4F1EA]'
                      : 'surface-elevated text-[#A1A1AA] hover:text-[#F4F1EA]'
                  }`}
                >
                  <div className="font-display font-bold text-sm text-[#F4F1EA]">{p.name}</div>
                  <div className="text-[11px] font-mono text-[#A1A1AA] mt-0.5">{p.role}</div>
                </button>
              );
            })}
          </div>

          {/* Active Policy Rules Inspector */}
          {activePolicy && (
            <div className="p-7 rounded-[28px] surface-elevated space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-[#272730]">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#F4F1EA]">
                    {activePolicy.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#A1A1AA] font-mono mt-1">
                    <span>
                      ID: <span className="text-[#FF5A36]">{activePolicy.id}</span>
                    </span>
                    <span>•</span>
                    <span>Version: {activePolicy.version}</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#10B981]/12 text-[#10B981] border border-[#10B981]/30">
                  ACTIVE POLICY
                </span>
              </div>

              {/* Allowed Tools */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A1A1AA] block mb-2">
                  Permitted Role Tools (Allowlist)
                </span>
                <div className="flex flex-wrap gap-2">
                  {activePolicy.allowed_tools.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 rounded-xl bg-[#09090B] border border-[#272730] text-[#FF5A36] text-xs font-mono font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Allowed Resources & Destinations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#A1A1AA] block mb-2">
                    Permitted Resources
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activePolicy.allowed_resources.map((r) => (
                      <span
                        key={r}
                        className="px-2.5 py-1 rounded-lg bg-[#09090B] border border-[#272730] text-[#F4F1EA] text-[11px] font-mono"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#A1A1AA] block mb-2">
                    Permitted Destinations
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activePolicy.allowed_destinations.map((d) => (
                      <span
                        key={d}
                        className="px-2.5 py-1 rounded-lg bg-[#09090B] border border-[#272730] text-[#F4F1EA] text-[11px] font-mono"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hard Denies Rules */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#F43F5E] block mb-2 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-[#F43F5E]" />
                  Mandatory Hard Deny Patterns (Non-Overridable)
                </span>
                <div className="space-y-2">
                  {activePolicy.hard_denies.map((hd, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-[#F43F5E]/10 border border-[#F43F5E]/30 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-[#09090B] text-[#F43F5E] font-mono text-[10px] uppercase font-bold border border-[#F43F5E]/35">
                          {hd.field}
                        </span>
                        <span className="font-mono text-[#F4F1EA] font-bold">{hd.pattern}</span>
                      </div>
                      <span className="font-mono text-[#F43F5E] text-[11px]">{hd.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Tier Thresholds */}
              <div className="pt-4 border-t border-[#272730]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A1A1AA] block mb-2.5">
                  Graduated Response Thresholds
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs font-mono">
                  <div className="p-3 rounded-2xl bg-[#09090B] border border-[#272730]">
                    <div className="text-[#818CF8] font-bold">L1 (Observe)</div>
                    <div className="text-[#F4F1EA] font-bold mt-1 text-sm">{activePolicy.thresholds?.L1 || 3.0}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#09090B] border border-[#272730]">
                    <div className="text-[#F59E0B] font-bold">L2 (Step-Up)</div>
                    <div className="text-[#F4F1EA] font-bold mt-1 text-sm">{activePolicy.thresholds?.L2 || 5.5}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#09090B] border border-[#272730]">
                    <div className="text-[#FF5A36] font-bold">L3 (Restrict)</div>
                    <div className="text-[#F4F1EA] font-bold mt-1 text-sm">{activePolicy.thresholds?.L3 || 7.5}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#09090B] border border-[#272730]">
                    <div className="text-[#F43F5E] font-bold">L4 (Isolate)</div>
                    <div className="text-[#F4F1EA] font-bold mt-1 text-sm">{activePolicy.thresholds?.L4 || 9.0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real-time Policy Tester */}
        <div className="space-y-4">
          <div className="p-7 rounded-[28px] surface-elevated">
            <h3 className="font-display text-base font-bold text-[#F4F1EA] flex items-center gap-2 mb-1">
              <Play className="w-4 h-4 text-[#FF5A36]" />
              Real-Time Policy Dry-Run Tester
            </h3>
            <p className="text-xs text-[#A1A1AA] mb-5 leading-relaxed">
              Verify deterministic enforcement against{' '}
              <span className="text-[#FF5A36] font-mono">{activePolicy?.name}</span> before deployment.
            </p>

            <form onSubmit={handleRunTest} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                  Tool Name
                </label>
                <input
                  type="text"
                  value={testTool}
                  onChange={(e) => setTestTool(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                  Target Resource
                </label>
                <input
                  type="text"
                  value={testResource}
                  onChange={(e) => setTestResource(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                  Target Destination
                </label>
                <input
                  type="text"
                  value={testDestination}
                  onChange={(e) => setTestDestination(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
                />
              </div>

              <button
                type="submit"
                disabled={isTesting}
                className="w-full mt-2 py-3 bg-[#FF5A36] hover:bg-[#ff6b4a] text-[#09090B] rounded-full text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isTesting ? 'Evaluating Guardrails...' : 'Execute Policy Dry-Run'}</span>
              </button>
            </form>

            {/* Test Results Output */}
            {testResult && (
              <div className="mt-5 pt-5 border-t border-[#272730] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#A1A1AA] font-mono">Test Verdict</span>
                  <span
                    className={`font-mono font-bold px-3 py-1 rounded-full border text-xs ${
                      testResult.passed
                        ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
                        : 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/40'
                    }`}
                  >
                    {testResult.passed ? 'PASSED (ALLOWED)' : 'DENIED (VIOLATION)'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#09090B] border border-[#272730] space-y-1 font-mono text-[11px]">
                  <div>
                    Decision: <span className="text-[#FF5A36] font-semibold">{testResult.decision}</span>
                  </div>
                  <div>
                    Risk Tier: <span className="text-[#F4F1EA] font-semibold">{testResult.tier}</span>
                  </div>
                </div>

                {testResult.reasons && testResult.reasons.length > 0 && (
                  <div>
                    <span className="text-[10px] font-mono text-[#A1A1AA] uppercase block mb-1.5">
                      Violations / Reasons
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {testResult.reasons.map((r: string, i: number) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-md bg-[#F43F5E]/15 border border-[#F43F5E]/35 text-[#F43F5E] font-mono text-[10px]"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Define Policy Modal */}
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
                <FileCode className="w-5 h-5 text-[#FF5A36]" />
                Define Deterministic Guardrail Policy
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-1.5 mb-5 leading-relaxed">
                Define allowed tools, resources, destinations, and hard-deny patterns enforced strictly before ML inference.
              </p>

              <form onSubmit={handleCreatePolicy} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1">
                    Policy Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Financial Payment Policy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] focus:outline-none focus:border-[#FF5A36]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1">
                    Target Functional Role
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Financial Auditor"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] focus:outline-none focus:border-[#FF5A36]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1">
                    Allowed Tools (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={allowedToolsStr}
                    onChange={(e) => setAllowedToolsStr(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1">
                      Allowed Resources
                    </label>
                    <input
                      type="text"
                      value={allowedResourcesStr}
                      onChange={(e) => setAllowedResourcesStr(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1">
                      Allowed Destinations
                    </label>
                    <input
                      type="text"
                      value={allowedDestinationsStr}
                      onChange={(e) => setAllowedDestinationsStr(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1">
                    Hard Deny Pattern
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Pattern e.g. *salary*"
                      value={hardDenyPattern}
                      onChange={(e) => setHardDenyPattern(e.target.value)}
                      className="px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
                    />
                    <input
                      type="text"
                      placeholder="Reason code"
                      value={hardDenyReason}
                      onChange={(e) => setHardDenyReason(e.target.value)}
                      className="px-3.5 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
                    />
                  </div>
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
                    Create Policy
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
