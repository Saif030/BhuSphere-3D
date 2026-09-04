import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LayoutDashboard, Map as MapIcon, Box, Globe, ShieldAlert, Cable, Bot, FileText, Settings, LogOut } from 'lucide-react';
import { useStore } from '../lib/store';

const NAV = [
  ['/', 'Overview', LayoutDashboard], ['/map', 'Map', MapIcon], ['/city', 'City 3D', Globe], ['/3d', '3D Cadastre', Box],
  ['/validation', 'Validation', ShieldAlert], ['/infrastructure', 'Infrastructure', Cable],
  ['/reports', 'Reports', FileText], ['/admin', 'Admin', Settings],
];
function Toast() {
  const { toast, setToast } = useStore();
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);
  if (!toast) return null;
  return <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-navy text-white text-sm rounded-lg px-4 py-2 shadow-xl z-[60]">{toast}</div>;
}
export default function Layout({ children, onCopilot }: { children: React.ReactNode; onCopilot: () => void }) {
  const { auth, setAuth } = useStore(); const nav = useNavigate();
  return (
    <div className="flex h-screen">
      <aside className="w-16 md:w-56 bg-navy text-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10"><div className="font-bold text-white text-lg hidden md:block">BhuSphere 3D</div>
          <div className="font-bold text-white md:hidden">B3D</div>
          <div className="text-[11px] text-sky-300 hidden md:block">3D Cadastral Intelligence Platform</div></div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto" aria-label="Primary">
          {NAV.map(([to, label, Icon]: any) => (
            <NavLink key={to} to={to} title={label as string} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-white/15 text-white' : 'hover:bg-white/5'}`}>
              <Icon size={16} /><span className="hidden md:inline">{label}</span></NavLink>))}
          <button onClick={onCopilot} title="AI Copilot" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-sky-600 text-white hover:bg-sky-500 mt-2"><Bot size={16} /><span className="hidden md:inline">AI Copilot</span></button>
        </nav>
        <div className="p-3 border-t border-white/10 text-xs">
          <div className="font-medium text-white hidden md:block">{auth?.username} · {auth?.role}</div>
          <div className="text-slate-400 mb-2 hidden md:block">Prototype — not an official ULPIN</div>
          <button onClick={() => { setAuth(null); nav('/login'); }} title="Logout" className="flex items-center gap-1 text-slate-300 hover:text-white"><LogOut size={13} /><span className="hidden md:inline">Logout</span></button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-4 py-2 flex items-center gap-3 text-sm">
          <span className="font-semibold text-navy">Vertical Property Mapping & Spatial Governance</span>
          <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">SIH 2026 · PS-26011 · DEMO MODE</span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
        <Toast />
      </div>
    </div>
  );
}
