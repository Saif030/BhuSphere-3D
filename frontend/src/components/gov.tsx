import { useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Landmark, LogIn, Menu, X, Phone, Mail, MapPin } from 'lucide-react';
import { useState } from 'react';
import { PUBLIC_NAV, PORTAL_META } from '../lib/content';
import { useStore } from '../lib/store';
import { FONT_MIN, FONT_MAX, FONT_DEFAULT, getSavedFontLevel, applyFontLevel } from '../lib/fontSize';

/** GIGW-style working text-size control. `dark` tone sits on the navy
 *  top bar, `light` tone on white headers (e.g. the app workspace). */
export function FontSizeControl({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const [level, setLevel] = useState<number>(() => getSavedFontLevel());
  useEffect(() => { applyFontLevel(level); }, []);
  const set = (l: number) => setLevel(applyFontLevel(l));
  const base =
    'text-[11px] font-bold px-1.5 py-0.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const cls = (active: boolean) =>
    tone === 'dark'
      ? `${base} ${active ? 'bg-white/15 text-white' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`
      : `${base} ${active ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`;
  return (
    <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="Text size">
      <button onClick={() => set(level - 1)} disabled={level <= FONT_MIN}
        title="Decrease text size" aria-label="Decrease text size (A minus)" className={cls(false)}>A-</button>
      <button onClick={() => set(FONT_DEFAULT)} title="Reset text size"
        aria-label="Reset text size (A)" aria-pressed={level === FONT_DEFAULT} className={cls(level === FONT_DEFAULT)}>A</button>
      <button onClick={() => set(level + 1)} disabled={level >= FONT_MAX}
        title="Increase text size" aria-label="Increase text size (A plus)" className={cls(false)}>A+</button>
    </div>
  );
}

/** Subtle scroll-reveal wrapper: adds .is-visible once in viewport. */
export function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('is-visible')),
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

function GovTopBar() {
  return (
    <div className="gov-topbar no-print">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:bg-white focus:text-slate-900 focus:px-3 focus:py-1 focus:z-[100]">
        Skip to main content
      </a>
      <div className="max-w-7xl mx-auto px-4 py-1 flex items-center gap-3">
        <span className="font-semibold tracking-wide">भारत सरकार · Government of India</span>
        <span className="hidden sm:inline text-slate-400">|</span>
        <span className="hidden sm:inline text-slate-300">{PORTAL_META.programme}</span>
        <div className="ml-auto flex items-center gap-2">
          <FontSizeControl tone="dark" />
          <span aria-hidden="true" className="text-slate-500">|</span>
          <span className="hidden md:inline text-slate-300">English | हिन्दी (demo)</span>
          <span className="md:hidden text-slate-300">EN | हिं</span>
        </div>
      </div>
    </div>
  );
}

function Masthead() {
  const { auth } = useStore();
  const nav = useNavigate();
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 min-w-0" aria-label="BhuSphere 3D home">
          <span className="w-11 h-11 rounded-lg bg-gov-navy text-white flex items-center justify-center shrink-0" aria-hidden>
            <Landmark size={22} />
          </span>
          <span className="min-w-0">
            <span className="block font-extrabold text-gov-navy text-lg leading-tight tracking-tight truncate">
              {PORTAL_META.name} <span className="text-gov-saffron">| {PORTAL_META.hindi}</span>
            </span>
            <span className="block text-xs text-slate-600 truncate">{PORTAL_META.tagline}</span>
            <span className="hidden sm:block text-[11px] text-slate-400">{PORTAL_META.programme}</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="hidden lg:inline text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            PROTOTYPE · DEMO DATA
          </span>
          {auth ? (
            <button onClick={() => nav(auth.role === 'citizen' || auth.role === 'public' ? '/home' : '/dashboard')} className="btn-primary">
              Go to workspace
            </button>
          ) : (
            <Link to="/login" className="btn-primary inline-flex items-center gap-1.5">
              <LogIn size={15} /> Login / Register
            </Link>
          )}
        </div>
      </div>
      <div className="tricolor" aria-hidden />
    </div>
  );
}

