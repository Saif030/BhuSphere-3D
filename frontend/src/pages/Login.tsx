import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useStore } from '../lib/store';

const ROLES = [['officer', 'Government Officer'], ['surveyor', 'Surveyor'], ['admin', 'Administrator'], ['public', 'Public User']];
export default function Login() {
  const [u, setU] = useState('officer'); const [pw, setPw] = useState('demo123'); const [err, setErr] = useState('');
  const { setAuth } = useStore(); const nav = useNavigate();
  const go = async () => {
    try { const r = await api.login(u, pw); localStorage.setItem('bhu_token', r.token);
      setAuth({ username: r.username, role: r.role }); nav('/'); }
    catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-2xl font-bold text-navy">BhuSphere 3D</div>
        <div className="text-sm text-slate-500 mb-1">3D Cadastral Intelligence Platform</div>
        <div className="text-xs text-slate-500 mb-5">Vertical Property Mapping & Spatial Governance · SIH 2026 PS-26011</div>
        <label className="text-xs font-medium">Demo role</label>
        <div className="grid grid-cols-2 gap-2 my-2">{ROLES.map(([v, l]) =>
          <button key={v} onClick={() => setU(v)} className={`border rounded-lg px-2 py-2 text-sm ${u === v ? 'bg-navy text-white' : 'hover:bg-slate-50'}`}>{l}</button>)}</div>
        <label className="text-xs font-medium">Password</label>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 mb-3" />
        {err && <div className="text-red-600 text-xs mb-2">{err}</div>}
        <button onClick={go} className="w-full bg-navy text-white rounded-lg py-2 font-medium">Sign in (mock auth)</button>
        <div className="text-[11px] text-slate-500 mt-3">All roles use password <b>demo123</b>. Prototype identifiers are not official Government of India ULPINs.</div>
      </div>
    </div>
  );
}
