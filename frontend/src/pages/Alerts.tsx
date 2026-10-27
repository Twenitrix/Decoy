import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  AlertOctagon,
  ExternalLink,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { alertsApi } from '../api/alerts';
import { RiskTierBadge } from '../components/RiskTierBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { MotionPage, motion, fadeUpItem } from '../components/motion';

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
    <MotionPage className="space-y-7 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <motion.div
        variants={fadeUpItem}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 p-7 sm:p-8 rounded-[28px] surface-elevated editorial-frame"
      >
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/35 font-semibold flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-[#F43F5E] animate-pulse" />
              THREAT INTELLIGENCE FEED
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F4F1EA] flex items-center gap-2.5">
            Security{' '}
            <span className="font-editorial italic font-normal text-[#F43F5E]">
              Alerts & Containment
            </span>
          </h2>
          <p className="text-sm text-[#A1A1AA] mt-2 max-w-2xl leading-relaxed">
            Automated detections triggered on anomalous tool executions, behavioral drift accumulation, L3 policy blocks, and L4 identity isolation containment.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <label className="text-xs text-[#A1A1AA] font-mono">Severity:</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-2.5 bg-[#09090B] border border-[#272730] rounded-xl text-xs text-[#F4F1EA] font-mono focus:outline-none focus:border-[#FF5A36]"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
          </select>
        </div>
      </motion.div>

      {/* Alert Feed */}
      {filtered.length === 0 ? (
        <motion.div variants={fadeUpItem}>
          <EmptyState
            icon={CheckCircle2}
            title="All clear — no security alerts"
            description="There are currently no active high-risk alerts or containment actions requiring SOC intervention."
          />
        </motion.div>
      ) : (
        <motion.div variants={fadeUpItem} className="space-y-3.5">
          {filtered.map((alert) => {
            const isCrit = alert.severity === 'critical';
            const isHigh = alert.severity === 'high';

            return (
              <motion.div
                key={alert.id}
                whileHover={{ y: -2 }}
                className={`p-6 rounded-3xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 surface-elevated ${
                  isCrit
                    ? 'border border-[#F43F5E]/45 shadow-[0_16px_36px_-10px_rgba(244,63,94,0.18)]'
                    : isHigh
                    ? 'border border-[#F59E0B]/40'
                    : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3.5 rounded-2xl flex-shrink-0 ${
                      isCrit
                        ? 'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/40'
                        : isHigh
                        ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40'
                        : 'bg-[#FF5A36]/15 text-[#FF5A36] border border-[#FF5A36]/35'
                    }`}
                  >
                    {isCrit ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-display font-bold text-base text-[#F4F1EA]">
                        {alert.title}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border ${
                          isCrit
                            ? 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/40'
                            : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <RiskTierBadge tier={alert.tier} />
                    </div>

                    <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1.5 leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-[#A1A1AA] font-mono">
                      <span>
                        Target Agent:{' '}
                        <span className="text-[#FF5A36] font-semibold">
                          {alert.agent_name || alert.agent_id}
                        </span>
                      </span>
                      <span className="text-[#272730]">•</span>
                      <span className="tabular-nums">{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {alert.action_event_id && (
                  <motion.button
                    whileHover={{ x: 2 }}
                    onClick={() => navigate(`/actions/${alert.action_event_id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#18181E] hover:bg-[#22222A] border border-[#272730] hover:border-[#FF5A36]/50 rounded-full text-xs font-bold text-[#F4F1EA] transition-all flex-shrink-0"
                  >
                    <span>Inspect Action Forensics</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#FF5A36]" />
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </MotionPage>
  );
};
