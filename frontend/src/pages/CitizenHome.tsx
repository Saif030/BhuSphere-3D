import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardEdit, History, ShieldCheck, Search, LifeBuoy, ArrowRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { SubStatus } from './Submit';

/** Citizen / property-owner home: service portal. Deliberately NO system-wide
 *  parcel/building/unit counts — only personal services. */
export default function CitizenHome() {
  const { t } = useLang();
  const { auth } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const { data: mine } = useQuery({ queryKey: ['my-subs-home'], queryFn: () => api.get('/api/submissions/my'), retry: false });
  const list = mine || [];
  const pending = list.filter((s: any) => !['APPROVED', 'INTEGRATED', 'REJECTED'].includes(s.status));

  return (
    <div className="p-5 space-y-5 max-w-[1100px] mx-auto">
      {/* Welcome */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-panel p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 tricolor" aria-hidden />
        <div className="text-[11px] font-bold uppercase tracking-widest text-gov-saffron">{t('ch.hello', { name: auth?.username ? `, ${auth.username}` : '' })}</div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">{t('ch.title')}</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          {t('ch.sub')}
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to="/submit" className="btn-saffron inline-flex items-center gap-1.5"><Plus size={15} /> {t('ch.submit')}</Link>
          <Link to="/submit/my" className="btn-ghost inline-flex items-center gap-1.5"><History size={15} /> {t('ch.my')}{list.length ? ` (${list.length})` : ''}</Link>
          <Link to="/verify" className="btn-ghost inline-flex items-center gap-1.5"><ShieldCheck size={15} /> {t('ch.verify')}</Link>
        </div>
      </section>

      {/* Verify + help */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="panel-pad">
          <div className="font-bold text-slate-900 text-sm mb-1">{t('ch.verifyBox')}</div>
          <div className="text-xs text-slate-500 mb-2">{t('ch.verifyBoxS')}</div>
          <div className="flex gap-2">
            <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2.5 flex-1 focus-within:border-gov-navy">
              <Search size={14} className="text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && q.trim() && nav('/verify?ulpin=' + encodeURIComponent(q.trim()))}
                placeholder="DL-SKT-0182-B01-F08-U804" className="bg-transparent text-xs font-mono px-2 py-2 w-full focus:outline-none" />
            </div>
            <button onClick={() => q.trim() && nav('/verify?ulpin=' + encodeURIComponent(q.trim()))} className="btn-primary text-xs">{t('verify.btn')}</button>
          </div>
        </div>
        <div className="panel-pad bg-gradient-to-br from-white to-blue-50/60">
          <div className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-1.5"><LifeBuoy size={15} className="text-gov-navy" /> {t('ch.new3')}</div>
          <ol className="text-xs text-slate-600 space-y-1.5 mt-1">
            <li>1. {t('ch.s1')}</li>
            <li>2. {t('ch.s2')}</li>
            <li>3. {t('ch.s3')}</li>
          </ol>
          <Link to="/how-it-works" className="text-xs font-bold text-gov-navy hover:underline underline-offset-2 inline-flex items-center gap-1 mt-2">{t('ch.how')} <ArrowRight size={13} /></Link>
        </div>
      </section>

      {/* My submissions — personal only */}
      <section>
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <div><h2 className="text-sm font-bold text-slate-900">{t('ch.myT')}</h2><div className="page-sub">{t('ch.myS')}{pending.length ? ` · ${pending.length} ${t('ch.inprog')}` : ''}</div></div>
          <Link to="/submit/new" className="ml-auto btn-primary text-xs">{t('ch.newSub')}</Link>
        </div>
        {!list.length && (
          <div className="panel-pad text-sm text-slate-500">
            {t('ch.empty')} <Link to="/submit/new" className="text-gov-navy font-semibold hover:underline">{t('ch.startFirst')}</Link>
          </div>
        )}
        <div className="space-y-2">
          {list.slice(0, 6).map((s: any) => (
            <Link key={s.submission_id} to={`/submit/track/${s.submission_id}`}
              className="panel p-3.5 flex flex-wrap items-center gap-2 hover:border-gov-navy/40 transition-colors">
              <span className="font-mono font-bold text-gov-navy text-xs">{s.submission_id}</span>
              <span className="text-xs text-slate-600">{s.payload?.property_name || s.property_type} · v{s.version}</span>
              <SubStatus s={s.status} />
              <span className="ml-auto text-[11px] text-slate-400">{s.updated_at?.slice(0, 16).replace('T', ' ')}</span>
            </Link>
          ))}
        </div>
        {list.length > 6 && <Link to="/submit/my" className="text-xs font-bold text-gov-navy hover:underline mt-2 inline-block">{t('c.viewAll')} {list.length} →</Link>}
      </section>

      {/* Service cards */}
      <section>
        <h2 className="text-sm font-bold text-slate-900 mb-2">{t('ch.services')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            [ClipboardEdit, t('ch.sc1t'), t('ch.sc1d'), '/submit'],
            [History, t('ch.sc2t'), t('ch.sc2d'), '/submit/my'],
            [ShieldCheck, t('ch.sc3t'), t('ch.sc3d'), '/verify'],
            [LifeBuoy, t('ch.sc4t'), t('ch.sc4d'), '/help'],
          ].map(([Icon, t, d, to]: any) => (
            <Link key={t} to={to} className="gov-card">
              <Icon size={19} className="text-gov-navy" />
              <div className="font-bold text-slate-900 text-sm mt-2">{t}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{d}</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="text-[11px] text-slate-400 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5">
        {t('ch.disclaimer')}
      </div>
    </div>
  );
}
