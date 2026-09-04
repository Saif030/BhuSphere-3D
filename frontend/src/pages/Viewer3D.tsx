import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import Building3D from '../components/Building3D';
import { ConfidenceRing, StatusBadge } from '../components/ui';
import { Skeleton, Empty } from '../components/feedback';
import { api } from '../lib/api';

export default function Viewer3D() {
  const [sp, setSp] = useSearchParams();
  const [bkey, setBkey] = useState(sp.get('b') || 'DL-SKT-0182-B01');
  const [floorId, setFloorId] = useState<string | null>(sp.get('f'));
  const [unitId, setUnitId] = useState<string | null>(sp.get('u'));
  const [exploded, setExploded] = useState(true);
  const [underground, setUnderground] = useState(false);
  const [viewKey, setViewKey] = useState(0);
  const [isolated, setIsolated] = useState(false);
  const [tab, setTab] = useState<'info' | 'evidence' | 'history' | 'qr' | 'report'>('info');

  const { data: buildings } = useQuery({ queryKey: ['blds'], queryFn: () => api.get('/api/buildings') });
  const { data: b, isLoading: bLoading, isError: bError } = useQuery({ queryKey: ['b', bkey], queryFn: async () => {
    const p = bkey.split('-'); const code = p.pop(); return api.get(`/api/buildings/${p.join('-')}/${code}`); } });
  const { data: floor, isLoading: fLoading } = useQuery({ queryKey: ['f', floorId], queryFn: () => api.get('/api/floors/' + floorId), enabled: !!floorId });
  const { data: unit } = useQuery({ queryKey: ['u', unitId], queryFn: () => api.get('/api/units/' + unitId), enabled: !!unitId });
  const { data: src } = useQuery({ queryKey: ['src', unitId], queryFn: () => api.get(`/api/properties/${unitId}/sources`), enabled: !!unitId });
  const { data: hist } = useQuery({ queryKey: ['h', unitId], queryFn: () => api.get(`/api/properties/${unitId}/history`), enabled: !!unitId });
  const { data: utils } = useQuery({ queryKey: ['utils'], queryFn: () => api.get('/api/utilities') });

  // Auto-select a sensible floor/unit only when the user hasn't chosen (or deep-linked) one.
  // Prefers F08 (flagship demo floor), else the first floor that has units.
  const needFloor = useRef(!sp.get('f'));
  const needUnit = useRef(!sp.get('u'));
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; } // keep deep-linked f/u on mount
    setFloorId(null); setUnitId(null); setIsolated(false); needFloor.current = true; needUnit.current = true;
  }, [bkey]);
  // Keep the URL in sync so back-button, QR, copilot and validation links all deep-link here.
  useEffect(() => {
    const p: any = { b: bkey };
    if (floorId) p.f = floorId;
    if (unitId) p.u = unitId;
    setSp(p, { replace: true });
  }, [bkey, floorId, unitId]);
  useEffect(() => {
    if (needFloor.current && b?.floor_list?.length) {
      const list = b.floor_list;
      const pick = list.find((f: any) => f.label === 'F08') || list.find((f: any) => f.units > 0) || list[0];
      setFloorId(pick.floor_id); needFloor.current = false;
    }
  }, [b]);
  useEffect(() => {
    if (needUnit.current && floor?.units?.length) { setUnitId(floor.units[0].ulpin); needUnit.current = false; }
  }, [floor]);
  const evidence = src?.evidence || [];
  const intersecting = (utils || []).filter((u: any) => (u.parcels || []).includes(b?.parcel));
  const floors = useMemo(() => [...(b?.floor_list || [])].sort((a, b2) => b2.number - a.number), [b]);

  return (
    <div className="p-4 space-y-3">
      <nav className="text-xs text-slate-500 flex flex-wrap gap-1 items-center" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-navy">Overview</Link><span>/</span>
        <Link to="/map" className="hover:text-navy">Map</Link>
        {b?.parcel && <><span>/</span><Link to="/map" className="hover:text-navy">{b.parcel}</Link></>}
        {b && <><span>/</span><span className="text-navy font-medium">{b.name}</span></>}
        {floor && <><span>/</span><span className="text-navy font-medium">{floor.label}</span></>}
        {unit && <><span>/</span><span className="text-navy font-medium">Unit {unit.unit}</span></>}
      </nav>
      <div className="grid xl:grid-cols-[1fr_360px] gap-4">
      <div className="space-y-3">
        <div className="bg-white border rounded-xl p-2 flex flex-wrap gap-2 items-center text-sm">
          <select value={bkey} onChange={e => setBkey(e.target.value)} className="border rounded-lg px-2 py-1">
            {(buildings || []).map((x: any) => <option key={x.key} value={x.key}>{x.name} ({x.key})</option>)}
          </select>
          <label className="text-xs flex gap-1 items-center"><input type="checkbox" checked={exploded} onChange={e => setExploded(e.target.checked)} />Exploded view</label>
          <label className="text-xs flex gap-1 items-center"><input type="checkbox" checked={underground} onChange={e => setUnderground(e.target.checked)} />Underground mode</label>
          <button onClick={() => setViewKey(k => k + 1)} className="text-xs border rounded-lg px-2 py-0.5 hover:bg-slate-50" title="Reset camera">Reset view</button>
          <span className="text-[11px] text-slate-500">2D → 3D: select floors vertically, click units on the highlighted floor.</span>
        </div>
        {bLoading && <Skeleton className="h-[520px]" />}
        {bError && <Empty text="Could not load this building. It may not exist — pick another tower above." />}
        {isolated && floor && <div className="bg-orange-500 text-white text-xs rounded-xl px-3 py-2 mb-2 flex items-center gap-2">
          <span>Isolated view: <b>{floor.label}</b> · {floor.z_min}–{floor.z_max}m · all {floor.units?.length || 0} units with room tags</span>
          <button onClick={() => setIsolated(false)} className="ml-auto bg-white text-orange-700 font-semibold rounded-lg px-3 py-1">← Back to tower</button>
        </div>}
        {b && !bError && <Building3D key={viewKey} building={b} selectedFloor={floorId} onFloor={(f) => { setFloorId(f); setUnitId(null); }}
          selectedUnit={unitId} onUnit={(u) => setUnitId(u)} exploded={exploded && !isolated} underground={underground} utilities={utils || []}
          isolateFloor={isolated ? floor : null} />}
        <div className="text-[11px] text-slate-500 bg-white border rounded-xl px-3 py-1.5">Legend:
          {isolated
            ? <><span className="inline-block w-2 h-2 rounded-sm bg-blue-700 ml-1" /> floor slab
                <span className="inline-block w-2 h-2 rounded-sm bg-yellow-200 ml-2" /> rooms (tags show numbers)
                <span className="inline-block w-2 h-2 rounded-sm bg-red-400 ml-2" /> unverified room
                <span className="inline-block w-2 h-2 rounded-sm bg-green-600 ml-2" /> selected room · click a room/tag</>
            : <><span className="inline-block w-2 h-2 rounded-sm bg-orange-500 ml-1" /> selected floor
          <span className="inline-block w-2 h-2 rounded-sm bg-sky-300 ml-2" /> verified
          <span className="inline-block w-2 h-2 rounded-sm bg-amber-300 ml-2" /> review
          <span className="inline-block w-2 h-2 rounded-sm bg-slate-400 ml-2" /> basement
          <span className="inline-block w-2 h-2 rounded-sm bg-yellow-200 ml-2" /> units
          <span className="inline-block w-2 h-2 rounded-sm bg-green-600 ml-2" /> selected unit · drag to orbit · scroll to zoom · click floor/unit</>}</div>
        {underground && <div className="bg-sky-950 text-sky-100 text-xs rounded-xl p-3">Underground view: water / electrical / sewer / telecom / gas / metro tubes below the ground plane (ground semi-transparent).{b?.parcel ? ` Parcel ${b.parcel} → ${intersecting.length} intersecting asset${intersecting.length === 1 ? '' : 's'}${intersecting.length ? ` (${intersecting.slice(0, 4).map((u: any) => u.utility_id).join(', ')})` : ''}.` : ''}</div>}
      </div>
      <div className="space-y-3">
        {/* vertical tower rail — mirrors the 3D stack: roof on top, basements below */}
        <div className="bg-white border rounded-xl p-3">
          <div className="text-xs font-semibold mb-2">{bLoading ? 'Loading building…' : `${b?.name || ''} — tower rail`}</div>
          {bError && <Empty text="Failed to load building. Check the backend and retry." />}
          {bLoading && <Skeleton className="h-40" />}
          {!bLoading && !bError && (
          <div className="flex gap-3">
            <div className="flex flex-col gap-[2px] w-16 shrink-0 max-h-[320px] overflow-y-auto scrollthin py-1" role="listbox" aria-label="Floors, top is roof">
              {floors.map((f: any) => {
                const sel = floorId === f.floor_id;
                const base = f.number < 0 ? 'bg-slate-400 text-white' : f.status === 'Verified' ? 'bg-sky-200 text-sky-900' : 'bg-amber-200 text-amber-900';
                return (
                  <button key={f.floor_id} role="option" aria-selected={sel}
                    title={`${f.label} · ${f.z_min}–${f.z_max}m · ${f.units} units · ${f.status}`}
                    onClick={() => { setFloorId(f.floor_id); setUnitId(null); }}
                    className={`rounded text-center border ${sel ? 'bg-orange-500 text-white border-orange-600 h-9 text-xs font-bold' : `${base} h-5 text-[9px] hover:brightness-95`}`}>
                    {f.label}</button>);
              })}
            </div>
            <div className="flex-1 min-w-0">
              {!floor && fLoading && <Skeleton className="h-24" />}
              {!floor && !fLoading && <Empty text="Select a floor on the rail or in 3D." />}
              {floor && <div className="text-[11px] text-slate-600">Selected {floor.label}: {floor.z_min}–{floor.z_max}m · {floor.units?.length} units · <StatusBadge s={floor.status} /></div>}
              {floor && <div className="grid grid-cols-4 gap-1 mt-2 max-h-40 overflow-auto scrollthin">
                {floor.units?.slice(0, 24).map((u: any) => (
                  <button key={u.ulpin} onClick={() => setUnitId(u.ulpin)} className={`text-[11px] border rounded px-1 py-1 ${unitId === u.ulpin ? 'bg-green-600 text-white' : 'hover:bg-green-50'}`}>{u.unit}</button>))}
              </div>}
              {floor && (floor.units?.length || 0) > 0 && <div className="text-[10px] text-slate-500 mt-1">Showing {Math.min(24, floor.units.length)} of {floor.units.length} units · {Math.min(8, floor.units.length)} rendered in 3D</div>}
              {floor && !isolated && <button onClick={() => setIsolated(true)} className="mt-2 w-full bg-orange-500 text-white text-xs font-semibold rounded-lg py-1.5 hover:bg-orange-600">View {floor.label} in 3D → all rooms</button>}
              {floor && !(floor.units?.length) && <div className="text-[10px] text-slate-500 mt-1">No registered units on this floor (e.g. parking/lobby).</div>}
            </div>
          </div>)}
        </div>
        {/* property drawer */}
        <div className="bg-white border rounded-xl p-4 text-sm">
          <div className="flex gap-1 text-xs mb-2">{(['info', 'evidence', 'history', 'qr', 'report'] as const).map(t =>
            <button key={t} onClick={() => setTab(t)} className={`px-2 py-1 rounded capitalize ${tab === t ? 'bg-navy text-white' : 'bg-slate-100'}`}>{t}</button>)}</div>
          {!unit && <div className="text-slate-500 text-xs">Select a unit (e.g. 804 on F08) to see its 3D volume identity.</div>}
          {unit && tab === 'info' && <>
            <div className="font-bold">{unit.building_name} · Unit {unit.unit}</div>
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">Prototype 3D ULPIN: <b>{unit.prototype_ulpin}</b><br />Internal ID: {unit.internal_id}<br /><span className="text-amber-600">Prototype reference — NOT an official Govt. of India ULPIN.</span></div>
            <div className="grid grid-cols-2 gap-1 text-xs mt-2">
              <div>Parcel: {unit.parcel}</div><div>Floor: {unit.floor_label} ({unit.floor})</div>
              <div>Area: {unit.area_sqft} sq.ft</div><div>Vertical: {unit.z_min}–{unit.z_max}m</div>
              <div>Type: {unit.unit_type}</div><div>Owner: {unit.owner?.display_name || '— missing'}</div>
            </div>
            <div className="flex items-center gap-3 mt-3"><ConfidenceRing value={unit.confidence} />
              <div className="text-xs"><StatusBadge s={unit.verification_status} />
                <div className="text-slate-500 mt-1">{evidence.length ? evidence.slice(0, 6).map((s: any) => `${s.type} ${s.score}`).join(' · ') : 'Evidence loading…'}</div></div></div>
            <Link to={'/property/' + unit.prototype_ulpin} className="text-xs text-sky-700 underline">Open public digital identity →</Link>
          </>}
          {unit && tab === 'evidence' && <div className="text-xs space-y-1">{(src?.evidence || []).map((s: any, i: number) =>
            <div key={i} className="border rounded p-1.5">✓ {s.type} — {s.name}<div className="text-slate-500">{s.date} · {s.resolution} · {s.provider} · score {s.score}</div></div>)}</div>}
          {unit && tab === 'history' && <div className="text-xs space-y-2">{(hist || []).map((h: any, i: number) =>
            <div key={i} className="flex gap-2"><div className="w-2 h-2 rounded-full bg-sky-600 mt-1" /><div><b>{h.timestamp}</b> — {h.event}<div className="text-slate-500">{h.description}</div></div></div>)}
            <div className="text-[11px] text-slate-500">Time machine: 2024 registration → 2025 floor-plan update → 2026 LiDAR height check.</div></div>}
          {unit && tab === 'qr' && <div className="text-center"><QRCodeSVG value={window.location.origin + '/property/' + unit.prototype_ulpin} size={150} />
            <div className="text-[11px] mt-1">Scan → public property identity (safe fields only).</div></div>}
          {unit && tab === 'report' && <div className="text-xs space-y-1">
            <div className="font-semibold">Property Report (in-browser)</div>
            <div>ULPIN: {unit.prototype_ulpin}</div><div>Parcel {unit.parcel} · {unit.building_name} · {unit.floor_label} · Unit {unit.unit}</div>
            <div>Area {unit.area_sqft} sq.ft · z {unit.z_min}–{unit.z_max}m · {unit.verification_status} · {unit.confidence}%</div>
            <div>Owner: {unit.owner?.display_name} ({unit.owner?.reference})</div>
            <button onClick={() => window.print()} className="mt-2 bg-navy text-white rounded px-3 py-1">Print / PDF</button></div>}
        </div>
      </div>
      </div>
    </div>
  );
}
