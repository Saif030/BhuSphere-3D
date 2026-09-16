import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Map as MapIcon, Box, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { entity3DLink } from '../lib/nav';
import { Empty, PageHeader, Skeleton } from '../components/feedback';
import { SubStatus } from './Submit';
import { downloadDoc } from './Track';
import Map2D from '../components/Map2D';

export function VerifyQueue() {
  const [st, setSt] = useState('');
  const { t } = useLang();
  const { data, isLoading, refetch } = useQuery({ queryKey: ['queue', st], queryFn: () => api.get('/api/submissions/queue' + (st ? `?status=${st}` : '')) });
  return (
    <div className="p-5 space-y-4 max-w-[1100px] mx-auto">
      <PageHeader title={t('q.title')} sub={t('q.sub')}
        actions={<select value={st} onChange={e => setSt(e.target.value)} className="select" aria-label={t('q.aria')}>
          <option value="">{t('q.newActive')}</option><option value="PENDING_VERIFICATION">{t('q.new')}</option>
          <option value="UNDER_VERIFICATION">{t('q.under')}</option><option value="FIELD_CHECK">{t('q.field')}</option>
          <option value="CORRECTION_REQUIRED">{t('q.corr')}</option></select>} />
      {isLoading && <Skeleton className="h-24" />}
      {!isLoading && !(data || []).length && <Empty text={t('q.empty')} />}
      <div className="space-y-2">{(data || []).map((s: any) => (
        <div key={s.submission_id} className="panel p-3.5 flex flex-wrap items-center gap-2">
          <span className="font-mono font-bold text-gov-navy text-xs">{s.submission_id}</span>
          <span className="text-xs text-slate-700">{s.payload?.property_name || s.property_type}</span>
          <span className="text-[11px] text-slate-500">by {s.submitter} · v{s.version}</span>
          {s.priority === 'High' && <span className="text-[10px] font-bold text-red-700 border border-red-200 rounded-full px-2 py-0.5">{t('q.high')}</span>}
          <SubStatus s={s.status} />
          <Link to={`/submit/verify/${s.submission_id}`} className="btn-primary !py-1 !text-xs ml-auto">{t('q.open')}</Link>
        </div>))}
      </div>
    </div>
  );
}