function PublicNav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="bg-gov-navy text-white no-print" aria-label="Primary">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center">
          <button
            className="md:hidden py-2.5 flex items-center gap-2 text-sm font-semibold"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            {open ? <X size={18} /> : <Menu size={18} />} Menu
          </button>
          <ul className="hidden md:flex items-stretch">
            {PUBLIC_NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={!!(n as any).end}
                  className={({ isActive }) =>
                    `block px-4 py-2.5 text-sm transition-colors border-b-2 ${
                      isActive
                        ? 'bg-white/10 border-gov-saffron font-semibold'
                        : 'border-transparent text-slate-200 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {open && (
        <ul className="md:hidden border-t border-white/15 px-2 py-2 space-y-0.5 bg-gov-navyDark">
          {PUBLIC_NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={!!(n as any).end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-white/15 font-semibold' : 'text-slate-200 hover:bg-white/10'}`
                }
              >
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

function Breadcrumb({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav className="text-xs text-slate-500" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((t, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300">/</span>}
            {t.to ? (
              <Link to={t.to} className="hover:text-gov-navy hover:underline underline-offset-2">
                {t.label}
              </Link>
            ) : (
              <span className="text-slate-700 font-medium" aria-current="page">
                {t.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function GovFooter() {
  return (
    <footer className="mt-12 no-print">
      <div className="bg-gov-navy text-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
          <div>
            <div className="font-extrabold text-white">BhuSphere 3D · भू-क्षेत्र 3D</div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Vertical property mapping and spatial governance prototype — parcel → building → floor → unit as 3D volumes, with AI-assisted validation and QR identity.
            </p>
            <p className="text-[11px] text-amber-200/90 bg-white/10 border border-white/15 rounded-lg p-2 mt-3">
              {PORTAL_META.disclaimer}
            </p>
          </div>
          <nav aria-label="Quick links">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Quick Links</div>
            <ul className="space-y-1.5 text-sm">
              {PUBLIC_NAV.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="hover:text-white hover:underline underline-offset-2">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Citizen services">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Citizen Services</div>
            <ul className="space-y-1.5 text-sm">
              <li><Link to="/verify" className="hover:text-white hover:underline underline-offset-2">Verify property identity</Link></li>
              <li><Link to="/login?role=citizen" className="hover:text-white hover:underline underline-offset-2">Submit property data</Link></li>
              <li><Link to="/login?role=citizen" className="hover:text-white hover:underline underline-offset-2">Track submission</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white hover:underline underline-offset-2">Submission workflow</Link></li>
              <li><Link to="/help" className="hover:text-white hover:underline underline-offset-2">FAQs & guides</Link></li>
            </ul>
          </nav>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Helpdesk (Demo)</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> 1800-XXX-XXXX (Toll free, demo)</li>
              <li className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> helpdesk-bhusphere[at]demo[dot]gov[dot]in</li>
              <li className="flex items-start gap-2"><MapPin size={14} className="text-slate-400 mt-0.5" /> Land Records Demo Cell, New Delhi — 110001</li>
            </ul>
            <Link to="/contact" className="inline-block mt-3 text-xs font-semibold bg-white text-gov-navy rounded-lg px-3 py-1.5 hover:bg-slate-100">
              Contact us →
            </Link>
          </div>
        </div>
      </div>
      <div className="bg-[#0B1C3A] text-slate-300">
        <div className="max-w-7xl mx-auto px-4 py-3 text-[11px] flex flex-wrap gap-x-4 gap-y-1 items-center">
          <span>This prototype is inspired by DILRMP · ULPIN (Bhu-Aadhaar) · Bhu-Naksha · India.gov.in design patterns.</span>
          <span className="ml-auto">SIH 2026 Prototype · For demonstration only · Last updated Sept 2026</span>
        </div>
      </div>
    </footer>
  );
}

export default function PublicLayout({ children, trail, bleed }: { children: React.ReactNode; trail?: { label: string; to?: string }[]; bleed?: boolean }) {
  // bleed mode: full-width bands (landing) manage their own inner max-w-7xl containers.
  if (bleed) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
        <GovTopBar />
        <Masthead />
        <PublicNav />
        <main id="main-content" className="flex-1 w-full">
          {trail && (
            <div className="max-w-7xl mx-auto px-4 pt-6">
              <Breadcrumb trail={trail} />
            </div>
          )}
          {children}
        </main>
        <div className="[&>footer]:!mt-0">
          <GovFooter />
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <GovTopBar />
      <Masthead />
      <PublicNav />
      <main id="main-content" className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        {trail && (
          <div className="mb-4">
            <Breadcrumb trail={trail} />
          </div>
        )}
        {children}
      </main>
      <GovFooter />
    </div>
  );
}
