import React from 'react';
import { RiskTier } from '../types';

interface RiskTierBadgeProps {
  tier: RiskTier | string;
  showLabel?: boolean;
}

export const RiskTierBadge: React.FC<RiskTierBadgeProps> = ({ tier, showLabel = true }) => {
  const norm = (tier || 'L0').toUpperCase();

  let styles = 'bg-slate-800 text-slate-300 border-slate-700';
  let label = 'Unknown';

  switch (norm) {
    case 'L0':
      styles = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      label = 'Allow';
      break;
    case 'L1':
      styles = 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
      label = 'Observe';
      break;
    case 'L2':
      styles = 'bg-amber-950/80 text-amber-300 border-amber-600/70';
      label = 'Step-up';
      break;
    case 'L3':
      styles = 'bg-orange-950/80 text-orange-300 border-orange-600/70';
      label = 'Restrict';
      break;
    case 'L4':
      styles = 'bg-red-950 text-red-200 border-red-500 shadow-sm shadow-red-950 font-bold';
      label = 'Isolate';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold font-mono border ${styles}`}
    >
      <span>{norm}</span>
      {showLabel && <span className="opacity-80 font-sans font-normal text-[11px]">— {label}</span>}
    </span>
  );
};