export function VerifyWorkspace() {
  const { sid } = useParams();
  const { setToast } = useStore();
  const { t } = useLang();
  const CHECKS = [t('q.c1'), t('q.c2'), t('q.c3'), t('q.c4'), t('q.c5'), t('q.c6'), t('q.c7'), t('q.c8'), t('q.c9'), t('q.c10')];
  const { data: s, refetch, isLoading, isError } = useQuery({ queryKey: ['vsub', sid], queryFn: () => api.get('/api/submissions/' + sid) });
  const { data: docs } = useQuery({ queryKey: ['vsub-d', sid], queryFn: () => api.get(`/api/submissions/${sid}/documents`), enabled: !!s });
  const { data: hist, refetch: refetchH } = useQuery({ queryKey: ['vsub-h', sid], queryFn: () => api.get(`/api/submissions/${sid}/history`), enabled: !!s });
  const [exist, setExist] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [corrFields, setCorrFields] = useState<string[]>([]);
  const [fv, setFv] = useState({ assignee: 'surveyor', reason: '', scheduled: '' });
  const [fres, setFres] = useState({ obs: '', notes: '', rec: 'APPROVE', checks: CHECKS.map(c => ({ item: c, done: false })) });
  const [busy, setBusy] = useState(false);

  const loadExisting = async () => {
    try {
      const t = s.targets || {};
      if (t.unit) setExist({ kind: 'unit', ...(await api.get('/api/units/' + t.unit)) });
      else if (t.building) { const p = t.building.split('-'); const code = p.pop(); setExist({ kind: 'building', ...(await api.get(`/api/buildings/${p.join('-')}/${code}`)) }); }
      else if (t.parcel || s.payload?.parcel_id) setExist({ kind: 'parcel', ...(await api.get('/api/parcels/' + (t.parcel || s.payload.parcel_id))) });
      else setToast(t('q.noLinked'));
    } catch (e: any) { setToast(t('q.notFoundRec', { e: e.message })); }
  };

  const act = async (action: string, extra: any = {}) => {
    if ((action === 'approve' || action === 'reject' || action === 'correction') && !reason.trim()) {
      setToast(t('q.needReason')); return;
    }
    setBusy(true);
    try {
      const r = await api.post(`/api/submissions/${sid}/review`, { action, reason, fields: corrFields, ...extra });
      setToast(action === 'approve' ? t('q.approved', { n: (r.applied || []).length }) : t('q.subStatus', { v: r.status }));
      setReason(''); setCorrFields([]); refetch(); refetchH();
    } catch (e: any) { setToast(t('q.actionFail', { e: e.message })); }
    setBusy(false);
  };

  const createFV = async () => {
    setBusy(true);
    try {
      const payload = { ...fv, assignee: fv.assignee.trim() || 'surveyor' };
      const r = await api.post(`/api/submissions/${sid}/field-verification`, payload);
      setToast(t('q.assigned', { v: r.verification_id, a: payload.assignee })); refetch(); refetchH();
      setFv({ assignee: 'surveyor', reason: '', scheduled: '' });
    } catch (e: any) { setToast(t('q.reqFail', { e: e.message })); }
    setBusy(false);
  };
  const submitFVResult = async (fvid: string) => {
    let observed: any = {};
    try { observed = fres.obs ? JSON.parse(fres.obs) : {}; } catch { setToast(t('q.badJson')); return; }
    if (fres.notes) observed.notes = fres.notes;
    setBusy(true);
    try {
      const r = await api.post(`/api/field-verification/${fvid}/result`, { observed, checklist: fres.checks, recommendation: fres.rec });
      setToast(t('q.resultOk', { v: r.recommendation })); refetch(); refetchH();
    } catch (e: any) { setToast(t('q.resultFail', { e: e.message })); }
    setBusy(false);
  };

  if (isLoading) return <div className="p-6 text-sm text-slate-400">{t('q.opening')}</div>;
  if (isError || !s) return <div className="p-6 max-w-xl mx-auto"><Empty text={t('q.notfound')} /></div>;
  const p = s.payload || {};
  const allFVs = hist?.field_verifications || [];
  const openFVs = allFVs.filter((f: any) => f.status === 'Open');
  const doneFVs = allFVs.filter((f: any) => f.status !== 'Open');
  const payloadKeys = Object.keys(p).filter(k => !['property_name'].includes(k)).slice(0, 24);
  const deep = entity3DLink(s.targets?.unit || s.targets?.building || s.targets?.parcel || '');
  // Mini 2D preview: prefer linked unit → building → parcel → payload parcel_id
  const _t = s.targets || {};
  const _parcelId = _t.parcel || s.payload?.parcel_id;
  const miniHighlight = _t.unit ? [{ type: 'unit', id: _t.unit }]
    : _t.building ? [{ type: 'building', id: _t.building }]
    : _parcelId ? [{ type: 'parcel', id: _parcelId }] : [];
  const _lat = parseFloat(p.latitude), _lng = parseFloat(p.longitude);
  const miniPoint: [number, number] | null =
    isFinite(_lat) && isFinite(_lng) ? [_lng, _lat] : null;

  return (
    <div className="p-5 space-y-4 max-w-[1200px] mx-auto">
      <Link to="/submit/queue" className="text-xs text-gov-navy flex items-center gap-1 w-fit"><ArrowLeft size={13} />{t('sub.queue')}</Link>
      <PageHeader title={`Verify ${s.submission_id}`} sub={`${s.property_type} · ${s.kind} · v${s.version} · by ${s.submitter}`}
        actions={<SubStatus s={s.status} />} />
      <div className="grid lg:grid-cols-2 gap-3">
        {/* LEFT: submitted */}
        <div className="panel-pad space-y-2">
          <div className="font-bold text-slate-900 text-sm">{t('q.subInfo')} <span className="font-normal text-slate-500">{t('q.unverified')}</span></div>
          <div className="grid sm:grid-cols-2 gap-1.5 text-xs">
            {[[t('sub.rProp'), p.property_name], [t('sub.rParcel'), p.parcel_id], [t('q.rUlp'), p.existing_ulpin], [t('trk.rSurvey'), p.survey_number],
              [t('q.rPlot'), p.plot_number], [t('sub.rBld'), p.building_name || p.building_id], [t('q.rFloors'), p.num_floors],
              [t('sub.rFloor'), p.floor_number], [t('sub.rUnit'), p.unit_number], [t('q.rUsage'), p.usage || p.floor_usage],
              [t('trk.rAddr'), [p.society, p.locality, p.city, p.pin].filter(Boolean).join(', ')],
              [t('trk.rCoords'), (p.latitude != null && p.longitude != null) ? `${p.latitude}, ${p.longitude}` : null],
              [t('sub.rOwner'), p.owner_name], [t('trk.rRight'), p.right_type], [t('sub.rVert'), (p.z_min != null && p.z_max != null) ? `${p.z_min}–${p.z_max} m` : null],
              [t('q.rHeight'), p.building_height_m ? `${p.building_height_m} m` : null]].map(([k, v]) =>
              <div key={k} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"><span className="text-slate-500">{k}:</span> <span className="text-slate-800">{v || '—'}</span></div>)}
          </div>
          {!!Object.keys(s.measurements || {}).length && <div className="text-xs"><span className="text-slate-500">{t('q.meas')} </span>
            {Object.entries(s.measurements).map(([k, m]: any) => <span key={k} className="text-gov-navy mr-2">{k} {m.sqm} m² <span className="text-slate-600">({m.value} {m.unit})</span></span>)}</div>}
          <div className="text-xs font-semibold text-slate-900 pt-1">{t('q.docs', { n: (docs || []).length })}</div>
          {(docs || []).map((d: any) => <button key={d.id} onClick={() => downloadDoc(d.filename)} className="block text-xs text-slate-600 hover:text-slate-900 border-b border-slate-200 py-1">✓ <b>{d.doc_type}</b>{d.doc_number ? ` — ${d.doc_number}` : ''} <span className="text-slate-500">· {d.authority || ''} {t('q.docOpen')}</span></button>)}
          {!(docs || []).length && <div className="text-[11px] text-slate-500">{t('q.noDocs')}</div>}
        </div>
        {/* RIGHT: existing */}
        <div className="panel-pad space-y-2">
          <div className="font-bold text-slate-900 text-sm">{t('q.existing')} <span className="font-normal text-slate-500">{t('q.authoritative')}</span></div>
          {!exist && <button onClick={loadExisting} className="btn-ghost text-xs">{t('q.loadLinked')}</button>}
          {exist?.kind === 'unit' && <div className="text-xs space-y-1 text-slate-600">
            <div className="font-mono text-gov-navy">{exist.prototype_ulpin}</div>
            <div>{t('q.existArea', { a: exist.area_sqft, zmin: exist.z_min, zmax: exist.z_max, s: exist.verification_status, c: exist.confidence })}</div>
            <div>Owner: {exist.owner?.display_name || '—'}</div></div>}
          {exist?.kind === 'building' && <div className="text-xs space-y-1 text-slate-600">
            <div className="font-bold text-slate-900">{exist.name}</div>
            <div>Registered {exist.registered_height_m} m · LiDAR {exist.lidar_height_m} m · {exist.floors} floors · {exist.confidence}%</div></div>}
          {exist?.kind === 'parcel' && <div className="text-xs space-y-1 text-slate-600">
            <div className="font-mono text-gov-navy">{exist.parcel_id}</div>
            <div>{exist.locality} · {exist.land_use} · {Math.round(exist.area_sqft).toLocaleString()} sq.ft · {exist.confidence}%</div></div>}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Link to={`/map?q=${encodeURIComponent(s.targets?.parcel || p.parcel_id || p.property_name || '')}`} className="btn-ghost !text-[11px] flex items-center gap-1"><MapIcon size={12} />{t('q.viewMap')}</Link>
            {deep && <Link to={deep} className="btn-ghost !text-[11px] flex items-center gap-1"><Box size={12} />{t('q.open3d')}</Link>}
          </div>
          {/* Mini location preview — isolated to this verification's property only */}
          <div className="pt-1">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">{t('q.locPreview')}</div>
            {!!miniHighlight.length && (
              <div className="h-56 rounded-xl overflow-hidden">
                <Map2D compact focusOnly focusPoint={miniPoint} onSelect={() => {}} highlights={miniHighlight} layerState={{ parcels: true, buildings: true, utils: false }} />
              </div>)}
            {(p.latitude != null && p.longitude != null) && (
              <div className="text-[11px] text-slate-500 mt-1 font-mono">{t('q.claimed', { v: `${p.latitude}, ${p.longitude}` })}</div>)}
            {!miniHighlight.length && !(p.latitude != null && p.longitude != null) && (
              <div className="text-[11px] text-slate-500 border border-dashed border-slate-200 rounded-xl p-3 text-center">{t('q.noLoc')}</div>)}
          </div>
          {(hist?.reviews || []).length > 0 && <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-2">{t('q.prior')}{(hist.reviews || []).map((r: any) => `${r.action} (${r.reviewer})`).join(' → ')}</div>}
        </div>
      </div>
      {/* action bar */}
      <div className="panel-pad space-y-2.5">
        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5"><ClipboardCheck size={15} />{t('q.decision')}</div>
        <label className="block text-xs"><span className="font-medium text-slate-600">{t('q.reason')}</span>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="input w-full mt-1" placeholder={t('q.reasonPh')} /></label>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => act('verify-start')} disabled={busy} className="btn-ghost !text-xs disabled:opacity-50">{t('q.start')}</button>
          <button onClick={() => act('approve')} disabled={busy} className="btn-primary !text-xs disabled:opacity-50">{t('q.approve')}</button>
          <button onClick={() => act('reject')} disabled={busy} className="btn-ghost !text-xs !border-red-200 !text-red-700 disabled:opacity-50">{t('q.reject')}</button>
        </div>
        <div className="border-t border-slate-200 pt-2">
          <div className="text-[11px] text-slate-400 mb-1">{t('q.corrFields')}</div>
          <div className="flex flex-wrap gap-1.5">{payloadKeys.map(k => (
            <button key={k} onClick={() => setCorrFields(f => f.includes(k) ? f.filter(x => x !== k) : [...f, k])}
              className={`text-[11px] border rounded-full px-2 py-0.5 ${corrFields.includes(k) ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-400'}`}>{k}</button>))}</div>
          <button onClick={() => act('correction')} disabled={busy} className="btn-ghost !text-xs mt-2 !border-orange-200 !text-orange-700 disabled:opacity-50">{t('q.reqCorr')}</button>
        </div>
      </div>
      {/* field verification */}
      <div className="panel-pad space-y-2.5">
        <div className="font-bold text-slate-900 text-sm">{t('q.fieldT')} {openFVs.length ? `(${openFVs.length} ${t('q.fieldOpen')})` : ''}</div>
        <div className="text-[11px] text-slate-500">{t('q.fieldHelp').split('Field Work')[0]}<Link to="/field-work" className="gov-link">{t('fw.titleAll')}</Link>{t('q.fieldHelp').split('Field Work')[1]}</div>
        <div className="grid sm:grid-cols-3 gap-2 text-xs">
          <label className="block"><span className="text-slate-400">{t('q.assignee')}</span><input value={fv.assignee} onChange={e => setFv({ ...fv, assignee: e.target.value })} placeholder="surveyor" className="input w-full mt-1 font-mono" /></label>
          <label className="block"><span className="text-slate-400">{t('q.scheduled')}</span><input value={fv.scheduled} onChange={e => setFv({ ...fv, scheduled: e.target.value })} placeholder="YYYY-MM-DD" className="input w-full mt-1" /></label>
          <label className="block"><span className="text-slate-400">{t('q.fReason')}</span><input value={fv.reason} onChange={e => setFv({ ...fv, reason: e.target.value })} placeholder={t('q.fReasonPh')} className="input w-full mt-1" /></label>
        </div>
        <button onClick={createFV} disabled={busy} className="btn-ghost !text-xs disabled:opacity-50">{t('q.createReq')}</button>
        {!!doneFVs.length && (
          <div className="space-y-1.5">
            {doneFVs.map((f: any) => (
              <div key={f.verification_id} className="text-xs border border-emerald-200 bg-emerald-50 rounded-lg px-2.5 py-1.5 flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-emerald-700">{f.verification_id}</span>
                <span className="text-emerald-700">{t('q.completed')}{f.recommendation ? ` → ${f.recommendation}` : ''}</span>
                {f.assignee && <span className="text-[11px] text-slate-500">{t('q.by', { v: f.assignee })}</span>}
                <Link to={`/field-work/${f.verification_id}`} className="gov-link ml-auto">{t('q.viewField')}</Link>
              </div>))}
          </div>)}
        {openFVs.map((f: any) => (
          <div key={f.verification_id} className="border border-violet-200 rounded-xl p-2.5 space-y-2">
            <div className="text-xs font-mono text-violet-700">{f.verification_id} · {t('q.fieldOpen')}{f.assignee ? ` → ${f.assignee}` : ''} {t('q.openNote')} · <Link to={`/field-work/${f.verification_id}`} className="gov-link">{t('q.openField')}</Link></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">{fres.checks.map((c, i) => (
              <button key={c.item} onClick={() => setFres(o => ({ ...o, checks: o.checks.map((x, j) => j === i ? { ...x, done: !x.done } : x) }))}
                className={`text-[11px] text-left border rounded-lg px-2 py-1 ${c.done ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400'}`}>{c.done ? '☑' : '☐'} {c.item}</button>))}</div>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              <label className="block"><span className="text-slate-400">{t('q.obs')}</span>
                <textarea value={fres.obs} onChange={e => setFres({ ...fres, obs: e.target.value })} rows={2} placeholder='{"area_sqm": 115.6, "coords": [77.201, 28.524]}' className="input w-full mt-1 font-mono" /></label>
              <label className="block"><span className="text-slate-400">{t('q.notes')}</span>
                <textarea value={fres.notes} onChange={e => setFres({ ...fres, notes: e.target.value })} rows={2} className="input w-full mt-1" /></label>
            </div>
            <div className="flex gap-1.5 items-center">
              <select value={fres.rec} onChange={e => setFres({ ...fres, rec: e.target.value })} className="select !text-xs">
                <option>APPROVE</option><option>REJECT</option><option>REQUEST_CORRECTION</option></select>
              <button onClick={() => submitFVResult(f.verification_id)} disabled={busy} className="btn-primary !text-xs disabled:opacity-50">{t('q.submitResult')}</button>
            </div>
          </div>))}
      </div>
    </div>
  );
}
