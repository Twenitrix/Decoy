import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, Home } from 'lucide-react';
import { MotionPage, motion, fadeUpItem } from '../components/motion';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MotionPage className="flex flex-col items-center justify-center min-h-[65vh] text-center p-6">
      <motion.div
        variants={fadeUpItem}
        className="p-5 rounded-3xl surface-elevated text-[#FF5A36] mb-5"
      >
        <ShieldX className="w-10 h-10" />
      </motion.div>
      <motion.h2
        variants={fadeUpItem}
        className="font-display text-2xl font-bold text-[#F4F1EA]"
      >
        404 — Telemetry View Not Found
      </motion.h2>
      <motion.p
        variants={fadeUpItem}
        className="text-sm text-[#A1A1AA] max-w-sm mt-2 mb-6 leading-relaxed"
      >
        The requested operational screen does not exist on this gateway control plane.
      </motion.p>
      <motion.button
        variants={fadeUpItem}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF5A36] hover:bg-[#ff6b4a] text-[#09090B] rounded-full text-xs font-bold shadow-[0_0_24px_-4px_rgba(255,90,54,0.45)] transition-all"
      >
        <Home className="w-4 h-4" />
        <span>Return to Command Dashboard</span>
      </motion.button>
    </MotionPage>
  );
};
