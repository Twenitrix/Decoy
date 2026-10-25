import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'No activity or entities match the selected filters.',
  actionLabel,
  onAction,
  icon: Icon = Inbox,
}) => (
  <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 border border-slate-800 rounded-xl text-center my-6">
    <div className="p-4 bg-slate-800/60 rounded-full text-slate-400 mb-3">
      <Icon className="w-8 h-8" />
    </div>
    <h3 className="text-base font-medium text-slate-200">{title}</h3>
    <p className="text-sm text-slate-400 max-w-sm mt-1 mb-4">{description}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="px-4 py-2 text-xs font-medium text-cyan-300 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 rounded-lg transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
