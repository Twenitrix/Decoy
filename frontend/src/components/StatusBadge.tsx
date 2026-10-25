import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldAlert, PauseCircle } from 'lucide-react';
import { DecisionStatus, AgentStatus, ApprovalStatus } from '../types';

interface StatusBadgeProps {
  status: DecisionStatus | AgentStatus | ApprovalStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status?.toLowerCase() || '';

  let styles = 'bg-slate-800 text-slate-300 border-slate-700';
  let Icon = Clock;

  if (norm === 'allowed' || norm === 'active' || norm === 'approved') {
    styles = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80';
    Icon = CheckCircle2;
  } else if (norm === 'observed') {
    styles = 'bg-cyan-950/70 text-cyan-300 border-cyan-800/80';
    Icon = CheckCircle2;
  } else if (norm === 'held_for_approval' || norm === 'pending') {
    styles = 'bg-amber-950/70 text-amber-300 border-amber-700/80 animate-pulse';
    Icon = Clock;
  } else if (norm === 'denied' || norm === 'rejected' || norm === 'disabled') {
    styles = 'bg-rose-950/70 text-rose-300 border-rose-800/80';
    Icon = XCircle;
  } else if (norm === 'restricted') {
    styles = 'bg-orange-950/70 text-orange-300 border-orange-800/80';
    Icon = AlertTriangle;
  } else if (norm === 'isolated' || norm === 'suspended') {
    styles = 'bg-red-950/90 text-red-200 border-red-600/90 font-bold';
    Icon = ShieldAlert;
  } else if (norm === 'expired') {
    styles = 'bg-slate-900 text-slate-400 border-slate-800';
    Icon = PauseCircle;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${styles} ${sizeClasses}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span className="capitalize">{norm.replace(/_/g, ' ')}</span>
    </span>
  );
};
