import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, X } from 'lucide-react';
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
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [log, busy]);
  /** Route a result row to the right view: unit/building/floor → 3D tower, else validation center. */
  const openRow = (r: any) => {
    const vals = [...Object.values(r).map(String), String(r.Entity || '')];
    for (const v of vals) { const url = entity3DLink(v); if (url) { nav(url); return; } }
    nav('/validation');
  };
  const ask = async (text: string) => {
    if (!text.trim() || busy) return; setBusy(true);
    setLog(l => [...l, { role: 'user', text }]); setQ('');
    try {
      const r = await api.ai(text);
      setHighlights(r.highlights || []);
      setLog(l => [...l, { role: 'ai', ...r }]);
    } catch (e: any) { setLog(l => [...l, { role: 'ai', answer: 'AI unavailable (demo fallback). ' + e.message, count: 0, rows: [] }]); }
    setBusy(false);
  };
  if (!open) return null;
  return (
    <div className="fixed bottom-4 right-4 w-[400px] max-w-[92vw] h-[560px] max-h-[80vh] glass border border-slate-300 rounded-2xl shadow-2xl flex flex-col z-50">
      <div className="flex items-center gap-2 p-3 border-b bg-navy text-white rounded-t-2xl">
        <Bot size={18} /><div><div className="font-semibold text-sm">Cadastral Copilot</div>
        <div className="text-[11px] text-sky-300">AI-assisted · requires official verification</div></div>
        <button className="ml-auto" onClick={onClose} aria-label="Close copilot"><X size={16} /></button>
      </div>
      <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollthin text-sm">
        {log.length === 0 && <div className="text-slate-500 text-xs">Try one of the suggested cadastral questions ↓</div>}
        {!!highlights.length && <button onClick={() => setHighlights([])} className="text-[11px] text-sky-700 underline">Clear {highlights.length} map highlight{highlights.length === 1 ? '' : 's'}</button>}
        {log.map((m, i) => m.role === 'user'
          ? <div key={i} className="ml-auto bg-navy text-white rounded-lg px-3 py-2 max-w-[85%]">{m.text}</div>
          : <div key={i} className="bg-white border rounded-lg px-3 py-2 shadow-sm">
              <div>{m.answer}</div>
              {m.count != null && <div className="text-[11px] text-slate-500 mt-1">Results: {m.count}{m.confidence ? ` · AI confidence ${m.confidence}%` : ''}{!!highlights.length && ' · shown on map'}</div>}
              {!!m.rows?.length && <table className="mt-2 w-full text-[11px]"><tbody>
                {m.rows.slice(0, 6).map((r: any, j: number) => <tr key={j} className="border-t hover:bg-sky-50 cursor-pointer" onClick={() => openRow(r)} title="Open in 3D / validation">{Object.values(r).map((v: any, k: number) => <td key={k} className="pr-2 py-0.5">{String(v)}</td>)}</tr>)}
              </tbody></table>}
            </div>)}
        {busy && <div className="text-xs text-slate-500">Querying cadastral database (safe tools)…</div>}
      </div>
      <div className="p-2 border-t space-y-2">
        <button onClick={() => setShowS(s => !s)} className="text-[10px] text-slate-500 underline">{showS ? 'Hide suggestions' : 'Show suggestions'}</button>
        {showS && <div className="flex flex-wrap gap-1">{SUGGEST.map(s => <button key={s} onClick={() => ask(s)} className="text-[10px] bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5 hover:bg-sky-100">{s}</button>)}</div>}
        <div className="flex gap-1"><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask(q)}
          placeholder="Ask about parcels, floors, conflicts, utilities…" className="flex-1 border rounded-lg px-2 py-1.5 text-sm" />
          <button onClick={() => ask(q)} className="bg-navy text-white rounded-lg px-3" aria-label="Send question"><Send size={15} /></button></div>
      </div>
    </div>
  );
}
