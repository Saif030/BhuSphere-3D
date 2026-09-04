import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export type Sel = { kind: string; id: string } | null;

/** 2D cadastral map: parcels + buildings + utilities, click-to-select, highlight support. */
export default function Map2D({ onSelect, highlights, layerState }:
  { onSelect: (s: Sel, extra?: any) => void; highlights: any[]; layerState: any }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selRef = useRef<Sel>(null);
  selRef.current = null;

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
      const [parcels, buildings, utils] = await Promise.all([
        fetch('/api/parcels').then(r => r.json()),
        fetch('/api/buildings').then(r => r.json()),
        fetch('/api/utilities').then(r => r.json()),
      ]);
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
    });
    return () => {};
  }, []);

  // apply layer toggles + highlights (all entity types resolve to a map center)
  const centroid = (ring: any[]) => {
    if (!ring?.length) return null;
    let x = 0, y = 0; ring.forEach((p: any) => { x += p[0]; y += p[1]; });
    return [x / ring.length, y / ring.length];
  };
  useEffect(() => {
    const map = mapRef.current; if (!map || !map.isStyleLoaded()) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
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
  }, [highlights, layerState]);

  return <div ref={ref} className="w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-700" />;
}
