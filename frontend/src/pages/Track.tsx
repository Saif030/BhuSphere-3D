import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { History, FileText, Pencil } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { Empty, PageHeader, Skeleton } from '../components/feedback';
import { STATUS_META } from '../lib/submit';
import { SubStatus } from './Submit';

export function downloadDoc(filename: string) {
  const token = localStorage.getItem('bhu_token');
  fetch('/api/uploads/' + filename, { headers: token ? { Authorization: 'Bearer ' + token } : {} })
    .then(r => { if (!r.ok) throw new Error('Download failed'); return r.blob(); })
    .then(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = filename; a.click(); URL.revokeObjectURL(a.href); })
    .catch((e: any) => alert(e.message));
}

export function MySubmissions() {
  const { data, isLoading } = useQuery({ queryKey: ['my-subs'], queryFn: () => api.get('/api/submissions/my') });
  return (
    <div className="p-5 space-y-4 max-w-[1000px] mx-auto">
      <PageHeader title="My Submissions" sub="Track every property submission and its verification timeline"
        actions={<Link to="/submit/new" className="btn-primary !py-1.5 !text-xs">+ New submission</Link>} />
      {isLoading && <Skeleton className="h-24" />}
      {!isLoading && !(data || []).length && <Empty text="No submissions yet. Start one from the submission form." />}
      <div className="space-y-2">{(data || []).map((s: any) => (
        <Link key={s.submission_id} to={`/submit/track/${s.submission_id}`}
          className="panel p-3.5 flex flex-wrap items-center gap-2 hover:border-accent-400/40 transition-colors">
          <span className="font-mono font-bold text-accent-300 text-xs">{s.submission_id}</span>
          <span className="text-xs text-slate-300">{s.payload?.property_name || s.property_type} · v{s.version}</span>
          <SubStatus s={s.status} />
          <span className="ml-auto text-[11px] text-slate-500">{s.updated_at?.slice(0, 16).replace('T', ' ')}</span>
        </Link>))}</div>
    </div>
  );
}

