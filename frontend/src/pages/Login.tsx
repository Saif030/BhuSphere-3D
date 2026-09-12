import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Layers, ShieldCheck, ScanLine } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';

const ROLES: [string, string, string][] = [
  ['officer', 'Government Officer', 'Review, approve & resolve conflicts'],
  ['surveyor', 'Surveyor', 'Inspect geometry & submit verification'],
  ['admin', 'Administrator', 'Datasets, rules & analytics'],
  ['citizen', 'Property Owner / Citizen', 'Submit property data for verification'],
  ['public', 'Public User', 'Safe public property identity'],
];
const POINTS = [
  [Building2, 'Parcel → building → floor → unit as 3D spatial volumes'],
  [Layers, 'GIS, LiDAR, drone, GNSS & floor-plan evidence fusion'],
  [ShieldCheck, 'AI-assisted topology validation + confidence scoring'],
  [ScanLine, 'QR digital identity for every property'],
];

export default function Login() {
  const [u, setU] = useState('officer'); const [pw, setPw] = useState('demo123');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const { setAuth } = useStore(); const nav = useNavigate();
  const go = async () => {
    setBusy(true); setErr('');
    try { const r = await api.login(u, pw); localStorage.setItem('bhu_token', r.token);
      setAuth({ username: r.username, role: r.role }); nav('/'); }
    catch (e: any) { setErr('Sign-in failed. Use a demo role with password demo123.'); }
    setBusy(false);
  };
  return (
    <div className="min-h-screen bg-night-950 text-slate-200 flex items-stretch">
      <div className="hidden lg:flex w-[46%] flex-col justify-between p-12 bg-gradient-to-br from-night-900 via-night-850 to-night-700 border-r border-white/10 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-accent-500/10 blur-3xl" />
        <div>
          <div className="font-extrabold text-white text-3xl tracking-tight">BhuSphere <span className="text-accent-400">3D</span></div>
          <div className="text-accent-300 text-sm mt-1">3D Cadastral Intelligence Platform</div>
          <div className="text-slate-400 text-xs mt-1">SIH 2026 · Problem Statement 26011 · Vertical Property Mapping & Spatial Governance</div>
        </div>
        <div className="space-y-4">
          {POINTS.map(([Icon, t]: any) => (
            <div key={t} className="flex items-center gap-3 text-sm text-slate-300">
              <span className="p-2 rounded-lg bg-white/5 border border-white/10"><Icon size={17} className="text-accent-400" /></span>{t}</div>))}
        </div>
        <div className="text-[11px] text-slate-500">Prototype identifiers are demo references — not official Government of India ULPINs.</div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md panel-pad !p-8">
          <div className="lg:hidden font-extrabold text-white text-2xl mb-1">BhuSphere <span className="text-accent-400">3D</span></div>
          <div className="font-bold text-white text-xl">Sign in</div>
          <div className="page-sub mb-5">Mock authentication · pick a demo role to explore its workspace</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4" role="radiogroup" aria-label="Demo role">
            {ROLES.map(([v, l, d]) => (
              <button key={v} role="radio" aria-checked={u === v} onClick={() => setU(v)}
                className={`text-left border rounded-xl px-3 py-2.5 transition-colors ${u === v ? 'border-accent-400 bg-accent-400/10' : 'border-white/10 hover:bg-white/5'}`}>
                <div className={`text-sm font-semibold ${u === v ? 'text-white' : 'text-slate-300'}`}>{l}</div>
                <div className="text-[11px] text-slate-500">{d}</div></button>))}
          </div>
          <label className="text-xs font-medium text-slate-300" htmlFor="pw">Password</label>
          <input id="pw" type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()}
            className="input w-full mt-1 mb-3" placeholder="demo123" />
          {err && <div role="alert" className="text-red-300 text-xs mb-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{err}</div>}
          <button onClick={go} disabled={busy} className="btn-primary w-full !py-2.5">{busy ? 'Signing in…' : 'Sign in to command center'}</button>
          <div className="text-[11px] text-slate-500 mt-3 text-center">All demo roles use password <b className="text-slate-300">demo123</b></div>
        </div>
      </div>
    </div>
  );
}
