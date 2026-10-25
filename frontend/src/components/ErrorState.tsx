import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load telemetry',
  message = 'An unexpected error occurred while communicating with the gateway control plane.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center p-8 bg-rose-950/20 border border-rose-800/40 rounded-xl text-center max-w-lg mx-auto my-8">
    <div className="p-3 bg-rose-900/40 rounded-full text-rose-400 mb-3">
      <AlertCircle className="w-8 h-8" />
    </div>
    <h3 className="text-base font-semibold text-rose-200">{title}</h3>
    <p className="text-sm text-slate-400 mt-1 mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-600 rounded-lg transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Retry Request
      </button>
    )}
  </div>
);
