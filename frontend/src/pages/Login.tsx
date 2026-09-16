import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Layers, ShieldCheck, ScanLine, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';

export default function Login() {
  const { t } = useLang();
  // Role `value`s (first element) are sent to the backend — never translate those.
  const ROLES: [string, string, string][] = [
    ['officer', t('login.officer'), t('login.officerD')],
    ['surveyor', t('login.surveyor'), t('login.surveyorD')],
    ['admin', t('login.admin'), t('login.adminD')],
    ['citizen', t('login.citizen'), t('login.citizenD')],
  ];
  const POINTS = [
    [Building2, t('login.p1')],
    [Layers, t('login.p2')],
    [ShieldCheck, t('login.p3')],
    [ScanLine, t('login.p4')],
  ];
  const [sp] = useSearchParams();
  const initial = sp.get('role') && ROLES.some(([v]) => v === sp.get('role')) ? sp.get('role')! : 'officer';
  const [u, setU] = useState(initial); const [pw, setPw] = useState('demo123');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const { setAuth } = useStore(); const nav = useNavigate();
  const go = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api.login(u, pw); localStorage.setItem('bhu_token', r.token);
      const auth = { username: r.username, role: r.role };
      setAuth(auth);
      const next = sp.get('next');
      if (next && next.startsWith('/')) nav(next);
      else if (r.role === 'citizen') nav('/home');
      else nav('/dashboard');
    }
    catch (e: any) { setErr(t('login.fail')); }
    setBusy(false);
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex items-stretch">
      <div className="hidden lg:flex w-[46%] flex-col justify-between p-12 bg-gov-navy text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 tricolor" aria-hidden />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white mb-6"><ArrowLeft size={13} /> {t('login.back')}</Link>
          <div className="font-extrabold text-3xl tracking-tight">BhuSphere <span className="text-orange-300">3D</span> <span className="text-base font-semibold text-slate-300">| भू-क्षेत्र 3D</span></div>
          <div className="text-orange-200 text-sm mt-1">{t('login.vert')}</div>
          <div className="text-slate-300 text-xs mt-1">{t('login.sih')}</div>
        </div>
        <div className="space-y-4">
          {POINTS.map(([Icon, t]: any) => (
            <div key={t} className="flex items-center gap-3 text-sm text-slate-100 animate-fade-up">
              <span className="p-2 rounded-lg bg-white/10 border border-white/15"><Icon size={17} className="text-orange-300" /></span>{t}</div>))}
        </div>
        <div className="text-[11px] text-slate-300">{t('login.disclaimer')}</div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md panel-pad !p-8">
          <Link to="/" className="lg:hidden inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-gov-navy mb-3"><ArrowLeft size={13} /> {t('login.portalHome')}</Link>
          <div className="lg:hidden font-extrabold text-gov-navy text-2xl mb-1">BhuSphere <span className="text-gov-saffron">3D</span></div>
          <div className="font-bold text-slate-900 text-xl">{t('login.title')}</div>
          <div className="page-sub mb-5">{t('login.sub')}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4" role="radiogroup" aria-label={t('login.role')}>
            {ROLES.map(([v, l, d]) => (
              <button key={v} role="radio" aria-checked={u === v} onClick={() => setU(v)}
                className={`text-left border rounded-xl px-3 py-2.5 transition-colors ${u === v ? 'border-gov-navy bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className={`text-sm font-semibold ${u === v ? 'text-gov-navy' : 'text-slate-700'}`}>{l}</div>
                <div className="text-[11px] text-slate-500">{d}</div></button>))}
          </div>
          <label className="text-xs font-medium text-slate-700" htmlFor="pw">{t('login.pw')}</label>
          <input id="pw" type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()}
            className="input w-full mt-1 mb-3" placeholder="demo123" />
          {err && <div role="alert" className="text-red-700 text-xs mb-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
          <button onClick={go} disabled={busy} className="btn-primary w-full !py-2.5">{busy ? t('login.signing') : u === 'citizen' ? t('login.portal') : t('login.dash')}</button>
          <div className="text-[11px] text-slate-500 mt-3 text-center">{t('login.allpw')} <b className="text-slate-700">demo123</b> · <Link to="/help" className="gov-link">{t('login.help')}</Link></div>
        </div>
      </div>
    </div>
  );
}
