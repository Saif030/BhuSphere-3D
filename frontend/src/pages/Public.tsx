import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck, ClipboardEdit, History, Map as MapIcon, Box, LifeBuoy,
  ArrowRight, Search, Building2, Layers, ScanLine, Bell, FileText, Phone, Mail, MapPin, CheckCircle2,
  ImageDown, FileDown,
} from 'lucide-react';
import PublicLayout, { Reveal } from '../components/gov';
import { PageHeader } from '../components/feedback';
import IdentityFacts from '../components/IdentityFacts';
import { portalContent } from '../lib/content';
import { useLang } from '../lib/i18n';
import { api } from '../lib/api';
import { downloadIdentityPdf, downloadIdentityPng } from '../lib/identityExport';

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
  const { lang, t } = useLang();
  const content = portalContent(lang);
  const nav = useNavigate();
  const [q, setQ] = useState('DL-SKT-0182-B01-F08-U804');
  const goVerify = () => {
    const v = q.trim().toUpperCase();
    if (v) nav('/verify?ulpin=' + encodeURIComponent(v));
  };
  return (
    <PublicLayout bleed>
      {/* Hero — headline only, generous whitespace */}
      <section className="bg-gradient-to-b from-white via-white to-slate-50 border-b border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 tricolor" aria-hidden />
        <div className="max-w-7xl mx-auto px-4 pt-12 pb-14 md:pt-16 md:pb-20 grid lg:grid-cols-[1.05fr_.95fr] gap-12 lg:gap-16 items-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold text-gov-navy bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-gov-green animate-pulse" /> {t('home.badge')}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mt-4 leading-[1.08]">
            {t('home.titleA')}<span className="text-gov-navy">{t('home.titleB')}</span>{' '}
            <span className="text-gov-saffron">{t('home.titleC')}</span>
          </h1>
          <p className="text-base text-slate-600 mt-4 leading-relaxed max-w-lg">
            {t('home.sub')}
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/verify" className="btn-primary !px-6 !py-3 inline-flex items-center gap-1.5">
              {t('home.verify')} <ArrowRight size={15} />
            </Link>
            <Link to="/login?role=citizen" className="btn-saffron !px-6 !py-3">{t('home.submit')}</Link>
            <Link to="/about" className="btn-ghost !px-6 !py-3 bg-white">{t('home.learn')}</Link>
          </div>
          <p className="text-xs text-slate-500 mt-8 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-gov-green" /> {t('home.nologin')}
          </p>
        </Reveal>
        <Reveal delay={120} className="hidden lg:block">
          <div className="bg-gradient-to-br from-blue-50 via-white to-orange-50 border border-slate-200 rounded-2xl p-7 shadow-panel animate-float-soft">
            <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">{t('home.stack')}</div>
            <p className="text-xs text-slate-500 mt-1">{t('home.stackSub')}</p>
            <div className="mt-4 space-y-3" aria-hidden>
              {[
                ['Parcel · DL-SKT-0182', 'Survey + locality record', 'bg-gov-navy'],
                ['Building · B01 Green Residency', '12 floors · verified height', 'bg-blue-500'],
                ['Floor · F08', 'z 24–27 m · 8 units', 'bg-sky-400'],
                ['Unit · U804', '96.4% confidence · QR identity', 'bg-gov-saffron'],
              ].map(([t, s, c]) => (
                <div key={t} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3.5 shadow-sm">
                  <span className={`w-2.5 h-11 rounded-full ${c}`} />
                  <div><div className="text-xs font-bold text-slate-800 font-mono">{t}</div><div className="text-[11px] text-slate-500 mt-0.5">{s}</div></div>
                  <ShieldCheck size={16} className="ml-auto text-gov-green" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5 text-center">
              {[[Building2, t('home.i1')], [Layers, t('home.i2')], [ScanLine, t('home.i3')]].map(([Icon, label]: any) => (
                <div key={label} className="bg-white border border-slate-200 rounded-xl py-3 px-1">
                  <Icon size={18} className="mx-auto text-gov-navy" /><div className="text-[11px] font-semibold text-slate-600 mt-1.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        </div>
      </section>

      {/* Verify band — separated from hero for breathing room */}
      <section className="bg-gov-navy text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-12 grid lg:grid-cols-[1fr_1.1fr] gap-8 items-center">
          <Reveal>
            <div className="text-[11px] font-bold uppercase tracking-widest text-orange-300">{t('home.bandK')}</div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mt-1">{t('home.bandT')}</h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-md">
              {t('home.bandS')}
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="bg-white text-slate-800 rounded-2xl p-5 md:p-6 shadow-lg">
              <label htmlFor="home-ulpin" className="text-xs font-semibold text-slate-700">
                {t('home.refLabel')}
              </label>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg px-2.5 flex-1 focus-within:border-gov-navy">
                  <Search size={15} className="text-slate-400 shrink-0" />
                  <input
                    id="home-ulpin"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && goVerify()}
                    placeholder="e.g. DL-SKT-0182-B01-F08-U804"
                    className="bg-transparent text-sm font-mono px-2 py-2.5 w-full focus:outline-none"
                  />
                </div>
                <button onClick={goVerify} className="btn-primary !py-2.5 shrink-0">{t('home.verifyBtn')}</button>
              </div>
              <div className="text-[11px] text-slate-500 mt-2.5">{content.meta.disclaimer}</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Trust strip — airy, one idea per card */}
      <section className="bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <Reveal>
          <div className="grid sm:grid-cols-3 gap-5 text-sm">
            {[
              [t('home.trust1t'), t('home.trust1d')],
              [t('home.trust2t'), t('home.trust2d')],
              [t('home.trust3t'), t('home.trust3d')],
            ].map(([t, d]) => (
              <div key={t} className="bg-white border border-slate-200 rounded-2xl px-5 py-5 flex gap-3 shadow-sm">
                <CheckCircle2 size={19} className="text-gov-green shrink-0 mt-0.5" />
                <div><div className="font-bold text-slate-800">{t}</div><div className="text-slate-500 text-[13px] mt-1 leading-relaxed">{d}</div></div>
              </div>
            ))}
          </div>
        </Reveal>
        </div>
      </section>

      {/* Services — generous rhythm */}
      <section className="bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 pb-16 md:pb-20">
        <Reveal>
          <div className="flex items-end gap-4 flex-wrap max-w-3xl">
            <div><div className="text-[11px] font-bold uppercase tracking-widest text-gov-saffron">{t('home.svcK')}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gov-navy tracking-tight mt-1">{t('home.svcT')}</h2>
            <p className="text-sm text-slate-500 mt-2">{t('home.svcS')}</p></div>
            <Link to="/services" className="ml-auto text-sm font-semibold text-gov-navy hover:underline underline-offset-2">{t('home.svcAll')}</Link>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {content.services.map((s, i) => {
            const Icon = ICONS[s.icon] || FileText;
            return (
              <Reveal key={s.title} delay={Math.min(i * 60, 180)}>
                <Link to={s.to} className="gov-card block h-full !p-6">
                  <span className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center"><Icon size={21} className="text-gov-navy" /></span>
                  <div className="font-bold text-slate-900 mt-4">{s.title}</div>
                  <div className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">{s.desc}</div>
                  <div className="text-xs font-bold text-gov-saffron mt-3">{t('home.open')}</div>
                </Link>
              </Reveal>
            );
          })}
        </div>
        </div>
      </section>

      {/* How it works — full-bleed white band with timeline rhythm */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-14 md:py-20">
        <Reveal>
          <div className="max-w-2xl"><div className="text-[11px] font-bold uppercase tracking-widest text-gov-saffron">{t('home.howK')}</div>
          <h2 className="text-2xl md:text-3xl font-bold text-gov-navy tracking-tight mt-1">{t('home.howT')}</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">{t('home.howS')}</p></div>
        </Reveal>
        <ol className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          <div className="hidden lg:block absolute top-5 left-[12%] right-[12%] h-px bg-slate-200" aria-hidden />
          {content.stepsCitizen.map((s, i) => (
            <Reveal key={s.n} delay={i * 70}>
              <li className="relative bg-slate-50 border border-slate-200 rounded-2xl p-6 h-full">
                <div className="relative z-10 w-10 h-10 rounded-full bg-gov-navy text-white text-sm font-bold flex items-center justify-center ring-4 ring-white">{s.n}</div>
                <div className="font-bold text-slate-900 mt-4">{s.title}</div>
                <div className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">{s.desc}</div>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal>
          <div className="max-w-3xl mx-auto mt-10 text-[13px] text-slate-600 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-center leading-relaxed">
            {t('home.claimNote')}
          </div>
        </Reveal>
        </div>
      </section>

      {/* Notices — own band, room to scan */}
      <section className="bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-14 md:py-16">
        <Reveal>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center"><Bell size={17} className="text-gov-saffron" /></span>
              <h2 className="font-bold text-lg text-slate-900">{t('home.notices')}</h2>
              <span className="ml-auto text-[11px] text-slate-400">{t('home.demoBoard')}</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {content.notices.map((n) => (
                <li key={n.title} className="py-4 flex gap-4 text-sm">
                  <span className="text-[10px] font-bold h-fit mt-1 px-2.5 py-1 rounded-full bg-blue-50 text-gov-navy border border-blue-100 whitespace-nowrap">{n.tag}</span>
                  <div><div className="text-slate-800 font-medium leading-snug">{n.title}</div><div className="text-[11px] text-slate-400 mt-1">{n.date}</div></div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        </div>
      </section>

      {/* Audiences — separate soft band, not squeezed beside notices */}
      <section className="bg-[#EDF1F7] border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-14 md:py-20">
        <Reveal>
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-gov-saffron">{t('home.whoK')}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gov-navy tracking-tight mt-1">{t('home.whoT')}</h2>
            <p className="text-sm text-slate-500 mt-2">{t('home.whoS')}</p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 mt-8">
          {[
            [t('home.aud1t'), t('home.aud1d')],
            [t('home.aud2t'), t('home.aud2d')],
            [t('home.aud3t'), t('home.aud3d')],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 70}>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 h-full shadow-sm">
                <div className="font-bold text-slate-900">{t}</div><div className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">{d}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/login" className="btn-primary !px-6 !py-2.5">{t('home.signin')}</Link>
            <Link to="/help" className="btn-ghost !px-6 !py-2.5 bg-white">{t('home.readFaq')}</Link>
          </div>
        </Reveal>
        </div>
      </section>

      {/* Closing CTA — gives the long page a proper ending */}
      <section className="bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-14 md:py-16">
        <Reveal>
          <div className="bg-gov-navy text-white rounded-3xl px-6 py-10 md:p-12 flex flex-col md:flex-row md:items-center gap-6 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 tricolor opacity-90" aria-hidden />
            <div className="max-w-xl">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">{t('home.ctaT')}</h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">{t('home.ctaS')}</p>
            </div>
            <div className="flex flex-wrap gap-3 md:ml-auto">
              <Link to="/verify" className="bg-white text-gov-navy font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-slate-100">{t('home.verify')}</Link>
              <Link to="/how-it-works" className="border border-white/30 text-white font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-white/10">{t('home.ctaHow')}</Link>
            </div>
          </div>
        </Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}

/* ---------------- ABOUT ---------------- */
export function About() {
  const { t } = useLang();
  return (
    <PublicLayout trail={[{ label: t('trail.home'), to: '/' }, { label: t('trail.about') }]}>
      <Reveal><PageHead kicker={t('about.kicker')} title={t('about.title')} sub={t('about.sub')} /></Reveal>
      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Reveal>
          <div className="panel-pad space-y-3 text-sm text-slate-600 leading-relaxed h-full">
            <h2 className="font-bold text-slate-900">{t('about.mission')}</h2>
            <p>{t('about.m1')}</p>
            <p>{t('about.m2')}</p>
            <h2 className="font-bold text-slate-900 pt-1">{t('about.aligned')}</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>{t('about.p1')}</li>
              <li>{t('about.p2')}</li>
              <li>{t('about.p3')}</li>
            </ul>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="space-y-4">
            <div className="panel-pad">
              <h2 className="font-bold text-slate-900 text-sm mb-2">{t('about.is')}</h2>
              <ul className="text-sm text-slate-600 space-y-1.5">
                {[t('about.is1'), t('about.is2'), t('about.is3'), t('about.is4')].map((s) => (
                  <li key={s} className="flex gap-2"><CheckCircle2 size={15} className="text-gov-green shrink-0 mt-0.5" />{s}</li>
                ))}
              </ul>
            </div>
            <div className="panel-pad !border-amber-300 !bg-amber-50">
              <h2 className="font-bold text-amber-900 text-sm mb-2">{t('about.isNot')}</h2>
              <ul className="text-sm text-amber-800 space-y-1.5 list-disc ml-5">
                <li>{t('about.not1')}</li>
                <li>{t('about.not2')}</li>
                <li>{t('about.not3')}</li>
                <li>{t('about.not4')}</li>
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
  const { lang, t } = useLang();
  const content = portalContent(lang);
  return (
    <PublicLayout trail={[{ label: t('trail.home'), to: '/' }, { label: t('trail.services') }]}>
      <Reveal><PageHead kicker={t('svc.kicker')} title={t('svc.title')} sub={t('svc.sub')} /></Reveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
        {content.services.map((s, i) => {
          const Icon = ICONS[s.icon] || FileText;
          return (
            <Reveal key={s.title} delay={Math.min(i * 60, 240)}>
              <Link to={s.to} className="gov-card block h-full">
                <span className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center"><Icon size={19} className="text-gov-navy" /></span>
                <div className="font-bold text-slate-900 mt-3">{s.title}</div>
                <div className="text-xs text-slate-500 mt-1">{s.desc}</div>
                <div className="text-xs font-bold text-gov-saffron mt-2">{t('home.svcOpen')}</div>
              </Link>
            </Reveal>
          );
        })}
      </div>
      <Reveal>
        <div className="mt-6 panel-pad text-xs text-slate-500">
          {t('svc.note')}
        </div>
      </Reveal>
    </PublicLayout>
  );
}

/* ---------------- HOW IT WORKS ---------------- */
export function HowItWorks() {
  const { lang, t } = useLang();
  const content = portalContent(lang);
  const [tab, setTab] = useState<'citizen' | 'officer'>('citizen');
  return (
    <PublicLayout trail={[{ label: t('trail.home'), to: '/' }, { label: t('trail.how') }]}>
      <Reveal><PageHead kicker={t('hiw.kicker')} title={t('hiw.title')} sub={t('hiw.sub')} /></Reveal>
      <Reveal>
        <div className="flex bg-white border border-slate-200 rounded-lg p-1 w-fit mt-5 text-sm" role="tablist" aria-label="Workflow lane">
          {(['citizen', 'officer'] as const).map((lane) => (
            <button key={lane} role="tab" aria-selected={tab === lane} onClick={() => setTab(lane)}
              className={`px-4 py-1.5 rounded-md font-semibold capitalize ${tab === lane ? 'bg-gov-navy text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              {lane === 'citizen' ? t('hiw.owner') : t('hiw.officer')}
            </button>
          ))}
        </div>
      </Reveal>
      {tab === 'citizen' ? (
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {content.stepsCitizen.map((s, i) => (
            <Reveal key={s.n} delay={i * 60}>
              <li className="gov-card"><div className="w-8 h-8 rounded-full bg-gov-navy text-white text-sm font-bold flex items-center justify-center">{s.n}</div>
              <div className="font-bold text-slate-900 mt-2.5">{s.title}</div><div className="text-xs text-slate-500 mt-1">{s.desc}</div></li>
            </Reveal>
          ))}
        </ol>
      ) : (
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {content.stepsOfficer.map((s, i) => (
            <Reveal key={s.n} delay={i * 60}>
              <li className="gov-card"><div className="w-8 h-8 rounded-full bg-gov-green text-white text-sm font-bold flex items-center justify-center">{s.n}</div>
              <div className="font-bold text-slate-900 mt-2.5">{s.title}</div><div className="text-xs text-slate-500 mt-1">{s.desc}</div></li>
            </Reveal>
          ))}
        </ol>
      )}
      <Reveal>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/login?role=citizen" className="btn-saffron">{t('hiw.start')}</Link>
          <Link to="/verify" className="btn-ghost">{t('hiw.verifyFirst')}</Link>
        </div>
      </Reveal>
    </PublicLayout>
  );
}

/* ---------------- VERIFY ---------------- */
/** Lookup form + identity result with no page chrome, so the public portal
 *  and the signed-in workspace can both embed it. */
export function VerifyPanel() {
  const { lang, t } = useLang();
  const content = portalContent(lang);
  const [sp] = useSearchParams();
  const [ulpin, setUlpin] = useState(() => (sp.get('ulpin') || 'DL-SKT-0182-B01-F08-U804').toUpperCase());
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const lastQ = useRef('');
  const qrBox = useRef<HTMLSpanElement>(null);
  const [dlBusy, setDlBusy] = useState<'png' | 'pdf' | null>(null);
  const [dlErr, setDlErr] = useState('');
  const onDl = async (kind: 'png' | 'pdf') => {
    if (!res) return;
    setDlBusy(kind); setDlErr('');
    try {
      const data = {
        ulpin: res.prototype_ulpin,
        parcel: res.parcel,
        building: res.building,
        floor: res.floor_label,
        unit: res.unit,
        area: res.area_sqft + ' sq.ft',
        vertical: `${res.z_min ?? '—'}–${res.z_max ?? '—'} m`,
        confidence: Number(res.confidence) || 0,
        status: res.verification_status,
        url: window.location.origin + '/property/' + res.prototype_ulpin,
        address: res.address,
        lat: res.lat, lng: res.lng, survey_number: res.survey_number,
        property_type: res.property_type, floor_usage: res.floor_usage,
        building_type: res.building_type, land_use: res.land_use,
        ownership: res.ownership_type, owner_status: res.owner_record_status,
        registration: res.registration_status,
        authority: res.issuing_authority, authority_detail: res.authority_detail,
        updated: res.last_updated,
      };
      const svg = qrBox.current?.querySelector('svg') ?? null;
      if (kind === 'png') await downloadIdentityPng(data, svg);
      else await downloadIdentityPdf(data, svg);
    } catch { setDlErr(t('c.dlFail')); }
    setDlBusy(null);
  };
  const lookup = async (v?: string) => {
    const id = (v ?? ulpin).trim().toUpperCase();
    if (!id) return;
    lastQ.current = id;
    setBusy(true); setErr(''); setRes(null);
    try {
      const u = await api.get('/api/properties/' + id);
      setRes(u);
    } catch (e: any) { setErr(t('verify.notfound', { id })); }
    setBusy(false);
  };
  // Accept incoming lookups while mounted (citizen home search sends ?ulpin=).
  useEffect(() => {
    const nq = (sp.get('ulpin') || '').trim().toUpperCase();
    if (nq && nq !== lastQ.current) {
      setUlpin(nq);
      lookup(nq);
    }
  }, [sp]);
  return (
    <>
      <div className="panel-pad">
        <label htmlFor="verify-ulpin" className="text-xs font-semibold text-slate-700">{t('verify.label')}</label>
        <div className="flex gap-2 mt-1.5">
          <input id="verify-ulpin" value={ulpin} onChange={(e) => setUlpin(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && lookup()} placeholder="DL-SKT-0182-B01-F08-U804"
            className="input flex-1 font-mono" />
          <button onClick={() => lookup()} disabled={busy} className="btn-primary disabled:opacity-50">{busy ? t('verify.busy') : t('verify.btn')}</button>
        </div>
        <div className="text-[11px] text-slate-500 mt-2">{content.meta.disclaimer}</div>
        {err && <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{err}</div>}
      </div>
      {res && (
          <div className="panel-pad mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-gov-green" />
              <div className="font-bold text-slate-900">{t('verify.cardTitle')}</div>
              <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{res.verification_status}</span>
            </div>
            <div className="font-mono font-bold text-gov-navy">{res.prototype_ulpin}</div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[[t('g.parcel'), res.parcel], [t('g.building'), res.building], [t('g.floor'), res.floor_label], [t('g.unit'), res.unit], [t('g.area'), res.area_sqft + ' sq.ft'], [t('g.vertical'), `${res.z_min ?? '—'}–${res.z_max ?? '—'} m`]].map(([k, v]) => (
                <div key={k} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"><span className="text-slate-500">{k}:</span> <span className="text-slate-800 font-medium">{v}</span></div>
              ))}
            </div>
            <div className="text-xs text-slate-500">{t('verify.confLine', { v: res.confidence })}</div>
            <IdentityFacts u={res} />
            <div className="text-center"><span ref={qrBox} className="inline-block bg-white p-3 rounded-xl border border-slate-200"><QRCodeSVG value={window.location.origin + '/property/' + res.prototype_ulpin} size={130} /></span></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onDl('png')} disabled={dlBusy !== null} className="btn-primary text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
                <ImageDown size={14} />{dlBusy === 'png' ? t('c.preparing') : t('c.downloadPng')}
              </button>
              <button onClick={() => onDl('pdf')} disabled={dlBusy !== null} className="btn-ghost text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
                <FileDown size={14} />{dlBusy === 'pdf' ? t('c.preparing') : t('c.downloadPdf')}
              </button>
              <Link to={'/property/' + res.prototype_ulpin} className="btn-ghost text-xs">{t('verify.openFull')}</Link>
            </div>
            {dlErr && <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{dlErr}</div>}
            <div className="flex gap-2">
              <Link to="/help" className="btn-ghost text-xs">{t('verify.whatMean')}</Link>
            </div>
          </div>
      )}
    </>
  );
}

/* Public portal version — with gov header, nav and footer. */
export function VerifyPublic() {
  const { t } = useLang();
  return (
    <PublicLayout trail={[{ label: t('trail.home'), to: '/' }, { label: t('trail.verify') }]}>
      <Reveal><PageHead kicker={t('verify.kicker')} title={t('verify.title')} sub={t('verify.sub')} /></Reveal>
      <Reveal>
        <div className="mt-5 max-w-2xl"><VerifyPanel /></div>
      </Reveal>
    </PublicLayout>
  );
}

/* Signed-in workspace version — no portal chrome, matches the app shell. */
export function VerifyTool() {
  const { t } = useLang();
  return (
    <div className="p-5 max-w-2xl mx-auto space-y-4">
      <PageHeader title={t('verify.toolTitle')} sub={t('verify.toolSub')} />
      <VerifyPanel />
    </div>
  );
}

/* ---------------- HELP ---------------- */
/** FAQ + accounts with no page chrome — embedded by portal and workspace. */
export function HelpPanel() {
  const { lang, t } = useLang();
  const content = portalContent(lang);
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <div className="space-y-2">
        {content.faqs.map((f, i) => (
          <div key={f.q} className={`bg-white border rounded-xl ${open === i ? 'border-gov-navy' : 'border-slate-200'}`}>
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="w-full text-left px-4 py-3 flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">{f.q}</span>
              <span className="ml-auto text-gov-saffron font-bold">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{f.a}</div>}
          </div>
        ))}
      </div>
      <aside className="panel-pad space-y-3 h-fit">
        <h2 className="font-bold text-slate-900 text-sm">{t('help.accounts')}</h2>
        <div className="text-xs text-slate-600 space-y-1.5">
          {[['citizen', t('help.dCitizen')], ['officer', t('help.dOfficer')], ['surveyor', t('help.dSurveyor')], ['admin', t('help.dAdmin')]].map(([r, d]) => (
            <div key={r} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"><b className="text-slate-800">{r}</b> <span className="text-slate-500">/ demo123 — {d}</span></div>
          ))}
        </div>
        <Link to="/contact" className="btn-ghost text-xs w-full text-center block">{t('help.contact')}</Link>
      </aside>
    </>
  );
}

/* Public portal version — with gov header, nav and footer. */
export function Help() {
  const { t } = useLang();
  return (
    <PublicLayout trail={[{ label: t('trail.home'), to: '/' }, { label: t('trail.help') }]}>
      <Reveal><PageHead kicker={t('help.kicker')} title={t('help.title')} sub={t('help.sub')} /></Reveal>
      <Reveal>
        <div className="grid lg:grid-cols-[1fr_320px] gap-4 mt-6"><HelpPanel /></div>
      </Reveal>
    </PublicLayout>
  );
}

/* Signed-in workspace version — no portal chrome, matches the app shell. */
export function HelpTool() {
  const { t } = useLang();
  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4">
      <PageHeader title={t('help.toolTitle')} sub={t('help.toolSub')} />
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start"><HelpPanel /></div>
    </div>
  );
}

/* ---------------- CONTACT ---------------- */
/** Helpdesk form + cards with no page chrome — embedded by portal and workspace. */
export function ContactPanel() {
  const { t } = useLang();
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
    <>
      <form onSubmit={submit} className="panel-pad space-y-3">
        {sent && <div role="status" className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{t('ct.saved', { id: sent })}</div>}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-slate-700">{t('ct.name')}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input w-full mt-1" required /></label>
          <label className="block text-xs font-medium text-slate-700">{t('ct.email')}<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input w-full mt-1" placeholder="you@example.in" /></label>
        </div>
        <label className="block text-xs font-medium text-slate-700">{t('ct.topic')}
          <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="select w-full mt-1">
            {[{ value: 'Property submission', label: t('ct.t1') }, { value: 'Verification / ULPIN', label: t('ct.t2') }, { value: 'Map / 3D issue', label: t('ct.t3') }, { value: 'Grievance (demo)', label: t('ct.t4') }, { value: 'Other', label: t('ct.t5') }].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-700">{t('ct.msg')}<textarea value={form.msg} onChange={(e) => setForm({ ...form, msg: e.target.value })} rows={5} className="input w-full mt-1" required placeholder={t('ct.msgPh')} /></label>
        <button type="submit" className="btn-primary">{t('ct.send')}</button>
      </form>
      <div className="space-y-3">
        <div className="panel-pad text-sm space-y-2">
          <div className="font-bold text-slate-900">{t('ct.hd')}</div>
          <div className="flex items-center gap-2 text-xs text-slate-600"><Phone size={14} className="text-gov-navy" /> {t('ct.hours')}</div>
          <div className="flex items-center gap-2 text-xs text-slate-600"><Mail size={14} className="text-gov-navy" /> helpdesk-bhusphere[at]demo[dot]gov[dot]in</div>
          <div className="flex items-start gap-2 text-xs text-slate-600"><MapPin size={14} className="text-gov-navy mt-0.5" /> {t('foot.addr')}</div>
        </div>
        <div className="panel-pad text-xs text-slate-500">
          {t('ct.note')}
        </div>
      </div>
    </>
  );
}

/* Public portal version — with gov header, nav and footer. */
export function Contact() {
  const { t } = useLang();
  return (
    <PublicLayout trail={[{ label: t('trail.home'), to: '/' }, { label: t('trail.contact') }]}>
      <Reveal><PageHead kicker={t('ct.kicker')} title={t('ct.title')} sub={t('ct.sub')} /></Reveal>
      <Reveal>
        <div className="grid lg:grid-cols-[1fr_340px] gap-4 mt-6"><ContactPanel /></div>
      </Reveal>
    </PublicLayout>
  );
}

/* Signed-in workspace version — no portal chrome, matches the app shell. */
export function ContactTool() {
  const { t } = useLang();
  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4">
      <PageHeader title={t('ct.toolTitle')} sub={t('ct.toolSub')} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start"><ContactPanel /></div>
    </div>
  );
}
