import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ArrowUpRight,
  LucideIcon
} from 'lucide-react';
import { approvalsApi } from '../api/approvals';
import { alertsApi } from '../api/alerts';
import { metricsApi } from '../api/metrics';
import { motion, AnimatePresence } from './motion';

interface NavItem {
  to: string;
  code: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  badgeVariant?: 'amber' | 'rose';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const AppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: pendingApprovals } = useQuery({
    queryKey: ['pendingApprovalsCount'],
    queryFn: () => approvalsApi.list('pending'),
    refetchInterval: 10000,
  });

  const { data: alerts } = useQuery({
    queryKey: ['alertsCount'],
    queryFn: () => alertsApi.list(),
    refetchInterval: 10000,
  });

  const { data: health } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => metricsApi.getHealth(),
    refetchInterval: 15000,
  });

  const pendingCount = pendingApprovals?.length || 0;
  const alertCount = alerts?.length || 0;

  const navSections: NavSection[] = [
    {
      title: 'TELEMETRY',
      items: [
        { to: '/', code: '01', label: 'Overview Dashboard', icon: LayoutDashboard },
        { to: '/agents', code: '02', label: 'Agent Inventory', icon: Bot },
        { to: '/actions', code: '03', label: 'Action Explorer', icon: Activity },
      ],
    },
    {
      title: 'INTERVENTION',
      items: [
        {
          to: '/approvals',
          code: '04',
          label: 'Step-Up Approvals',
          icon: CheckSquare,
          badge: pendingCount > 0 ? pendingCount : undefined,
          badgeVariant: 'amber',
        },
        {
          to: '/alerts',
          code: '05',
          label: 'Security Alerts',
          icon: AlertTriangle,
          badge: alertCount > 0 ? alertCount : undefined,
          badgeVariant: 'rose',
        },
      ],
    },
    {
      title: 'GOVERNANCE',
      items: [
        { to: '/policies', code: '06', label: 'Policy Engine', icon: FileCode },
        { to: '/model-evaluation', code: '07', label: 'Model Evaluation', icon: Gauge },
        { to: '/simulator', code: '08', label: 'Gateway Simulator', icon: PlayCircle },
      ],
    },
  ];

  const getPageMeta = (path: string) => {
    if (path === '/') return { index: '01', title: 'Command Posture Overview', category: 'LIVE MEDIATION' };
    if (path.startsWith('/agents/')) return { index: '02.A', title: 'Agent Identity Telemetry', category: 'BEHAVIORAL PROFILE' };
    if (path.startsWith('/agents')) return { index: '02', title: 'Autonomous Agent Fleet', category: 'IDENTITY REGISTRY' };
    if (path.startsWith('/actions/')) return { index: '03.A', title: 'Action Forensics & Hash Chain', category: 'CRYPTOGRAPHIC AUDIT' };
    if (path.startsWith('/actions')) return { index: '03', title: 'Action Explorer Stream', category: 'PRE-EXECUTION LOG' };
    if (path.startsWith('/approvals')) return { index: '04', title: 'Step-Up Approval Quarantine', category: 'HUMAN-IN-THE-LOOP' };
    if (path.startsWith('/alerts')) return { index: '05', title: 'Security Alerts & Containment', category: 'THREAT FEED' };
    if (path.startsWith('/policies')) return { index: '06', title: 'Deterministic Policy Guardrails', category: 'RBAC / ABAC FLOOR' };
    if (path.startsWith('/model-evaluation')) return { index: '07', title: 'Hybrid Model Evaluation', category: 'DRIFT BENCHMARKS' };
    if (path.startsWith('/simulator')) return { index: '08', title: 'Gateway Interception Sandbox', category: 'LIVE SIMULATION' };
    return { index: '00', title: 'Identity Drift Control', category: 'DECOY SOC' };
  };

  const pageMeta = getPageMeta(location.pathname);

  const renderNavLinks = (isCollapsed: boolean, onSelect?: () => void) => (
    <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
      {navSections.map((section) => (
        <div key={section.title} className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 pb-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A36]/70" />
              <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-[#A1A1AA]/70 uppercase">
                {section.title}
              </span>
            </div>
          )}
          {section.items.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onSelect}
                title={isCollapsed ? item.label : undefined}
                className={`relative group flex items-center ${
                  isCollapsed ? 'justify-center px-2.5' : 'justify-between px-3.5'
                } py-2.5 rounded-2xl text-[13px] transition-colors duration-200 ${
                  isActive
                    ? 'text-[#09090B] font-bold'
                    : 'text-[#A1A1AA] hover:text-[#F4F1EA] hover:bg-[#18181E]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId={onSelect ? 'editorial-nav-pill-mobile' : 'editorial-nav-pill'}
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    className="absolute inset-0 rounded-2xl bg-[#F4F1EA] shadow-[0_8px_24px_-4px_rgba(244,241,234,0.25)]"
                  />
                )}

                <div className="relative z-10 flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-[#FF5A36]' : 'text-[#A1A1AA] group-hover:text-[#F4F1EA]'
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span
                        className={`text-[10px] font-mono ${
                          isActive ? 'text-[#09090B]/60 font-bold' : 'text-[#A1A1AA]/50'
                        }`}
                      >
                        {item.code}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>
                  )}
                </div>

                {!isCollapsed && item.badge !== undefined && (
                  <span
                    className={`relative z-10 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums leading-tight ${
                      isActive
                        ? 'bg-[#09090B] text-[#F4F1EA]'
                        : item.badgeVariant === 'amber'
                        ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                        : 'bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/40'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {isCollapsed && item.badge !== undefined && (
                  <span
                    className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                      item.badgeVariant === 'amber' ? 'bg-[#F59E0B]' : 'bg-[#F43F5E]'
                    }`}
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen bg-[#09090B] text-[#F4F1EA] overflow-hidden font-sans bg-command-atmosphere">
      {/* Floating Architectural Command Rail (Desktop) */}
      <div className="hidden md:flex p-3 pr-0 flex-shrink-0 z-20">
        <motion.aside
          animate={{ width: sidebarCollapsed ? 78 : 268 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="h-full flex flex-col rounded-3xl bg-[#121216]/95 border border-[#272730] shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden"
        >
          {/* Brand Monogram Header */}
          <div
            className={`h-20 px-4 border-b border-[#272730]/80 flex items-center ${
              sidebarCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div
              onClick={() => navigate('/')}
              className="flex items-center gap-3 cursor-pointer group min-w-0"
            >
              <div className="relative w-10 h-10 rounded-2xl bg-[#FF5A36] flex items-center justify-center shadow-[0_0_24px_-4px_rgba(255,90,54,0.6)] flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#09090B] stroke-[2.4]" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="font-display font-bold text-base tracking-tight text-[#F4F1EA] uppercase">
                      DECOY
                    </h1>
                    <span className="font-editorial italic text-base text-[#FF5A36]">
                      SOC
                    </span>
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] font-mono tracking-[0.16em] uppercase truncate">
                    AGENT CONTROL PLANE
                  </p>
                </div>
              )}
            </div>

            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                title="Collapse command rail"
                className="p-1.5 rounded-xl text-[#A1A1AA] hover:text-[#F4F1EA] hover:bg-[#18181E] transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {sidebarCollapsed && (
            <div className="px-3 pt-3 flex justify-center">
              <button
                onClick={() => setSidebarCollapsed(false)}
                title="Expand command rail"
                className="p-2 rounded-xl text-[#A1A1AA] hover:text-[#F4F1EA] hover:bg-[#18181E] transition-colors"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation Links */}
          {renderNavLinks(sidebarCollapsed)}

          {/* Architectural Footer Pod */}
          <div className="p-3.5 border-t border-[#272730]/80 bg-[#09090B]/60">
            {sidebarCollapsed ? (
              <div className="flex justify-center py-1" title={`Gateway: ${health?.mode || 'ENFORCING'}`}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]" />
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#18181E] border border-[#272730] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
                    </span>
                    <span className="text-[#F4F1EA] font-semibold text-xs">Mediation Gate</span>
                  </span>
                  <span className="font-mono text-[#10B981] uppercase text-[10px] px-2 py-0.5 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 font-semibold">
                    {health?.mode || 'ACTIVE'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#A1A1AA] pt-2 border-t border-[#272730]">
                  <span>CRYPTO LEDGER</span>
                  <span className="text-[#F4F1EA]">SHA-256</span>
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -290 }}
              animate={{ x: 0 }}
              exit={{ x: -290 }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              className="relative w-72 max-w-[85vw] bg-[#121216] border-r border-[#272730] flex flex-col z-10"
            >
              <div className="h-16 px-4 border-b border-[#272730] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FF5A36] flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-[#09090B]" />
                  </div>
                  <span className="font-display font-bold text-sm text-[#F4F1EA] uppercase">
                    DECOY SOC
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F4F1EA]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderNavLinks(false, () => setMobileMenuOpen(false))}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Editorial Top Masthead */}
        <header className="h-20 px-5 sm:px-8 flex items-center justify-between z-10 flex-shrink-0 border-b border-[#272730]/60">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2.5 rounded-xl bg-[#121216] border border-[#272730] text-[#A1A1AA] hover:text-[#F4F1EA]"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5 min-w-0">
              <span className="hidden sm:inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-[#18181E] border border-[#272730] font-mono text-xs font-bold text-[#FF5A36]">
                {pageMeta.index}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#A1A1AA]">
                  {pageMeta.category}
                </div>
                <h2 className="font-display font-bold text-base sm:text-lg text-[#F4F1EA] tracking-tight truncate">
                  {pageMeta.title}
                </h2>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Attention Pill if Pending Approvals exist */}
            {pendingCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/approvals')}
                className="hidden lg:inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] text-xs font-semibold"
              >
                <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />
                <span>{pendingCount} Step-Up Approval{pendingCount > 1 ? 's' : ''} Pending</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </motion.button>
            )}

            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/simulator')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF5A36] hover:bg-[#ff6b4a] text-[#09090B] text-xs font-bold rounded-full transition-all shadow-[0_0_24px_-4px_rgba(255,90,54,0.5)]"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Simulate Action</span>
            </motion.button>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 bg-SubtleDots">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
