import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Map as MapIcon, Box, ArrowLeft, MapPin } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { entity3DLink } from '../lib/nav';
import { Empty, PageHeader, Skeleton } from '../components/feedback';
import { SubStatus } from './Submit';
import { downloadDoc } from './Track';
import Map2D from '../components/Map2D';

const CHECKS = ['Property exists', 'Address matches', 'Parcel boundary matches', 'Building exists',
  'Floor exists', 'Unit exists', 'Measurements verified', 'Coordinates checked',
  'Documents checked', 'Photographs collected'];

export function FieldWorkList() {
  const { auth } = useStore();
  const [st, setSt] = useState('');
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['field-assigned', st],
    queryFn: () => api.get('/api/field-verification/assigned' + (st ? `?status=${st}` : '')),
  });
  const isSurveyor = auth?.role === 'surveyor';
  const rows: any[] = data || [];
  const mine = rows.filter((f: any) => f.mine);
  const others = rows.filter((f: any) => !f.mine && f.status === 'Open');
  const renderRow = (f: any) => (
    <div key={f.verification_id} className="panel p-3.5 flex flex-wrap items-center gap-2">
      <span className="font-mono font-bold text-violet-700 text-xs">{f.verification_id}</span>
      <span className="font-mono text-gov-navy text-xs">{f.submission_id}</span>
      <span className="text-xs text-slate-700">{f.submission?.payload?.property_name || f.submission?.property_type || ''}</span>
      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${f.status === 'Open' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{f.status}{f.recommendation ? ` → ${f.recommendation}` : ''}</span>
      {f.scheduled && <span className="text-[11px] text-slate-500">scheduled {f.scheduled}</span>}
      {f.assignee && <span className={`text-[11px] ${f.mine ? 'text-violet-700 font-semibold' : 'text-slate-500'}`}>→ {f.assignee}{f.mine ? ' (you)' : ''}</span>}
      {!f.mine && f.status === 'Open' && isSurveyor && <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">open pool — opening claims it to you</span>}
      <Link to={`/field-work/${f.verification_id}`} className="btn-primary !py-1 !text-xs ml-auto">Open field workspace</Link>
    </div>
  );
  return (
    <div className="p-5 space-y-4 max-w-[1100px] mx-auto">
      <PageHeader
        title={isSurveyor ? 'My Field Work' : 'Field Verifications'}
        sub={isSurveyor
          ? 'All open site visits — assigned to you or open pool. Open one and submit; it auto-claims to you. Officers take the final decision.'
          : 'All field verification requests — assign to surveyors, track recommendations.'}
        actions={<select value={st} onChange={e => setSt(e.target.value)} className="select" aria-label="Status filter">
          <option value="">Open + completed</option>
          <option value="Open">Open only</option>
          <option value="Completed">Completed</option>
        </select>}
      />
      {isLoading && <Skeleton className="h-24" />}
      {!isLoading && !rows.length && (
        <Empty text={isSurveyor
          ? 'No field visits yet. Officers create them from the Verification Queue → Open workspace → Field verification.'
          : 'No field verification requests yet. Create one from a submission in the Verification Queue.'} />
      )}
      {!!mine.length && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-900">Assigned to me ({mine.length})</div>
          {mine.map(renderRow)}
        </div>)}
      {!!others.length && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-900">Other open visits — claimable ({others.length})</div>
          {others.map(renderRow)}
        </div>)}
      {!isSurveyor && !!rows.length && !mine.length && !others.length && (
        <div className="space-y-2">{rows.map(renderRow)}</div>)}
      {!isSurveyor && (
        <div className="text-xs text-slate-500">
          Assign new visits from <Link to="/submit/queue" className="gov-link">Verification Queue → Open workspace → Field verification</Link>. Use username <b className="font-mono">surveyor</b> for the demo account.
        </div>)}
    </div>
  );
}

