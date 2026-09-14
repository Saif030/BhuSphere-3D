import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Map as MapIcon, Box, ShieldAlert, Cable, Bot, FileText, Settings, LogOut, Search, Presentation, ClipboardEdit, ClipboardCheck, Bell, Home, LifeBuoy } from 'lucide-react';
import { useStore } from '../lib/store';
import { api } from '../lib/api';
import DemoTour from './DemoTour';
import { FontSizeControl } from './gov';

const STAFF = ['officer', 'surveyor', 'admin'];

function groupsFor(role?: string) {
  const isStaff = !!role && STAFF.includes(role);
  const isCitizenLike = role === 'citizen' || role === 'public';
  if (isCitizenLike) {
    return [
      { title: 'My Services', items: [['/home', 'Home', Home], ['/submit', 'Submit Property', ClipboardEdit], ['/submit/my', 'My Submissions', FileText], ['/verify', 'Verify Property', ShieldAlert]] as [string, string, any][] },
      { title: 'Explore', items: [['/map', '2D Map', MapIcon], ['/3d', '3D View', Box]] as [string, string, any][] },
      { title: 'Help', items: [['/help', 'Help / FAQ', LifeBuoy], ['/contact', 'Contact Us', FileText]] as [string, string, any][] },
    ];
  }
  return [
    { title: 'Public Portal', items: [['/', 'Portal Home', Home]] as [string, string, any][] },
    { title: 'Workspace', items: [
      ['/dashboard', 'Dashboard', LayoutDashboard], ['/map', '2D Map', MapIcon], ['/3d', '3D Cadastre', Box]] as [string, string, any][] },
    { title: 'Govern', items: [
      ['/validation', 'Validation', ShieldAlert], ['/infrastructure', 'Infrastructure', Cable], ['/reports', 'Reports', FileText]] as [string, string, any][],
      roles: STAFF },
    { title: 'Submit Data', items: [
      ['/submit', 'Submit Property', ClipboardEdit], ['/submit/my', 'My Submissions', FileText], ['/field-work', 'Field Work', ClipboardCheck], ['/submit/queue', 'Verify Queue', ShieldAlert]] as [string, string, any][],
      roles: ['citizen', 'officer', 'surveyor', 'admin'] },
    { title: 'System', items: [['/admin', 'Admin', Settings]] as [string, string, any][], roles: ['admin'] },
  ];
}

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
        className="relative p-1.5 text-slate-500 hover:text-gov-navy">
        <Bell size={16} />
        {!!unread && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-gov-saffron text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>}
      </button>
      {open && <div className="absolute right-0 top-9 w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-auto panel p-2 z-[80] shadow-xl">
        <div className="text-[11px] font-bold text-slate-500 px-2 py-1">NOTIFICATIONS</div>
        {!(data || []).length && <div className="text-xs text-slate-500 px-2 py-2">No notifications.</div>}
        {(data || []).map((n: any) => (
          <button key={n.id} onClick={() => openLink(n)} className={`block w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 ${n.read ? '' : 'bg-orange-50'}`}>
            <div className={`text-xs font-semibold ${n.read ? 'text-slate-500' : 'text-slate-900'}`}>{n.title}</div>
            <div className="text-[11px] text-slate-500 truncate">{n.body}</div>
          </button>))}
      </div>}
    </div>);
}

function Toast() {
  const { toast, setToast } = useStore();
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);
  if (!toast) return null;
  return <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gov-navy text-white text-sm font-medium rounded-lg px-4 py-2 shadow-panel z-[60]">{toast}</div>;
}

export default function Layout({ children, onCopilot }: { children: React.ReactNode; onCopilot: () => void }) {
  const { auth, setAuth, setTour } = useStore(); const nav = useNavigate();
  const [sq, setSq] = useState('');
  const goSearch = () => { if (sq.trim()) nav('/map?q=' + encodeURIComponent(sq.trim())); };
  const groups = groupsFor(auth?.role);
  return (
    <div className="flex h-screen bg-slate-100 text-slate-700">
      <aside className="w-16 md:w-60 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-slate-200">
          <Link to="/" className="font-extrabold text-gov-navy text-lg tracking-tight hidden md:block">BhuSphere <span className="text-gov-saffron">3D</span></Link>
          <div className="font-extrabold text-gov-saffron md:hidden text-center">B3D</div>
          <div className="text-[11px] text-slate-500 hidden md:block mt-0.5">Vertical Property Mapping · SIH 2026</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto scrollthin" aria-label="Primary">
          {groups.filter(g => !(g as any).roles || (auth && (g as any).roles.includes(auth.role))).map(g => (
            <div key={g.title}>
              <div className="hidden md:flex items-center gap-1.5 px-3 mb-1 th-label">{g.title}</div>
              <div className="space-y-0.5">
                {g.items.filter(([to]) => {
                  if (to === '/submit/queue') return auth && ['officer', 'admin'].includes(auth.role);
                  if (to === '/field-work') return auth && ['officer', 'surveyor', 'admin'].includes(auth.role);
                  return true;
                }).map(([to, label, Icon]: any) => (
                  <NavLink key={to} to={to} title={label as string} end={to !== '/validation'}
                    className={({ isActive }) => `relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-blue-50 text-gov-navy font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                    {({ isActive }) => (<>
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-gov-saffron" />}
                      <Icon size={17} className={isActive ? 'text-gov-saffron' : 'text-slate-400'} /><span className="hidden md:inline">{label}</span>
                    </>)}
                  </NavLink>))}
              </div>
            </div>))}
          <button onClick={onCopilot} title="AI Copilot"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gov-navy text-white hover:bg-gov-navyDark transition mt-2">
            <Bot size={17} /><span className="hidden md:inline">AI Copilot</span></button>
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="hidden md:block px-1 mb-2">
            <div className="text-xs font-semibold text-slate-900 capitalize">{auth?.username}</div>
            <div className="text-[11px] text-slate-500 capitalize">{auth?.role} · demo session</div>
          </div>
          <button onClick={() => { setAuth(null); nav('/'); }} title="Logout"
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 px-1"><LogOut size={14} /><span className="hidden md:inline">Logout</span></button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="relative z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 text-sm truncate">Vertical Property Mapping & Spatial Governance</div>
            <div className="text-[11px] text-slate-400 hidden sm:block">SIH 2026 · Problem Statement 26011 · Prototype identifiers are not official ULPINs</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <FontSizeControl tone="light" />
            <NotifBell />
            <div className="hidden md:flex items-center bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 w-64 focus-within:border-gov-navy">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input value={sq} onChange={e => setSq(e.target.value)} onKeyDown={e => e.key === 'Enter' && goSearch()}
                placeholder="Search ULPIN, parcel, building…" className="bg-transparent text-xs ml-1.5 w-full focus:outline-none placeholder:text-slate-400" />
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">DEMO</span>
            {auth?.role && STAFF.includes(auth.role) && (
            <button onClick={() => setTour(0)} title="Start guided demo tour"
              className="flex items-center gap-1.5 text-[11px] font-bold bg-gov-saffron text-white rounded-lg px-3 py-1.5 hover:bg-gov-saffronDark transition-colors whitespace-nowrap">
              <Presentation size={13} />Present</button>)}
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-slate-100">{children}</main>
      </div>
      <Toast />
      <DemoTour onCopilot={onCopilot} />
    </div>
  );
}
