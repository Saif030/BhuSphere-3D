import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Play, Pause, Presentation } from 'lucide-react';
import { tourSteps, COPILOT_DEMO_Q } from '../lib/tourSteps';
import { useLang } from '../lib/i18n';
import { useStore } from '../lib/store';
import { api } from '../lib/api';

/** Guided demo tour: deep-link navigation + spotlight ring + optional auto-play.
 *  Drives the real UI (never screenshots), so it can't go stale. Esc exits. */
export default function DemoTour({ onCopilot }: { onCopilot: () => void }) {
  const { tour, setTour, setHighlights, setToast } = useStore();
  const { lang, t } = useLang();
  const steps = tourSteps(lang);
  const nav = useNavigate();
  const loc = useLocation();
  const [auto, setAuto] = useState(false);
  const asked = useRef(-1);

  useEffect(() => {
    if (tour == null) return;
    const s = steps[tour];
    if (loc.pathname + loc.search !== s.route) nav(s.route);
    if (s.action === 'copilot-ask' && asked.current !== tour) {
      asked.current = tour;
      onCopilot();
      api.ai(COPILOT_DEMO_Q)
        .then(r => { setHighlights(r.highlights || []); setToast(t('tour.copilotHi', { n: r.count })); })
        .catch((e: any) => setToast(t('tour.copilotDown', { e: e.message })));
    }
  }, [tour]);

  useEffect(() => {
    if (tour == null) {
      document.querySelectorAll('.tour-spot').forEach(e => e.classList.remove('tour-spot'));
      return;
    }
    const t = setTimeout(() => {
      document.querySelectorAll('.tour-spot').forEach(e => e.classList.remove('tour-spot'));
      const el = document.querySelector(`[data-tour="${steps[tour].anchor}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.classList.add('tour-spot');
    }, 500); // allow route render + data fetch
    return () => clearTimeout(t);
  }, [tour, loc.pathname, loc.search]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setTour(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    if (tour == null || !auto) return;
    const t = setTimeout(() => setTour(tour >= steps.length - 1 ? null : tour + 1), 9000);
    return () => clearTimeout(t);
  }, [tour, auto]);

  if (tour == null) return null;
  const s = steps[tour];
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] w-[460px] max-w-[93vw]">
      <div className="panel p-4 !border-gov-saffron shadow-panel">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-gov-saffron rounded-full px-2 py-0.5">
            <Presentation size={11} />{t('tour.guided')}</span>
          <div className="flex gap-1 ml-1">{steps.map((_, j) => (
            <span key={j} className={`h-1.5 rounded-full transition-all ${j === tour ? 'w-5 bg-gov-saffron' : j < tour ? 'w-1.5 bg-gov-saffron/60' : 'w-1.5 bg-slate-200'}`} />))}</div>
          <span className="ml-auto text-[11px] text-slate-500">{tour + 1}/{steps.length}</span>
          <button onClick={() => setAuto(a => !a)} title={auto ? t('tour.pause') : t('tour.auto')}
            className="text-slate-400 hover:text-slate-900 p-1" aria-label={t('tour.autoT')}>
            {auto ? <Pause size={14} /> : <Play size={14} />}</button>
          <button onClick={() => setTour(null)} className="text-slate-400 hover:text-slate-900 p-1" aria-label={t('tour.endT')}><X size={14} /></button>
        </div>
        <div className="font-bold text-slate-900 text-sm">{s.title}</div>
        <div className="text-xs text-slate-400 mt-0.5">{s.text}</div>
        <div className="flex gap-2 mt-3">
          <button disabled={tour === 0} onClick={() => setTour(tour - 1)}
            className="btn-ghost !text-xs disabled:opacity-40 flex items-center gap-1"><ChevronLeft size={13} />{t('tour.back')}</button>
          {tour < steps.length - 1
            ? <button onClick={() => setTour(tour + 1)} className="btn-primary !text-xs flex items-center gap-1">{t('tour.next')}<ChevronRight size={13} /></button>
            : <button onClick={() => setTour(null)} className="btn-primary !text-xs">{t('tour.finish')}</button>}
          <button onClick={() => setTour(null)} className="ml-auto text-[11px] text-slate-500 hover:text-slate-700 underline underline-offset-2">{t('tour.skip')}</button>
        </div>
      </div>
    </div>
  );
}
