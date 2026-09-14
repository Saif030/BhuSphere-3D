import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ClipboardEdit, History, Map as MapIcon, Box, LifeBuoy,
  ArrowRight, Search, Building2, Layers, ScanLine, Bell, FileText, Phone, Mail, MapPin, CheckCircle2,
} from 'lucide-react';
import PublicLayout, { Reveal } from '../components/gov';
import { SERVICES, STEPS_CITIZEN, NOTICES, FAQS, PORTAL_META } from '../lib/content';
import { api } from '../lib/api';

const ICONS: Record<string, any> = {
  ShieldCheck, ClipboardEdit, Track: History, Map: MapIcon, Box, Help: LifeBuoy,
};

function PageHead({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <div className="max-w-3xl">
      <div className="text-[11px] font-bold uppercase tracking-widest text-gov-saffron">{kicker}</div>
      <h1 className="gov-section-title mt-1">{title}</h1>
      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{sub}</p>
    </div>
  );
}

/* ---------------- HOME ---------------- */
export function Home() {
  const nav = useNavigate();
  const [q, setQ] = useState('DL-SKT-0182-B01-F08-U804');
  const goVerify = () => {
    const v = q.trim().toUpperCase();
    if (v) nav('/verify?ulpin=' + encodeURIComponent(v));
  };
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="grid lg:grid-cols-[1.2fr_.8fr] gap-6 items-center bg-white border border-slate-200 rounded-2xl shadow-panel p-6 md:p-10 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 tricolor" aria-hidden />
        <Reveal>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold text-gov-navy bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-gov-green animate-pulse" /> SIH 2026 PROTOTYPE · DILRMP-INSPIRED
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mt-3 leading-tight">
            Vertical property records, <span className="text-gov-navy">floor by floor,</span>{' '}
            <span className="text-gov-saffron">unit by unit.</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 mt-3 leading-relaxed max-w-xl">
            BhuSphere 3D demonstrates how parcels, buildings, floors and apartments can be mapped as 3D
            spatial volumes — with validation, QR identity and a citizen submission workflow aligned to
            Digital India Land Records Modernisation Programme concepts.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Link to="/verify" className="btn-primary !px-5 !py-2.5 inline-flex items-center gap-1.5">
              Verify property <ArrowRight size={15} />
            </Link>
            <Link to="/login?role=citizen" className="btn-saffron !px-5 !py-2.5">Submit property data</Link>
            <Link to="/about" className="btn-ghost !px-5 !py-2.5">Learn more</Link>
          </div>
          {/* ULPIN search */}
          <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <label htmlFor="home-ulpin" className="text-xs font-semibold text-slate-700">
              Verify by property reference (demo ULPIN)
            </label>
            <div className="flex gap-2 mt-1.5">
              <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2.5 flex-1 focus-within:border-gov-navy">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  id="home-ulpin"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && goVerify()}
                  placeholder="e.g. DL-SKT-0182-B01-F08-U804"
                  className="bg-transparent text-sm font-mono px-2 py-2 w-full focus:outline-none"
                />
              </div>
              <button onClick={goVerify} className="btn-primary shrink-0">Verify</button>
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">{PORTAL_META.disclaimer}</div>
          </div>
        </Reveal>
        <Reveal delay={120} className="hidden lg:block">
          <div className="bg-gradient-to-br from-blue-50 via-white to-orange-50 border border-slate-200 rounded-2xl p-6 animate-float-soft">
            <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">Property stack</div>
            <div className="mt-3 space-y-1.5" aria-hidden>
              {[
                ['Parcel · DL-SKT-0182', 'Survey + locality record', 'bg-gov-navy'],
                ['Building · B01 Green Residency', '12 floors · verified height', 'bg-blue-500'],
                ['Floor · F08', 'z 24–27 m · 8 units', 'bg-sky-400'],
                ['Unit · U804', '96.4% confidence · QR identity', 'bg-gov-saffron'],
              ].map(([t, s, c]) => (
                <div key={t} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
                  <span className={`w-2.5 h-9 rounded-full ${c}`} />
                  <div><div className="text-xs font-bold text-slate-800 font-mono">{t}</div><div className="text-[11px] text-slate-500">{s}</div></div>
                  <ShieldCheck size={15} className="ml-auto text-gov-green" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              {[[Building2, '3D volumes'], [Layers, 'GIS + LiDAR'], [ScanLine, 'QR identity']].map(([Icon, t]: any) => (
                <div key={t} className="bg-white border border-slate-200 rounded-xl py-2.5 px-1">
                  <Icon size={17} className="mx-auto text-gov-navy" /><div className="text-[11px] font-semibold text-slate-600 mt-1">{t}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Trust strip */}
      <Reveal className="mt-4">
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          {[
            ['Bhu-Aadhaar concept', 'Demo ULPINs show parcel → unit lineage like the national ULPIN idea.'],
            ['DILRMP-aligned flow', 'Submit → validate → officer verification → approval. No bypass.'],
            ['QR for every unit', 'Public identity carries safe fields only — no sensitive owner data.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex gap-2.5">
              <CheckCircle2 size={16} className="text-gov-green shrink-0 mt-0.5" />
              <div><div className="font-bold text-slate-800">{t}</div><div className="text-slate-500 mt-0.5">{d}</div></div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Services */}
      <section className="mt-10">
        <Reveal>
          <div className="flex items-end gap-3 flex-wrap">
            <div><div className="text-[11px] font-bold uppercase tracking-widest text-gov-saffron">Citizen services</div>
            <h2 className="gov-section-title">What can you do here?</h2></div>
            <Link to="/services" className="ml-auto text-sm font-semibold text-gov-navy hover:underline underline-offset-2">All services →</Link>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {SERVICES.map((s, i) => {
            const Icon = ICONS[s.icon] || FileText;
            return (
              <Reveal key={s.title} delay={i * 60}>
                <Link to={s.to} className="gov-card block h-full">
                  <span className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center"><Icon size={19} className="text-gov-navy" /></span>
                  <div className="font-bold text-slate-900 mt-3">{s.title}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">{s.desc}</div>
                  <div className="text-xs font-bold text-gov-saffron mt-2">Open →</div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-10 bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
        <Reveal>
          <div className="text-[11px] font-bold uppercase tracking-widest text-gov-saffron">How it works</div>
          <h2 className="gov-section-title">From submission to verified record</h2>
        </Reveal>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {STEPS_CITIZEN.map((s, i) => (
            <Reveal key={s.n} delay={i * 70}>
              <li className="bg-slate-50 border border-slate-200 rounded-xl p-4 h-full">
                <div className="w-8 h-8 rounded-full bg-gov-navy text-white text-sm font-bold flex items-center justify-center">{s.n}</div>
                <div className="font-bold text-slate-900 mt-2.5">{s.title}</div>
                <div className="text-xs text-slate-500 mt-1 leading-relaxed">{s.desc}</div>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal>
          <div className="mt-4 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Citizen submissions are <b>unverified claims</b> until an authorised officer approves them. Ownership details never establish legal title.
          </div>
        </Reveal>
      </section>

      {/* Notices + Help */}
      <section className="mt-10 grid lg:grid-cols-2 gap-4">
        <Reveal>
          <div className="panel-pad h-full">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={16} className="text-gov-saffron" />
              <h2 className="font-bold text-slate-900">Notices & updates</h2>
              <span className="ml-auto text-[11px] text-slate-400">Demo board</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {NOTICES.map((n) => (
                <li key={n.title} className="py-2.5 flex gap-3 text-sm">
                  <span className="text-[10px] font-bold h-fit mt-0.5 px-2 py-0.5 rounded-full bg-blue-50 text-gov-navy border border-blue-100 whitespace-nowrap">{n.tag}</span>
                  <div><div className="text-slate-800 font-medium leading-snug">{n.title}</div><div className="text-[11px] text-slate-400 mt-0.5">{n.date}</div></div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="panel-pad h-full">
            <h2 className="font-bold text-slate-900 mb-1">Who is this for?</h2>
            <p className="text-xs text-slate-500 mb-3">One portal, role-based workspaces after login.</p>
            <div className="space-y-2 text-sm">
              {[
                ['Property Owner / Citizen', 'Submit, track, correction, QR identity. No system counts — only your services.'],
                ['Government Officer', 'Verification queue, approvals, validation centre, reports, audit trail.'],
                ['Surveyor', 'Field checks, geometry inspection, measurement verification.'],
              ].map(([t, d]) => (
                <div key={t} className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <div className="font-bold text-slate-800 text-[13px]">{t}</div><div className="text-xs text-slate-500">{d}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Link to="/login" className="btn-primary text-xs">Sign in to workspace</Link>
              <Link to="/help" className="btn-ghost text-xs">Read FAQs</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}

/* ---------------- ABOUT ---------------- */
export function About() {
  return (
    <PublicLayout trail={[{ label: 'Home', to: '/' }, { label: 'About Us' }]}>
      <Reveal><PageHead kicker="About us" title="About BhuSphere 3D" sub="A Smart India Hackathon 2026 prototype for vertical property mapping — showing how India's land-records ideas (DILRMP, ULPIN/Bhu-Aadhaar, Bhu-Naksha) extend naturally into 3D." /></Reveal>
      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Reveal>
          <div className="panel-pad space-y-3 text-sm text-slate-600 leading-relaxed h-full">
            <h2 className="font-bold text-slate-900">Mission</h2>
            <p>Urban India stacks homes vertically — but most cadastral maps stop at the ground parcel. BhuSphere 3D prototypes a <b className="text-slate-800">parcel → building → floor → unit</b> volume model so apartments, basements and utilities each carry identity, geometry, evidence and verification state.</p>
            <p>It fuses GIS, LiDAR-derived heights, drone/survey evidence and floor plans, then runs AI-assisted topology checks. <b className="text-slate-800">Every finding needs human review</b> — the system never auto-declares truth.</p>
            <h2 className="font-bold text-slate-900 pt-1">Aligned to national programmes</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li><b>DILRMP</b> — modern, transparent land-records management; RoR + cadastral map integration.</li>
              <li><b>ULPIN / Bhu-Aadhaar</b> — single authoritative parcel identity (14-digit nationally; extended demo references here for 3D stacking).</li>
              <li><b>Bhu-Naksha / NGDRS concepts</b> — map-based services, registration linkages, citizen access.</li>
            </ul>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="space-y-4">
            <div className="panel-pad">
              <h2 className="font-bold text-slate-900 text-sm mb-2">What this prototype IS</h2>
              <ul className="text-sm text-slate-600 space-y-1.5">
                {['Interactive 2D map + 3D tower demo on synthetic data', 'Citizen submit → officer verify workflow with audit trail', 'Public QR identity with safe fields only', 'Validation centre showing evidence + confidence honestly'].map((t) => (
                  <li key={t} className="flex gap-2"><CheckCircle2 size={15} className="text-gov-green shrink-0 mt-0.5" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="panel-pad !border-amber-300 !bg-amber-50">
              <h2 className="font-bold text-amber-900 text-sm mb-2">What it is NOT</h2>
              <ul className="text-sm text-amber-800 space-y-1.5 list-disc ml-5">
                <li>Not an official Government of India website.</li>
                <li>Demo ULPIN-like IDs are not real Bhu-Aadhaar numbers.</li>
                <li>Submissions and AI scores do not confer legal ownership.</li>
                <li>City-scale counts on staff screens are illustrative, not census data.</li>
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </PublicLayout>
  );
}

/* ---------------- SERVICES ---------------- */
export function Services() {
  return (
    <PublicLayout trail={[{ label: 'Home', to: '/' }, { label: 'Services' }]}>
      <Reveal><PageHead kicker="Services" title="Citizen & department services" sub="Start here. Public services need no login; workspace actions sign you in with a demo role." /></Reveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
        {SERVICES.map((s, i) => {
          const Icon = ICONS[s.icon] || FileText;
          return (
            <Reveal key={s.title} delay={Math.min(i * 60, 240)}>
              <Link to={s.to} className="gov-card block h-full">
                <span className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center"><Icon size={19} className="text-gov-navy" /></span>
                <div className="font-bold text-slate-900 mt-3">{s.title}</div>
                <div className="text-xs text-slate-500 mt-1">{s.desc}</div>
                <div className="text-xs font-bold text-gov-saffron mt-2">Open service →</div>
              </Link>
            </Reveal>
          );
        })}
      </div>
      <Reveal>
        <div className="mt-6 panel-pad text-xs text-slate-500">
          Map and 3D workspaces open in the signed-in demo. Try <b className="text-slate-700">Public User / demo123</b> for safe browsing, or <b className="text-slate-700">citizen / demo123</b> to submit.
        </div>
      </Reveal>
    </PublicLayout>
  );
}

/* ---------------- HOW IT WORKS ---------------- */
export function HowItWorks() {
  const [tab, setTab] = useState<'citizen' | 'officer'>('citizen');
  return (
    <PublicLayout trail={[{ label: 'Home', to: '/' }, { label: 'How It Works' }]}>
      <Reveal><PageHead kicker="How it works" title="How property data becomes a verified record" sub="Two lanes: citizen claims that must be verified, and authorised department sources that skip the citizen queue." /></Reveal>
      <Reveal>
        <div className="flex bg-white border border-slate-200 rounded-lg p-1 w-fit mt-5 text-sm" role="tablist" aria-label="Workflow lane">
          {(['citizen', 'officer'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md font-semibold capitalize ${tab === t ? 'bg-gov-navy text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              {t === 'citizen' ? 'Property owner' : 'Officer / dept'}
            </button>
          ))}
        </div>
      </Reveal>
      {tab === 'citizen' ? (
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {STEPS_CITIZEN.map((s, i) => (
            <Reveal key={s.n} delay={i * 60}>
              <li className="gov-card"><div className="w-8 h-8 rounded-full bg-gov-navy text-white text-sm font-bold flex items-center justify-center">{s.n}</div>
              <div className="font-bold text-slate-900 mt-2.5">{s.title}</div><div className="text-xs text-slate-500 mt-1">{s.desc}</div></li>
            </Reveal>
          ))}
        </ol>
      ) : (
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {[
            ['1', 'Department submit', 'Authorised officer/surveyor submits with department name.'],
            ['2', 'Auto validation', 'Technical checks run; record integrates or flags Needs Review.'],
            ['3', 'Queue (citizen only)', 'Department sources never enter the citizen verification queue.'],
            ['4', 'Audit + reports', 'Every action writes to the audit trail and reports.'],
          ].map(([n, t, d], i) => (
            <Reveal key={n} delay={i * 60}>
              <li className="gov-card"><div className="w-8 h-8 rounded-full bg-gov-green text-white text-sm font-bold flex items-center justify-center">{n}</div>
              <div className="font-bold text-slate-900 mt-2.5">{t}</div><div className="text-xs text-slate-500 mt-1">{d}</div></li>
            </Reveal>
          ))}
        </ol>
      )}
      <Reveal>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/login?role=citizen" className="btn-saffron">Start as property owner</Link>
          <Link to="/verify" className="btn-ghost">Verify a property first</Link>
        </div>
      </Reveal>
    </PublicLayout>
  );
}

/* ---------------- VERIFY (public) ---------------- */
export function VerifyPublic() {
  const params = new URLSearchParams(window.location.search);
  const [ulpin, setUlpin] = useState(params.get('ulpin') || 'DL-SKT-0182-B01-F08-U804');
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const lookup = async (v?: string) => {
    const id = (v ?? ulpin).trim().toUpperCase();
    if (!id) return;
    setBusy(true); setErr(''); setRes(null);
    try {
      const u = await api.get('/api/properties/' + id);
      setRes(u);
    } catch (e: any) { setErr('Property not found for ' + id + '. Check the reference or QR and try again.'); }
    setBusy(false);
  };
  return (
    <PublicLayout trail={[{ label: 'Home', to: '/' }, { label: 'Verify Property' }]}>
      <Reveal><PageHead kicker="Verify property" title="Verify a property identity" sub="Enter the demo reference from a QR or notice. Public mode shows geometry, verification status and reference only." /></Reveal>
      <Reveal>
        <div className="panel-pad mt-5 max-w-2xl">
          <label htmlFor="verify-ulpin" className="text-xs font-semibold text-slate-700">Property reference / demo ULPIN</label>
          <div className="flex gap-2 mt-1.5">
            <input id="verify-ulpin" value={ulpin} onChange={(e) => setUlpin(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && lookup()} placeholder="DL-SKT-0182-B01-F08-U804"
              className="input flex-1 font-mono" />
            <button onClick={() => lookup()} disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'Verifying…' : 'Verify'}</button>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">{PORTAL_META.disclaimer}</div>
          {err && <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{err}</div>}
        </div>
      </Reveal>
      {res && (
        <Reveal>
          <div className="panel-pad mt-4 max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-gov-green" />
              <div className="font-bold text-slate-900">Public property identity</div>
              <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{res.verification_status}</span>
            </div>
            <div className="font-mono font-bold text-gov-navy">{res.prototype_ulpin}</div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[['Parcel', res.parcel], ['Building', res.building], ['Floor', res.floor_label], ['Unit', res.unit], ['Area', res.area_sqft + ' sq.ft'], ['Vertical', `${res.z_min}–${res.z_max} m`]].map(([k, v]) => (
                <div key={k} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"><span className="text-slate-500">{k}:</span> <span className="text-slate-800 font-medium">{v}</span></div>
              ))}
            </div>
            <div className="text-xs text-slate-500">Confidence {res.confidence}% · Ownership detail requires an authorised role.</div>
            <div className="flex gap-2">
              <Link to={'/property/' + res.prototype_ulpin} className="btn-primary text-xs">Open full identity card →</Link>
              <Link to="/help" className="btn-ghost text-xs">What does this mean?</Link>
            </div>
          </div>
        </Reveal>
      )}
    </PublicLayout>
  );
}

/* ---------------- HELP ---------------- */
export function Help() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <PublicLayout trail={[{ label: 'Home', to: '/' }, { label: 'Help / FAQ' }]}>
      <Reveal><PageHead kicker="Help" title="Help & frequently asked questions" sub="Short answers for citizens, departments and evaluators. Demo logins use password demo123." /></Reveal>
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 mt-6">
        <div className="space-y-2">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={Math.min(i * 40, 200)}>
              <div className={`bg-white border rounded-xl ${open === i ? 'border-gov-navy' : 'border-slate-200'}`}>
                <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="w-full text-left px-4 py-3 flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{f.q}</span>
                  <span className="ml-auto text-gov-saffron font-bold">{open === i ? '−' : '+'}</span>
                </button>
                {open === i && <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{f.a}</div>}
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <aside className="panel-pad space-y-3 h-fit">
            <h2 className="font-bold text-slate-900 text-sm">Demo accounts</h2>
            <div className="text-xs text-slate-600 space-y-1.5">
              {[['citizen', 'Property owner — submit & track'], ['public', 'Safe browsing + QR identity'], ['officer', 'Verify queue + approvals'], ['surveyor', 'Field checks + geometry'], ['admin', 'Datasets + audit']].map(([r, d]) => (
                <div key={r} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"><b className="text-slate-800">{r}</b> <span className="text-slate-500">/ demo123 — {d}</span></div>
              ))}
            </div>
            <Link to="/login" className="btn-primary text-xs w-full text-center block">Go to login</Link>
            <Link to="/contact" className="btn-ghost text-xs w-full text-center block">Contact helpdesk</Link>
          </aside>
        </Reveal>
      </div>
    </PublicLayout>
  );
}

/* ---------------- CONTACT ---------------- */
export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', topic: 'Property submission', msg: '' });
  const [sent, setSent] = useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.msg.trim()) return;
    const box = JSON.parse(localStorage.getItem('bhu_contact') || '[]');
    const rec = { ...form, at: new Date().toISOString(), id: 'ENQ-' + String(box.length + 1).padStart(4, '0') };
    localStorage.setItem('bhu_contact', JSON.stringify([...box, rec]));
    setSent(rec.id);
    setForm({ name: '', email: '', topic: 'Property submission', msg: '' });
  };
  return (
    <PublicLayout trail={[{ label: 'Home', to: '/' }, { label: 'Contact Us' }]}>
      <Reveal><PageHead kicker="Contact us" title="Contact the helpdesk" sub="Demo helpdesk — enquiries are saved in your browser only and are never sent to a real department." /></Reveal>
      <div className="grid lg:grid-cols-[1fr_340px] gap-4 mt-6">
        <Reveal>
          <form onSubmit={submit} className="panel-pad space-y-3">
            {sent && <div role="status" className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">Enquiry <b>{sent}</b> saved locally (demo). Our team would respond within 2 working days on a live portal.</div>}
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-slate-700">Full name *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input w-full mt-1" required /></label>
              <label className="block text-xs font-medium text-slate-700">Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input w-full mt-1" placeholder="you@example.in" /></label>
            </div>
            <label className="block text-xs font-medium text-slate-700">Topic
              <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="select w-full mt-1">
                {['Property submission', 'Verification / ULPIN', 'Map / 3D issue', 'Grievance (demo)', 'Other'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">Message *<textarea value={form.msg} onChange={(e) => setForm({ ...form, msg: e.target.value })} rows={5} className="input w-full mt-1" required placeholder="Describe your query…" /></label>
            <button type="submit" className="btn-primary">Submit enquiry (demo)</button>
          </form>
        </Reveal>
        <Reveal delay={100}>
          <div className="space-y-3">
            <div className="panel-pad text-sm space-y-2">
              <div className="font-bold text-slate-900">Helpdesk (Demo)</div>
              <div className="flex items-center gap-2 text-xs text-slate-600"><Phone size={14} className="text-gov-navy" /> 1800-XXX-XXXX · Mon–Fri, 9am–5:30pm</div>
              <div className="flex items-center gap-2 text-xs text-slate-600"><Mail size={14} className="text-gov-navy" /> helpdesk-bhusphere[at]demo[dot]gov[dot]in</div>
              <div className="flex items-start gap-2 text-xs text-slate-600"><MapPin size={14} className="text-gov-navy mt-0.5" /> Land Records Demo Cell, New Delhi — 110001</div>
            </div>
            <div className="panel-pad text-xs text-slate-500">
              For land disputes, registration or RoR corrections, please approach your State Revenue Department / Sub-Registrar Office. This demo cannot change official records.
            </div>
          </div>
        </Reveal>
      </div>
    </PublicLayout>
  );
}
