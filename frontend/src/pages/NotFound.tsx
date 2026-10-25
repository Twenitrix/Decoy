import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 mb-4">
        <ShieldX className="w-10 h-10" />
      </div>
      <h2 className="text-xl font-bold text-slate-100">404 - Screen Not Found</h2>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6">
        The requested operations screen does not exist on this gateway control plane.
      </p>
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
      >
        <Home className="w-4 h-4" />
        Return to Dashboard
      </button>
    </div>
  );
};
