import React from 'react';
import { Shield } from 'lucide-react';
import { motion } from './motion';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Synchronizing gateway telemetry...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-[#A1A1AA] min-h-[340px]">
      <div className="relative flex items-center justify-center mb-5">
        <motion.div
          animate={{ scale: [1, 1.22, 1], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-16 h-16 rounded-full bg-[#FF5A36]/20 blur-md"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-2xl border-2 border-[#272730] border-t-[#FF5A36]"
        />
        <Shield className="w-5 h-5 text-[#FF5A36] absolute" />
      </div>
      <p className="text-xs font-mono tracking-wider uppercase text-[#A1A1AA]">{message}</p>
    </div>
  );
};
