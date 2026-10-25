import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  LayoutDashboard,
  Bot,
  Activity,
  CheckSquare,
  AlertTriangle,
  FileCode,
  Gauge,
  PlayCircle,
  Wifi,
  Server
} from 'lucide-react';
import { approvalsApi } from '../api/approvals';
import { alertsApi } from '../api/alerts';
import { metricsApi } from '../api/metrics';

export const AppShell: React.FC = () => {
  const location = useLocation();

  // Polling pending approvals count
  const { data: pendingApprovals } = useQuery({
    queryKey: ['pendingApprovalsCount'],
    queryFn: () => approvalsApi.list('pending'),
    refetchInterval: 10000,
  });

  // Polling alerts count
  const { data: alerts } = useQuery({
    queryKey: ['alertsCount'],
    queryFn: () => alertsApi.list(),
    refetchInterval: 10000,
  });

  // System health query
  const { data: health } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => metricsApi.getHealth(),
    refetchInterval: 15000,
  });

  const pendingCount = pendingApprovals?.length || 0;
  const alertCount = alerts?.length || 0;

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/agents', label: 'Agent Inventory', icon: Bot },
    { to: '/actions', label: 'Action Explorer', icon: Activity },
    {
      to: '/approvals',
      label: 'Approvals Queue',
      icon: CheckSquare,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      to: '/alerts',
      label: 'Security Alerts',
      icon: AlertTriangle,
      badge: alertCount > 0 ? alertCount : undefined,
      badgeColor: 'bg-red-500 text-white font-bold',
    },
    { to: '/policies', label: 'Policy Engine', icon: FileCode },
    { to: '/model-evaluation', label: 'Model Evaluation', icon: Gauge },
    { to: '/simulator', label: 'Gateway Simulator', icon: PlayCircle },
  ];

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-slate-800 bg-[#0d1322] flex-shrink-0">
        {/* App Logo & Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-950">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white uppercase">Identity Drift</h1>
            <p className="text-[11px] text-cyan-400 font-mono tracking-wider">GATEWAY CONTROL PLANE</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] leading-tight ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System Health Status in Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 text-[11px] text-slate-400">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-300 font-medium">Gateway Active</span>
            </span>
            <span className="font-mono text-emerald-400 uppercase text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
              {health?.mode || 'ENFORCING'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Latency p50: ~1.9ms</span>
            <span>API: v1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-800 bg-[#0d1322]/80 backdrop-blur-md px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400">Environment:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/60">
              <Server className="w-3 h-3" />
              Autonomous Agent Runtime
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Mediation Enforced</span>
            </div>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#090d16]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
