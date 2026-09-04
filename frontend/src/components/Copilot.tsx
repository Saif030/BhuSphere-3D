import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { entity3DLink } from '../lib/nav';
import { useStore } from '../lib/store';

const SUGGEST = [
  'Show buildings with height mismatch greater than 2m',
  'Show properties above the 5th floor',
  'Show underground utilities near Green Residency',
  'Which properties need verification?',
  'Why is apartment A804 marked 96.4% confidence?',
];

export default function Copilot({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState(''); const [log, setLog] = useState<any[]>([]); const [busy, setBusy] = useState(false);
  const [showS, setShowS] = useState(true);
  const { highlights, setHighlights } = useStore();
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
    } catch (e: any) { setLog(l => [...l, { role: 'ai', answer: 'Copilot is unreachable (demo fallback). ' + e.message, count: 0, rows: [], t: new Date() }]); }
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
    <div className="fixed bottom-4 right-4 w-[400px] max-w-[92vw] h-[560px] max-h-[80vh] bg-night-800 border border-white/10 rounded-2xl shadow-panel flex flex-col z-50 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-night-900 to-night-800">
        <span className="p-1.5 rounded-lg bg-accent-400/15 border border-accent-400/30"><Bot size={16} className="text-accent-400" /></span>
        <div><div className="font-bold text-sm text-white">Cadastral Copilot</div>
        <div className="text-[11px] text-slate-500">AI-assisted · requires official verification</div></div>
        <button className="ml-auto text-slate-500 hover:text-white p-1" onClick={onClose} aria-label="Close copilot"><X size={16} /></button>
      </div>
      <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollthin text-sm">
        {log.length === 0 && (
          <div className="text-center pt-6">
            <Sparkles size={22} className="text-accent-400 mx-auto mb-2" />
            <div className="text-slate-300 text-xs font-medium">Ask about parcels, floors, conflicts, utilities…</div>
            <div className="text-slate-600 text-[11px] mt-1">Answers highlight matching objects on the map.</div>
          </div>)}
        {!!highlights.length && <button onClick={() => setHighlights([])} className="text-[11px] text-accent-400 underline underline-offset-2">Clear {highlights.length} map highlight{highlights.length === 1 ? '' : 's'}</button>}
        {log.map((m, i) => m.role === 'user'
          ? <div key={i} className="ml-auto w-fit max-w-[85%]">
              <div className="bg-accent-400 text-night-950 font-medium rounded-2xl rounded-br-md px-3.5 py-2">{m.text}</div>
              <div className="text-[10px] text-slate-600 text-right mt-0.5">{time(m.t)}</div></div>
          : <div key={i} className="bg-white/[0.04] border border-white/10 rounded-2xl rounded-bl-md px-3.5 py-2.5">
              <div className="text-slate-200">{m.answer}</div>
              {m.count != null && <div className="text-[11px] text-slate-500 mt-1.5">Results: {m.count}{m.confidence ? ` · AI confidence ${m.confidence}%` : ''}{!!highlights.length && ' · shown on map'}</div>}
              {!!m.rows?.length && (
                <table className="mt-2 w-full text-[11px]">
                  <tbody>{m.rows.slice(0, 6).map((r: any, j: number) => (
                    <tr key={j} className="border-t border-white/10 hover:bg-accent-400/10 cursor-pointer transition-colors" onClick={() => openRow(r)} title="Open in 3D / validation">
                      {Object.values(r).map((v: any, k: number) => <td key={k} className="pr-2 py-1 text-slate-300">{String(v)}</td>)}
                    </tr>))}</tbody>
                </table>)}
              <div className="text-[10px] text-slate-600 mt-1">{time(m.t)}</div>
            </div>)}
        {busy && <div className="flex gap-1 items-center bg-white/[0.04] border border-white/10 rounded-2xl rounded-bl-md px-3.5 py-3 w-fit" aria-live="polite">
          {[0, 1, 2].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />)}
          <span className="text-[11px] text-slate-500 ml-1.5">Querying cadastral database…</span></div>}
      </div>
      <div className="p-2.5 border-t border-white/10 space-y-2 bg-night-900/60">
        <button onClick={() => setShowS(s => !s)} className="text-[10px] text-slate-500 underline underline-offset-2">{showS ? 'Hide suggestions' : 'Show suggestions'}</button>
        {showS && <div className="flex flex-wrap gap-1.5">{SUGGEST.map(s => <button key={s} onClick={() => ask(s)} className="text-[10px] text-slate-300 bg-white/[0.04] border border-white/10 rounded-full px-2.5 py-1 hover:border-accent-400/50 hover:text-white transition-colors">{s}</button>)}</div>}
        <div className="flex gap-1.5">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask(q)}
            placeholder="Ask about parcels, floors, conflicts, utilities…" className="input flex-1" aria-label="Ask the copilot" />
          <button onClick={() => ask(q)} className="btn-primary !px-3.5" aria-label="Send question"><Send size={15} /></button></div>
      </div>
    </div>
  );
}
