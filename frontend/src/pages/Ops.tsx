import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { entity3DLink as entityLink } from '../lib/nav';
import { useStore } from '../lib/store';
import { StatusBadge } from '../components/ui';
import { Empty } from '../components/feedback';

const PAGE = 12;

export function ValidationPage() {
  const { data, refetch, isLoading } = useQuery({ queryKey: ['val'], queryFn: () => api.get('/api/validation/issues') });
  const { setToast } = useStore();
  const [sev, setSev] = useState('');
  const [st, setSt] = useState('');
  const [page, setPage] = useState(0);
  const list = (data || []).filter((i: any) => (!sev || i.severity === sev) && (!st || i.status === st));
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const view = list.slice(page * PAGE, page * PAGE + PAGE);
  const review = async (id: string, s: string) => {
    try {
      await api.post(`/api/validation/${id}/review`, { status: s, user: 'demo-officer' });
      setToast(`Issue marked ${s}`); refetch();
    } catch (e: any) { setToast('Review failed: ' + e.message); }
  };
  return (
    <div className="p-5 space-y-3">
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <h1 className="font-bold text-lg">Validation Center</h1>
        <select value={sev} onChange={e => { setSev(e.target.value); setPage(0); }} className="border rounded px-2 py-1 text-sm" aria-label="Severity filter">
          <option value="">All severities</option><option>High</option><option>Medium</option><option>Low</option></select>
        <select value={st} onChange={e => { setSt(e.target.value); setPage(0); }} className="border rounded px-2 py-1 text-sm" aria-label="Status filter">
          <option value="">All statuses</option><option>Open</option><option>Under Review</option><option>Resolved</option><option>Rejected</option></select>
        <button onClick={async () => { const r = await api.post('/api/validation/run'); setToast(`Validation complete: ${r.issues} open issues`); refetch(); }} className="bg-navy text-white rounded px-3 py-1 text-sm">Run validation engine</button>
        <span className="text-xs text-slate-500 ml-auto">{list.length} issues · page {page + 1}/{pages}</span>
      </div>
      {isLoading && <div className="text-sm text-slate-500">Loading issues…</div>}
      {!isLoading && !list.length && <Empty text="No issues match these filters." />}
      <div className="grid md:grid-cols-2 gap-3">
        {view.map((i: any) => (
          <div key={i.id} className={`bg-white border-l-4 rounded-xl border p-3 text-sm ${i.severity === 'High' ? 'border-l-red-500' : i.severity === 'Medium' ? 'border-l-amber-500' : 'border-l-sky-500'}`}>
            <div className="flex gap-2 items-center"><b>{i.type}</b><StatusBadge s={i.severity} /><StatusBadge s={i.status} />
              <span className="ml-auto text-[11px] text-slate-500">AI {i.confidence}%</span></div>
            <div className="text-xs text-slate-500">{i.entity_type}: {i.entity}</div>
            <div className="text-xs mt-1">{i.description}</div>
            <div className="text-[11px] text-slate-500 mt-1">Evidence: {(i.evidence || []).join(', ')}</div>
            <div className="text-[11px] mt-1">→ {i.action}</div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {entityLink(i.entity) && <Link to={entityLink(i.entity)!} className="text-[11px] bg-navy text-white rounded px-2 py-0.5">Open in 3D</Link>}
              {['Under Review', 'Resolved', 'Rejected'].map(s =>
                <button key={s} className="text-[11px] border rounded px-2 py-0.5 hover:bg-slate-50" onClick={() => review(i.id, s)}>{s}</button>)}
            </div>
          </div>))}
      </div>
      {pages > 1 && <div className="flex gap-2 justify-center text-sm">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="border rounded px-3 py-1 disabled:opacity-40">Prev</button>
        <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} className="border rounded px-3 py-1 disabled:opacity-40">Next</button>
      </div>}
    </div>
  );
}

