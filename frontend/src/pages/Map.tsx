import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Map2D, { Sel } from '../components/Map2D';
import { api } from '../lib/api';
import { unit3DUrl } from '../lib/nav';
import { useStore } from '../lib/store';
import { StatusBadge } from '../components/ui';

export default function MapPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { highlights } = useStore();
  const [sel, setSel] = useState<any>(null);
  const [selLoading, setSelLoading] = useState(false);
  const [selError, setSelError] = useState('');
  const [layers, setLayers] = useState({ parcels: true, buildings: true, utils: false });
  const [q, setQ] = useState(sp.get('q') || 'Green Residency');
  const { data: searchRes, refetch } = useQuery({ queryKey: ['s', q], queryFn: () => api.search(q), enabled: false });
  useEffect(() => { if (sp.get('q')) refetch(); }, []);

  const onSelect = async (s: Sel, extra?: any) => {
    if (!s) return;
    setSelLoading(true); setSelError('');
    try {
      if (s.kind === 'building') { // s.id like DL-SKT-0182-B01 → split parcel/building
        const parts = s.id.split('-'); const bcode = parts.pop(); const parcel = parts.join('-');
        const full = await api.get(`/api/buildings/${parcel}/${bcode}`);
        setSel({ kind: 'building', ...full });
      } else if (s.kind === 'parcel') {
        const full = await api.get(`/api/parcels/${s.id}`);
        setSel({ kind: 'parcel', ...full });
      } else if (s.kind === 'utility') {
        const us = await api.get('/api/utilities');
        const u = us.find((x: any) => x.utility_id === s.id);
        if (!u) throw new Error('Utility not found');
        setSel({ kind: 'utility', ...u });
      } else setSel({ kind: s.kind, ...extra });
    } catch (e: any) { setSelError(e.message || 'Failed to load details'); }
    setSelLoading(false);
  };

  /** Deep link a unit chip straight into the 3D tower at the right floor + unit. */
  const openUnit3D = (ulpin: string) => {
    const url = unit3DUrl(ulpin);
    if (url) nav(url);
  };

  return (
    <div className="p-4 grid lg:grid-cols-[1fr_360px] gap-4 h-[calc(100vh-57px)]">
      <div className="flex flex-col gap-2 min-h-0">
        <div className="panel p-2.5 flex flex-wrap gap-2 items-center text-sm">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && refetch()}
            className="input flex-1 min-w-[200px]" placeholder="Search ULPIN / parcel / building / utility…" />
          <button onClick={() => refetch()} className="btn-primary">Search</button>
          {(searchRes?.results || []).slice(0, 4).map((r: any) => (
            <button key={r.id} className="chip" onClick={async () => {
              if (r.kind === 'building') onSelect({ kind: 'building', id: r.id }, null);
              else if (r.kind === 'parcel') onSelect({ kind: 'parcel', id: r.id }, null);
              else if (r.kind === 'utility') onSelect({ kind: 'utility', id: r.id }, null);
              else if (r.kind === 'unit') openUnit3D(r.id);
            }}>{r.label}</button>))}
          <label className="text-xs flex gap-1.5 items-center text-slate-300"><input type="checkbox" className="accent-cyan-400" checked={layers.parcels} onChange={e => setLayers({ ...layers, parcels: e.target.checked })} />Parcels</label>
          <label className="text-xs flex gap-1.5 items-center text-slate-300"><input type="checkbox" className="accent-cyan-400" checked={layers.buildings} onChange={e => setLayers({ ...layers, buildings: e.target.checked })} />Buildings</label>
          <label className="text-xs flex gap-1.5 items-center text-slate-300"><input type="checkbox" className="accent-cyan-400" checked={layers.utils} onChange={e => setLayers({ ...layers, utils: e.target.checked })} />Underground</label>
          <span className="text-[11px] text-slate-500 ml-auto hidden xl:inline">Legend:
            <span className="inline-block w-2 h-2 rounded-sm bg-emerald-400 ml-1" /> parcel verified
            <span className="inline-block w-2 h-2 rounded-sm bg-amber-400 ml-1" /> parcel review
            <span className="inline-block w-2 h-2 rounded-sm bg-orange-500 ml-1" /> building
            <span className="inline-block w-4 h-0 border-t-2 border-dashed border-sky-400 ml-1 align-middle" /> utility</span>
        </div>
        <div className="flex-1 min-h-0"><Map2D onSelect={onSelect} highlights={highlights} layerState={layers} /></div>
      </div>
      <div className="panel p-4 overflow-auto scrollthin text-sm">
        <div className="th-label mb-2">Selection</div>
        {selLoading && <div className="text-slate-400 text-sm">Loading details…</div>}
        {selError && <div className="text-red-300 text-xs bg-red-500/10 border border-red-500/30 rounded-lg p-2">{selError}</div>}
        {!sel && !selLoading && <div className="text-slate-400 text-sm">Click a building or parcel on the map.<br /><br />Demo flow: search <b className="text-slate-200">Green Residency</b> → click <b className="text-slate-200">Building A</b> → <b className="text-slate-200">Open 3D View</b> (2D→3D transition).</div>}
        {sel?.kind === 'building' && <>
          <div className="font-bold text-white">{sel.name}</div>
          <div className="text-xs text-slate-500">Parcel {sel.parcel}</div>
          <div className="grid grid-cols-3 gap-2 my-3 text-center">
            <div className="bg-white/[0.04] border border-white/10 rounded-lg p-2"><div className="font-bold text-white">{sel.floors}</div><div className="text-[10px] text-slate-500">Floors</div></div>
            <div className="bg-white/[0.04] border border-white/10 rounded-lg p-2"><div className="font-bold text-white">{sel.height_m}m</div><div className="text-[10px] text-slate-500">Height</div></div>
            <div className="bg-white/[0.04] border border-white/10 rounded-lg p-2"><div className="font-bold text-white">{sel.confidence}%</div><div className="text-[10px] text-slate-500">Confidence</div></div>
          </div>
          <StatusBadge s={sel.status} />
          <button onClick={() => nav('/3d?b=' + sel.key)} className="mt-3 w-full bg-orange-500 hover:bg-orange-400 text-white rounded-lg py-2.5 font-semibold transition-colors">Open 3D View →</button>
          <div className="text-[11px] text-slate-500 mt-2">Parcel → 3D tower → floors → units.</div>
        </>}
        {sel?.kind === 'utility' && <>
          <div className="font-bold text-white">{sel.utility_id} · {sel.type}</div>
          <div className="text-xs text-slate-500 mt-1">Depth {sel.depth_m}m · {sel.owner} · {sel.year} · {sel.status}</div>
          <div className="text-xs text-slate-300 mt-1">Affected parcels: {(sel.parcels || []).join(', ') || '—'}</div>
          <button onClick={() => setLayers(l => ({ ...l, utils: true }))} className="btn-ghost mt-3 w-full">Show underground layer</button>
        </>}
        {sel?.kind === 'parcel' && <>
          <div className="font-bold text-white">Parcel {sel.parcel_id}</div>
          <div className="text-xs text-slate-500">{sel.locality} · {sel.land_use} · {Math.round(sel.area_sqft).toLocaleString()} sq.ft</div>
          <div className="mt-2"><StatusBadge s={sel.verification_status} /> <span className="text-xs text-slate-400">{sel.confidence}%</span></div>
          <div className="mt-3 font-semibold text-xs text-slate-300">Buildings ({sel.buildings?.length})</div>
          {sel.buildings?.map((b: any) => <button key={b.key} onClick={() => nav('/3d?b=' + b.key)} className="block w-full text-left border border-white/10 rounded-lg px-2.5 py-2 mt-1.5 hover:bg-white/5"><b className="text-slate-100 text-xs">{b.name}</b><div className="text-[11px] text-slate-500">{b.floors} floors · {b.confidence}%</div></button>)}
          {!!sel.underground_assets?.length && <div className="mt-3 text-xs bg-sky-400/10 border border-sky-400/30 text-sky-200 rounded-lg p-2.5">{sel.underground_assets.length} underground assets intersect this parcel: {sel.underground_assets.map((u: any) => u.utility_id).join(', ')}</div>}
        </>}
      </div>
    </div>
  );
}
