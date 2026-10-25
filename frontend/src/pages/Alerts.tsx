import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ShieldAlert,
  AlertOctagon,
  ExternalLink,
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { alertsApi } from '../api/alerts';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

export const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const [severityFilter, setSeverityFilter] = useState('');

  const { data: alerts, isLoading, error, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.list(),
    refetchInterval: 10000,
  });

  if (isLoading) return <LoadingState message="Loading security alerts..." />;
  if (error) return <ErrorState onRetry={() => refetch()} />;

  const filtered = (alerts || []).filter((a) => {
    if (severityFilter && a.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Security Alerts & Containment Events
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated notifications generated for anomalous actions, high-risk drift (L3/L4), and isolated agents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
          </select>
        </div>
      </div>

      {/* Alert Feed */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All clear — no security alerts"
          description="There are currently no active high-risk alerts or containment actions required."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const isCrit = alert.severity === 'critical';
            const isHigh = alert.severity === 'high';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCrit
                    ? 'bg-red-950/30 border-red-800/80 hover:border-red-600'
                    : isHigh
                    ? 'bg-orange-950/20 border-orange-800/60 hover:border-orange-600'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl flex-shrink-0 ${
                      isCrit
                        ? 'bg-red-950 text-red-400 border border-red-700'
                        : isHigh
                        ? 'bg-orange-950 text-orange-400 border border-orange-700'
                        : 'bg-amber-950 text-amber-400 border border-amber-700'
                    }`}
                  >
                    {isCrit ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-slate-100">{alert.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                          isCrit
                            ? 'bg-red-950 text-red-300 border border-red-700'
                            : 'bg-orange-950 text-orange-300 border border-orange-800'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <RiskTierBadge tier={alert.tier} />
                    </div>

                    <p className="text-xs text-slate-300 mt-1">{alert.message}</p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                      <span>Agent: <span className="text-cyan-400">{alert.agent_name || alert.agent_id}</span></span>
                      <span>•</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {alert.action_event_id && (
                  <button
                    onClick={() => navigate(`/actions/${alert.action_event_id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors flex-shrink-0"
                  >
                    <span>Inspect Action</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
