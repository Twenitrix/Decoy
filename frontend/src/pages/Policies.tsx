import React, { useState } from 'react';
import {
  FileCode,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  Layers,
  ChevronRight
} from 'lucide-react';
import { usePolicies, useCreatePolicy } from '../hooks/usePolicies';
import { policiesApi } from '../api/policies';
import { Policy } from '../types';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

export const Policies: React.FC = () => {
  const { data: policies, isLoading, error, refetch } = usePolicies();
  const createPolicyMutation = useCreatePolicy();

  // Policy Tester state
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [testTool, setTestTool] = useState('read_file');
  const [testResource, setTestResource] = useState('hr_salary_records');
  const [testDestination, setTestDestination] = useState('internal_erp');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Create Policy Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [allowedToolsStr, setAllowedToolsStr] = useState('read_file, query_database');
  const [allowedResourcesStr, setAllowedResourcesStr] = useState('public_docs, inventory');
  const [allowedDestinationsStr, setAllowedDestinationsStr] = useState('internal_erp');
  const [hardDenyField, setHardDenyField] = useState('resource');
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

  if (isLoading) return <LoadingState message="Loading deterministic policy specifications..." />;
  if (error) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileCode className="w-5 h-5 text-cyan-400" />
            Deterministic Policy Engine & Gate Rules
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mandatory authorization allowlists, explicit hard-denials, and probabilistic response tier thresholds.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-cyan-950 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Security Policy
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Policy List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
            Active Security Policies ({policies?.length || 0})
          </h3>

          <div className="space-y-2">
            {policies?.map((pol) => {
              const isSelected = activePolicy?.id === pol.id;

              return (
                <div
                  key={pol.id}
                  onClick={() => {
                    setSelectedPolicyId(pol.id);
                    setTestResult(null);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-950'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-100">{pol.name}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                      {pol.version}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Role: {pol.role}</div>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-mono">
                    <span>Tools: {pol.allowed_tools?.length || 0}</span>
                    <span>•</span>
                    <span>Hard Denies: {pol.hard_denies?.length || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Policy Inspection & Interactive Tester */}
        {activePolicy && (
          <div className="lg:col-span-2 space-y-6">
            {/* Policy Inspection Card */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100">{activePolicy.name}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Target Role: <span className="text-cyan-400 font-medium">{activePolicy.role}</span> | Policy ID:{' '}
                    <span className="font-mono text-slate-300">{activePolicy.id}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Version: {activePolicy.version}
                </span>
              </div>

              {/* Allowlists Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 font-medium block mb-1">Allowed Tools</span>
                  <div className="flex flex-wrap gap-1">
                    {activePolicy.allowed_tools?.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 font-medium block mb-1">Allowed Resources</span>
                  <div className="flex flex-wrap gap-1">
                    {activePolicy.allowed_resources?.map((r) => (
                      <span key={r} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 font-medium block mb-1">Allowed Destinations</span>
                  <div className="flex flex-wrap gap-1">
                    {activePolicy.allowed_destinations?.map((d) => (
                      <span key={d} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mandatory Hard Deny Rules */}
              <div>
                <span className="text-xs font-medium text-slate-300 block mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Mandatory Hard-Deny Rules (Deterministic Block Pre-ML)
                </span>
                <div className="space-y-1.5">
                  {activePolicy.hard_denies?.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/60 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-rose-400 font-bold">{rule.field}:</span>
                        <span className="text-slate-200 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                          {rule.pattern}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px] font-sans">
                        Reason: <span className="font-mono text-rose-300">{rule.reason}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thresholds */}
              <div className="pt-2 border-t border-slate-800 text-xs flex items-center gap-4 text-slate-400">
                <span className="font-medium text-slate-300">Tier Cutoffs:</span>
                {Object.entries(activePolicy.thresholds || {}).map(([tier, cut]) => (
                  <span key={tier} className="font-mono">
                    <strong className="text-cyan-400">{tier}</strong>: &ge;{cut}
                  </span>
                ))}
              </div>
            </div>

            {/* Interactive Policy Dry-Run Tester */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Play className="w-4 h-4 text-emerald-400" />
                    Interactive Policy Dry-Run Tester
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Test sample tool invocations against {activePolicy.name} without executing tools.
                  </p>
                </div>
              </div>

              <form onSubmit={handleRunTest} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Tool</label>
                  <input
                    type="text"
                    value={testTool}
                    onChange={(e) => setTestTool(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Resource</label>
                  <input
                    type="text"
                    value={testResource}
                    onChange={(e) => setTestResource(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Destination</label>
                  <input
                    type="text"
                    value={testDestination}
                    onChange={(e) => setTestDestination(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
                  />
                </div>

                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {isTesting ? 'Evaluating...' : 'Dry-Run Evaluation'}
                  </button>
                </div>
              </form>

              {/* Dry-Run Result Preview */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border mt-3 ${
                    testResult.allowed
                      ? 'bg-emerald-950/30 border-emerald-800/80'
                      : 'bg-rose-950/30 border-rose-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.allowed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span className="font-bold text-sm text-slate-100">
                      {testResult.allowed
                        ? 'PASS: Policy Allows Action to Proceed to Risk Scoring'
                        : 'MANDATORY DENY: Policy Violations Preempt ML Execution'}
                    </span>
                  </div>

                  {testResult.reasons && testResult.reasons.length > 0 && (
                    <div className="mt-2 text-xs space-y-1">
                      <span className="text-slate-400">Triggered Violations:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {testResult.reasons.map((r: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-mono border border-rose-800 text-[11px]"
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
        )}
      </div>

      {/* Create Policy Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-1">Create Security Policy</h3>
            <p className="text-xs text-slate-400 mb-4">
              Author deterministic permissions, allowlists, and explicit hard-denials.
            </p>

            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Analytics Engineer Policy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Scientist"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Allowed Tools (comma-separated)
                </label>
                <input
                  type="text"
                  value={allowedToolsStr}
                  onChange={(e) => setAllowedToolsStr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Allowed Resources (comma-separated)
                </label>
                <input
                  type="text"
                  value={allowedResourcesStr}
                  onChange={(e) => setAllowedResourcesStr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-rose-400 block">Initial Hard Deny Rule</span>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={hardDenyField}
                    onChange={(e) => setHardDenyField(e.target.value)}
                    className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200"
                  >
                    <option value="resource">resource</option>
                    <option value="tool">tool</option>
                    <option value="destination">destination</option>
                  </select>
                  <input
                    type="text"
                    value={hardDenyPattern}
                    onChange={(e) => setHardDenyPattern(e.target.value)}
                    className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 font-mono"
                    placeholder="*salary*"
                  />
                  <input
                    type="text"
                    value={hardDenyReason}
                    onChange={(e) => setHardDenyReason(e.target.value)}
                    className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 font-mono"
                    placeholder="REASON_CODE"
                  />
                </div>
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
                  Create Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
