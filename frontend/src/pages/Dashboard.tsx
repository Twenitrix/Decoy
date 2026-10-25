import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  ShieldX,
  AlertOctagon,
  Clock,
  Activity,
  Zap,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { metricsApi } from '../api/metrics';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

const TIER_COLORS: Record<string, string> = {
  L0: '#10b981', // emerald
  L1: '#06b6d4', // cyan
  L2: '#f59e0b', // amber
  L3: '#f97316', // orange
  L4: '#ef4444', // red
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => metricsApi.getDashboardSummary(),
    refetchInterval: 10000,
  });

  if (isLoading) return <LoadingState message="Fetching live gateway metrics..." />;
  if (error || !summary) return <ErrorState onRetry={() => refetch()} />;

  const tierChartData = Object.entries(summary.risk_tier_distribution || {}).map(
    ([tier, count]) => ({
      tier,
      count,
      color: TIER_COLORS[tier] || '#64748b',
    })
  );

  const decisionDistData = [
    { name: 'Allowed', value: summary.allowed_count, color: '#10b981' },
    { name: 'Held for Approval', value: summary.held_for_approval_count, color: '#f59e0b' },
    { name: 'Denied / Blocked', value: summary.denied_count, color: '#f97316' },
    { name: 'Isolated', value: summary.isolated_count, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / System Health Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Operations & Identity Drift Control Plane
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pre-execution policy gating, explainable risk scoring, and tool mediation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-cyan-400" />
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase font-mono">Gateway Latency</div>
              <div className="text-xs font-bold text-slate-200">
                p50: {summary.latency_summary.p50_ms}ms | p95: {summary.latency_summary.p95_ms}ms
              </div>
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-800/80 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-emerald-500 uppercase font-mono">Enforcement Mode</div>
              <div className="text-xs font-bold text-emerald-300">ACTIVE MEDIATION</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Agents</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{summary.active_agents}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            of {summary.total_agents} total registered
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Evaluated Actions</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {summary.total_actions_evaluated}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">All mediated events</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Allowed</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{summary.allowed_count}</div>
          <div className="text-[11px] text-slate-500 mt-1">Authorized & executed</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Held for Approval</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {summary.held_for_approval_count}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting reviewer</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Denied / Blocked</span>
            <ShieldX className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-400">{summary.denied_count}</div>
          <div className="text-[11px] text-slate-500 mt-1">Policy & risk blocks</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Isolated Agents</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-500">{summary.isolated_count}</div>
          <div className="text-[11px] text-slate-500 mt-1">Critical containment</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Tier Distribution Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Action Risk Tier Distribution
              </h3>
              <p className="text-xs text-slate-400">
                Actions evaluated across graduated response tiers (L0 to L4)
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="tier" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val} actions`, 'Evaluated']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {tierChartData.map((entry) => (
                    <Cell key={entry.tier} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tier Legend */}
          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300">L0 (Allow)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span className="text-slate-300">L1 (Observe)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-300">L2 (Step-up Approval)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-slate-300">L3 (Restrict / Block)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-slate-300">L4 (Isolate)</span>
            </div>
          </div>
        </div>

        {/* Decision Breakdown Pie */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Enforcement Decisions</h3>
            <p className="text-xs text-slate-400 mb-2">Outcome breakdown of evaluated actions</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {decisionDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={decisionDistData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {decisionDistData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">No decisions recorded yet.</div>
            )}
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-800 text-xs">
            {decisionDistData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="font-mono font-medium text-slate-200">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent High-Risk Events */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Recent High-Risk & Anomalous Events
            </h3>
            <p className="text-xs text-slate-400">
              Actions flagged with L2, L3, or L4 risk requiring investigation or intervention
            </p>
          </div>
          <button
            onClick={() => navigate('/actions')}
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            <span>View All in Action Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-mono">
                <th className="py-2.5 px-3">Agent</th>
                <th className="py-2.5 px-3">Tool / Action</th>
                <th className="py-2.5 px-3">Resource / Destination</th>
                <th className="py-2.5 px-3">Decision</th>
                <th className="py-2.5 px-3">Risk Tier</th>
                <th className="py-2.5 px-3">Reason Codes</th>
                <th className="py-2.5 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {summary.recent_high_risk_events.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => navigate(`/actions/${e.action_id}`)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-200">{e.agent_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{e.agent_id}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-cyan-300 font-medium">{e.tool}</td>
                  <td className="py-3 px-3">
                    <span className="text-slate-300">{e.resource || '—'}</span>
                    {e.destination && (
                      <span className="text-slate-500 block text-[11px]">→ {e.destination}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={e.status} size="sm" />
                  </td>
                  <td className="py-3 px-3">
                    <RiskTierBadge tier={e.tier} />
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {e.reasons?.slice(0, 2).map((r, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-400 text-[11px]">
                    {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