export function InfraPage() {
  const { data } = useQuery({ queryKey: ['u'], queryFn: () => api.get('/api/utilities') });
  const [f, setF] = useState('');
  const list = (data || []).filter((u: any) => !f || u.type === f);
  return (
    <div className="p-5 space-y-3">
      <h1 className="font-bold text-lg">Underground Infrastructure</h1>
      <div className="flex gap-2 text-sm">{['', 'Water', 'Electrical', 'Sewer', 'Telecom', 'Gas', 'Transport'].map(t =>
        <button key={t} onClick={() => setF(t)} className={`border rounded px-2 py-1 ${f === t ? 'bg-navy text-white' : ''}`}>{t || 'All'}</button>)}</div>
      <div className="grid md:grid-cols-3 gap-2 text-sm">{list.map((u: any) =>
        <div key={u.utility_id} className="bg-white border rounded-xl p-3"><b>{u.utility_id}</b> · {u.type}
          <div className="text-xs text-slate-500">Depth {u.depth_m}m · {u.owner} · {u.year} · {u.status}</div>
          <div className="text-[11px]">Parcels: {(u.parcels || []).join(', ') || '—'}</div></div>)}</div>
    </div>
  );
}

export function AdminPage() {
  const { data: audit } = useQuery({ queryKey: ['a'], queryFn: () => api.get('/api/audit') });
  const { data: stats } = useQuery({ queryKey: ['st'], queryFn: () => api.get('/api/dashboard/stats') });
  const { setToast } = useStore();
  const [auditQ, setAuditQ] = useState('');
  const filteredAudit = (audit || []).filter((a: any) =>
    !auditQ || `${a.time} ${a.user} ${a.role} ${a.action} ${a.entity}`.toLowerCase().includes(auditQ.toLowerCase()));
  const exportAudit = () => {
    const rows = [['time', 'user', 'role', 'action', 'entity'],
      ...filteredAudit.map((a: any) => [a.time, a.user, a.role, a.action, a.entity])];
    const blob = new Blob([rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'audit-trail.csv'; a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="p-5 space-y-4 text-sm">
      <h1 className="font-bold text-lg">Admin · Reports · Audit</h1>
      <div className="bg-white border rounded-xl p-4">Demo counts: <pre className="text-[11px] bg-slate-50 rounded p-2 overflow-auto">{JSON.stringify(stats?.demo_counts, null, 1)}</pre></div>
      <div className="bg-white border rounded-xl p-4"><div className="font-semibold mb-2">Data ingestion (prototype)</div>
        <div className="text-xs text-slate-500">Upload GeoJSON/JSON (features counted → validate → preview → map → process). CSV/KML parsing is simulated in demo.</div>
        <label className="inline-block mt-2 border rounded px-3 py-1 cursor-pointer hover:bg-slate-50">Choose file…
          <input type="file" accept=".geojson,.json,.csv,.kml" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            try {
              const text = await f.text();
              let feats: any[] = [];
              try { const j = JSON.parse(text); feats = j.features || j.parcels || []; }
              catch { feats = text.split('\n').filter(l => l.trim()).map((_, i) => ({ row: i })); }
              const r = await api.post('/api/data/import', { features: feats, filename: f.name });
              setToast(`Import validated: ${r.received} features from ${f.name}`);
            } catch (err: any) { setToast('Import failed: ' + err.message); }
            e.target.value = '';
          }} /></label></div>
      <div className="bg-white border rounded-xl p-4"><div className="font-semibold mb-2">Audit trail</div>
        <div className="flex gap-2 mb-2">
          <input value={auditQ} onChange={e => setAuditQ(e.target.value)} placeholder="Filter user / action / entity…" className="border rounded px-2 py-1 text-xs flex-1" />
          <button onClick={exportAudit} className="border rounded px-2 py-1 text-xs hover:bg-slate-50">Export CSV</button>
        </div>
        <div className="text-xs space-y-1 max-h-64 overflow-auto scrollthin">{filteredAudit.map((a: any, i: number) =>
          <div key={i} className="border-b py-1">{a.time} · {a.user}({a.role}) · {a.action} · {a.entity}</div>)}
          {!filteredAudit?.length && <div className="text-slate-500">{(audit || []).length ? 'No audit rows match.' : 'No audit events yet — approve/resolve a validation issue to generate one.'}</div>}</div></div>
      <div className="bg-white border rounded-xl p-4 text-xs text-slate-600">Roles: Public (safe fields+QR) · Surveyor (inspect/upload) · Officer (approve/evidence/audit) · Admin (datasets/rules/analytics). Validation thresholds 95/80/60 are configurable prototype rules.</div>
    </div>
  );
}