export function TrackSubmission() {
  const { sid } = useParams();
  const { auth } = useStore();
  const { data: s, isLoading, isError } = useQuery({ queryKey: ['sub', sid], queryFn: () => api.get('/api/submissions/' + sid) });
  const { data: h } = useQuery({ queryKey: ['sub-h', sid], queryFn: () => api.get(`/api/submissions/${sid}/history`), enabled: !!s });
  const { data: docs } = useQuery({ queryKey: ['sub-d', sid], queryFn: () => api.get(`/api/submissions/${sid}/documents`), enabled: !!s });
  if (isLoading) return <div className="p-6 text-sm text-slate-400">Loading submission…</div>;
  if (isError || !s) return <div className="p-6 max-w-xl mx-auto"><Empty text="Submission not found or not shared with you." /></div>;
  const meta = STATUS_META[s.status] || STATUS_META.SUBMITTED;
  const mine = s.submitter === auth?.username;
  const p = s.payload || {};
  return (
    <div className="p-5 space-y-4 max-w-[900px] mx-auto">
      <PageHeader title={s.submission_id} sub={`${s.property_type} · ${s.kind === 'new' ? 'new registration' : 'update'} · v${s.version}`}
        actions={<SubStatus s={s.status} />} />
      <div className="panel-pad text-xs text-slate-400">{meta.desc} Trust: <b className="text-slate-200">{s.trust}</b>
        {s.source_type === 'GOVERNMENT_DEPARTMENT' && <span> · Authorized department{s.department ? ` (${s.department})` : ''}</span>}</div>
      {s.status === 'CORRECTION_REQUIRED' && mine && (
        <div className="panel-pad border-orange-400/40">
          <div className="font-bold text-orange-300 text-sm">Correction required</div>
          <div className="text-xs text-slate-300 mt-1">{h?.reviews?.slice(-1)[0]?.reason}</div>
          {!!h?.reviews?.slice(-1)[0]?.fields?.length && <div className="text-[11px] text-slate-500 mt-1">Fields: {h.reviews.slice(-1)[0].fields.join(', ')}</div>}
          <Link to={`/submit/new?draft=${s.submission_id}`} className="btn-primary inline-flex items-center gap-1.5 mt-2 !text-xs"><Pencil size={13} />Edit & resubmit</Link>
        </div>)}
      {s.status === 'DRAFT' && mine && <Link to={`/submit/new?draft=${s.submission_id}`} className="btn-ghost inline-flex items-center gap-1.5 text-xs"><Pencil size={13} />Continue editing draft</Link>}
      <div className="panel-pad">
        <div className="font-semibold text-white text-sm mb-2">Submitted data</div>
        <div className="grid sm:grid-cols-2 gap-1.5 text-xs">
          {[['Property', p.property_name || s.property_type], ['Parcel', s.targets?.parcel || p.parcel_id || '—'],
            ['Building', s.targets?.building || p.building_id || '—'], ['Floor', s.targets?.floor || p.floor_number || '—'],
            ['Unit', s.targets?.unit || p.unit_number || '—'], ['Survey', p.survey_number || '—'],
            ['Address', [p.society, p.locality, p.city, p.pin].filter(Boolean).join(', ') || '—'],
            ['Coords', (p.latitude != null && p.longitude != null) ? `${p.latitude}, ${p.longitude} (${p.coord_source || '?'})` : '—'],
            ['Owner (claim)', p.owner_name || '—'], ['Right', p.right_type || '—']].map(([k, v]) =>
            <div key={k} className="bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5"><span className="text-slate-500">{k}:</span> <span className="text-slate-100">{v}</span></div>)}
        </div>
        {!!Object.keys(s.measurements || {}).length && <div className="mt-2 text-xs">
          <span className="text-slate-500">Measurements: </span>
          {Object.entries(s.measurements).map(([k, m]: any) => <span key={k} className="text-accent-300 mr-2">{k} {m.sqm} m²</span>)}</div>}
      </div>
      {!!(docs || []).length && <div className="panel-pad">
        <div className="font-semibold text-white text-sm mb-2 flex items-center gap-1.5"><FileText size={14} />Documents ({docs.length})</div>
        {docs.map((d: any) => <button key={d.id} onClick={() => downloadDoc(d.filename)} className="block w-full text-left text-xs border-b border-white/5 py-1.5 text-slate-300 hover:text-white">✓ <b>{d.doc_type}</b>{d.doc_number ? ` — ${d.doc_number}` : ''} <span className="text-slate-500">· {d.authority || ''} · download</span></button>)}
      </div>}
      <div className="panel-pad">
        <div className="font-semibold text-white text-sm mb-2 flex items-center gap-1.5"><History size={14} />Timeline</div>
        <div className="text-xs space-y-2.5">
          {(h?.reviews || []).map((r: any, i: number) => (
            <div key={i} className="flex gap-2.5"><div className="w-2 h-2 rounded-full bg-accent-400 mt-1 shrink-0" />
              <div className="text-slate-300"><b className="text-slate-100">{r.action}</b> by {r.reviewer} ({r.role}) <span className="text-slate-500">· {r.at?.slice(0, 16).replace('T', ' ')}</span>
                {r.reason && <div className="text-slate-400">{r.reason}</div>}</div></div>))}
          {(h?.versions || []).map((v: any, i: number) => (
            <div key={i} className="flex gap-2.5"><div className="w-2 h-2 rounded-full bg-white/20 mt-1 shrink-0" />
              <div className="text-slate-400">Version {v.version} snapshot — {v.note}</div></div>))}
          {(h?.field_verifications || []).map((f: any, i: number) => (
            <div key={i} className="flex gap-2.5"><div className="w-2 h-2 rounded-full bg-violet-400 mt-1 shrink-0" />
              <div className="text-slate-300">Field verification {f.verification_id}: {f.status}{f.recommendation ? ` → ${f.recommendation}` : ''}</div></div>))}
          {(h?.audit || []).map((a: any, i: number) => (
            <div key={i} className="text-[11px] text-slate-500 font-mono">{a.time?.slice(0, 16).replace('T', ' ')} · {a.user} · {a.action}</div>))}
          {!(h?.reviews || []).length && <div className="text-slate-500">Awaiting first review.</div>}
        </div>
      </div>
    </div>
  );
}
