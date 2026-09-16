import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, ChevronLeft, ChevronRight, ArrowLeft, FileWarning } from 'lucide-react';
import { api } from '../lib/api';
import { entity3DLink as entityLink } from '../lib/nav';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { StatusBadge } from '../components/ui';
import { Empty, PageHeader } from '../components/feedback';

const PAGE = 12;

export function ValidationPage() {
  const { data, refetch, isLoading } = useQuery({ queryKey: ['val'], queryFn: () => api.get('/api/validation/issues') });
  const { setToast } = useStore();
  const { t } = useLang();
  const [sev, setSev] = useState('');
  const [st, setSt] = useState('');
  const [page, setPage] = useState(0);
  const list = (data || []).filter((i: any) => (!sev || i.severity === sev) && (!st || i.status === st));
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const view = list.slice(page * PAGE, page * PAGE + PAGE);
  const review = async (id: string, s: string) => {
    try {
      await api.post(`/api/validation/${id}/review`, { status: s, user: 'demo-officer' });
      setToast(t('val.marked', { v: s })); refetch();
    } catch (e: any) { setToast(t('val.fail', { e: e.message })); }
  };
  return (
    <div className="p-5 space-y-4 max-w-[1400px] mx-auto">
      <PageHeader title={t('val.title')} sub={t('val.sub')}
        actions={<>
          <select value={sev} onChange={e => { setSev(e.target.value); setPage(0); }} className="select" aria-label={t('val.sevAria')}>
            <option value="">{t('val.allSev')}</option><option>High</option><option>Medium</option><option>Low</option></select>
          <select value={st} onChange={e => { setSt(e.target.value); setPage(0); }} className="select" aria-label={t('val.stAria')}>
            <option value="">{t('val.allSt')}</option><option>Open</option><option>Under Review</option><option>Resolved</option><option>Rejected</option></select>
          <button onClick={async () => { const r = await api.post('/api/validation/run'); setToast(t('val.done', { n: r.issues })); refetch(); }}
            className="btn-primary flex items-center gap-1.5"><Play size={14} />{t('val.run')}</button>
        </>} />
      <div className="text-xs text-slate-500">{t('val.page', { n: list.length, p: `${page + 1}/${pages}` })}</div>
      {isLoading && <div className="text-sm text-slate-400">{t('val.loading')}</div>}
      {!isLoading && !list.length && <Empty text={t('val.empty')} />}
      <div className="grid md:grid-cols-2 gap-3" data-tour="tour-validation">
        {view.map((i: any) => (
          <div key={i.id} className={`panel p-4 text-sm border-l-2 ${i.severity === 'High' ? '!border-l-red-400' : i.severity === 'Medium' ? '!border-l-amber-400' : '!border-l-sky-400'}`}>
            <div className="flex gap-2 items-center flex-wrap"><b className="text-slate-900">{i.type}</b><StatusBadge s={i.severity} /><StatusBadge s={i.status} />
              <span className="ml-auto text-[11px] text-slate-500">AI {i.confidence}%</span></div>
            <div className="text-xs text-slate-500 font-mono mt-1">{i.entity_type}: {i.entity}</div>
            <div className="text-xs text-slate-600 mt-1.5">{i.description}</div>
            <div className="text-[11px] text-slate-500 mt-1">Evidence: {(i.evidence || []).join(', ')}</div>
            <div className="text-[11px] text-gov-navy mt-1">→ {i.action}</div>
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              {entityLink(i.entity) && <Link to={entityLink(i.entity)!} className="text-[11px] font-semibold bg-gov-navy text-white rounded-md px-2.5 py-1">{t('c.open3d')}</Link>}
              <Link to={`/validation/case/${i.entity}`} className="text-[11px] font-semibold border border-slate-200 text-slate-700 rounded-md px-2.5 py-1 hover:bg-slate-100">{t('val.case')}</Link>
              {['Under Review', 'Resolved', 'Rejected'].map(s =>
                <button key={s} className="btn-ghost !text-[11px] !py-1" onClick={() => review(i.id, s)}>{s}</button>)}
            </div>
          </div>))}
      </div>
      {pages > 1 && <div className="flex gap-2 justify-center text-sm">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost disabled:opacity-40 flex items-center gap-1"><ChevronLeft size={14} />{t('c.prev')}</button>
        <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} className="btn-ghost disabled:opacity-40 flex items-center gap-1">{t('c.next')}<ChevronRight size={14} /></button>
      </div>}
    </div>
  );
}

