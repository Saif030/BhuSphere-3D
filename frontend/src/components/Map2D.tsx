import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

export type Sel = { kind: string; id: string } | null;

/** 2D cadastral map: parcels + buildings + utilities, click-to-select, highlight support.
 *  `preview` renders an upload as a dashed-cyan overlay; `reloadToken` refetches base layers.
 *  `focusOnly` isolates the mini preview to the single highlighted property (hides the rest
 *  of the city); `focusPoint` marks the claimed lng/lat with an orange dot. */
export default function Map2D({ onSelect, highlights, layerState, preview, reloadToken, compact, focusOnly, focusPoint }:
  { onSelect: (s: Sel, extra?: any) => void; highlights: any[]; layerState: any;
    preview?: { features: any[]; bbox: number[] | null } | null; reloadToken?: number; compact?: boolean;
    focusOnly?: boolean; focusPoint?: [number, number] | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const selRef = useRef<Sel>(null);
  selRef.current = null;

  const fetchBase = async () => Promise.all([
    fetch('/api/parcels').then(r => r.json()),
    fetch('/api/buildings').then(r => r.json()),
    fetch('/api/utilities').then(r => r.json()),
  ]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [77.201, 28.527], zoom: 14.2,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;
    map.on('load', async () => {
      const [parcels, buildings, utils] = await fetchBase();
      const pGeo = { type: 'FeatureCollection', features: parcels.map((p: any) => ({
        type: 'Feature', properties: { id: p.parcel_id, conf: p.confidence, status: p.verification_status },
        geometry: { type: 'Polygon', coordinates: [p.geometry] } })) };
      const bGeo = { type: 'FeatureCollection', features: buildings.map((b: any) => ({
        type: 'Feature', properties: { id: b.key, name: b.name, conf: b.confidence },
        geometry: { type: 'Polygon', coordinates: [b.geometry] } })) };
      const uGeo = { type: 'FeatureCollection', features: utils.map((u: any) => ({
        type: 'Feature', properties: { id: u.utility_id, type: u.type },
        geometry: { type: 'LineString', coordinates: u.geometry } })) };
      map.addSource('parcels', { type: 'geojson', data: pGeo as any });
      map.addSource('buildings', { type: 'geojson', data: bGeo as any });
      map.addSource('utils', { type: 'geojson', data: uGeo as any });
      map.addLayer({ id: 'parcel-fill', type: 'fill', source: 'parcels',
        paint: { 'fill-color': ['case', ['==', ['get', 'status'], 'Verified'], '#22c55e', '#f59e0b'], 'fill-opacity': 0.18 } });
      map.addLayer({ id: 'parcel-line', type: 'line', source: 'parcels',
        paint: { 'line-color': '#38bdf8', 'line-width': 1.4 } });
      map.addLayer({ id: 'bld-fill', type: 'fill', source: 'buildings',
        paint: { 'fill-color': '#f97316', 'fill-opacity': 0.55 } });
      map.addLayer({ id: 'bld-line', type: 'line', source: 'buildings',
        paint: { 'line-color': '#fdba74', 'line-width': 1.2 } });
      map.addLayer({ id: 'util-line', type: 'line', source: 'utils',
        paint: { 'line-color': ['match', ['get', 'type'], 'Water', '#38bdf8', 'Electrical', '#facc15', 'Sewer', '#a78bfa', 'Telecom', '#34d399', 'Gas', '#fb7185', '#e2e8f0'],
          'line-width': 2.4, 'line-dasharray': [2, 1] } });
      (map as any)._raw = { parcels, buildings };
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
      const hover = (layer: string, text: (p: any) => string) => {
        map.on('mousemove', layer, (e: any) => {
          const f = e.features?.[0]; if (!f) return;
          map.getCanvas().style.cursor = 'pointer';
          popup.setLngLat(e.lngLat).setHTML(text(f.properties)).addTo(map);
        });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; popup.remove(); });
      };
      hover('bld-fill', p => `<b>${p.name}</b><br/>${p.id} · ${p.conf}%`);
      hover('parcel-fill', p => `<b>${p.id}</b><br/>${p.status} · ${p.conf}%`);
      map.on('click', 'bld-fill', (e: any) => {
        const id = e.features?.[0]?.properties?.id;
        const b = (map as any)._raw.buildings.find((x: any) => x.key === id);
        onSelect({ kind: 'building', id }, b);
      });
      map.on('click', 'parcel-fill', (e: any) => {
        const id = e.features?.[0]?.properties?.id;
        const p = (map as any)._raw.parcels.find((x: any) => x.parcel_id === id);
        onSelect({ kind: 'parcel', id }, p);
      });
      map.on('click', 'util-line', (e: any) => {
        const id = e.features?.[0]?.properties?.id;
        onSelect({ kind: 'utility', id }, null);
      });
      setLoaded(true);
    });
    return () => {};
  }, []);

  // refetch base layers (e.g. after an upload commit)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !reloadToken) return;
    (async () => {
      try {
        const [parcels, buildings, utils] = await fetchBase();
        (map as any)._raw = { parcels, buildings };
        (map.getSource('parcels') as any)?.setData({ type: 'FeatureCollection', features: parcels.map((p: any) => ({
          type: 'Feature', properties: { id: p.parcel_id, conf: p.confidence, status: p.verification_status },
          geometry: { type: 'Polygon', coordinates: [p.geometry] } })) });
        (map.getSource('buildings') as any)?.setData({ type: 'FeatureCollection', features: buildings.map((b: any) => ({
          type: 'Feature', properties: { id: b.key, name: b.name, conf: b.confidence },
          geometry: { type: 'Polygon', coordinates: [b.geometry] } })) });
        (map.getSource('utils') as any)?.setData({ type: 'FeatureCollection', features: utils.map((u: any) => ({
          type: 'Feature', properties: { id: u.utility_id, type: u.type },
          geometry: { type: 'LineString', coordinates: u.geometry } })) });
      } catch {}
    })();
  }, [reloadToken, loaded]);

  // upload preview overlay: dashed-cyan shapes + auto-zoom to their bbox
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    ['preview-fill', 'preview-line'].forEach(l => { if (map.getLayer(l)) map.removeLayer(l); });
    if (map.getSource('preview')) map.removeSource('preview');
    if (!preview?.features?.length) return;
    try {
      map.addSource('preview', { type: 'geojson', data: { type: 'FeatureCollection', features: preview.features } as any });
      map.addLayer({ id: 'preview-fill', type: 'fill', source: 'preview',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#22d3ee', 'fill-opacity': 0.22 } });
      map.addLayer({ id: 'preview-line', type: 'line', source: 'preview',
        paint: { 'line-color': '#22d3ee', 'line-width': 2.5, 'line-dasharray': [3, 2] } });
      if (preview.bbox) map.fitBounds([[preview.bbox[0], preview.bbox[1]], [preview.bbox[2], preview.bbox[3]]], { padding: 60, duration: 1000 });
    } catch {}
  }, [preview, loaded]);

  // apply layer toggles + highlights (all entity types resolve to a map center)
  const centroid = (ring: any[]) => {
    if (!ring?.length) return null;
    let x = 0, y = 0; ring.forEach((p: any) => { x += p[0]; y += p[1]; });
    return [x / ring.length, y / ring.length];
  };
  const bboxOf = (ring: any[]): [number, number, number, number] | null => {
    if (!ring?.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) continue;
      if (pt[0] < minX) minX = pt[0]; if (pt[1] < minY) minY = pt[1];
      if (pt[0] > maxX) maxX = pt[0]; if (pt[1] > maxY) maxY = pt[1];
    }
    if (!isFinite(minX)) return null;
    return [minX, minY, maxX, maxY];
  };
  const toParcelFeature = (pd: any) => pd ? {
    type: 'Feature', properties: { id: pd.parcel_id, conf: pd.confidence, status: pd.verification_status },
    geometry: { type: 'Polygon', coordinates: [pd.geometry] } } : null;
  const toBuildingFeature = (bd: any) => bd ? {
    type: 'Feature', properties: { id: bd.key, name: bd.name, conf: bd.confidence },
    geometry: { type: 'Polygon', coordinates: [bd.geometry] } } : null;
  const showClaimPoint = (map: maplibregl.Map, pt: [number, number] | null | undefined) => {
    try {
      if (map.getLayer('claim-dot')) map.removeLayer('claim-dot');
      if (map.getSource('claim-point')) map.removeSource('claim-point');
      if (!pt || !isFinite(pt[0]) || !isFinite(pt[1])) return;
      map.addSource('claim-point', { type: 'geojson', data: { type: 'FeatureCollection', features: [
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: pt } }] } as any });
      map.addLayer({ id: 'claim-dot', type: 'circle', source: 'claim-point',
        paint: { 'circle-radius': 7, 'circle-color': '#f97316', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
    } catch {}
  };
  useEffect(() => {
    const map = mapRef.current; if (!map || !map.isStyleLoaded()) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        // Focused mini preview: show ONLY the verified property, hide the rest of the city
        if (focusOnly && highlights?.length) {
          const h = highlights[0];
          const raw = (map as any)._raw;
          let parcelFeat: any = null, buildingFeat: any = null, ring: any[] | null = null;
          if (h.type === 'parcel') {
            let pd = raw?.parcels?.find((x: any) => x.parcel_id === h.id);
            if (!pd) pd = await fetch('/api/parcels/' + h.id).then(r => r.ok ? r.json() : null).catch(() => null);
            if (pd?.geometry || pd?.parcel_id) {
              // fetched single-parcel shape uses {geometry, ...}; base-list shape uses raw fields
              const full = pd.geometry ? pd : raw?.parcels?.find((x: any) => x.parcel_id === h.id);
              parcelFeat = toParcelFeature({ parcel_id: h.id, confidence: pd.confidence ?? full?.confidence ?? 95, verification_status: pd.verification_status ?? full?.verification_status ?? 'Verified', geometry: pd.geometry ?? full?.geometry });
              ring = (pd.geometry ?? full?.geometry) || null;
            }
          } else if (h.type === 'building') {
            let bd = raw?.buildings?.find((x: any) => x.key === h.id);
            if (!bd) {
              const parts = String(h.id).split('-'); const code = parts.pop(); const parcel = parts.join('-');
              bd = await fetch(`/api/buildings/${parcel}/${code}`).then(r => r.ok ? r.json() : null).catch(() => null);
              if (bd) bd = { key: h.id, name: bd.name, confidence: bd.confidence, geometry: bd.geometry };
            }
            buildingFeat = toBuildingFeature(bd);
            ring = bd?.geometry || null;
          } else if (h.type === 'unit' || h.type === 'floor') {
            // unit geometry isn't exposed by the API — fall back to its parent building
            const bk = h.type === 'unit' ? String(h.id).split('-').slice(0, 4).join('-') : String(h.id).split('-').slice(0, 4).join('-');
            let bd = raw?.buildings?.find((x: any) => x.key === bk);
            if (!bd && bk.includes('-')) {
              const parts = bk.split('-'); const code = parts.pop(); const parcel = parts.join('-');
              bd = await fetch(`/api/buildings/${parcel}/${code}`).then(r => r.ok ? r.json() : null).catch(() => null);
              if (bd) bd = { key: bk, name: bd.name, confidence: bd.confidence, geometry: bd.geometry };
            }
            buildingFeat = toBuildingFeature(bd);
            ring = bd?.geometry || null;
          }
          try {
            (map.getSource('parcels') as any)?.setData({ type: 'FeatureCollection', features: parcelFeat ? [parcelFeat] : [] });
            (map.getSource('buildings') as any)?.setData({ type: 'FeatureCollection', features: buildingFeat ? [buildingFeat] : [] });
            (map.getSource('utils') as any)?.setData({ type: 'FeatureCollection', features: [] });
          } catch {}
          showClaimPoint(map, focusPoint);
          const bb = ring ? bboxOf(ring) : null;
          if (bb && !cancelled) {
            const pad = 0.0006;
            map.fitBounds([[bb[0] - pad, bb[1] - pad], [bb[2] + pad, bb[3] + pad]], { padding: 28, duration: 900, maxZoom: 18 });
          } else if (focusPoint && !cancelled) {
            map.flyTo({ center: focusPoint, zoom: 17, duration: 900 });
          }
          return;
        }
        for (const [layer, vis] of [['parcel-fill', layerState.parcels], ['parcel-line', layerState.parcels],
             ['bld-fill', layerState.buildings], ['bld-line', layerState.buildings], ['util-line', layerState.utils]]) {
          if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', vis ? 'visible' : 'none');
        }
        if (highlights?.length) {
          const h = highlights[0];
          const raw = (map as any)._raw;
          let c: any = null;
          if (h.type === 'building') c = raw?.buildings?.find((x: any) => x.key === h.id)?.center;
          else if (h.type === 'parcel') {
            c = raw?.parcels?.find((x: any) => x.parcel_id === h.id)?.center;
            if (!c) { const p = await fetch('/api/parcels/' + h.id).then(r => r.ok ? r.json() : null); c = p?.center; }
          } else if (h.type === 'utility') {
            const us = await fetch('/api/utilities').then(r => r.json());
            const u = us.find((x: any) => x.utility_id === h.id);
            if (u?.geometry?.length) { const g = u.geometry; c = [(g[0][0] + g[g.length - 1][0]) / 2, (g[0][1] + g[g.length - 1][1]) / 2]; }
          } else if (h.type === 'floor') {
            const bk = h.id.split('-').slice(0, 4).join('-');
            c = raw?.buildings?.find((x: any) => x.key === bk)?.center;
          } else if (h.type === 'unit') {
            const u = await fetch('/api/units/' + h.id).then(r => r.ok ? r.json() : null);
            c = centroid(u?.geometry) || null;
          }
          if (c && !cancelled) map.flyTo({ center: c, zoom: 16.5, duration: 1200 });
        }
      } catch {}
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [highlights, layerState, focusOnly, focusPoint]);

  return <div ref={ref} className={`w-full h-full rounded-xl overflow-hidden border border-slate-700 ${compact ? 'min-h-[220px]' : 'min-h-[420px]'}`} />;
}
