import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Landmark, MapPin, ArrowLeft, ArrowRight, Save, UploadCloud, CheckCircle2, Sparkles } from 'lucide-react';
import Map2D from '../components/Map2D';
import { StatusBadge } from '../components/ui';
import { Empty, PageHeader, Skeleton } from '../components/feedback';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { PROPERTY_TYPES, PROPERTY_TYPES_HI, WIZARD_STEPS, WIZARD_STEPS_HI, AREA_LABEL_HI, showBlocks, AREA_ROWS, AREA_UNITS, toSqm, statusMeta } from '../lib/submit';

export function SubStatus({ s }: { s: string }) {
  const { lang } = useLang();
  const meta = statusMeta(lang);
  const m = meta[s] || meta.DRAFT;
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${m.cls}`}>{m.label}</span>;
}

/* ---------------- landing ---------------- */

export function SubmitLanding() {
  const { auth } = useStore();
  const { t } = useLang();
  const role = auth?.role || '';
  const isGovt = ['officer', 'surveyor', 'admin'].includes(role);
  const isCitizen = role === 'citizen';
  const isSurveyor = role === 'surveyor';
  // Surveyors are government field staff — they never file as property owners.
  const canOwnerSubmit = isCitizen || role === 'officer' || role === 'admin';
  return (
    <div className="p-5 space-y-4 max-w-[1000px] mx-auto">
      <PageHeader title={t('sub.title')} sub={t('sub.sub')} />
      {isSurveyor && (
        <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg p-2.5">
          {t('sub.survBanner')}
        </div>)}
      <div className={`grid gap-3 ${isSurveyor ? '' : 'md:grid-cols-2'}`}>
        {!isSurveyor && (
          <div className="panel-pad space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold"><User size={18} className="text-gov-navy" />{t('sub.ownerCard')}</div>
            <div className="text-xs text-slate-400">{t('sub.ownerD')}</div>
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">{t('sub.flow')}</div>
            {canOwnerSubmit
              ? <Link to="/submit/new" className="btn-primary inline-block">{t('sub.asOwner')}</Link>
              : <div className="text-xs text-slate-500">{t('sub.needCitizen')}</div>}
          </div>)}
        <div className="panel-pad space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold"><Landmark size={18} className="text-gov-navy" />{t('sub.govtCard')}</div>
          <div className="text-xs text-slate-400">{t('sub.govtD')}</div>
          <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2">{t('sub.govtNote')}</div>
          {isGovt
            ? <Link to="/submit/new?as=govt" className="btn-primary inline-block">{t('sub.asGovt')}</Link>
            : <div className="text-xs text-slate-500">{t('sub.needGovt')}</div>}
        </div>
      </div>
      {(isCitizen || isGovt) && (
        <div className="flex gap-2 text-xs flex-wrap">
          <Link to="/submit/my" className="btn-ghost">{t('sub.mySubs')}</Link>
          {isSurveyor && <Link to="/field-work" className="btn-ghost">{t('sub.myField')}</Link>}
          {(role === 'officer' || role === 'admin') && <Link to="/submit/queue" className="btn-ghost">{t('sub.queue')}</Link>}
          {(role === 'officer' || role === 'admin') && <Link to="/field-work" className="btn-ghost">{t('sub.allField')}</Link>}
        </div>)}
    </div>
  );
}

/* ---------------- small field helpers ---------------- */

const F = ({ label, req, hint, children }: any) => {
  const { t } = useLang();
  return (
  <label className="block text-xs">
    <span className="font-medium text-slate-600">{label} {req
      ? <span className="text-red-400 font-semibold">{t('sub.req')}</span>
      : <span className="text-slate-500">{t('sub.opt')}</span>}</span>
    <span className="block mt-1">{children}</span>
    {hint && <span className="block text-[11px] text-slate-500 mt-0.5">{hint}</span>}
  </label>);
};

const IN = 'input w-full';

/* ---------------- wizard ---------------- */

const EMPTY_M = (unit = 'sqm') => ({ value: '', unit, sqm: 0 });

export function SubmitWizard() {
  const { auth, setToast } = useStore();
  const { lang, t } = useLang();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const role = auth?.role || '';
  // Surveyors always file as an authorized department — never as property owners.
  const govtMode = role === 'surveyor'
    ? ['officer', 'surveyor', 'admin'].includes(role)
    : sp.get('as') === 'govt' && ['officer', 'surveyor', 'admin'].includes(role);
  const [step, setStep] = useState(0);
  const [sid, setSid] = useState<string | null>(sp.get('draft'));
  const [draftStatus, setDraftStatus] = useState('');
  const [kind, setKind] = useState('new');
  const [propertyType, setPropertyType] = useState('Apartment / Flat');
  const [department, setDepartment] = useState('');
  const [p, setP] = useState<any>({ state: 'Delhi', country: 'India', coord_system: 'WGS84', coord_source: 'Manual' });
  const [meas, setMeas] = useState<any>({});
  const [targets, setTargets] = useState({ parcel: '', building: '', floor: '', unit: '' });
  const [lookup, setLookup] = useState('');
  const [lookupRes, setLookupRes] = useState<any[]>([]);
  const [existing, setExisting] = useState<any>(null);
  const [dups, setDups] = useState<any[]>([]);
  const [aiWarn, setAiWarn] = useState<string[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [doc, setDoc] = useState<any>({ doc_type: 'Ownership document' });
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<any>(null);
  const [showMap, setShowMap] = useState(false);
  const [resuming, setResuming] = useState(!!sp.get('draft'));

  const set = (k: any, v?: any) => setP((o: any) => (typeof k === 'string' ? { ...o, [k]: v } : { ...o, ...k }));
  const setM = (k: string, patch: any) => setMeas((o: any) => ({ ...o, [k]: { ...(o[k] || EMPTY_M()), ...patch } }));
  const blocks = showBlocks(propertyType);

  // Showcase: one-click fill of the entire wizard with realistic demo data
  const fillDemo = () => {
    const mk = (value: any, unit: string) => ({ value: String(value), unit, sqm: toSqm(String(value), unit) });
    setKind('new');
    setPropertyType('Apartment / Flat');
    setDepartment('Survey Department');
    setTargets({ parcel: '', building: '', floor: '', unit: '' });
    setExisting(null); setDups([]); setAiWarn([]);
    setP({
      state: 'Delhi', district: 'South West Delhi', tehsil: 'Dwarka', city: 'New Delhi',
      ward: '12', locality: 'Saket', society: 'Green Residency Tower B01',
      street: 'Press Enclave Road', pin: '110017', landmark: 'Near Saket Metro',
      country: 'India', coord_system: 'WGS84', coord_source: 'GNSS',
      coord_accuracy: '0.5', survey_date: '2026-09-10',
      property_name: 'Green Residency — A804',
      survey_number: 'SY-0182', subdivision_number: 'SD-04', plot_number: '182',
      tower: 'B01', usage: 'Residential',
      parcel_id: 'DL-SKT-0182', land_use: 'Residential', boundary_source: 'Survey',
      building_name: 'Green Residency B01', building_id: 'B01', building_type: 'Residential',
      num_floors: '12', basements: '2', construction_year: '2021',
      approval_ref: 'MCD/2020/1842', completion: 'Occupied',
      floor_number: '8', floor_usage: 'Residential', floor_plan: 'Yes',
      unit_number: 'A804', unit_type: '2BHK',
      latitude: '28.5245', longitude: '77.2010',
      length_m: '12.5', width_m: '9.2', height_m: '3.1',
      building_height_m: '36.6', floor_height_m: '3.1',
      ground_elev_m: '216.5', z_min: '24.8', z_max: '27.9',
      elev_source: 'GNSS',
      owner_name: 'Aarav Sharma (Demo)', owner_reference: 'OWN-DEMO-804',
      ownership_type: 'Freehold', right_type: 'Ownership',
      reg_ref: 'DL-2021-88412', share: '100%', right_notes: 'Self-occupied demo record',
    });
    setMeas({
      carpet_area: mk(1245, 'sq ft'),
      builtup_area: mk(1450, 'sq ft'),
      super_builtup_area: mk(1700, 'sq ft'),
      unit_area: mk(1245, 'sq ft'),
      common_area: mk(200, 'sq ft'),
      parking_area: mk(120, 'sq ft'),
    });
    setDeclared(true);
    setToast(t('sub.demoFilled'));
  };

  // resume a draft / correction version
  useEffect(() => {
    if (!sp.get('draft')) return;
    api.get('/api/submissions/' + sp.get('draft')).then(s => {
      setSid(s.submission_id); setDraftStatus(s.status || ''); setKind(s.kind); setPropertyType(s.property_type || 'Apartment / Flat');
      setP(s.payload || {}); setMeas(s.measurements || {});
      setDepartment(s.department || '');
      setTargets({ parcel: s.targets?.parcel || '', building: s.targets?.building || '', floor: s.targets?.floor || '', unit: s.targets?.unit || '' });
      api.get(`/api/submissions/${s.submission_id}/documents`).then(setDocs).catch(() => {});
    }).catch((e: any) => setToast(t('sub.cantDraft', { e: e.message }))).finally(() => setResuming(false));
  }, []);

  const bundle = () => ({
    kind, property_type: propertyType, department: govtMode ? department : '',
    // explicit filing intent: officers can file as owners (queue path) or as dept (auto path)
    as_owner: !govtMode,
    payload: p, measurements: meas,
    target_parcel: targets.parcel, target_building: targets.building,
    target_floor: targets.floor, target_unit: targets.unit,
  });

  const ensureDraft = async () => {
    if (sid) return sid;
    const r = await api.post('/api/submissions', { ...bundle(), payload: p, measurements: meas });
    setSid(r.submission_id);
    return r.submission_id as string;
  };
  const saveDraft = async (silent = true) => {
    try {
      const id = await ensureDraft();
      await api.put('/api/submissions/' + id, bundle());
      if (!silent) setToast(t('sub.saved'));
    } catch (e: any) { setToast(t('sub.saveFail', { e: e.message })); }
  };

  const lookupExisting = async (id: string, k: string) => {
    try {
      if (k === 'unit') {
        const u = await api.get('/api/units/' + id);
        setTargets(t => ({ ...t, unit: id, floor: `${u.parcel}-${u.building}-${u.floor_label}`, building: `${u.parcel}-${u.building}`, parcel: u.parcel }));
        set({ parcel_id: u.parcel, building_id: u.building, floor_number: u.floor, unit_number: u.unit, existing_ulpin: id, existing_area_sqm: +(u.area_sqft / 10.7639).toFixed(2), z_min: u.z_min, z_max: u.z_max });
        setExisting({ kind: 'unit', area_sqft: u.area_sqft, z_min: u.z_min, z_max: u.z_max, status: u.verification_status });
      } else if (k === 'parcel') {
        const pc = await api.get('/api/parcels/' + id);
        setTargets(t => ({ ...t, parcel: id }));
        set({ parcel_id: id, survey_number: pc.survey_number, locality: pc.locality, existing_area_sqm: +(pc.area_sqft / 10.7639).toFixed(2) });
        setExisting({ kind: 'parcel', area_sqft: pc.area_sqft, status: pc.verification_status });
      } else if (k === 'building') {
        const parts = id.split('-'); const code = parts.pop();
        const b = await api.get(`/api/buildings/${parts.join('-')}/${code}`);
        setTargets(t => ({ ...t, building: id, parcel: b.parcel }));
        set({ parcel_id: b.parcel, building_id: code, num_floors: b.floors, building_height_m: b.registered_height_m, existing_height: b.registered_height_m });
        if (b.center) { set('longitude', b.center[0]); set('latitude', b.center[1]); }
        setExisting({ kind: 'building', height: b.registered_height_m, status: b.status });
      }
    } catch (e: any) { setToast(t('sub.lookupFail', { e: e.message })); }
  };

  const pickOnMap = async (s: any) => {
    try {
      if (s.kind === 'building') await lookupExisting(s.id, 'building');
      else if (s.kind === 'parcel') await lookupExisting(s.id, 'parcel');
      else { setToast(t('sub.mapPick')); return; }
      setKind('update');
      setShowMap(false);
      setToast(t('sub.mapApplied'));
    } catch (e: any) { setToast(t('sub.mapPickFail', { e: e.message })); }
  };

  const stepValid = () => {
    if (step === 0 && govtMode && !department.trim()) { setToast(t('sub.errDept')); return false; }
    if (step === 1 && kind === 'update' && !targets.parcel && !targets.building && !targets.floor && !targets.unit) {
      setToast(t('sub.errTarget')); return false;
    }
    if (step === 2 && !propertyType) { setToast(t('sub.errType')); return false; }
    if (step === 2 && !(p.parcel_id || p.existing_ulpin || p.unit_number)) { setToast(t('sub.errParcel')); return false; }
    if (step === 4 && !govtMode && !p.owner_name?.trim()) { setToast(t('sub.errOwner')); return false; }
    return true;
  };

  const next = async () => {
    if (!stepValid()) return;
    setBusy(true);
    try {
      await saveDraft();
      if (step === 5) {
        // entering review: duplicates + existing record for diff
        const r = await api.post('/api/submissions/check-duplicates', { payload: { ...p, property_type: propertyType, area_sqm: submittedSqm() } });
        setDups(r.duplicates || []); setAiWarn(r.ai_warnings || []);
        if (targets.unit && !existing) await lookupExisting(targets.unit, 'unit');
      }
      setStep(s => Math.min(6, s + 1));
    } catch (e: any) { setToast(t('sub.contFail', { e: e.message })); }
    setBusy(false);
  };

  const submittedSqm = () => {
    for (const k of ['carpet_area', 'unit_area', 'plot_area', 'builtup_area']) {
      const v = parseFloat(meas[k]?.sqm || 0);
      if (v > 0) return v;
    }
    return 0;
  };

  const uploadDoc = async () => {
    if (!doc.file) { setToast(t('sub.chooseFile')); return; }
    setBusy(true);
    try {
      const id = await ensureDraft();
      const fd = new FormData();
      fd.append('file', doc.file);
      const qs = new URLSearchParams({ doc_type: doc.doc_type || 'Other supporting document', doc_number: doc.doc_number || '', doc_date: doc.doc_date || '', authority: doc.authority || '', description: doc.description || '' });
      const token = localStorage.getItem('bhu_token');
      const r = await fetch(`/api/submissions/${id}/documents?${qs}`, { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: fd });
      if (!r.ok) throw new Error(await r.text());
      setDocs(await api.get(`/api/submissions/${id}/documents`));
      setDoc({ doc_type: 'Ownership document' });
      setToast(t('sub.uploaded'));
    } catch (e: any) { setToast(t('sub.uploadFail', { e: e.message })); }
    setBusy(false);
  };

  const submit = async () => {
    if (!declared) { setToast(t('sub.declare')); return; }
    setBusy(true);
    try {
      const id = await ensureDraft();
      await api.put('/api/submissions/' + id, bundle());
      // correction/rejection loop uses resubmit (version bump + audit), fresh drafts use submit
      const r = (draftStatus === 'CORRECTION_REQUIRED' || draftStatus === 'REJECTED')
        ? await api.post(`/api/submissions/${id}/resubmit`, bundle())
        : await api.post(`/api/submissions/${id}/submit`);
      setDraftStatus(r.status || '');
      setDone(r);
    } catch (e: any) { setToast(t('sub.submitFail', { e: e.message })); }
    setBusy(false);
  };

  if (!['citizen', 'officer', 'surveyor', 'admin'].includes(role)) {
    return <div className="p-6 max-w-xl mx-auto"><Empty text={t('sub.needsAuth')} /></div>;
  }
  if (resuming) return <div className="p-6 text-sm text-slate-400">{t('sub.opening')}</div>;

  if (done) {
    const govt = done.source_type === 'GOVERNMENT_DEPARTMENT';
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-3">
        <CheckCircle2 size={40} className="text-emerald-600 mx-auto" />
        <div className="font-bold text-slate-900 text-xl">{t('sub.success')}</div>
        <div className="font-mono font-bold text-gov-navy text-lg">{done.submission_id}</div>
        <div><SubStatus s={done.status} /></div>
        <div className="text-xs text-slate-400">{govt ? t('sub.govtDone') : t('sub.ownerDone')}</div>
        <div className="flex gap-2 justify-center">
          <Link to={`/submit/track/${done.submission_id}`} className="btn-primary">{t('sub.track')}</Link>
          <Link to="/submit/my" className="btn-ghost">{t('sub.mySubs')}</Link>
        </div>
      </div>);
  }

  const MRow = ({ mkey, label }: any) => {
    const m = meas[mkey] || { value: '', unit: 'sqm', sqm: 0 };
    return (
      <div className="grid grid-cols-[1fr_110px_100px] gap-2 items-center">
        <span className="text-xs text-slate-600">{label}</span>
        <input value={m.value} inputMode="decimal" placeholder="0" onChange={e => { const value = e.target.value; setM(mkey, { value, sqm: toSqm(value, m.unit || 'sqm') }); }} className={IN} />
        <select value={m.unit || 'sqm'} onChange={e => { const unit = e.target.value; setM(mkey, { unit, sqm: toSqm(m.value, unit) }); }} className="select">
          {AREA_UNITS.map(u => <option key={u}>{u}</option>)}
        </select>
        {!!m.sqm && <span className="col-span-3 text-[11px] text-gov-navy">{t('sub.canon', { v: Number(m.sqm).toFixed(2) })}</span>}
      </div>);
  };

  const diffRows = () => {
    const rows: any[] = [];
    const sub = submittedSqm();
    if (existing?.area_sqft && sub > 0) {
      const oldM = existing.area_sqft / 10.7639;
      rows.push({ k: t('sub.diffArea'), old: `${oldM.toFixed(2)} m²`, cur: `${sub.toFixed(2)} m²`, d: sub - oldM, u: 'm²' });
    }
    if (existing?.height && p.building_height_m) {
      rows.push({ k: t('sub.diffHeight'), old: `${existing.height} m`, cur: `${p.building_height_m} m`, d: parseFloat(p.building_height_m) - existing.height, u: 'm' });
    }
    if (existing?.z_min != null && p.z_min != null && p.z_max != null) {
      rows.push({ k: t('sub.diffVert'), old: `${existing.z_min}–${existing.z_max} m`, cur: `${p.z_min}–${p.z_max} m`, d: 0, u: '' });
    }
    return rows;
  };

  return (
    <div className="p-5 max-w-[900px] mx-auto space-y-4">
      <PageHeader title={sid ? t('sub.subId', { v: sid }) : t('sub.newHead')}
        sub={govtMode ? t('sub.govtMode') : t('sub.ownerMode')}
        actions={<div className="flex gap-2">
          <button onClick={fillDemo} title={t('sub.fillTitle')} className="btn-primary flex items-center gap-1.5 text-xs !bg-gov-saffron !border-gov-saffron hover:!bg-gov-saffronDark"><Sparkles size={13} />{t('sub.fillDemo')}</button>
          <button onClick={() => saveDraft(false)} className="btn-ghost flex items-center gap-1.5 text-xs"><Save size={13} />{t('sub.saveDraft')}</button>
        </div>} />
      {/* progress */}
      <div className="flex items-center gap-1 flex-wrap">
        {WIZARD_STEPS.map((t, i) => (
          <button key={t} onClick={() => i < step && setStep(i)}
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors ${i === step ? 'border-gov-navy bg-blue-50 text-slate-900 font-semibold' : i < step ? 'border-slate-200 text-gov-navy' : 'border-slate-200 text-slate-500'}`}>
            <span className="font-mono">{i + 1}</span>{lang === 'hi' ? WIZARD_STEPS_HI[i] : t}</button>))}
      </div>

      {/* STEP 0 source */}
      {step === 0 && <div className="panel-pad space-y-3">
        <div className="font-semibold text-slate-900 text-sm">{t('sub.source')}</div>
        {govtMode ? (
          <><div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">{t('sub.govtAs')} <b>{role}</b>{t('sub.deptSrcSuffix')}</div>
            <F label={t('sub.fDept')} req hint={t('sub.fDeptH')}><input value={department} onChange={e => setDepartment(e.target.value)} className={IN} placeholder={t('sub.deptName')} /></F></>
        ) : (
          <div className="text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg p-2.5">{t('sub.ownerClaim')}</div>)}
      </div>}

      {/* STEP 1 intent */}
      {step === 1 && <div className="panel-pad space-y-3">
        <div className="font-semibold text-slate-900 text-sm">{t('sub.what')}</div>
        <div className="grid sm:grid-cols-2 gap-2">
          {[['new', t('sub.newKind'), t('sub.newKindD')], ['update', t('sub.updKind'), t('sub.updKindD')]].map(([v, t, d]) => (
            <button key={v} onClick={() => setKind(v)} className={`text-left border rounded-xl p-3 ${kind === v ? 'border-gov-navy bg-blue-50' : 'border-slate-200 hover:bg-slate-100'}`}>
              <div className="text-sm font-semibold text-slate-900">{t}</div><div className="text-[11px] text-slate-500">{d}</div></button>))}
        </div>
        <F label={t('sub.find')} hint={t('sub.findH')}>
          <div className="flex gap-2"><input value={lookup} onChange={e => setLookup(e.target.value)} onKeyDown={e => e.key === 'Enter' && api.search(lookup).then(r => setLookupRes(r.results || []))} className={IN} placeholder="DL-SKT-0182-B01-F08-U804" />
            <button onClick={() => api.search(lookup).then(r => setLookupRes(r.results || [])).catch((e: any) => setToast(e.message))} className="btn-primary shrink-0">{t('map.search')}</button></div>
        </F>
        {!!lookupRes.length && <div className="flex flex-wrap gap-1.5">{lookupRes.slice(0, 6).map((r: any) => (
          <button key={r.id} onClick={() => { if (r.kind === 'unit') lookupExisting(r.id, 'unit'); else if (r.kind === 'parcel') lookupExisting(r.id, 'parcel'); else if (r.kind === 'building') lookupExisting(r.id, 'building'); setKind('update'); }} className="chip">{r.label}</button>))}</div>}
        <button onClick={() => setShowMap(true)} className="btn-ghost flex items-center gap-1.5 text-xs"><MapPin size={13} />{t('sub.pickMap')}</button>
        {(targets.parcel || targets.building || targets.unit) && <div className="text-[11px] text-gov-navy">{t('sub.linked', { v: [targets.parcel, targets.building, targets.floor, targets.unit].filter(Boolean).join(' · ') })}</div>}
      </div>}

      {/* STEP 2 property & location */}
      {step === 2 && <div className="panel-pad space-y-3">
        <div className="font-semibold text-slate-900 text-sm">{t('sub.propLoc')}</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <F label={t('sub.propType')} req><select value={propertyType} onChange={e => setPropertyType(e.target.value)} className="select w-full">{PROPERTY_TYPES.map((pt, pi) => <option key={pt} value={pt}>{lang === 'hi' ? PROPERTY_TYPES_HI[pi] : pt}</option>)}</select></F>
          <F label={t('sub.propName')} req hint={t('sub.fPropNameH')}><input value={p.property_name || ''} onChange={e => set('property_name', e.target.value)} className={IN} /></F>
          <F label={t('sub.fExistUlp')} hint={t('sub.fExistUlpH')}><input value={p.existing_ulpin || ''} onChange={e => set('existing_ulpin', e.target.value.toUpperCase())} className={`${IN} font-mono`} /></F>
          <F label={t('sub.fSurvey')}><input value={p.survey_number || ''} onChange={e => set('survey_number', e.target.value)} className={IN} /></F>
          <F label={t('sub.fSubdiv')}><input value={p.subdivision_number || ''} onChange={e => set('subdivision_number', e.target.value)} className={IN} /></F>
          <F label={t('sub.fPlot')}><input value={p.plot_number || ''} onChange={e => set('plot_number', e.target.value)} className={IN} /></F>
          <F label={t('sub.fTower')}><input value={p.tower || ''} onChange={e => set('tower', e.target.value)} className={IN} /></F>
          <F label={t('sub.fUsage')} hint={t('sub.fUsageH')}><input value={p.usage || ''} onChange={e => set('usage', e.target.value)} className={IN} /></F>
        </div>
        {blocks.parcel && <div className="border-t border-slate-200 pt-3 space-y-3">
          <div className="text-xs font-bold text-slate-900">{t('sub.parcel')}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <F label={t('sub.parcelId')} req={kind === 'update'}><input value={p.parcel_id || ''} onChange={e => set('parcel_id', e.target.value.toUpperCase())} className={`${IN} font-mono`} /></F>
            <F label={t('sub.fLandUse')}><select value={p.land_use || 'Residential'} onChange={e => set('land_use', e.target.value)} className="select w-full">{['Residential', 'Commercial', 'Industrial', 'Mixed', 'Government', 'Agricultural'].map(t => <option key={t}>{t}</option>)}</select></F>
            <F label={t('sub.fBoundary')} hint={t('sub.fBoundaryH')}><input value={p.boundary_source || ''} onChange={e => set('boundary_source', e.target.value)} className={IN} /></F>
          </div></div>}
        {blocks.building && <div className="border-t border-slate-200 pt-3 space-y-3">
          <div className="text-xs font-bold text-slate-900">{t('sub.building')}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <F label={t('sub.fBldName')}><input value={p.building_name || ''} onChange={e => set('building_name', e.target.value)} className={IN} /></F>
            <F label={t('sub.fBldId')}><input value={p.building_id || ''} onChange={e => set('building_id', e.target.value.toUpperCase())} className={IN} /></F>
            <F label={t('sub.fBldType')}><select value={p.building_type || 'Residential'} onChange={e => set('building_type', e.target.value)} className="select w-full">{['Residential', 'Commercial', 'Industrial', 'Institutional', 'Government', 'Mixed Use', 'Other'].map(t => <option key={t}>{t}</option>)}</select></F>
            <F label={t('sub.fFloors')}><input type="number" value={p.num_floors || ''} onChange={e => set('num_floors', e.target.value)} className={IN} /></F>
            <F label={t('sub.fBasements')}><input type="number" value={p.basements || ''} onChange={e => set('basements', e.target.value)} className={IN} /></F>
            <F label={t('sub.fConstYr')}><input type="number" value={p.construction_year || ''} onChange={e => set('construction_year', e.target.value)} className={IN} /></F>
            <F label={t('sub.fApprRef')}><input value={p.approval_ref || ''} onChange={e => set('approval_ref', e.target.value)} className={IN} /></F>
            <F label={t('sub.fComplete')}><input value={p.completion || ''} onChange={e => set('completion', e.target.value)} className={IN} /></F>
          </div></div>}
        {blocks.floor && <div className="border-t border-slate-200 pt-3 space-y-3">
          <div className="text-xs font-bold text-slate-900">{t('sub.floor')}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <F label={t('sub.fFloorNo')} hint={t('sub.fFloorNoH')}><input type="number" value={p.floor_number ?? ''} onChange={e => set('floor_number', e.target.value)} className={IN} /></F>
            <F label={t('sub.fFloorUse')}><select value={p.floor_usage || 'Residential'} onChange={e => set('floor_usage', e.target.value)} className="select w-full">{['Basement', 'Parking', 'Ground', 'Residential', 'Commercial', 'Office', 'Utility', 'Mechanical', 'Terrace/Roof', 'Other'].map(t => <option key={t}>{t}</option>)}</select></F>
            <F label={t('sub.fFloorPlan')}><select value={p.floor_plan || 'No'} onChange={e => set('floor_plan', e.target.value)} className="select w-full"><option value="Yes">{t('sub.yes')}</option><option value="No">{t('sub.no')}</option></select></F>
          </div></div>}
        {blocks.unit && <div className="border-t border-slate-200 pt-3 space-y-3">
          <div className="text-xs font-bold text-slate-900">{t('sub.unit')}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <F label={t('sub.fUnitNo')} req><input value={p.unit_number || ''} onChange={e => set('unit_number', e.target.value)} className={IN} /></F>
            <F label={t('sub.fUnitType')} hint={t('sub.fUnitTypeH')}><input value={p.unit_type || ''} onChange={e => set('unit_type', e.target.value)} className={IN} /></F>
          </div></div>}
        {blocks.utility && <div className="border-t border-slate-200 pt-3 space-y-3">
          <div className="text-xs font-bold text-slate-900">{t('sub.fUtil')}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <F label={t('sub.fUtilType')} req><select value={p.utility_type || 'Water'} onChange={e => set('utility_type', e.target.value)} className="select w-full">{['Water', 'Electrical', 'Sewer', 'Telecom', 'Gas', 'Transport'].map(t => <option key={t}>{t}</option>)}</select></F>
            <F label={t('sub.fDepth')} req><input type="number" step="0.1" value={p.depth_m ?? ''} onChange={e => set('depth_m', e.target.value)} className={IN} /></F>
            <F label={t('sub.fInstYr')}><input type="number" value={p.install_year || ''} onChange={e => set('install_year', e.target.value)} className={IN} /></F>
            <F label={t('sub.fAffParcels')} hint={t('sub.fAffParcelsH')}><input value={p.affected_parcels || ''} onChange={e => set('affected_parcels', e.target.value)} className={IN} /></F>
          </div></div>}
        <div className="border-t border-slate-200 pt-3 space-y-3">
          <div className="text-xs font-bold text-slate-900">{t('sub.addr')}</div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[['state', t('sub.fState')], ['district', t('sub.fDistrict')], ['tehsil', t('sub.fTehsil')], ['city', t('sub.fCity')], ['ward', t('sub.fWard')], ['locality', t('sub.fLocality')], ['society', t('sub.fColony')], ['street', t('sub.fStreet')], ['pin', t('sub.fPin')], ['landmark', t('sub.fLandmark')]].map(([k, l]) => (
              <F key={k} label={l} req={['state', 'city', 'locality'].includes(k)}><input value={p[k] || ''} onChange={e => set(k, e.target.value)} className={IN} /></F>))}
            <F label={t('sub.fLat')} hint={t('sub.fLatH')}><input inputMode="decimal" value={p.latitude ?? ''} onChange={e => set('latitude', e.target.value)} className={`${IN} font-mono`} /></F>
            <F label={t('sub.fLng')}><input inputMode="decimal" value={p.longitude ?? ''} onChange={e => set('longitude', e.target.value)} className={`${IN} font-mono`} /></F>
            <F label={t('sub.fCoordSrc')}><select value={p.coord_source || 'Manual'} onChange={e => set('coord_source', e.target.value)} className="select w-full">{['GNSS', 'CORS', 'Survey', 'Existing GIS', 'Drone', 'Satellite', 'Manual', 'Other'].map(t => <option key={t}>{t}</option>)}</select></F>
            <F label={t('sub.fAcc')}><input value={p.coord_accuracy || ''} onChange={e => set('coord_accuracy', e.target.value)} className={IN} /></F>
            <F label={t('sub.fSurveyDate')}><input value={p.survey_date || ''} onChange={e => set('survey_date', e.target.value)} placeholder="YYYY-MM-DD" className={IN} /></F>
          </div>
          <button onClick={() => setShowMap(true)} className="btn-ghost flex items-center gap-1.5 text-xs"><MapPin size={13} />{t('sub.pickLoc')}</button>
        </div>
      </div>}

      {/* STEP 3 measurements */}
      {step === 3 && <div className="panel-pad space-y-3">
        <div className="font-semibold text-slate-900 text-sm">{t('sub.meas')}</div>
        <div className="text-[11px] text-slate-500">{t('sub.measNote')}</div>
        <div className="space-y-2">{AREA_ROWS.filter(r => r.types.includes(propertyType)).map(r => <MRow key={r.key} mkey={r.key} label={lang === 'hi' ? (AREA_LABEL_HI[r.key] || r.label) : r.label} />)}</div>
        <div className="border-t border-slate-200 pt-3 grid sm:grid-cols-3 gap-3">
          {[['length_m', t('sub.mLength')], ['width_m', t('sub.mWidth')], ['height_m', t('sub.mHeight')], ['depth_m2', t('sub.mDepth')], ['perimeter_m', t('sub.mPerim')], ['building_height_m', t('sub.mBldH')], ['floor_height_m', t('sub.mFloorH')], ['basement_depth_m', t('sub.mBaseDepth')], ['ground_elev_m', t('sub.mGround')], ['z_min', t('sub.mZmin')], ['z_max', t('sub.mZmax')]].map(([k, l]) => (
            <F key={k} label={l}><input type="number" step="0.01" value={p[k] ?? ''} onChange={e => set(k, e.target.value)} className={IN} /></F>))}
          <F label={t('sub.mElevSrc')}><input value={p.elev_source || ''} onChange={e => set('elev_source', e.target.value)} className={IN} /></F>
        </div>
        {(p.z_min != null && p.z_max != null && p.z_min !== '' && p.z_max !== '') && (
          <div className="text-[11px] text-gov-navy">{t('sub.vertExt', { v: (parseFloat(p.z_max) - parseFloat(p.z_min)).toFixed(2) })}</div>)}
      </div>}

      {/* STEP 4 ownership */}
      {step === 4 && <div className="panel-pad space-y-3">
        <div className="font-semibold text-slate-900 text-sm">{t('sub.owner')}</div>
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{t('sub.ownerNote')}</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <F label={t('sub.fOwner')} req><input value={p.owner_name || ''} onChange={e => set('owner_name', e.target.value)} className={IN} placeholder={t('sub.fOwnerPh')} /></F>
          <F label={t('sub.fOwnerRef')}><input value={p.owner_reference || ''} onChange={e => set('owner_reference', e.target.value)} className={IN} /></F>
          <F label={t('sub.fOwnerType')}><select value={p.ownership_type || 'Freehold'} onChange={e => set('ownership_type', e.target.value)} className="select w-full">{['Freehold', 'Leasehold'].map(t => <option key={t}>{t}</option>)}</select></F>
          <F label={t('sub.fRightType')}><select value={p.right_type || 'Ownership'} onChange={e => set('right_type', e.target.value)} className="select w-full">{['Ownership', 'Lease', 'Easement', 'Access Right', 'Utility Right', 'Other'].map(t => <option key={t}>{t}</option>)}</select></F>
          <F label={t('sub.fRegRef')}><input value={p.reg_ref || ''} onChange={e => set('reg_ref', e.target.value)} className={IN} /></F>
          <F label={t('sub.fShare')} hint={t('sub.fShareH')}><input value={p.share || ''} onChange={e => set('share', e.target.value)} className={IN} /></F>
          <F label={t('sub.fLeaseNotes')}><input value={p.right_notes || ''} onChange={e => set('right_notes', e.target.value)} className={IN} /></F>
        </div>
      </div>}

      {/* STEP 5 documents */}
      {step === 5 && <div className="panel-pad space-y-3">
        <div className="font-semibold text-slate-900 text-sm">{t('sub.docs')} <span className="font-normal text-slate-500">{t('sub.docsOpt')}</span></div>
        {!!docs.length && <div className="space-y-1.5">{docs.map((d: any) => (
          <div key={d.id} className="border border-slate-200 rounded-lg p-2 text-xs text-slate-700">✓ <b>{d.doc_type}</b>{d.doc_number ? ` — ${d.doc_number}` : ''}<div className="text-slate-500">{[d.authority, d.doc_date, d.filename].filter(Boolean).join(' · ')}</div></div>))}</div>}
        <div className="grid sm:grid-cols-2 gap-3 border border-dashed border-slate-200 rounded-xl p-3">
          <F label={t('sub.fDocType')}><select value={doc.doc_type} onChange={e => setDoc({ ...doc, doc_type: e.target.value })} className="select w-full">{['Ownership document', 'Sale deed / reference', 'Registration document', 'Property tax record', 'Approved building plan', 'Floor plan', 'Survey report', 'Completion certificate', 'Occupancy certificate', 'Utility document', 'Government record', 'Property photograph', 'Other supporting document'].map(t => <option key={t}>{t}</option>)}</select></F>
          <F label={t('sub.fFile')} req hint={t('sub.fFileH')}><input type="file" onChange={e => setDoc({ ...doc, file: e.target.files?.[0] })} className="text-xs text-slate-600 file:mr-2 file:btn-ghost file:border-0" /></F>
          <F label={t('sub.fDocNo')}><input value={doc.doc_number || ''} onChange={e => setDoc({ ...doc, doc_number: e.target.value })} className={IN} /></F>
          <F label={t('sub.fDocDate')}><input value={doc.doc_date || ''} onChange={e => setDoc({ ...doc, doc_date: e.target.value })} placeholder="YYYY-MM-DD" className={IN} /></F>
          <F label={t('sub.fAuthority')}><input value={doc.authority || ''} onChange={e => setDoc({ ...doc, authority: e.target.value })} className={IN} /></F>
          <F label={t('sub.fDesc')}><input value={doc.description || ''} onChange={e => setDoc({ ...doc, description: e.target.value })} className={IN} /></F>
        </div>
        <button onClick={uploadDoc} disabled={busy} className="btn-ghost flex items-center gap-1.5 text-xs disabled:opacity-50"><UploadCloud size={13} />{t('sub.uploadDoc')}</button>
      </div>}

      {/* STEP 6 review */}
      {step === 6 && <div className="panel-pad space-y-3">
        <div className="font-semibold text-slate-900 text-sm">{t('sub.review')}</div>
        <div className="grid sm:grid-cols-2 gap-1.5 text-xs">
          {[[t('sub.rProp'), p.property_name || propertyType], [t('sub.rIntent'), kind === 'new' ? t('sub.rNew') : t('sub.rUpd')],
            [t('sub.rParcel'), targets.parcel || p.parcel_id || '—'], [t('sub.rBld'), targets.building || p.building_id || '—'],
            [t('sub.rFloor'), targets.floor || (p.floor_number ?? '—')], [t('sub.rUnit'), targets.unit || p.unit_number || '—'],
            [t('sub.rArea'), submittedSqm() ? `${submittedSqm().toFixed(2)} m²` : '—'],
            [t('sub.rVert'), (p.z_min != null && p.z_min !== '' && p.z_max) ? `${p.z_min}–${p.z_max} m` : '—'],
            [t('sub.rOwner'), p.owner_name || '—'], [t('sub.rDocs'), `${docs.length} ${t('sub.rUploaded')}`],
            [t('sub.rSource'), govtMode ? t('sub.rDept', { v: department }) : t('sub.rOwnerUnv')],
            [t('sub.rStatus'), govtMode ? t('sub.rValInt') : t('sub.rPendHum')]].map(([k, v]) =>
            <div key={k} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"><span className="text-slate-500">{k}:</span> <span className="text-slate-800">{v}</span></div>)}
        </div>
        {!!diffRows().length && <div>
          <div className="text-xs font-bold text-slate-900 mb-1">{t('sub.existing')}</div>
          {diffRows().map((r: any) => <div key={r.k} className="text-xs border-b border-slate-200 py-1.5"><b className="text-slate-700">{r.k}:</b> <span className="text-slate-500">{r.old}</span> <span className="text-slate-600">↓</span> <span className="text-gov-navy">{r.cur}</span>{r.d ? <span className={`ml-1 font-mono ${r.d > 0 ? 'text-amber-700' : 'text-sky-700'}`}>({r.d > 0 ? '+' : ''}{r.d.toFixed(2)} {r.u})</span> : null}</div>)}
        </div>}
        {!!dups.length && <div className="border border-amber-200 bg-amber-50 rounded-xl p-2.5">
          <div className="text-xs font-bold text-amber-700">{t('sub.dupNote')}</div>
          {dups.map((m: any) => <div key={m.id} className="text-[11px] text-slate-600 mt-1">{m.label}</div>)}
        </div>}
        {!!aiWarn.length && aiWarn.map((w, i) => <div key={i} className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">{t('sub.aiAssist', { v: w })}</div>)}
        <label className="flex gap-2 items-start text-xs text-slate-600"><input type="checkbox" checked={declared} onChange={e => setDeclared(e.target.checked)} className="mt-0.5 accent-[#1A3A6B]" />
          {t('sub.declare1')} {govtMode ? t('sub.declareGovt') : t('sub.declareOwner')}</label>
      </div>}

      {/* nav */}
      <div className="flex gap-2">
        {step > 0 && <button onClick={() => setStep(s => s - 1)} className="btn-ghost flex items-center gap-1 text-xs"><ArrowLeft size={13} />{t('sub.back')}</button>}
        {step < 6 && <button onClick={next} disabled={busy} className="btn-primary flex items-center gap-1 text-xs disabled:opacity-50">{t('sub.continue')}<ArrowRight size={13} /></button>}
        {step === 6 && <button onClick={submit} disabled={busy || !declared} className="btn-primary text-xs disabled:opacity-50">{sid && done === null ? t('sub.submitBtn') : t('sub.submitBtn')}</button>}
      </div>

      {/* map picker modal reuses the existing 2D map */}
      {showMap && <div className="fixed inset-0 z-[70] bg-black/70 p-4 flex items-center justify-center" onClick={() => setShowMap(false)}>
        <div className="panel w-full max-w-4xl h-[560px] p-3 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 text-sm"><MapPin size={15} className="text-gov-navy" /><b className="text-slate-900">{t('sub.mapTitle')}</b>
            <span className="text-[11px] text-slate-500">{t('sub.mapHelp')}</span>
            <button onClick={() => setShowMap(false)} className="btn-ghost ml-auto !py-1 !text-xs">{t('sub.closeMap')}</button></div>
          <div className="flex-1 min-h-0"><Map2D onSelect={pickOnMap} highlights={[]} layerState={{ parcels: true, buildings: true, utils: false }} /></div>
        </div>
      </div>}
    </div>
  );
}
