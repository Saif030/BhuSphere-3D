import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Map2D, { Sel } from '../components/Map2D';
import { api } from '../lib/api';
import { unit3DUrl } from '../lib/nav';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { StatusBadge } from '../components/ui';

export default function MapPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { highlights, setToast } = useStore();
  const { t } = useLang();
  const [sel, setSel] = useState<any>(null);
  const [selLoading, setSelLoading] = useState(false);
  const [selError, setSelError] = useState('');
  const [layers, setLayers] = useState({ parcels: true, buildings: true, utils: false });
  const [preview, setPreview] = useState<any>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [committing, setCommitting] = useState(false);
  useEffect(() => {
    try { const p = JSON.parse(localStorage.getItem('bhu_preview') || 'null'); if (p?.features?.length) setPreview(p); } catch {}
  }, []);
  const [q, setQ] = useState(sp.get('q') || 'Green Residency');
  const { data: searchRes, refetch } = useQuery({ queryKey: ['s', q], queryFn: () => api.search(q), enabled: false });
  useEffect(() => { if (sp.get('q')) refetch(); }, []);
  // Accept incoming searches while mounted (sidebar search, queue/field-work links).
  const qc = useQueryClient();
  const lastQ = useRef(sp.get('q') || '');
  useEffect(() => {
    const nq = sp.get('q') || '';
    if (nq && nq !== lastQ.current) {
      lastQ.current = nq; setQ(nq);
      qc.fetchQuery({ queryKey: ['s', nq], queryFn: () => api.search(nq) });
    }
  }, [sp]);

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
        if (!u) throw new Error(t('map.utilNotFound'));
        setSel({ kind: 'utility', ...u });
      } else setSel({ kind: s.kind, ...extra });
    } catch (e: any) { setSelError(e.message || t('map.loadFail')); }
    setSelLoading(false);
  };

  /** Deep link a unit chip straight into the 3D tower at the right floor + unit. */
  const openUnit3D = (ulpin: string) => {
    const url = unit3DUrl(ulpin);
    if (url) nav(url);
  };

  const discardPreview = () => {
    localStorage.removeItem('bhu_preview'); setPreview(null);
    setToast(t('map.discarded'));
  };
  const acceptPreview = async () => {
    if (!preview || committing) return;
    setCommitting(true);
    try {
      const r = await api.post('/api/data/commit', { features: preview.features, filename: preview.filename });
      const c = r.created || {};
      const skip = (r.skipped || []).length ? t('map.skipped', { n: (r.skipped || []).length }) : '';
      localStorage.removeItem('bhu_preview'); setPreview(null);
      setReloadToken(t => t + 1);
      setToast(t('map.committed', { p: c.parcels || 0, b: c.buildings || 0, u: c.utilities || 0, s: skip }));
    } catch (e: any) { setToast(t('map.commitFail', { e: e.message })); }
    setCommitting(false);
  };

  return (
    <div className="p-4 grid lg:grid-cols-[1fr_360px] gap-4 h-[calc(100vh-57px)]">
      <div className="flex flex-col gap-2 min-h-0">
        <div className="panel p-2.5 flex flex-wrap gap-2 items-center text-sm" data-tour="tour-search">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && refetch()}
            className="input flex-1 min-w-[200px]" placeholder={t('map.searchPh')} />
          <button onClick={() => refetch()} className="btn-primary">{t('map.search')}</button>
          {(searchRes?.results || []).slice(0, 4).map((r: any) => (
            <button key={r.id} className="chip" onClick={async () => {
              if (r.kind === 'building') onSelect({ kind: 'building', id: r.id }, null);
              else if (r.kind === 'parcel') onSelect({ kind: 'parcel', id: r.id }, null);
              else if (r.kind === 'utility') onSelect({ kind: 'utility', id: r.id }, null);
              else if (r.kind === 'unit') openUnit3D(r.id);
            }}>{r.label}</button>))}
          <label className="text-xs flex gap-1.5 items-center text-slate-600"><input type="checkbox" className="accent-[#1A3A6B]" checked={layers.parcels} onChange={e => setLayers({ ...layers, parcels: e.target.checked })} />{t('map.parcels')}</label>
          <label className="text-xs flex gap-1.5 items-center text-slate-600"><input type="checkbox" className="accent-[#1A3A6B]" checked={layers.buildings} onChange={e => setLayers({ ...layers, buildings: e.target.checked })} />{t('map.buildings')}</label>
          <label className="text-xs flex gap-1.5 items-center text-slate-600"><input type="checkbox" className="accent-[#1A3A6B]" checked={layers.utils} onChange={e => setLayers({ ...layers, utils: e.target.checked })} />{t('map.under')}</label>
          <span className="text-[11px] text-slate-500 ml-auto hidden xl:inline">{t('map.legend')}
            <span className="inline-block w-2 h-2 rounded-sm bg-emerald-400 ml-1" /> {t('map.verified')}
            <span className="inline-block w-2 h-2 rounded-sm bg-amber-400 ml-1" /> {t('map.review')}
            <span className="inline-block w-2 h-2 rounded-sm bg-orange-500 ml-1" /> {t('map.building')}
            <span className="inline-block w-4 h-0 border-t-2 border-dashed border-sky-400 ml-1 align-middle" /> {t('map.utility')}</span>
        </div>
        <div className="flex-1 min-h-0 relative">
          <Map2D onSelect={onSelect} highlights={highlights} layerState={layers} preview={preview} reloadToken={reloadToken} />
          {preview && <div className="absolute top-2 left-2 right-2 sm:right-auto panel px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gov-navy" />
            <span className="text-slate-700 font-semibold">{t('map.prevTitle', { v: preview.filename })}</span>
            <span className="text-slate-400">{t('map.prevSub', { n: preview.received })}</span>
            <button onClick={acceptPreview} disabled={committing} className="btn-primary !py-1 !text-xs disabled:opacity-50">{committing ? t('map.committing') : t('map.accept')}</button>
            <button onClick={discardPreview} className="btn-ghost !py-1 !text-xs">{t('map.discard')}</button>
          </div>}
        </div>
      </div>
      <div className="panel p-4 overflow-auto scrollthin text-sm">
        <div className="th-label mb-2">{t('map.selection')}</div>
        {selLoading && <div className="text-slate-400 text-sm">{t('map.loading')}</div>}
        {selError && <div className="text-red-700 text-xs bg-red-50 border border-red-200 rounded-lg p-2">{selError}</div>}
        {!sel && !selLoading && <div className="text-slate-400 text-sm">{t('map.hint')}</div>}
        {sel?.kind === 'building' && <>
          <div className="font-bold text-slate-900">{sel.name}</div>
          <div className="text-xs text-slate-500">{t('map.parcelX', { v: sel.parcel })}</div>
          <div className="grid grid-cols-3 gap-2 my-3 text-center">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2"><div className="font-bold text-slate-900">{sel.floors}</div><div className="text-[10px] text-slate-500">{t('map.floors')}</div></div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2"><div className="font-bold text-slate-900">{sel.height_m}m</div><div className="text-[10px] text-slate-500">{t('map.height')}</div></div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2"><div className="font-bold text-slate-900">{sel.confidence}%</div><div className="text-[10px] text-slate-500">{t('map.conf')}</div></div>
          </div>
          <StatusBadge s={sel.status} />
          <button onClick={() => nav('/3d?b=' + sel.key)} className="mt-3 w-full bg-orange-500 hover:bg-orange-400 text-white rounded-lg py-2.5 font-semibold transition-colors">{t('map.open3d')}</button>
          <div className="text-[11px] text-slate-500 mt-2">{t('map.flow')}</div>
        </>}
        {sel?.kind === 'utility' && <>
          <div className="font-bold text-slate-900">{sel.utility_id} · {sel.type}</div>
          <div className="text-xs text-slate-500 mt-1">Depth {sel.depth_m}m · {sel.owner} · {sel.year} · {sel.status}</div>
          <div className="text-xs text-slate-600 mt-1">{t('map.affParcels', { v: (sel.parcels || []).join(', ') || '—' })}</div>
          <button onClick={() => setLayers(l => ({ ...l, utils: true }))} className="btn-ghost mt-3 w-full">{t('map.showUnder')}</button>
        </>}
        {sel?.kind === 'parcel' && <>
          <div className="font-bold text-slate-900">{t('map.parcelX', { v: sel.parcel_id })}</div>
          <div className="text-xs text-slate-500">{sel.locality} · {sel.land_use} · {Math.round(sel.area_sqft).toLocaleString()} {t('map.sqft')}</div>
          <div className="mt-2"><StatusBadge s={sel.verification_status} /> <span className="text-xs text-slate-400">{sel.confidence}%</span></div>
          <div className="mt-3 font-semibold text-xs text-slate-600">{t('map.blds', { n: sel.buildings?.length })}</div>
          {sel.buildings?.map((b: any) => <button key={b.key} onClick={() => nav('/3d?b=' + b.key)} className="block w-full text-left border border-slate-200 rounded-lg px-2.5 py-2 mt-1.5 hover:bg-slate-100"><b className="text-slate-800 text-xs">{b.name}</b><div className="text-[11px] text-slate-500">{t('map.flConf', { f: b.floors, c: b.confidence })}</div></button>)}
          {!!sel.underground_assets?.length && <div className="mt-3 text-xs bg-sky-50 border border-sky-200 text-sky-700 rounded-lg p-2.5">{t('map.underX', { n: sel.underground_assets.length, v: sel.underground_assets.map((u: any) => u.utility_id).join(', ') })}</div>}
        </>}
      </div>
    </div>
  );
}
