import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Radio,
  ChevronDown
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
import { approvalsApi } from '../api/approvals';
import { StatusBadge } from '../components/StatusBadge';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import {
  MotionPage,
  motion,
  AnimatePresence,
  fadeUpItem,
  AnimatedNumber
} from '../components/motion';

const TIER_COLORS: Record<string, string> = {
  L0: '#10B981', // emerald safe
  L1: '#818CF8', // periwinkle observe
  L2: '#F59E0B', // amber step-up
  L3: '#FF5A36', // vermilion restrict
  L4: '#F43F5E', // crimson isolate
};

const TIER_META: Record<string, { title: string; subtitle: string; color: string }> = {
  L0: { title: 'L0 · Allow', subtitle: 'Baseline in-role execution', color: '#10B981' },
  L1: { title: 'L1 · Observe', subtitle: 'Low-amplitude drift logged', color: '#818CF8' },
  L2: { title: 'L2 · Step-Up', subtitle: 'Quarantined for human sign-off', color: '#F59E0B' },
  L3: { title: 'L3 · Restrict', subtitle: 'Hard-policy or high-drift block', color: '#FF5A36' },
  L4: { title: 'L4 · Isolate', subtitle: 'Identity credentials revoked', color: '#F43F5E' },
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => metricsApi.getDashboardSummary(),
    refetchInterval: 10000,
  });

  const { data: pendingApprovals } = useQuery({
    queryKey: ['pendingApprovalsDashboard'],
    queryFn: () => approvalsApi.list('pending'),
    refetchInterval: 10000,
  });

  const handleQuickResolve = async (approvalId: string, status: 'approved' | 'rejected') => {
    setResolvingId(approvalId);
    try {
      await approvalsApi.resolve(approvalId, {
        status,
        reviewer_id: 'SOC_COMMAND_OPERATOR',
        comment: `Quick-resolved (${status}) from Command Overview`,
      });
      queryClient.invalidateQueries();
      refetch();
    } catch (err: any) {
      alert(`Failed to resolve approval: ${err.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  if (isLoading) return <LoadingState message="Synchronizing autonomous agent control plane..." />;
  if (error || !summary) return <ErrorState onRetry={() => refetch()} />;

  const tierChartData = Object.entries(summary.risk_tier_distribution || {}).map(
    ([tier, count]) => ({
      tier,
      count,
      color: TIER_COLORS[tier] || '#A1A1AA',
    })
  );

  const decisionDistData = [
    { name: 'Allowed', value: summary.allowed_count, color: '#10B981' },
    { name: 'Step-Up Hold', value: summary.held_for_approval_count, color: '#F59E0B' },
    { name: 'Restricted', value: summary.denied_count, color: '#FF5A36' },
    { name: 'Isolated', value: summary.isolated_count, color: '#F43F5E' },
  ].filter((d) => d.value > 0);

  const totalEval = Math.max(summary.total_actions_evaluated, 1);
  const safeRatio = Math.round((summary.allowed_count / totalEval) * 100);
  const attentionCount =
    summary.held_for_approval_count + summary.denied_count + summary.isolated_count;
  const livePending = pendingApprovals || [];

  return (
    <MotionPage className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* SECTION 1: Editorial Asymmetric Hero & Security Posture Sculpture */}
      <motion.section
        variants={fadeUpItem}
        className="relative overflow-hidden rounded-[28px] surface-elevated p-7 sm:p-10 editorial-frame"
      >
        <div className="pointer-events-none absolute -top-32 right-12 w-[420px] h-[420px] rounded-full bg-[#FF5A36]/[0.08] blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 w-[360px] h-[360px] rounded-full bg-[#8B5CF6]/[0.07] blur-[90px]" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left 7 Cols: Editorial Headline & Live Operator Answer */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#FF5A36]/15 text-[#FF5A36] border border-[#FF5A36]/35">
                <Radio className="w-3 h-3 animate-pulse" />
                PRE-EXECUTION MEDIATION ACTIVE
              </span>
              <span className="text-xs font-mono text-[#A1A1AA]">
                p50 <strong className="text-[#F4F1EA]">{summary.latency_summary.p50_ms}ms</strong> · p95{' '}
                <strong className="text-[#F4F1EA]">{summary.latency_summary.p95_ms}ms</strong>
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold text-[#F4F1EA] leading-[1.08] tracking-tight">
                Autonomous Agent{' '}
                <span className="font-editorial italic font-normal text-[#FF5A36]">
                  Identity & Drift
                </span>{' '}
                Command
              </h1>
              <p className="text-sm sm:text-base text-[#A1A1AA] max-w-2xl leading-relaxed">
                Across <strong className="text-[#F4F1EA]">{summary.active_agents} active agents</strong>, the gateway has mediated{' '}
                <strong className="text-[#F4F1EA]">{summary.total_actions_evaluated} tool calls</strong>.{' '}
                {attentionCount > 0 ? (
                  <span>
                    <strong className="text-[#F59E0B]">{attentionCount} high-risk interceptions</strong> have been contained or queued for human verification.
                  </span>
                ) : (
                  <span>All evaluated operations are currently within declared role baselines.</span>
                )}
              </p>
            </div>

            {/* Architectural Telemetry Strip (No boxy cards — clean hairline columns) */}
            <div className="pt-4 border-t border-[#272730] grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#A1A1AA]">
                  ACTIVE FLEET
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-[#F4F1EA] mt-1 tabular-nums">
                  <AnimatedNumber value={summary.active_agents} />
                  <span className="text-sm font-mono text-[#A1A1AA] font-normal">
                    /{summary.total_agents}
                  </span>
                </div>
              </div>

              <div className="border-l border-[#272730] pl-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#10B981]">
                  ALLOWED (L0/L1)
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-[#10B981] mt-1 tabular-nums">
                  <AnimatedNumber value={summary.allowed_count} />
                </div>
              </div>

              <div className="border-l border-[#272730] pl-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#F59E0B]">
                  STEP-UP HOLD (L2)
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-[#F59E0B] mt-1 tabular-nums">
                  <AnimatedNumber value={summary.held_for_approval_count} />
                </div>
              </div>

              <div className="border-l border-[#272730] pl-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#FF5A36]">
                  BLOCKED / ISOLATED
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-[#FF5A36] mt-1 tabular-nums">
                  <AnimatedNumber value={summary.denied_count + summary.isolated_count} />
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Sculpted Security Posture Dial & Spectrum */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-3xl bg-[#09090B]/90 border border-[#272730] space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#A1A1AA] block">
                    GATEWAY POSTURE INDEX
                  </span>
                  <span className="font-display text-sm font-bold text-[#F4F1EA]">
                    Real-Time Mediation Integrity
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#10B981]/12 text-[#10B981] border border-[#10B981]/30 font-mono text-[10px] font-bold">
                  HMAC VERIFIED
                </span>
              </div>

              <div className="flex items-center gap-6">
                {/* Multi-Ring Concentric Posture Sculpture */}
                <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
                    <circle cx="65" cy="65" r="54" fill="none" stroke="#18181E" strokeWidth="10" />
                    <circle
                      cx="65"
                      cy="65"
                      r="54"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(safeRatio / 100) * 339} 339`}
                    />
                    <circle
                      cx="65"
                      cy="65"
                      r="40"
                      fill="none"
                      stroke="#FF5A36"
                      strokeWidth="3"
                      strokeDasharray={`${((100 - safeRatio) / 100) * 251} 251`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-display text-2xl font-bold text-[#F4F1EA] tabular-nums">
                      <AnimatedNumber value={safeRatio} suffix="%" />
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#A1A1AA]">
                      BASELINE
                    </span>
                  </div>
                </div>

                {/* Proportional Disposition Stack */}
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#A1A1AA]">Total Evaluated</span>
                      <span className="font-mono font-bold text-[#F4F1EA] tabular-nums">
                        {summary.total_actions_evaluated} calls
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#18181E] overflow-hidden flex p-0.5 gap-0.5">
                      <div
                        style={{ width: `${(summary.allowed_count / totalEval) * 100}%` }}
                        className="bg-[#10B981] h-full rounded-l-full transition-all duration-500"
                      />
                      <div
                        style={{ width: `${(summary.held_for_approval_count / totalEval) * 100}%` }}
                        className="bg-[#F59E0B] h-full transition-all duration-500"
                      />
                      <div
                        style={{ width: `${(summary.denied_count / totalEval) * 100}%` }}
                        className="bg-[#FF5A36] h-full transition-all duration-500"
                      />
                      <div
                        style={{ width: `${(summary.isolated_count / totalEval) * 100}%` }}
                        className="bg-[#F43F5E] h-full rounded-r-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                    <div className="p-2 rounded-xl bg-[#121216] border border-[#272730] flex items-center justify-between">
                      <span className="text-[#A1A1AA]">Denied L3</span>
                      <span className="text-[#FF5A36] font-bold">{summary.denied_count}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#121216] border border-[#272730] flex items-center justify-between">
                      <span className="text-[#A1A1AA]">Isolated L4</span>
                      <span className="text-[#F43F5E] font-bold">{summary.isolated_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* SECTION 2: Focal Risk-Tier Architecture & Enforcement Disposition */}
      <motion.section
        variants={fadeUpItem}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* Left 8 Cols: Graduated Response Tier Telemetry (L0-L4) */}
        <div className="lg:col-span-8 p-7 rounded-[28px] surface-elevated flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#FF5A36] mb-1">
                GRADUATED RESPONSE SPECTRUM
              </div>
              <h3 className="font-display text-xl font-bold text-[#F4F1EA]">
                Action Risk-Tier Distribution (L0 – L4)
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Hybrid deterministic hard-policy gating combined with multi-dimensional behavioral drift scoring
              </p>
            </div>
            <button
              onClick={() => navigate('/model-evaluation')}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-mono text-[#F4F1EA] hover:text-[#FF5A36] transition-colors"
            >
              <span>Model Benchmarks</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Recharts Bar Canvas */}
            <div className="md:col-span-7 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tierChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="tier"
                    stroke="#A1A1AA"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#272730' }}
                  />
                  <YAxis
                    stroke="#A1A1AA"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 90, 54, 0.06)' }}
                    contentStyle={{
                      backgroundColor: '#121216',
                      borderColor: '#272730',
                      borderRadius: '16px',
                      color: '#F4F1EA',
                      fontSize: '12px',
                      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.8)',
                    }}
                    formatter={(val: any) => [`${val} evaluated actions`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[10, 10, 3, 3]} maxBarSize={48}>
                    {tierChartData.map((entry) => (
                      <Cell key={entry.tier} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Vertical Architectural Tier Breakdown Rails */}
            <div className="md:col-span-5 space-y-2.5">
              {(['L0', 'L1', 'L2', 'L3', 'L4'] as const).map((tierKey) => {
                const meta = TIER_META[tierKey];
                const count = summary.risk_tier_distribution?.[tierKey] ?? 0;
                const pct = Math.round((count / totalEval) * 100);
                return (
                  <div
                    key={tierKey}
                    className="p-3 rounded-2xl bg-[#09090B]/70 border border-[#272730] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-[#F4F1EA] flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.title}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#F4F1EA] tabular-nums">
                        {count} <span className="text-[#A1A1AA] font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#18181E] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(pct, count > 0 ? 6 : 0)}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-[#A1A1AA]">{meta.subtitle}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Enforcement Disposition Radial */}
        <div className="lg:col-span-4 p-7 rounded-[28px] surface-elevated flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B5CF6] mb-1">
              GATEWAY DISPOSITION
            </div>
            <h3 className="font-display text-xl font-bold text-[#F4F1EA]">
              Enforcement Outcomes
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Final pre-execution adapter authorization split
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center my-2 relative">
            {decisionDistData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={decisionDistData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={90}
                      paddingAngle={4}
                      stroke="#121216"
                      strokeWidth={3}
                    >
                      {decisionDistData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121216',
                        borderColor: '#272730',
                        borderRadius: '14px',
                        color: '#F4F1EA',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-3xl font-bold text-[#F4F1EA] tabular-nums">
                    {summary.total_actions_evaluated}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#A1A1AA]">
                    MEDIATED
                  </span>
                </div>
              </>
            ) : (
              <div className="text-xs text-[#A1A1AA] font-mono">No decisions recorded yet.</div>
            )}
          </div>

          <div className="space-y-2 pt-4 border-t border-[#272730] text-xs">
            {decisionDistData.map((d) => (
              <div
                key={d.name}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#09090B]/70 border border-[#272730]"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-[#F4F1EA] font-medium">{d.name}</span>
                </span>
                <span className="font-mono font-bold text-[#F4F1EA] tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* SECTION 3: Operator Investigation Deck — Expandable Event Timeline + Live Step-Up Triage */}
      <motion.section
        variants={fadeUpItem}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* Left 8 Cols: Interactive Expandable Security Investigation Timeline */}
        <div className="lg:col-span-8 p-7 rounded-[28px] surface-elevated space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#F59E0B] mb-1">
                ANOMALY & CONTAINMENT STREAM
              </div>
              <h3 className="font-display text-xl font-bold text-[#F4F1EA]">
                Recent High-Risk Interceptions
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Click any event node to expand its forensic summary or inspect the full cryptographic hash chain
              </p>
            </div>

            <button
              onClick={() => navigate('/actions')}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#18181E] hover:bg-[#22222A] border border-[#272730] text-xs font-semibold text-[#F4F1EA] transition-all"
            >
              <span>Full Action Stream</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#FF5A36]" />
            </button>
          </div>

          {summary.recent_high_risk_events.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#09090B]/70 border border-[#272730] text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-[#10B981] mx-auto" />
              <div className="font-display text-sm font-bold text-[#F4F1EA]">
                Zero High-Risk Anomalies in Current Window
              </div>
              <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto">
                All autonomous agent tool calls are currently operating within L0/L1 baseline bounds.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.recent_high_risk_events.map((e) => {
                const isExpanded = expandedEventId === e.id;
                const tierColor = TIER_COLORS[e.tier] || '#FF5A36';

                return (
                  <motion.div
                    key={e.id}
                    layout
                    className="rounded-2xl bg-[#09090B]/85 border border-[#272730] hover:border-[#FF5A36]/40 transition-colors overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedEventId(isExpanded ? null : e.id)}
                      className="p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className="w-2 h-10 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: tierColor }}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono font-bold text-sm text-[#F4F1EA]">
                              {e.tool}
                            </span>
                            <RiskTierBadge tier={e.tier} />
                            <StatusBadge status={e.status} size="sm" />
                          </div>
                          <div className="text-xs text-[#A1A1AA] mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[#F4F1EA]">{e.agent_name}</span>
                            <span className="font-mono text-[11px] text-[#A1A1AA]">({e.agent_id})</span>
                            <span>→</span>
                            <span className="font-mono text-[#FF5A36]">{e.resource || 'unspecified'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                        <span className="font-mono text-[11px] text-[#A1A1AA] tabular-nums">
                          {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : 'N/A'}
                        </span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="p-1.5 rounded-lg bg-[#18181E] text-[#A1A1AA]"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-3 border-t border-[#272730]/80 bg-[#121216]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-2">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-[#A1A1AA]">
                                Triggered Risk & Policy Signals
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {e.reasons && e.reasons.length > 0 ? (
                                  e.reasons.map((r, i) => (
                                    <span
                                      key={i}
                                      className="px-2.5 py-1 rounded-lg bg-[#18181E] border border-[#272730] text-[#F59E0B] font-mono text-[11px]"
                                    >
                                      {r}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-[#A1A1AA] font-mono">
                                    Elevated composite drift score
                                  </span>
                                )}
                              </div>
                              {e.destination && (
                                <div className="text-xs text-[#A1A1AA] font-mono">
                                  Egress Destination: <span className="text-[#F4F1EA]">{e.destination}</span>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                navigate(`/actions/${e.action_id}`);
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5A36] hover:bg-[#ff6b4a] text-[#09090B] text-xs font-bold transition-all self-start sm:self-end flex-shrink-0"
                            >
                              <span>Inspect Cryptographic Audit</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 4 Cols: Live Step-Up Approval Quarantine Deck */}
        <div className="lg:col-span-4 p-7 rounded-[28px] surface-elevated flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#F59E0B] mb-1">
                  HUMAN-IN-THE-LOOP
                </div>
                <h3 className="font-display text-xl font-bold text-[#F4F1EA]">
                  Pending Approvals
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/35 font-mono text-xs font-bold text-[#F59E0B]">
                {livePending.length} Held
              </span>
            </div>

            {livePending.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#09090B]/70 border border-[#272730] text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-[#10B981] mx-auto" />
                <div className="font-display text-sm font-bold text-[#F4F1EA]">
                  Approval Queue Clear
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  No L2 step-up actions are currently waiting for human authorization.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {livePending.slice(0, 3).map((appr) => (
                  <motion.div
                    key={appr.id}
                    layout
                    className="p-4 rounded-2xl bg-[#09090B]/90 border border-[#F59E0B]/35 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-xs text-[#F4F1EA] block">
                          {appr.action_summary?.tool}
                        </span>
                        <span className="text-[11px] text-[#A1A1AA]">
                          {appr.agent_name} · <span className="font-mono">{appr.action_summary?.resource || 'resource'}</span>
                        </span>
                      </div>
                      <RiskTierBadge tier={appr.risk_tier || 'L2'} />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        disabled={resolvingId === appr.id}
                        onClick={() => handleQuickResolve(appr.id, 'approved')}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-[#10B981] hover:bg-[#0ea572] disabled:opacity-50 text-[#09090B] font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        disabled={resolvingId === appr.id}
                        onClick={() => handleQuickResolve(appr.id, 'rejected')}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-[#F43F5E]/20 hover:bg-[#F43F5E]/30 disabled:opacity-50 text-[#F43F5E] border border-[#F43F5E]/40 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/approvals')}
            className="w-full py-3 rounded-2xl bg-[#18181E] hover:bg-[#22222A] border border-[#272730] text-xs font-bold text-[#F4F1EA] inline-flex items-center justify-center gap-2 transition-all"
          >
            <span>Open Step-Up Command Queue</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#FF5A36]" />
          </button>
        </div>
      </motion.section>
    </MotionPage>
  );
};
