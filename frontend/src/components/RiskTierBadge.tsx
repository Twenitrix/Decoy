import React from 'react';
import { RiskTier } from '../types';

interface RiskTierBadgeProps {
  tier: RiskTier | string;
}

export const RiskTierBadge: React.FC<RiskTierBadgeProps> = ({ tier }) => {
  const styles: Record<string, { badge: string; dot: string }> = {
    L0: {
      badge: 'bg-[#10B981]/12 text-[#10B981] border-[#10B981]/30',
      dot: 'bg-[#10B981] shadow-[0_0_8px_#10B981]',
    },
    L1: {
      badge: 'bg-[#818CF8]/12 text-[#818CF8] border-[#818CF8]/30',
      dot: 'bg-[#818CF8] shadow-[0_0_8px_#818CF8]',
    },
    L2: {
      badge: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40',
      dot: 'bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]',
    },
    L3: {
      badge: 'bg-[#FF5A36]/15 text-[#FF5A36] border-[#FF5A36]/40',
      dot: 'bg-[#FF5A36] shadow-[0_0_8px_#FF5A36]',
    },
    L4: {
      badge: 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/45',
      dot: 'bg-[#F43F5E] shadow-[0_0_10px_#F43F5E] animate-pulse',
    },
  };

  const labels: Record<string, string> = {
    L0: 'L0 · Allow',
    L1: 'L1 · Observe',
    L2: 'L2 · Step-Up',
    L3: 'L3 · Restrict',
    L4: 'L4 · Isolate',
  };

  const style = styles[tier] || {
    badge: 'bg-[#18181E] text-[#A1A1AA] border-[#272730]',
    dot: 'bg-[#A1A1AA]',
  };
  const label = labels[tier] || tier;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border tracking-tight ${style.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
};
