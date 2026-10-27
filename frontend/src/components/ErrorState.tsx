import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, scaleInItem } from './motion';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Failed to synchronize telemetry from the security gateway.',
  onRetry,
}) => {
  return (
    <motion.div
      variants={scaleInItem}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center p-12 text-center rounded-[28px] bg-[#121216] border border-[#F43F5E]/35"
    >
      <div className="p-3.5 rounded-2xl bg-[#F43F5E]/15 border border-[#F43F5E]/35 text-[#F43F5E] mb-3.5">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="font-display text-sm font-bold text-[#F4F1EA] mb-1">
        Telemetry Synchronization Interrupted
      </h3>
      <p className="text-xs text-[#A1A1AA] max-w-md mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#18181E] hover:bg-[#22222A] text-[#F4F1EA] text-xs font-semibold rounded-full border border-[#272730] transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#FF5A36]" />
          Retry Connection
        </button>
      )}
    </motion.div>
  );
};
