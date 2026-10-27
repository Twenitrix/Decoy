import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = (status || '').toLowerCase();

  let badgeStyle = 'bg-[#18181E] text-[#A1A1AA] border-[#272730]';
  let dotStyle = 'bg-[#A1A1AA]';

  if (s === 'active' || s === 'allowed' || s === 'approved' || s === 'healthy') {
    badgeStyle = 'bg-[#10B981]/12 text-[#10B981] border-[#10B981]/30';
    dotStyle = 'bg-[#10B981] shadow-[0_0_8px_#10B981]';
  } else if (s === 'observed') {
    badgeStyle = 'bg-[#818CF8]/12 text-[#818CF8] border-[#818CF8]/30';
    dotStyle = 'bg-[#818CF8] shadow-[0_0_8px_#818CF8]';
  } else if (s === 'pending' || s === 'held_for_approval' || s === 'suspended') {
    badgeStyle = 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/35';
    dotStyle = 'bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]';
  } else if (s === 'restricted' || s === 'denied') {
    badgeStyle = 'bg-[#FF5A36]/15 text-[#FF5A36] border-[#FF5A36]/35';
    dotStyle = 'bg-[#FF5A36] shadow-[0_0_8px_#FF5A36]';
  } else if (
    s === 'disabled' ||
    s === 'isolated' ||
    s === 'rejected' ||
    s === 'critical' ||
    s === 'expired'
  ) {
    badgeStyle = 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/40';
    dotStyle = 'bg-[#F43F5E] shadow-[0_0_8px_#F43F5E]';
  }

  const sizeClass =
    size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-[11px]';

  const displayLabel = status ? status.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-semibold border tracking-wider ${badgeStyle} ${sizeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
      {displayLabel}
    </span>
  );
};