export function FieldWorkDetail() {
  const { fvid } = useParams();
  const { setToast } = useStore();
  const { data: fv, refetch, isLoading, isError } = useQuery({
    queryKey: ['field-one', fvid],
    queryFn: () => api.get('/api/field-verification/' + fvid),
  });
  const [checks, setChecks] = useState<{ item: string; done: boolean }[] | null>(null);
  const [obs, setObs] = useState('');
  const [notes, setNotes] = useState('');
  const [rec, setRec] = useState('APPROVE');
  const [busy, setBusy] = useState(false);

  if (isLoading) return <div className="p-6 text-sm text-slate-400">Opening field workspace…</div>;
  if (isError || !fv) return <div className="p-6 max-w-xl mx-auto"><Empty text="Field verification not found." /></div>;

  const s = fv.submission || {};
  const p = s.payload || {};
  const list = checks ?? (fv.checklist?.length ? fv.checklist : CHECKS.map(c => ({ item: c, done: false })));
  const done = fv.status === 'Completed';
  const deep = entity3DLink(s.targets?.unit || s.targets?.building || s.targets?.parcel || '');
  const mapQ = s.targets?.parcel || p.parcel_id || p.property_name || '';
  const _ft = s.targets || {};
  const _fparcel = _ft.parcel || p.parcel_id;
  const fieldMini = _ft.unit ? [{ type: 'unit', id: _ft.unit }]
    : _ft.building ? [{ type: 'building', id: _ft.building }]
    : _fparcel ? [{ type: 'parcel', id: _fparcel }] : [];
  const _flat = parseFloat(p.latitude), _flng = parseFloat(p.longitude);
  const fieldPoint: [number, number] | null =
    isFinite(_flat) && isFinite(_flng) ? [_flng, _flat] : null;

  const submit = async () => {
    let observed: any = {};
    try { observed = obs ? JSON.parse(obs) : {}; }
    catch { setToast('Observed JSON is invalid'); return; }
    if (notes) observed.notes = notes;
    setBusy(true);
    try {
      const r = await api.post(`/api/field-verification/${fvid}/result`, { observed, checklist: list, recommendation: rec });
      setToast(`Field result recorded → ${r.recommendation}`);
      refetch();
    } catch (e: any) { setToast('Result failed: ' + e.message); }
    setBusy(false);
  };

  return (
    <div className="p-5 space-y-4 max-w-[1100px] mx-auto">
      <Link to="/field-work" className="text-xs text-gov-navy flex items-center gap-1 w-fit"><ArrowLeft size={13} />My Field Work</Link>
      <PageHeader
        title={`Field visit ${fv.verification_id}`}
        sub={`${fv.submission_id} · assigned to ${fv.assignee || '—'}${fv.scheduled ? ` · scheduled ${fv.scheduled}` : ''}`}
        actions={<span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-violet-50 text-violet-700 border-violet-200'}`}>{fv.status}{fv.recommendation ? ` → ${fv.recommendation}` : ''}</span>}
      />
      {fv.reason && <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg p-2.5">Officer instruction: {fv.reason}</div>}
      {done && <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">Completed with recommendation <b>{fv.recommendation}</b>. The submission is back with the officer for the final decision — no further edits.</div>}

      <div className="grid lg:grid-cols-2 gap-3">
        <div className="panel-pad space-y-2">
          <div className="font-bold text-slate-900 text-sm">What to verify <span className="font-normal text-slate-500">(officer claim — not yet authoritative)</span></div>
          <div className="flex items-center gap-2"><SubStatus s={s.status} /><span className="text-[11px] text-slate-500">v{s.version} by {s.submitter}</span></div>
          <div className="grid sm:grid-cols-2 gap-1.5 text-xs">
            {[['Property', p.property_name || s.property_type], ['Parcel', s.targets?.parcel || p.parcel_id],
              ['Building', s.targets?.building || p.building_name || p.building_id], ['Floor no', p.floor_number],
              ['Unit', s.targets?.unit || p.unit_number], ['Usage', p.usage || p.floor_usage],
              ['Address', [p.society, p.locality, p.city, p.pin].filter(Boolean).join(', ')],
              ['Coords', (p.latitude != null && p.longitude != null) ? `${p.latitude}, ${p.longitude}` : null],
              ['Owner (claim)', p.owner_name], ['Z range', (p.z_min != null && p.z_max != null) ? `${p.z_min}–${p.z_max} m` : null],
              ['Height', p.building_height_m ? `${p.building_height_m} m` : null]].map(([k, v]) =>
              <div key={k} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"><span className="text-slate-500">{k}:</span> <span className="text-slate-800">{(v as string) || '—'}</span></div>)}
          </div>
          {!!Object.keys(s.measurements || {}).length && <div className="text-xs"><span className="text-slate-500">Claimed measurements: </span>
            {Object.entries(s.measurements).map(([k, m]: any) => <span key={k} className="text-gov-navy mr-2">{k} {m.sqm} m² <span className="text-slate-600">({m.value} {m.unit})</span></span>)}</div>}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {mapQ && <Link to={`/map?q=${encodeURIComponent(mapQ)}`} className="btn-ghost !text-[11px] flex items-center gap-1"><MapIcon size={12} />View on 2D Map</Link>}
            {deep && <Link to={deep} className="btn-ghost !text-[11px] flex items-center gap-1"><Box size={12} />Open 3D Building</Link>}
          </div>
          <div className="pt-1">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">Location preview — this property only</div>
            {fieldMini.length ? (
              <div className="h-56 rounded-xl overflow-hidden">
                <Map2D compact focusOnly focusPoint={fieldPoint} onSelect={() => {}} highlights={fieldMini} layerState={{ parcels: true, buildings: true, utils: false }} />
              </div>) : (
              <div className="text-[11px] text-slate-500 border border-dashed border-slate-200 rounded-xl p-3 text-center">No location linked yet.</div>)}
          </div>
          <div className="text-xs font-semibold text-slate-900 pt-1">Evidence documents ({(fv.documents || []).length})</div>
          {(fv.documents || []).map((d: any) => <button key={d.id} onClick={() => downloadDoc(d.filename)} className="block text-xs text-slate-600 hover:text-slate-900 border-b border-slate-200 py-1">✓ <b>{d.doc_type}</b>{d.doc_number ? ` — ${d.doc_number}` : ''} <span className="text-slate-500">· {d.authority || ''} · open</span></button>)}
          {!(fv.documents || []).length && <div className="text-[11px] text-slate-500">No documents attached.</div>}
        </div>

        <div className="panel-pad space-y-2.5">
          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5"><ClipboardCheck size={15} />Site observation</div>
          <div className="text-[11px] text-slate-500">Tick what you physically verified. Photographs + coordinates are mandatory for APPROVE.</div>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-1">
            {list.map((c: any, i: number) => (
              <button key={c.item} disabled={done} onClick={() => setChecks((list as any[]).map((x, j) => j === i ? { ...x, done: !x.done } : x))}
                className={`text-[11px] text-left border rounded-lg px-2 py-1 ${c.done ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400'} disabled:opacity-60`}>{c.done ? '☑' : '☐'} {c.item}</button>))}
          </div>
          <div className="grid sm:grid-cols-1 gap-2 text-xs">
            <label className="block"><span className="text-slate-600 font-medium">Observed (JSON: coords, area, height…)</span>
              <textarea value={obs} onChange={e => setObs(e.target.value)} disabled={done} rows={3} placeholder='{"area_sqm": 115.6, "coords": [77.201, 28.524], "height_m": 36}' className="input w-full mt-1 font-mono disabled:opacity-60" /></label>
            <label className="block"><span className="text-slate-600 font-medium">Field notes</span>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={done} rows={2} placeholder="Access, occupancy, boundary markers, photos taken…" className="input w-full mt-1 disabled:opacity-60" /></label>
          </div>
          {!done && (
            <div className="flex gap-1.5 items-center flex-wrap">
              <select value={rec} onChange={e => setRec(e.target.value)} className="select !text-xs">
                <option>APPROVE</option><option>REJECT</option><option>REQUEST_CORRECTION</option>
              </select>
              <button onClick={submit} disabled={busy} className="btn-primary !text-xs disabled:opacity-50">Submit field result</button>
            </div>)}
          {!done && <div className="text-[11px] text-slate-500 flex items-center gap-1"><MapPin size={11} />Result goes to the officer — APPROVE/REJECT here is a recommendation, not the final cadastral decision.</div>}
          {done && !!Object.keys(fv.observed || {}).length && (
            <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono whitespace-pre-wrap">{JSON.stringify(fv.observed, null, 2)}</div>)}
        </div>
      </div>
    </div>
  );
}