const UCOLOR: any = { Water: 'bg-sky-400', Electrical: 'bg-yellow-400', Sewer: 'bg-violet-400', Telecom: 'bg-emerald-400', Gas: 'bg-rose-400', Transport: 'bg-slate-300' };

/** Case file: one entity's full story — snapshot, measurements, evidence, history, live audit. */
export function ValidationCase() {
  const { entity } = useParams();
  const { data, refetch, isLoading, isError } = useQuery({
    queryKey: ['case', entity], queryFn: () => api.get('/api/validation/case/' + entity), retry: 1 });
  const { setToast } = useStore();
  const { t } = useLang();
  const review = async (id: string, s: string) => {
    try {
      await api.post(`/api/validation/${id}/review`, { status: s, user: 'demo-officer' });
      setToast(t('val.marked', { v: s })); refetch();
    } catch (e: any) { setToast(t('val.fail', { e: e.message })); }
  };
  if (isLoading) return <div className="p-6 text-sm text-slate-400">{t('val.opening')}</div>;
  if (isError || !data) return (
    <div className="p-6 text-sm max-w-xl mx-auto text-center">
      <FileWarning size={26} className="text-slate-600 mx-auto mb-2" />
      <div className="font-bold text-slate-900 text-lg">{t('val.noCase')}</div>
      <Link to="/validation" className="btn-primary inline-block mt-4">{t('val.backCenter')}</Link>
    </div>);
  const s = data.snapshot || {};
  const maxH = Math.max(s.registered_height_m || 0, s.lidar_height_m || 0, 1);
  const bar = (v: number, cls: string) => (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 h-4 bg-slate-100 rounded-md overflow-hidden">
        <div className={`h-full rounded-md ${cls}`} style={{ width: `${Math.max(4, (v / maxH) * 100)}%` }} /></div>
      <span className="w-16 text-right font-mono text-slate-700">{v.toFixed(1)} m</span>
    </div>);
  return (
    <div className="p-5 space-y-4 max-w-[1000px] mx-auto" data-tour="tour-case">
      <Link to="/validation" className="text-xs text-gov-navy flex items-center gap-1 w-fit"><ArrowLeft size={13} />Validation Center</Link>
      <PageHeader title={t('val.caseT')} sub={t('val.caseS')}
        actions={entityLink(data.entity) ? <Link to={entityLink(data.entity)!} className="btn-primary !py-1.5">{t('c.open3dArrow')}</Link> : undefined} />
      <div className="panel-pad">
        <div className="font-mono font-bold text-gov-navy">{data.entity}</div>
        <div className="text-xs text-slate-400 mt-0.5">{s.name || s.kind} {s.parcel ? `· Parcel ${s.parcel}` : ''}</div>
        {s.kind === 'building' && (
          <div className="mt-3 space-y-1.5">
            <div className="text-[11px] text-slate-500">{t('val.regH')}</div>{bar(s.registered_height_m, 'bg-sky-400')}
            <div className="text-[11px] text-slate-500">{t('val.lidarH')}</div>{bar(s.lidar_height_m, 'bg-red-400')}
            <div className="text-xs mt-1">{t('val.diff')}<b className="text-red-700 font-mono">{typeof s.difference_m === 'number' ? `${s.difference_m > 0 ? '+' : ''}${s.difference_m.toFixed(1)} m` : '—'}</b>
              <span className="text-slate-500"> · {s.floors} floors · {s.confidence}% · </span><StatusBadge s={s.status} /></div>
          </div>)}
      </div>
      <div className="space-y-2.5">
        <div className="text-sm font-bold text-slate-900">{t('val.findings', { n: data.issues.length })}</div>
        {data.issues.map((i: any) => (
          <div key={i.id} className="panel p-4 text-sm">
            <div className="flex gap-2 items-center flex-wrap"><b className="text-slate-900">{i.type}</b>
              <StatusBadge s={i.severity} /><StatusBadge s={i.status} />
              <span className="ml-auto text-[11px] text-slate-500">AI {i.confidence}%</span></div>
            <div className="text-xs text-slate-600 mt-1.5">{i.description}</div>
            <div className="text-[11px] text-slate-500 mt-1">Evidence: {(i.evidence || []).join(', ')}</div>
            <div className="text-[11px] text-gov-navy mt-1">→ {i.action}</div>
            <div className="flex gap-1.5 mt-2.5">
              {['Under Review', 'Resolved', 'Rejected'].map(st =>
                <button key={st} className="btn-ghost !text-[11px] !py-1" onClick={() => review(i.id, st)}>{st}</button>)}
            </div>
          </div>))}
      </div>
      {!!data.history?.length && (
        <div className="panel-pad"><div className="font-semibold text-sm text-slate-900 mb-2">{t('val.history')}</div>
          <div className="text-xs space-y-2">{data.history.map((h: any, j: number) => (
            <div key={j} className="flex gap-2.5"><div className="w-2 h-2 rounded-full bg-gov-navy mt-1 shrink-0" />
              <div className="text-slate-600"><b className="text-slate-800">{h.timestamp}</b> — {h.event}<div className="text-slate-500">{h.description}</div></div></div>))}
          </div></div>)}
      <div className="panel-pad"><div className="font-semibold text-sm text-slate-900 mb-2">{t('val.audit')} <span className="text-[11px] font-normal text-slate-500">{t('val.auditS')}</span></div>
        <div className="text-xs space-y-1">{(data.audit || []).map((a: any, j: number) => (
          <div key={j} className="border-b border-slate-200 py-1.5 text-slate-600 font-mono !text-[11px]">{a.time} · {a.user}({a.role}) · {a.action}</div>))}
          {!data.audit?.length && <div className="text-slate-500 text-xs">{t('val.noAudit')}</div>}
        </div></div>
    </div>
  );
}

