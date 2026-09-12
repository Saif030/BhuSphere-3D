import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Map as MapIcon, Box, ShieldAlert, Cable, Bot, FileText, Settings, LogOut, Search, Presentation, ClipboardEdit, Bell } from 'lucide-react';
import { useStore } from '../lib/store';
import { api } from '../lib/api';
import DemoTour from './DemoTour';

const GROUPS: { title: string; items: [string, string, any][]; roles?: string[] }[] = [
  { title: 'Explore', items: [
    ['/', 'Overview', LayoutDashboard], ['/map', '2D Map', MapIcon], ['/3d', '3D Cadastre', Box]] },
  { title: 'Govern', items: [
    ['/validation', 'Validation', ShieldAlert], ['/infrastructure', 'Infrastructure', Cable], ['/reports', 'Reports', FileText]] },
  { title: 'Submit Data', items: [
    ['/submit', 'Submit Property', ClipboardEdit], ['/submit/my', 'My Submissions', FileText], ['/submit/queue', 'Verify Queue', ShieldAlert]],
    roles: ['citizen', 'officer', 'surveyor', 'admin'] },
  { title: 'System', items: [['/admin', 'Admin', Settings]] },
];

function NotifBell() {
  const { auth } = useStore();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const can = auth && ['citizen', 'officer', 'surveyor', 'admin'].includes(auth.role);
  const { data } = useQuery({ queryKey: ['notifs'], queryFn: () => api.get('/api/notifications'),
    enabled: !!can, refetchInterval: 30000 });
  if (!can) return null;
  const unread = (data || []).filter((n: any) => !n.read).length;
  const openLink = async (n: any) => {
    try { await api.post(`/api/notifications/${n.id}/read`); } catch {}
    setOpen(false);
    if (n.link) nav(n.link);
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} title="Notifications" aria-label="Notifications"
        className="relative p-1.5 text-slate-400 hover:text-white">
        <Bell size={16} />
        {!!unread && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-accent-400 text-night-950 text-[10px] font-bold flex items-center justify-center">{unread}</span>}
      </button>
      {open && <div className="absolute right-0 top-9 w-80 max-h-96 overflow-auto panel p-2 z-[80]">
        <div className="text-[11px] font-bold text-slate-400 px-2 py-1">NOTIFICATIONS</div>
        {!(data || []).length && <div className="text-xs text-slate-500 px-2 py-2">No notifications.</div>}
        {(data || []).map((n: any) => (
          <button key={n.id} onClick={() => openLink(n)} className={`block w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/5 ${n.read ? '' : 'bg-accent-400/5'}`}>
            <div className={`text-xs font-semibold ${n.read ? 'text-slate-400' : 'text-white'}`}>{n.title}</div>
            <div className="text-[11px] text-slate-500 truncate">{n.body}</div>
          </button>))}
      </div>}
    </div>);
}

function Toast() {
  const { toast, setToast } = useStore();
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);
  if (!toast) return null;
  return <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-accent-400 text-night-950 text-sm font-medium rounded-lg px-4 py-2 shadow-panel z-[60]">{toast}</div>;
}

export default function Layout({ children, onCopilot }: { children: React.ReactNode; onCopilot: () => void }) {
  const { auth, setAuth, setTour } = useStore(); const nav = useNavigate();
  const [sq, setSq] = useState('');
  const goSearch = () => { if (sq.trim()) nav('/map?q=' + encodeURIComponent(sq.trim())); };
  return (
    <div className="flex h-screen bg-night-900 text-slate-200">
      <aside className="w-16 md:w-60 bg-night-950 border-r border-white/10 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-white/10">
          <div className="font-extrabold text-white text-lg tracking-tight hidden md:block">BhuSphere <span className="text-accent-400">3D</span></div>
          <div className="font-extrabold text-accent-400 md:hidden text-center">B3D</div>
          <div className="text-[11px] text-slate-400 hidden md:block mt-0.5">3D Cadastral Intelligence Platform</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto scrollthin" aria-label="Primary">
          {GROUPS.filter(g => !g.roles || (auth && g.roles.includes(auth.role))).map(g => (
            <div key={g.title}>
              <div className="hidden md:flex items-center gap-1.5 px-3 mb-1 th-label">{g.title}</div>
              <div className="space-y-0.5">
                {g.items.filter(([to]) => to !== '/submit/queue' || (auth && ['officer', 'admin'].includes(auth.role))).map(([to, label, Icon]: any) => (
                  <NavLink key={to} to={to} title={label as string}
                    className={({ isActive }) => `relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-white/10 text-white font-medium' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}>
                    {({ isActive }) => (<>
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-accent-400" />}
                      <Icon size={17} className={isActive ? 'text-accent-400' : ''} /><span className="hidden md:inline">{label}</span>
                    </>)}
                  </NavLink>))}
              </div>
            </div>))}
          <button onClick={onCopilot} title="AI Copilot"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent-600 to-accent-400 text-night-950 hover:brightness-110 transition mt-2">
            <Bot size={17} /><span className="hidden md:inline">AI Copilot</span></button>
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="hidden md:block px-1 mb-2">
            <div className="text-xs font-semibold text-white capitalize">{auth?.username}</div>
            <div className="text-[11px] text-accent-300 capitalize">{auth?.role} · demo session</div>
          </div>
          <button onClick={() => { setAuth(null); nav('/login'); }} title="Logout"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white px-1"><LogOut size={14} /><span className="hidden md:inline">Logout</span></button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-night-950/80 backdrop-blur border-b border-white/10 px-4 py-2.5 flex items-center gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-white text-sm truncate">Vertical Property Mapping & Spatial Governance</div>
            <div className="text-[11px] text-slate-500 hidden sm:block">SIH 2026 · Problem Statement 26011 · Prototype identifiers are not official ULPINs</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotifBell />
            <div className="hidden md:flex items-center bg-night-800 border border-white/10 rounded-lg px-2.5 py-1.5 w-64 focus-within:border-accent-400">
              <Search size={14} className="text-slate-500 shrink-0" />
              <input value={sq} onChange={e => setSq(e.target.value)} onKeyDown={e => e.key === 'Enter' && goSearch()}
                placeholder="Search ULPIN, parcel, building…" className="bg-transparent text-xs ml-1.5 w-full focus:outline-none placeholder:text-slate-500" />
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 whitespace-nowrap">DEMO MODE</span>
            <button onClick={() => setTour(0)} title="Start guided demo tour"
              className="flex items-center gap-1.5 text-[11px] font-bold bg-accent-400 text-night-950 rounded-lg px-3 py-1.5 hover:bg-accent-300 transition-colors whitespace-nowrap">
              <Presentation size={13} />Present</button>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <Toast />
      <DemoTour onCopilot={onCopilot} />
    </div>
  );
}
