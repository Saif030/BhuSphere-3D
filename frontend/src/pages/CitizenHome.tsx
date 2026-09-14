import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardEdit, History, ShieldCheck, Search, LifeBuoy, ArrowRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { SubStatus } from './Submit';

/** Citizen / property-owner home: service portal. Deliberately NO system-wide
 *  parcel/building/unit counts — only personal services. */
export default function CitizenHome() {
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
        <div className="text-[11px] font-bold uppercase tracking-widest text-gov-saffron">Namaste{auth?.username ? `, ${auth.username}` : ''} 🙏</div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">Property Owner Service Portal</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Submit your property information, track verification, and verify identities — without needing to read any
          system-wide registers or maps jargon.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to="/submit" className="btn-saffron inline-flex items-center gap-1.5"><Plus size={15} /> Submit property data</Link>
          <Link to="/submit/my" className="btn-ghost inline-flex items-center gap-1.5"><History size={15} /> My submissions{list.length ? ` (${list.length})` : ''}</Link>
          <Link to="/verify" className="btn-ghost inline-flex items-center gap-1.5"><ShieldCheck size={15} /> Verify property</Link>
        </div>
      </section>

      {/* Verify + help */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="panel-pad">
          <div className="font-bold text-slate-900 text-sm mb-1">Verify a property reference</div>
          <div className="text-xs text-slate-500 mb-2">From a QR, notice or allotment letter (demo IDs only).</div>
          <div className="flex gap-2">
            <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2.5 flex-1 focus-within:border-gov-navy">
              <Search size={14} className="text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && q.trim() && nav('/verify?ulpin=' + encodeURIComponent(q.trim()))}
                placeholder="DL-SKT-0182-B01-F08-U804" className="bg-transparent text-xs font-mono px-2 py-2 w-full focus:outline-none" />
            </div>
            <button onClick={() => q.trim() && nav('/verify?ulpin=' + encodeURIComponent(q.trim()))} className="btn-primary text-xs">Verify</button>
          </div>
        </div>
        <div className="panel-pad bg-gradient-to-br from-white to-blue-50/60">
          <div className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-1.5"><LifeBuoy size={15} className="text-gov-navy" /> New here? 3 steps</div>
          <ol className="text-xs text-slate-600 space-y-1.5 mt-1">
            <li><b className="text-slate-800">1. Submit</b> — fill the guided form; documents optional.</li>
            <li><b className="text-slate-800">2. Track</b> — watch validation → officer review on your timeline.</li>
            <li><b className="text-slate-800">3. Fix if asked</b> — resubmit corrections from My Submissions.</li>
          </ol>
          <Link to="/how-it-works" className="text-xs font-bold text-gov-navy hover:underline underline-offset-2 inline-flex items-center gap-1 mt-2">How it works <ArrowRight size={13} /></Link>
        </div>
      </section>

      {/* My submissions — personal only */}
      <section>
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <div><h2 className="text-sm font-bold text-slate-900">My submissions</h2><div className="page-sub">Only yours — newest first{pending.length ? ` · ${pending.length} in progress` : ''}</div></div>
          <Link to="/submit/new" className="ml-auto btn-primary text-xs">+ New submission</Link>
        </div>
        {!list.length && (
          <div className="panel-pad text-sm text-slate-500">
            No submissions yet. <Link to="/submit/new" className="text-gov-navy font-semibold hover:underline">Start your first submission →</Link>
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
        {list.length > 6 && <Link to="/submit/my" className="text-xs font-bold text-gov-navy hover:underline mt-2 inline-block">View all {list.length} →</Link>}
      </section>

      {/* Service cards */}
      <section>
        <h2 className="text-sm font-bold text-slate-900 mb-2">Services</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            [ClipboardEdit, 'Submit / update', 'Guided property form with map pick.', '/submit'],
            [History, 'Track status', 'Timeline + officer notes + corrections.', '/submit/my'],
            [ShieldCheck, 'Verify identity', 'Public QR/reference check.', '/verify'],
            [LifeBuoy, 'Help & contact', 'FAQs, guides and helpdesk.', '/help'],
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
        Prototype identifiers are demo references — not official Government of India ULPINs. Submissions are unverified claims until approved and never establish legal ownership.
      </div>
    </div>
  );
}