export function InfraPage() {
  const { data } = useQuery({ queryKey: ['u'], queryFn: () => api.get('/api/utilities') });
  const { t } = useLang();
  const [f, setF] = useState('');
  const list = (data || []).filter((u: any) => !f || u.type === f);
  return (
    <div className="p-5 space-y-4 max-w-[1400px] mx-auto">
      <PageHeader title={t('inf.title')} sub={t('inf.sub')}
        actions={<div className="flex gap-1.5 flex-wrap">{['', 'Water', 'Electrical', 'Sewer', 'Telecom', 'Gas', 'Transport'].map(x =>
          <button key={x} onClick={() => setF(x)} className={`text-xs border rounded-lg px-2.5 py-1.5 transition-colors ${f === x ? 'bg-gov-navy text-white font-semibold border-accent-400' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{x || t('adm.allOpt')}</button>)}</div>} />
      <div className="grid md:grid-cols-3 gap-2.5 text-sm">{list.map((u: any) =>
        <div key={u.utility_id} className="panel p-3.5">
          <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${UCOLOR[u.type] || 'bg-slate-400'}`} />
            <b className="text-slate-900 font-mono text-xs">{u.utility_id}</b><span className="text-xs text-slate-400">{u.type}</span>
            <StatusBadge s={u.status} /></div>
          <div className="text-xs text-slate-500 mt-1.5">Depth {u.depth_m}m · {u.owner} · {u.year}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Parcels: {(u.parcels || []).join(', ') || '—'}</div></div>)}</div>
    </div>
  );
}

export function ReportsPage() {
  const [ulpin, setUlpin] = useState('DL-SKT-0182-B01-F08-U804');
  const [kind, setKind] = useState<'property' | 'validation' | 'evidence'>('property');
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const { setToast } = useStore();
  const { t } = useLang();
  const generate = async () => {
    setBusy(true);
    try {
      if (kind === 'property') {
        const [u, s, h, v] = await Promise.all([
          api.get('/api/units/' + ulpin), api.get(`/api/properties/${ulpin}/sources`),
          api.get(`/api/properties/${ulpin}/history`), api.get(`/api/properties/${ulpin}/validation`),
        ]);
        setOut({ kind, u, s: s.evidence, h, v });
      } else if (kind === 'evidence') {
        const [u, s, h] = await Promise.all([
          api.get('/api/units/' + ulpin), api.get(`/api/properties/${ulpin}/sources`),
          api.get(`/api/properties/${ulpin}/history`),
        ]);
        setOut({ kind, u, s: s.evidence, h });
      } else {
        const iss = await api.get('/api/validation/issues?limit=500');
        const by = (k: string) => iss.reduce((m: any, i: any) => ((m[i[k]] = (m[i[k]] || 0) + 1), m), {});
        setOut({ kind, total: iss.length, sev: by('severity'), st: by('status'), top: iss.slice(0, 10) });
      }
    } catch (e: any) { setToast(t('rep.fail', { e: e.message })); }
    setBusy(false);
  };
  const csv = () => {
    if (!out?.top) return;
    const rows = [['entity', 'type', 'severity', 'status', 'description'],
      ...out.top.map((i: any) => [i.entity, i.type, i.severity, i.status, i.description])];
    const blob = new Blob([rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'validation-summary.csv'; a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="p-5 space-y-4 text-sm max-w-[1000px] mx-auto">
      <PageHeader title={t('rep.title')} sub={t('rep.sub')} />
      <div className="panel-pad flex flex-wrap gap-3 items-end">
        <div><label className="text-xs font-medium text-slate-600">{t('rep.type')}</label><br />
          <select value={kind} onChange={e => { setKind(e.target.value as any); setOut(null); }} className="select mt-1">
            <option value="property">{t('rep.prop')}</option>
            <option value="evidence">{t('rep.evidence')}</option>
            <option value="validation">{t('rep.valSum')}</option>
          </select></div>
        {kind !== 'validation' && <div className="flex-1 min-w-[220px]"><label className="text-xs font-medium text-slate-600">{t('c.protoUlp')}</label><br />
          <input value={ulpin} onChange={e => setUlpin(e.target.value.toUpperCase())} className="input mt-1 w-full font-mono !text-xs" /></div>}
        <button onClick={generate} disabled={busy} className="btn-primary">{busy ? t('rep.generating') : t('rep.generate')}</button>
        {out && <button onClick={() => window.print()} className="btn-ghost">{t('rep.print')}</button>}
        {out?.top && <button onClick={csv} className="btn-ghost">{t('rep.csv')}</button>}
      </div>
      {!out && !busy && <Empty text={t('rep.pick')} />}
      {out?.kind === 'property' && <div className="panel-pad space-y-2.5">
        <div className="font-bold text-slate-900 text-base">{t('rep.propT')}</div>
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{t('c.protoNotice')}</div>
        <div className="font-mono font-bold text-gov-navy">{out.u.prototype_ulpin}</div>
        <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
          {[[t('g.parcel'), out.u.parcel], [t('g.building'), out.u.building_name], [t('g.floor'), out.u.floor_label], [t('g.unit'), out.u.unit],
            [t('g.area'), out.u.area_sqft + ' sq.ft'], [t('g.vertical'), `${out.u.z_min}–${out.u.z_max}m`],
            [t('rep.rStatus'), out.u.verification_status], [t('rep.rConf'), out.u.confidence + '%'],
            [t('rep.rOwner'), out.u.owner?.display_name || t('rep.missing')], [t('rep.rType'), out.u.unit_type]].map(([k, v]) =>
            <div key={k}>{k}: <span className="text-slate-800">{v}</span></div>)}
        </div>
        <div className="text-xs font-semibold text-slate-900 pt-2">Evidence ({out.s.length})</div>
        <div className="text-xs space-y-1.5">{out.s.map((s: any, i: number) => <div key={i} className="border border-slate-200 rounded-lg p-2 text-slate-700"><span className="text-emerald-600">✓</span> {s.type} — {s.name}<div className="text-slate-500">{s.date} · {s.resolution} · {s.provider} · score {s.score}</div></div>)}</div>
        <div className="text-xs font-semibold text-slate-900 pt-2">History ({out.h.length})</div>
        <div className="text-xs space-y-1 text-slate-600">{out.h.map((h: any, i: number) => <div key={i}><b className="text-slate-800">{h.timestamp}</b> — {h.event}: {h.description}</div>)}</div>
        <div className="text-xs font-semibold text-slate-900 pt-2">Open validation ({out.v.length})</div>
        <div className="text-xs space-y-1 text-slate-600">{out.v.length ? out.v.map((v: any, i: number) => <div key={i}><StatusBadge s={v.severity} /> {v.type} — {v.description}</div>) : <span className="text-slate-500">{t('rep.none')}</span>}</div>
      </div>}
      {out?.kind === 'evidence' && <div className="panel-pad space-y-2.5">
        <div className="font-bold text-slate-900 text-base">{t('rep.evT')}<span className="font-mono text-gov-navy">{out.u.prototype_ulpin}</span></div>
        <div className="text-xs text-slate-400">Confidence {out.u.confidence}% · {out.u.verification_status}</div>
        <div className="text-xs space-y-1.5">{out.s.map((s: any, i: number) => <div key={i} className="border border-slate-200 rounded-lg p-2.5 text-slate-700">✓ <b>{s.type}</b> — {s.name}<div className="text-slate-500">Captured {s.date} · {s.resolution} · {s.provider} · contributes score {s.score}</div></div>)}</div>
        <div className="text-xs font-semibold text-slate-900 pt-2">{t('rep.custody')}</div>
        <div className="text-xs space-y-1 text-slate-600">{out.h.map((h: any, i: number) => <div key={i}><b className="text-slate-800">{h.timestamp}</b> — {h.event}: {h.description}</div>)}</div>
      </div>}
      {out?.kind === 'validation' && <div className="panel-pad space-y-2.5">
        <div className="font-bold text-slate-900 text-base">{t('rep.valSumN', { n: out.total })}</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-600">{t('rep.bySev')} {Object.entries(out.sev).map(([k, v]) => `${k} ${v}`).join(' · ')}</div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-600">{t('rep.bySt')} {Object.entries(out.st).map(([k, v]) => `${k} ${v}`).join(' · ')}</div>
        </div>
        <div className="text-xs">{out.top.map((i: any) => <div key={i.id} className="border-b border-slate-200 py-1.5 text-slate-600"><StatusBadge s={i.severity} /> {i.type} · <span className="text-slate-500 font-mono">{i.entity}</span></div>)}</div>
      </div>}
    </div>
  );
}

export function AdminPage() {
  const { data: audit } = useQuery({ queryKey: ['a'], queryFn: () => api.get('/api/audit') });
  const { data: stats } = useQuery({ queryKey: ['st'], queryFn: () => api.get('/api/dashboard/stats') });
  const { setToast } = useStore();
  const { t } = useLang();
  const [auditQ, setAuditQ] = useState('');
  const [lastImport, setLastImport] = useState<any>(null);
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
  const dc = stats?.demo_counts;
  const [th, setTh] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bhu_thresholds') || '{"verified":95,"high":80,"review":60}'); }
    catch { return { verified: 95, high: 80, review: 60 }; }
  });
  const saveTh = () => {
    const v = { verified: +th.verified || 95, high: +th.high || 80, review: +th.review || 60 };
    localStorage.setItem('bhu_thresholds', JSON.stringify(v)); setTh(v);
    setToast(t('adm.saved'));
  };
  return (
    <div className="p-5 space-y-4 text-sm max-w-[1200px] mx-auto">
      <PageHeader title={t('adm.title')} sub={t('adm.sub')} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[[t('adm.sParcels'), dc?.parcels], [t('adm.sBld'), dc?.buildings], [t('adm.sUnits'), dc?.units], [t('adm.sOpen'), dc?.issues],
          [t('adm.sUtils'), dc?.utilities], [t('adm.sVer'), dc?.verified], [t('adm.sNeeds'), dc?.needs_review], [t('adm.sAvg'), dc?.avg_confidence + '%']].map(([l, v]: any) =>
          <div key={l} className="panel p-3.5"><div className="th-label">{l}</div><div className="text-xl font-extrabold text-slate-900 mt-0.5">{v ?? '…'}</div></div>)}
      </div>
      <div className="panel-pad"><div className="font-semibold text-slate-900 mb-1">{t('adm.thresholds')} <span className="text-[11px] font-normal text-slate-500">{t('adm.proto')}</span></div>
        <div className="text-xs text-slate-500 mb-2.5">{t('adm.bands')}</div>
        <div className="flex flex-wrap gap-2.5 items-end text-xs text-slate-600">
          <div><label>{t('adm.verifiedGe')}</label><br /><input type="number" value={th.verified} onChange={e => setTh({ ...th, verified: e.target.value })} className="input mt-1 w-20" /></div>
          <div><label>{t('adm.highGe')}</label><br /><input type="number" value={th.high} onChange={e => setTh({ ...th, high: e.target.value })} className="input mt-1 w-20" /></div>
          <div><label>{t('adm.revGe')}</label><br /><input type="number" value={th.review} onChange={e => setTh({ ...th, review: e.target.value })} className="input mt-1 w-20" /></div>
          <button onClick={saveTh} className="btn-primary">{t('adm.saveBtn')}</button>
        </div></div>
      <div className="panel-pad"><div className="font-semibold text-slate-900 mb-1">{t('adm.ingest')} <span className="text-[11px] font-normal text-slate-500">{t('adm.ingestS')}</span></div>
        <div className="text-xs text-slate-500">{t('adm.ingestD')}</div>
        <div className="flex flex-wrap gap-2 items-center mt-2.5">
        <label className="btn-ghost inline-block cursor-pointer">{t('adm.choose')}
          <input type="file" accept=".geojson,.json,.csv,.kml" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            try {
              const text = await f.text();
              let feats: any[] = [];
              try { const j = JSON.parse(text); feats = j.features || j.parcels || []; }
              catch { feats = text.split('\n').filter(l => l.trim()).map((_, i) => ({ row: i })); }
              const r = await api.post('/api/data/import', { features: feats, filename: f.name });
              const det = r.by_type ? ' (' + Object.entries(r.by_type).map(([k, v]) => `${v} ${k}`).join(', ') + ')' : '';
              setLastImport({ filename: f.name, features: feats, received: r.received, det, bbox: r.bbox });
              setToast(t('adm.validated', { n: r.received, f: det, v: f.name }));
            } catch (err: any) { setToast(t('adm.importFail', { e: err.message })); }
            e.target.value = '';
          }} /></label>
        {lastImport && <Link to="/map" onClick={() => localStorage.setItem('bhu_preview', JSON.stringify(lastImport))}
            className="btn-primary !py-1.5">{t('adm.preview', { n: lastImport.received })}</Link>}
        </div>
        {lastImport && <div className="text-[11px] text-slate-500 mt-2">{t('adm.last', { v: lastImport.filename })} · {lastImport.received} {t('adm.feat')}{lastImport.det} · {t('adm.bbox', { v: lastImport.bbox ? lastImport.bbox.map((n: number) => n.toFixed(4)).join(', ') : '—' })}</div>}
        </div>
      <div className="panel-pad"><div className="font-semibold text-slate-900 mb-2.5">{t('adm.audit')}</div>
        <div className="flex gap-2 mb-2.5">
          <input value={auditQ} onChange={e => setAuditQ(e.target.value)} placeholder={t('adm.filter')} className="input !text-xs flex-1" />
          <button onClick={exportAudit} className="btn-ghost !text-xs">{t('rep.csv')}</button>
        </div>
        <div className="text-xs space-y-1 max-h-64 overflow-auto scrollthin">{filteredAudit.map((a: any, i: number) =>
          <div key={i} className="border-b border-slate-200 py-1.5 text-slate-600 font-mono !text-[11px]">{a.time} · {a.user}({a.role}) · {a.action} · {a.entity}</div>)}
          {!filteredAudit?.length && <div className="text-slate-500">{(audit || []).length ? t('adm.noMatch') : t('adm.noEvents')}</div>}</div></div>
      <div className="panel p-4 text-xs text-slate-500">{t('adm.roles')}</div>
    </div>
  );
}
