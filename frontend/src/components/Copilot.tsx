import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { entity3DLink } from '../lib/nav';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';

const SUGGEST = [
  'Show buildings with height mismatch greater than 2m',
  'Show properties above the 5th floor',
  'Show underground utilities near Green Residency',
  'Which properties need verification?',
  'Why is apartment A804 marked 96.4% confidence?',
];

/** Starter questions per role — backend answers with that role's own records. */
const SUGGEST_ROLE: Record<string, string[]> = {
  citizen: [
    'What is the status of my latest submission?',
    'Will my submission get rejected? What should I fix?',
    'How do I submit property data?',
  ],
  surveyor: [
    'What field visits are assigned to me?',
    'What should I check during a site visit?',
  ],
  officer: [
    'What needs my attention in the verification queue?',
    'Which submissions are high priority?',
  ],
  admin: [
    'Summarize submission intake and validation health',
  ],
};

export default function Copilot({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState(''); const [log, setLog] = useState<any[]>([]); const [busy, setBusy] = useState(false);
  const [showS, setShowS] = useState(true);
  const { highlights, setHighlights } = useStore();
  const { auth } = useStore();
  const suggest = (auth && SUGGEST_ROLE[auth.role]) || SUGGEST;
  const { t } = useLang();
  const nav = useNavigate();
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }); }, [log, busy]);
  const ask = async (text: string) => {
    if (!text.trim() || busy) return; setBusy(true);
    setLog(l => [...l, { role: 'user', text, t: new Date() }]); setQ('');
    try {
      const r = await api.ai(text);
      setHighlights(r.highlights || []);
      setLog(l => [...l, { role: 'ai', ...r, t: new Date() }]);
    } catch (e: any) { setLog(l => [...l, { role: 'ai', answer: t('ai.down') + ' ' + e.message, count: 0, rows: [], t: new Date() }]); }
    setBusy(false);
  };
  /** Route a result row to the right view: unit/building/floor → 3D tower, else validation center. */
  const openRow = (r: any) => {
    const vals = [...Object.values(r).map(String), String(r.Entity || '')];
    for (const v of vals) { const url = entity3DLink(v); if (url) { nav(url); return; } }
    nav('/validation');
  };
  if (!open) return null;
  const time = (d: any) => { try { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  return (
    <div data-tour="tour-copilot" className="fixed bottom-4 right-4 w-[400px] max-w-[92vw] h-[560px] max-h-[80vh] bg-white border border-slate-200 rounded-2xl shadow-panel flex flex-col z-50 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200 bg-slate-50">
        <span className="p-1.5 rounded-lg bg-blue-50 border border-blue-100"><Bot size={16} className="text-gov-navy" /></span>
        <div><div className="font-bold text-sm text-slate-900">{t('ai.title')}</div>
        <div className="text-[11px] text-slate-500">{t('ai.sub')}</div></div>
        <button className="ml-auto text-slate-400 hover:text-slate-900 p-1" onClick={onClose} aria-label={t('ai.close')}><X size={16} /></button>
      </div>
      <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollthin text-sm bg-white">
        {log.length === 0 && (
          <div className="text-center pt-6">
            <Sparkles size={22} className="text-gov-saffron mx-auto mb-2" />
            <div className="text-slate-600 text-xs font-medium">{t('ai.ph')}</div>
            <div className="text-slate-400 text-[11px] mt-1">{t('ai.hint')}</div>
          </div>)}
        {!!highlights.length && <button onClick={() => setHighlights([])} className="text-[11px] text-gov-navy underline underline-offset-2">{t('ai.clear', { n: highlights.length })}</button>}
        {log.map((m, i) => m.role === 'user'
          ? <div key={i} className="ml-auto w-fit max-w-[85%]">
              <div className="bg-gov-navy text-white font-medium rounded-2xl rounded-br-md px-3.5 py-2">{m.text}</div>
              <div className="text-[10px] text-slate-400 text-right mt-0.5">{time(m.t)}</div></div>
          : <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-3.5 py-2.5">
              <div className="text-slate-700">{m.answer}</div>
              {m.count != null && <div className="text-[11px] text-slate-500 mt-1.5">{t('ai.results', { n: m.count })}{m.confidence ? t('ai.conf', { v: m.confidence }) : ''}{!!highlights.length && t('ai.shown')}</div>}
              {m.engine && <div className="mt-1"><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{m.engine === 'mistral' ? t('ai.llm') : t('ai.rules')}</span></div>}
              {!!m.rows?.length && (
                <table className="mt-2 w-full text-[11px]">
                  <tbody>{m.rows.slice(0, 6).map((r: any, j: number) => (
                    <tr key={j} className="border-t border-slate-200 hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => openRow(r)} title="Open in 3D / validation">
                      {Object.values(r).map((v: any, k: number) => <td key={k} className="pr-2 py-1 text-slate-600">{String(v)}</td>)}
                    </tr>))}</tbody>
                </table>)}
              <div className="text-[10px] text-slate-400 mt-1">{time(m.t)}</div>
            </div>)}
        {busy && <div className="flex gap-1 items-center bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-3.5 py-3 w-fit" aria-live="polite">
          {[0, 1, 2].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-gov-saffron animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />)}
          <span className="text-[11px] text-slate-500 ml-1.5">{t('ai.querying')}</span></div>}
      </div>
      <div className="p-2.5 border-t border-slate-200 space-y-2 bg-slate-50">
        <button onClick={() => setShowS(s => !s)} className="text-[10px] text-slate-500 underline underline-offset-2">{showS ? t('ai.hideS') : t('ai.showS')}</button>
        {showS && <div className="flex flex-wrap gap-1.5">{suggest.map(s => <button key={s} onClick={() => ask(s)} className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded-full px-2.5 py-1 hover:border-gov-navy hover:text-gov-navy transition-colors">{s}</button>)}</div>}
        <div className="flex gap-1.5">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask(q)}
            placeholder={t('ai.ph')} className="input flex-1" aria-label={t('ai.ask')} />
          <button onClick={() => ask(q)} className="btn-primary !px-3.5" aria-label={t('ai.send')}><Send size={15} /></button></div>
      </div>
    </div>
  );
}
