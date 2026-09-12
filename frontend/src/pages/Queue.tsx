import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Map as MapIcon, Box, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { entity3DLink } from '../lib/nav';
import { Empty, PageHeader, Skeleton } from '../components/feedback';
import { SubStatus } from './Submit';
import { downloadDoc } from './Track';

const CHECKS = ['Property exists', 'Address matches', 'Parcel boundary matches', 'Building exists',
  'Floor exists', 'Unit exists', 'Measurements verified', 'Coordinates checked',
  'Documents checked', 'Photographs collected'];

export function VerifyQueue() {
  const [st, setSt] = useState('');
  const { data, isLoading, refetch } = useQuery({ queryKey: ['queue', st], queryFn: () => api.get('/api/submissions/queue' + (st ? `?status=${st}` : '')) });
  return (
    <div className="p-5 space-y-4 max-w-[1100px] mx-auto">
      <PageHeader title="Property Verification Queue" sub="Citizen submissions awaiting human verification — data is unverified until you act"
        actions={<select value={st} onChange={e => setSt(e.target.value)} className="select" aria-label="Queue filter">
          <option value="">New + active</option><option value="PENDING_VERIFICATION">New</option>
          <option value="UNDER_VERIFICATION">Under Review</option><option value="FIELD_CHECK">Field Check</option>
          <option value="CORRECTION_REQUIRED">Correction Required</option></select>} />
      {isLoading && <Skeleton className="h-24" />}
      {!isLoading && !(data || []).length && <Empty text="Queue is clear. New citizen submissions will appear here." />}
      <div className="space-y-2">{(data || []).map((s: any) => (
        <div key={s.submission_id} className="panel p-3.5 flex flex-wrap items-center gap-2">
          <span className="font-mono font-bold text-accent-300 text-xs">{s.submission_id}</span>
          <span className="text-xs text-slate-200">{s.payload?.property_name || s.property_type}</span>
          <span className="text-[11px] text-slate-500">by {s.submitter} · v{s.version}</span>
          {s.priority === 'High' && <span className="text-[10px] font-bold text-red-300 border border-red-400/40 rounded-full px-2 py-0.5">HIGH PRIORITY</span>}
          <SubStatus s={s.status} />
          <Link to={`/submit/verify/${s.submission_id}`} className="btn-primary !py-1 !text-xs ml-auto">Open workspace</Link>
        </div>))}
      </div>
    </div>
  );
}

