import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity, ChevronLeft, ChevronRight, Cpu, FolderKanban,
  LayoutDashboard, Menu, Plus, Box, X, Zap,
} from 'lucide-react';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard, end: true },
  { name: 'Projects', path: '/simulations', icon: FolderKanban, end: false },
  { name: 'New simulation', path: '/simulations/new', icon: Plus, end: true },
  { name: '3D Geometry', path: '/geometry', icon: Box, end: true },
  { name: 'Solver library', path: '/solvers', icon: Cpu, end: true },
];

const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const sidebar = (
    <div className="flex h-full flex-col bg-[#101827] text-slate-300">
      <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-5">
        <NavLink to="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
            <Zap size={19} fill="currentColor" />
          </span>
          {(!collapsed || mobileOpen) && (
            <span className="text-lg font-bold tracking-[0.18em] text-white">FLOW<span className="text-blue-400">.</span></span>
          )}
        </NavLink>
        {mobileOpen && (
          <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <X size={19} />
          </button>
        )}
      </div>

      <div className="px-4 pt-7 pb-2">
        {(!collapsed || mobileOpen) && <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = item.path === '/'
              ? location.pathname === '/'
              : item.path === '/simulations'
                ? location.pathname === '/simulations' || /^\/simulations\/[^/]+$/.test(location.pathname)
                : location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                title={collapsed && !mobileOpen ? item.name : undefined}
                className={() => `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${active ? 'bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-400/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Icon size={18} className="shrink-0" />
                {(!collapsed || mobileOpen) && <span>{item.name}</span>}
                {active && (!collapsed || mobileOpen) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 p-4">
        <div className={`mb-3 flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 ${collapsed && !mobileOpen ? 'justify-center' : ''}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-xs font-bold text-white">AI</span>
          {(!collapsed || mobileOpen) && (
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-200">Simulation workspace</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Engineering tools</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden w-full items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f4f7fb] text-slate-900">
      <aside className={`hidden shrink-0 transition-[width] duration-200 lg:block ${collapsed ? 'w-[76px]' : 'w-[252px]'}`}>
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <aside className="relative h-full w-[min(82vw,300px)] shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">{location.pathname.startsWith('/simulations/new') ? 'Create workspace' : location.pathname.startsWith('/simulations/') ? 'Project workspace' : location.pathname.startsWith('/solvers') ? 'Solver library' : location.pathname.startsWith('/geometry') ? '3D Geometry workspace' : 'Engineering workspace'}</p>
              <p className="hidden text-[10px] text-slate-400 sm:block">FLOW / MULTIPHYSICS SIMULATION</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-500 sm:flex">
              <Activity size={13} className="text-emerald-500" /> Workspace ready
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">FL</span>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
