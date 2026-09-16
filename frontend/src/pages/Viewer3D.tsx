import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import Building3D from '../components/Building3D';
import { ConfidenceRing, StatusBadge } from '../components/ui';
import { Skeleton, Empty } from '../components/feedback';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';

export default function Viewer3D() {
  const { t } = useLang();
  const [sp, setSp] = useSearchParams();
  // The URL is the single source of truth for selection: every reader derives
  // from ?b/?f/?u and every writer updates the URL. No mirrored state, so no
  // sync loops are possible (reload and in-app nav behave identically).
  const bkey = sp.get('b') || 'DL-SKT-0182-B01';
  const floorId = sp.get('f');
  const unitId = sp.get('u');
  const isoLink = sp.get('iso') === '1';
  const writeSp = (p: Record<string, string>) => {
    const next: any = { ...p };
    if (isoLink) next.iso = '1';
    setSp(next, { replace: true });
  };
  const [exploded, setExploded] = useState(true);
  const [underground, setUnderground] = useState(false);
  const [viewKey, setViewKey] = useState(0);
  const [isolated, setIsolated] = useState(sp.get('iso') === '1');
  const [tab, setTab] = useState<'info' | 'evidence' | 'history' | 'qr' | 'report'>('info');

  const { data: buildings } = useQuery({ queryKey: ['blds'], queryFn: () => api.get('/api/buildings') });
  const { data: b, isLoading: bLoading, isError: bError } = useQuery({ queryKey: ['b', bkey], queryFn: async () => {
    const p = bkey.split('-'); const code = p.pop(); return api.get(`/api/buildings/${p.join('-')}/${code}`); } });
  const { data: floor, isLoading: fLoading } = useQuery({ queryKey: ['f', floorId], queryFn: () => api.get('/api/floors/' + floorId), enabled: !!floorId });
  const { data: unit } = useQuery({ queryKey: ['u', unitId], queryFn: () => api.get('/api/units/' + unitId), enabled: !!unitId });
  const { data: src } = useQuery({ queryKey: ['src', unitId], queryFn: () => api.get(`/api/properties/${unitId}/sources`), enabled: !!unitId });
  const { data: hist } = useQuery({ queryKey: ['h', unitId], queryFn: () => api.get(`/api/properties/${unitId}/history`), enabled: !!unitId });
  const { data: utils } = useQuery({ queryKey: ['utils'], queryFn: () => api.get('/api/utilities') });

  // Allow entry deep-links (tour, shared links) to open the isolated floor view.
  useEffect(() => { if (isoLink && floorId) setIsolated(true); }, [sp]);
  // Auto-select a floor only when the URL has none: prefer the deep-linked
  // unit's own floor, else flagship F08, else the first floor with units.
  // Writing the URL satisfies the guard, so this runs at most once per load.
  useEffect(() => {
    if (floorId || !b?.floor_list?.length) return;
    const list = b.floor_list;
    const unitFloor = unitId ? unitId.split('-U')[0] : null;
    const pick =
      (unitFloor && list.find((f: any) => f.floor_id === unitFloor)) ||
      list.find((f: any) => f.label === 'F08') ||
      list.find((f: any) => f.units > 0) ||
      list[0];
    writeSp({ b: bkey, f: pick.floor_id, ...(unitId ? { u: unitId } : {}) });
  }, [b, sp]);
  // Auto-select the first unit only when the URL has none.
  useEffect(() => {
    if (unitId || !floor?.units?.length || !floorId) return;
    writeSp({ b: bkey, f: floorId, u: floor.units[0].ulpin });
  }, [floor, sp]);
  const evidence = src?.evidence || [];
  const intersecting = (utils || []).filter((u: any) => (u.parcels || []).includes(b?.parcel));
  const floors = useMemo(() => [...(b?.floor_list || [])].sort((a, b2) => b2.number - a.number), [b]);

  return (
    <div className="p-4 space-y-3 max-w-[1400px] mx-auto">
      <nav className="text-xs text-slate-500 flex flex-wrap gap-1 items-center" aria-label="Breadcrumb">
        <Link to="/dashboard" className="hover:text-gov-navy">{t('v3d.crumbDash')}</Link><span className="text-slate-700">/</span>
        <Link to="/map" className="hover:text-gov-navy">{t('v3d.crumbMap')}</Link>
        {b?.parcel && <><span className="text-slate-700">/</span><Link to="/map" className="hover:text-gov-navy">{b.parcel}</Link></>}
        {b && <><span className="text-slate-700">/</span><span className="text-slate-700 font-medium">{b.name}</span></>}
        {floor && <><span className="text-slate-700">/</span><span className="text-slate-700 font-medium">{floor.label}</span></>}
        {unit && <><span className="text-slate-700">/</span><span className="text-slate-700 font-medium">Unit {unit.unit}</span></>}
      </nav>
      <div className="grid xl:grid-cols-[1fr_360px] gap-4">
      <div className="space-y-3">
        <div className="panel p-2.5 flex flex-wrap gap-x-3 gap-y-2 items-center text-sm">
          <select value={bkey} onChange={e => { writeSp({ b: e.target.value }); setIsolated(false); }} className="select max-w-[260px]" aria-label="Building">
            {(buildings || []).map((x: any) => <option key={x.key} value={x.key}>{x.name} ({x.key})</option>)}
          </select>
          <label className="text-xs flex gap-1.5 items-center text-slate-600"><input type="checkbox" className="accent-[#1A3A6B]" checked={exploded} onChange={e => setExploded(e.target.checked)} />{t('v3d.exploded')}</label>
          <label className="text-xs flex gap-1.5 items-center text-slate-600"><input type="checkbox" className="accent-[#1A3A6B]" checked={underground} onChange={e => setUnderground(e.target.checked)} />{t('v3d.under')}</label>
          <button onClick={() => setViewKey(k => k + 1)} className="btn-ghost !py-1 !text-xs" title={t('v3d.resetCam')}>{t('v3d.reset')}</button>
          <span className="text-[11px] text-slate-500">{t('v3d.hint')}</span>
        </div>
        {bLoading && <Skeleton className="h-[520px]" />}
        {bError && <Empty text={t('v3d.loadFail')} />}
        {isolated && floor && <div data-tour="tour-isolate" className="bg-orange-500 text-white text-xs rounded-xl px-3 py-2 mb-2 flex items-center gap-2">
          <span>{t('v3d.isolated', { v: floor.label })} · {floor.z_min}–{floor.z_max}m · all {floor.units?.length || 0} units with room tags</span>
          <button onClick={() => setIsolated(false)} className="ml-auto bg-white text-orange-700 font-semibold rounded-lg px-3 py-1">{t('v3d.backTower')}</button>
        </div>}
        {b && !bError && <div data-tour="tour-3d"><Building3D key={viewKey} building={b} selectedFloor={floorId} onFloor={(f) => writeSp({ b: bkey, f })}
          selectedUnit={unitId} onUnit={(u) => floorId && writeSp({ b: bkey, f: floorId, u })} exploded={exploded && !isolated} underground={underground} utilities={utils || []}
          isolateFloor={isolated ? floor : null} /></div>}
        <div className="panel px-3 py-2 text-[11px] text-slate-400">{t('v3d.legend')}
          {isolated
            ? <><span className="inline-block w-2 h-2 rounded-sm bg-blue-700 ml-1" /> {t('v3d.lSlab')}
                <span className="inline-block w-2 h-2 rounded-sm bg-yellow-200 ml-2" /> {t('v3d.lRooms')}
                <span className="inline-block w-2 h-2 rounded-sm bg-red-400 ml-2" /> {t('v3d.lUnv')}
                <span className="inline-block w-2 h-2 rounded-sm bg-green-600 ml-2" /> {t('v3d.lSel')}</>
            : <><span className="inline-block w-2 h-2 rounded-sm bg-orange-500 ml-1" /> {t('v3d.lSelF')}
          <span className="inline-block w-2 h-2 rounded-sm bg-sky-300 ml-2" /> {t('v3d.lVer')}
          <span className="inline-block w-2 h-2 rounded-sm bg-amber-300 ml-2" /> {t('v3d.lRev')}
          <span className="inline-block w-2 h-2 rounded-sm bg-slate-400 ml-2" /> {t('v3d.lBase')}
          <span className="inline-block w-2 h-2 rounded-sm bg-yellow-200 ml-2" /> {t('v3d.lUnits')}
          <span className="inline-block w-2 h-2 rounded-sm bg-green-600 ml-2" /> {t('v3d.lSelU')}</>}</div>
        {underground && <div className="bg-sky-50 border border-sky-200 text-sky-700 text-xs rounded-xl p-3">{t('v3d.underNote')}{b?.parcel ? t('v3d.parcelAssets', { p: b.parcel, n: intersecting.length, v: intersecting.slice(0, 4).map((u: any) => u.utility_id).join(', ') }) : ''}</div>}
      </div>
      <div className="space-y-3">
        {/* vertical tower rail — mirrors the 3D stack: roof on top, basements below */}
        <div className="panel p-3" data-tour="tour-rail">
          <div className="text-xs font-semibold text-slate-700 mb-2">{bLoading ? t('v3d.loading') : `${b?.name || ''} ${t('v3d.towerRail')}`}</div>
          {bError && <Empty text={t('v3d.loadFail2')} />}
          {bLoading && <Skeleton className="h-40" />}
          {!bLoading && !bError && (
          <div className="flex gap-3">
            <div className="flex flex-col gap-[2px] w-16 shrink-0 max-h-[320px] overflow-y-auto scrollthin py-1" role="listbox" aria-label="Floors, top is roof">
              {floors.map((f: any) => {
                const sel = floorId === f.floor_id;
                const base = f.number < 0 ? 'bg-slate-200 text-slate-600 border-slate-200' : f.status === 'Verified' ? 'bg-sky-400/15 text-sky-700 border-sky-200' : 'bg-amber-400/15 text-amber-700 border-amber-200';
                return (
                  <button key={f.floor_id} role="option" aria-selected={sel}
                    title={`${f.label} · ${f.z_min}–${f.z_max}m · ${f.units} units · ${f.status}`}
                    onClick={() => writeSp({ b: bkey, f: f.floor_id })}
                    className={`rounded text-center border ${sel ? 'bg-orange-500 text-white border-orange-400 h-9 text-xs font-bold' : `${base} border h-5 text-[9px] hover:brightness-125`}`}>
                    {f.label}</button>);
              })}
            </div>
            <div className="flex-1 min-w-0">
              {!floor && fLoading && <Skeleton className="h-24" />}
              {!floor && !fLoading && <Empty text={t('v3d.pickFloor')} />}
              {floor && <div className="text-[11px] text-slate-400">{t('v3d.selected', { v: floor.label })}: {floor.z_min}–{floor.z_max}m · {floor.units?.length} units · <StatusBadge s={floor.status} /></div>}
              {floor && <div className="grid grid-cols-4 gap-1 mt-2 max-h-40 overflow-auto scrollthin">
                {floor.units?.slice(0, 24).map((u: any) => (
                  <button key={u.ulpin} onClick={() => floorId && writeSp({ b: bkey, f: floorId, u: u.ulpin })} className={`text-[11px] border rounded px-1 py-1 ${unitId === u.ulpin ? 'bg-emerald-500 text-white font-bold border-emerald-400' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{u.unit}</button>))}
              </div>}
              {floor && (floor.units?.length || 0) > 0 && <div className="text-[10px] text-slate-500 mt-1">{t('v3d.showing', { a: Math.min(24, floor.units.length), b: floor.units.length, c: Math.min(8, floor.units.length) })}</div>}
              {floor && !isolated && <button onClick={() => setIsolated(true)} className="mt-2 w-full bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold rounded-lg py-2 transition-colors">{t('v3d.viewAll', { v: floor.label })}</button>}
              {floor && !(floor.units?.length) && <div className="text-[10px] text-slate-500 mt-1">{t('v3d.noUnits')}</div>}
            </div>
          </div>)}
        </div>
        {/* property drawer */}
        <div className="panel p-4 text-sm">
          <div className="flex gap-1 text-xs mb-3 bg-slate-100 border border-slate-200 rounded-lg p-1" role="tablist">{(['info', 'evidence', 'history', 'qr', 'report'] as const).map(tb =>
            <button key={tb} role="tab" aria-selected={tab === tb} onClick={() => setTab(tb)} className={`flex-1 px-2 py-1.5 rounded-md capitalize font-medium transition-colors ${tab === tb ? 'bg-gov-navy text-white' : 'text-slate-400 hover:text-slate-800'}`}>{tb}</button>)}</div>
          {!unit && <div className="text-slate-500 text-xs">{t('v3d.pickUnit')}</div>}
          {unit && tab === 'info' && <>
            <div className="font-bold text-slate-900">{unit.building_name} · Unit {unit.unit}</div>
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">{t('v3d.proto')} <b className="font-mono">{unit.prototype_ulpin}</b><br />{t('v3d.iid')} <span className="font-mono">{unit.internal_id}</span><br /><span className="text-amber-400/80">{t('v3d.protoNote')}</span></div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mt-2.5 text-slate-600">
              <div>{t('v3d.rParcel')} <span className="text-slate-800">{unit.parcel}</span></div><div>{t('v3d.rFloor')} <span className="text-slate-800">{unit.floor_label} ({unit.floor})</span></div>
              <div>{t('v3d.rArea')} <span className="text-slate-800">{unit.area_sqft} sq.ft</span></div><div>{t('v3d.rVert')} <span className="text-slate-800">{unit.z_min}–{unit.z_max}m</span></div>
              <div>{t('v3d.rType')} <span className="text-slate-800">{unit.unit_type}</span></div><div>{t('v3d.rOwner')} <span className="text-slate-800">{unit.owner?.display_name || t('v3d.missing')}</span></div>
            </div>
            <div className="flex items-center gap-3 mt-3"><ConfidenceRing value={unit.confidence} />
              <div className="text-xs"><StatusBadge s={unit.verification_status} />
                <div className="text-slate-500 mt-1">{evidence.length ? evidence.slice(0, 6).map((s: any) => `${s.type} ${s.score}`).join(' · ') : t('v3d.evLoading')}</div></div></div>
            <Link to={'/property/' + unit.prototype_ulpin} className="text-xs text-gov-navy underline underline-offset-2">{t('v3d.openIdentity')}</Link>
          </>}
          {unit && tab === 'evidence' && <div className="text-xs space-y-1.5">{(src?.evidence || []).map((s: any, i: number) =>
            <div key={i} className="border border-slate-200 rounded-lg p-2 text-slate-700"><span className="text-emerald-600">✓</span> {s.type} — {s.name}<div className="text-slate-500">{s.date} · {s.resolution} · {s.provider} · score {s.score}</div></div>)}</div>}
          {unit && tab === 'history' && <div className="text-xs space-y-2.5">{(hist || []).map((h: any, i: number) =>
            <div key={i} className="flex gap-2.5"><div className="w-2 h-2 rounded-full bg-gov-navy mt-1 shrink-0" /><div className="text-slate-600"><b className="text-slate-800">{h.timestamp}</b> — {h.event}<div className="text-slate-500">{h.description}</div></div></div>)}
            <div className="text-[11px] text-slate-500">{t('v3d.timeMachine')}</div></div>}
          {unit && tab === 'qr' && <div className="text-center"><span className="inline-block bg-white p-3 rounded-xl"><QRCodeSVG value={window.location.origin + '/property/' + unit.prototype_ulpin} size={150} /></span>
            <div className="text-[11px] text-slate-500 mt-2">{t('v3d.scanNote')}</div></div>}
          {unit && tab === 'report' && <div className="text-xs space-y-1 text-slate-600">
            <div className="font-semibold text-slate-900">{t('v3d.report')}</div>
            <div>{t('v3d.repUlp')} <span className="font-mono">{unit.prototype_ulpin}</span></div><div>{t('v3d.repParcel', { p: unit.parcel, b: unit.building_name, f: unit.floor_label, u: unit.unit })}</div>
            <div>{t('v3d.repArea', { a: unit.area_sqft, z: `${unit.z_min}–${unit.z_max}`, s: unit.verification_status, c: unit.confidence })}</div>
            <div>{t('v3d.repOwner', { v: unit.owner?.display_name, r: unit.owner?.reference })}</div>
            <button onClick={() => window.print()} className="btn-primary mt-2">{t('rep.print')}</button></div>}
        </div>
      </div>
      </div>
    </div>
  );
}