export function VerifyWorkspace() {
  const { sid } = useParams();
  const { setToast } = useStore();
  const { data: s, refetch, isLoading, isError } = useQuery({ queryKey: ['vsub', sid], queryFn: () => api.get('/api/submissions/' + sid) });
  const { data: docs } = useQuery({ queryKey: ['vsub-d', sid], queryFn: () => api.get(`/api/submissions/${sid}/documents`), enabled: !!s });
  const { data: hist, refetch: refetchH } = useQuery({ queryKey: ['vsub-h', sid], queryFn: () => api.get(`/api/submissions/${sid}/history`), enabled: !!s });
  const [exist, setExist] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [corrFields, setCorrFields] = useState<string[]>([]);
  const [fv, setFv] = useState({ assignee: '', reason: '', scheduled: '' });
  const [fres, setFres] = useState({ obs: '', notes: '', rec: 'APPROVE', checks: CHECKS.map(c => ({ item: c, done: false })) });
  const [busy, setBusy] = useState(false);

  const loadExisting = async () => {
    try {
      const t = s.targets || {};
      if (t.unit) setExist({ kind: 'unit', ...(await api.get('/api/units/' + t.unit)) });
      else if (t.building) { const p = t.building.split('-'); const code = p.pop(); setExist({ kind: 'building', ...(await api.get(`/api/buildings/${p.join('-')}/${code}`)) }); }
      else if (t.parcel || s.payload?.parcel_id) setExist({ kind: 'parcel', ...(await api.get('/api/parcels/' + (t.parcel || s.payload.parcel_id))) });
      else setToast('No linked existing record');
    } catch (e: any) { setToast('Existing record not found: ' + e.message); }
  };

  const act = async (action: string, extra: any = {}) => {
    if ((action === 'approve' || action === 'reject' || action === 'correction') && !reason.trim()) {
      setToast('A reason is required'); return;
    }
    setBusy(true);
    try {
      const r = await api.post(`/api/submissions/${sid}/review`, { action, reason, fields: corrFields, ...extra });
      setToast(action === 'approve' ? `Approved — live record updated (${(r.applied || []).length} changes)` : `Submission ${r.status}`);
      setReason(''); setCorrFields([]); refetch(); refetchH();
    } catch (e: any) { setToast('Action failed: ' + e.message); }
    setBusy(false);
  };

  const createFV = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/api/submissions/${sid}/field-verification`, fv);
      setToast(`Field verification ${r.verification_id} created`); refetch(); refetchH();
    } catch (e: any) { setToast('Field request failed: ' + e.message); }
    setBusy(false);
  };
  const submitFVResult = async (fvid: string) => {
    let observed: any = {};
    try { observed = fres.obs ? JSON.parse(fres.obs) : {}; } catch { setToast('Observed JSON is invalid'); return; }
    if (fres.notes) observed.notes = fres.notes;
    setBusy(true);
    try {
      const r = await api.post(`/api/field-verification/${fvid}/result`, { observed, checklist: fres.checks, recommendation: fres.rec });
      setToast(`Field result recorded → ${r.recommendation}`); refetch(); refetchH();
    } catch (e: any) { setToast('Result failed: ' + e.message); }
    setBusy(false);
  };

  if (isLoading) return <div className="p-6 text-sm text-slate-400">Opening workspace…</div>;
  if (isError || !s) return <div className="p-6 max-w-xl mx-auto"><Empty text="Submission not found." /></div>;
  const p = s.payload || {};
  const openFVs = (hist?.field_verifications || []).filter((f: any) => f.status === 'Open');
  const payloadKeys = Object.keys(p).filter(k => !['property_name'].includes(k)).slice(0, 24);
  const deep = entity3DLink(s.targets?.unit || s.targets?.building || s.targets?.parcel || '');

  return (
    <div className="p-5 space-y-4 max-w-[1200px] mx-auto">
      <Link to="/submit/queue" className="text-xs text-accent-400 flex items-center gap-1 w-fit"><ArrowLeft size={13} />Verification Queue</Link>
      <PageHeader title={`Verify ${s.submission_id}`} sub={`${s.property_type} · ${s.kind} · v${s.version} · by ${s.submitter}`}
        actions={<SubStatus s={s.status} />} />
      <div className="grid lg:grid-cols-2 gap-3">
        {/* LEFT: submitted */}
        <div className="panel-pad space-y-2">
          <div className="font-bold text-white text-sm">Submitted information <span className="font-normal text-slate-500">(unverified claim)</span></div>
          <div className="grid sm:grid-cols-2 gap-1.5 text-xs">
            {[['Property', p.property_name], ['Parcel', p.parcel_id], ['ULPIN ref', p.existing_ulpin], ['Survey', p.survey_number],
              ['Plot', p.plot_number], ['Building', p.building_name || p.building_id], ['Floors', p.num_floors],
              ['Floor no', p.floor_number], ['Unit', p.unit_number], ['Usage', p.usage || p.floor_usage],
              ['Address', [p.society, p.locality, p.city, p.pin].filter(Boolean).join(', ')],
              ['Coords', (p.latitude != null && p.longitude != null) ? `${p.latitude}, ${p.longitude}` : null],
              ['Owner (claim)', p.owner_name], ['Right', p.right_type], ['Z range', (p.z_min != null && p.z_max != null) ? `${p.z_min}–${p.z_max} m` : null],
              ['Height', p.building_height_m ? `${p.building_height_m} m` : null]].map(([k, v]) =>
              <div key={k} className="bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5"><span className="text-slate-500">{k}:</span> <span className="text-slate-100">{v || '—'}</span></div>)}
          </div>
          {!!Object.keys(s.measurements || {}).length && <div className="text-xs"><span className="text-slate-500">Measurements: </span>
            {Object.entries(s.measurements).map(([k, m]: any) => <span key={k} className="text-accent-300 mr-2">{k} {m.sqm} m² <span className="text-slate-600">({m.value} {m.unit})</span></span>)}</div>}
          <div className="text-xs font-semibold text-white pt-1">Documents ({(docs || []).length})</div>
          {(docs || []).map((d: any) => <button key={d.id} onClick={() => downloadDoc(d.filename)} className="block text-xs text-slate-300 hover:text-white border-b border-white/5 py-1">✓ <b>{d.doc_type}</b>{d.doc_number ? ` — ${d.doc_number}` : ''} <span className="text-slate-500">· {d.authority || ''} · open</span></button>)}
          {!(docs || []).length && <div className="text-[11px] text-slate-500">No documents attached.</div>}
        </div>
        {/* RIGHT: existing */}
        <div className="panel-pad space-y-2">
          <div className="font-bold text-white text-sm">Existing cadastral record <span className="font-normal text-slate-500">(authoritative)</span></div>
          {!exist && <button onClick={loadExisting} className="btn-ghost text-xs">Load linked record</button>}
          {exist?.kind === 'unit' && <div className="text-xs space-y-1 text-slate-300">
            <div className="font-mono text-accent-300">{exist.prototype_ulpin}</div>
            <div>Area {exist.area_sqft} sq.ft · z {exist.z_min}–{exist.z_max} m · {exist.verification_status} · {exist.confidence}%</div>
            <div>Owner: {exist.owner?.display_name || '—'}</div></div>}
          {exist?.kind === 'building' && <div className="text-xs space-y-1 text-slate-300">
            <div className="font-bold text-white">{exist.name}</div>
            <div>Registered {exist.registered_height_m} m · LiDAR {exist.lidar_height_m} m · {exist.floors} floors · {exist.confidence}%</div></div>}
          {exist?.kind === 'parcel' && <div className="text-xs space-y-1 text-slate-300">
            <div className="font-mono text-accent-300">{exist.parcel_id}</div>
            <div>{exist.locality} · {exist.land_use} · {Math.round(exist.area_sqft).toLocaleString()} sq.ft · {exist.confidence}%</div></div>}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Link to={`/map?q=${encodeURIComponent(s.targets?.parcel || p.parcel_id || p.property_name || '')}`} className="btn-ghost !text-[11px] flex items-center gap-1"><MapIcon size={12} />View on 2D Map</Link>
            {deep && <Link to={deep} className="btn-ghost !text-[11px] flex items-center gap-1"><Box size={12} />Open 3D Building</Link>}
          </div>
          {(hist?.reviews || []).length > 0 && <div className="text-[11px] text-slate-500 border-t border-white/10 pt-2">Prior actions: {(hist.reviews || []).map((r: any) => `${r.action} (${r.reviewer})`).join(' → ')}</div>}
        </div>
      </div>
      {/* action bar */}
      <div className="panel-pad space-y-2.5">
        <div className="font-bold text-white text-sm flex items-center gap-1.5"><ClipboardCheck size={15} />Decision</div>
        <label className="block text-xs"><span className="font-medium text-slate-300">Reason / officer note * Required for approve, reject, correction</span>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="input w-full mt-1" placeholder="Evidence-based justification…" /></label>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => act('verify-start')} disabled={busy} className="btn-ghost !text-xs disabled:opacity-50">Start verification</button>
          <button onClick={() => act('approve')} disabled={busy} className="btn-primary !text-xs disabled:opacity-50">Approve → integrate</button>
          <button onClick={() => act('reject')} disabled={busy} className="btn-ghost !text-xs !border-red-400/40 !text-red-300 disabled:opacity-50">Reject</button>
        </div>
        <div className="border-t border-white/10 pt-2">
          <div className="text-[11px] text-slate-400 mb-1">Fields requiring correction:</div>
          <div className="flex flex-wrap gap-1.5">{payloadKeys.map(k => (
            <button key={k} onClick={() => setCorrFields(f => f.includes(k) ? f.filter(x => x !== k) : [...f, k])}
              className={`text-[11px] border rounded-full px-2 py-0.5 ${corrFields.includes(k) ? 'border-orange-400 bg-orange-400/15 text-orange-200' : 'border-white/15 text-slate-400'}`}>{k}</button>))}</div>
          <button onClick={() => act('correction')} disabled={busy} className="btn-ghost !text-xs mt-2 !border-orange-400/40 !text-orange-300 disabled:opacity-50">Request correction</button>
        </div>
      </div>
      {/* field verification */}
      <div className="panel-pad space-y-2.5">
        <div className="font-bold text-white text-sm">Field verification {openFVs.length ? `(${openFVs.length} open)` : ''}</div>
        <div className="grid sm:grid-cols-3 gap-2 text-xs">
          <label className="block"><span className="text-slate-400">Assign surveyor</span><input value={fv.assignee} onChange={e => setFv({ ...fv, assignee: e.target.value })} placeholder="surveyor" className="input w-full mt-1" /></label>
          <label className="block"><span className="text-slate-400">Scheduled</span><input value={fv.scheduled} onChange={e => setFv({ ...fv, scheduled: e.target.value })} placeholder="YYYY-MM-DD" className="input w-full mt-1" /></label>
          <label className="block"><span className="text-slate-400">Reason</span><input value={fv.reason} onChange={e => setFv({ ...fv, reason: e.target.value })} placeholder="Why a site visit is needed" className="input w-full mt-1" /></label>
        </div>
        <button onClick={createFV} disabled={busy} className="btn-ghost !text-xs disabled:opacity-50">Create field request</button>
        {openFVs.map((f: any) => (
          <div key={f.verification_id} className="border border-violet-400/30 rounded-xl p-2.5 space-y-2">
            <div className="text-xs font-mono text-violet-300">{f.verification_id} · Open — record result (surveyor/officer)</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">{fres.checks.map((c, i) => (
              <button key={c.item} onClick={() => setFres(o => ({ ...o, checks: o.checks.map((x, j) => j === i ? { ...x, done: !x.done } : x) }))}
                className={`text-[11px] text-left border rounded-lg px-2 py-1 ${c.done ? 'border-emerald-400/50 text-emerald-200' : 'border-white/10 text-slate-400'}`}>{c.done ? '☑' : '☐'} {c.item}</button>))}</div>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              <label className="block"><span className="text-slate-400">Observed (JSON: coords, area, height…)</span>
                <textarea value={fres.obs} onChange={e => setFres({ ...fres, obs: e.target.value })} rows={2} placeholder='{"area_sqm": 115.6, "coords": [77.201, 28.524]}' className="input w-full mt-1 font-mono" /></label>
              <label className="block"><span className="text-slate-400">Notes</span>
                <textarea value={fres.notes} onChange={e => setFres({ ...fres, notes: e.target.value })} rows={2} className="input w-full mt-1" /></label>
            </div>
            <div className="flex gap-1.5 items-center">
              <select value={fres.rec} onChange={e => setFres({ ...fres, rec: e.target.value })} className="select !text-xs">
                <option>APPROVE</option><option>REJECT</option><option>REQUEST_CORRECTION</option></select>
              <button onClick={() => submitFVResult(f.verification_id)} disabled={busy} className="btn-primary !text-xs disabled:opacity-50">Submit result</button>
            </div>
          </div>))}
      </div>
    </div>
  );
}
