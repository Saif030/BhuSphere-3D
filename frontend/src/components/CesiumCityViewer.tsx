import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { api } from '../lib/api';
import { StatusBadge } from './ui';

// Green Residency flagship — default camera + risk-radius center.
const GX = 77.2010, GY = 28.5245;
type Preset = 'context' | 'residential' | 'risk' | 'offices' | 'apartments';
const PRESETS: { v: Preset; label: string }[] = [
  { v: 'context', label: 'City context' },
  { v: 'residential', label: 'Highlight residential' },
  { v: 'risk', label: 'Risk radius from parcel' },
  { v: 'offices', label: 'Offices only' },
  { v: 'apartments', label: 'Apartments only' },
];

function applyStyle(osm: any, preset: Preset, cx: number, cy: number) {
  switch (preset) {
    case 'residential':
      osm.style = new Cesium.Cesium3DTileStyle({ color: { conditions: [
        ["${feature['building']} === 'apartments' || ${feature['building']} === 'residential'", "color('cyan', 0.9)"],
        ['true', "color('white', 0.85)"]] } });
      break;
    case 'risk':
      osm.style = new Cesium.Cesium3DTileStyle({ defines: {
        distance: `distance(vec2(\${feature['cesium#longitude']}, \${feature['cesium#latitude']}), vec2(${cx},${cy}))` },
        color: { conditions: [
          ['${distance} > 0.014', "color('blue', 0.85)"], ['${distance} > 0.010', "color('green', 0.85)"],
          ['${distance} > 0.006', "color('yellow', 0.9)"], ['${distance} > 0.0001', "color('red', 0.9)"],
          ['true', "color('white')"]] } });
      break;
    case 'offices':
      osm.style = new Cesium.Cesium3DTileStyle({ show: "${feature['building']} === 'office'" });
      break;
    case 'apartments':
      osm.style = new Cesium.Cesium3DTileStyle({ show: "${feature['building']} === 'apartments'" });
      break;
    default:
      osm.style = new Cesium.Cesium3DTileStyle({ color: { conditions: [
        ["${feature['building:material']} === 'glass'", "color('skyblue', 0.6)"],
        ['true', "color('white', 0.85)"]] } });
  }
}

/** City-scale 3D: Cesium OSM buildings + terrain for context, our demo cadastre extruded on top.
 *  OSM has no floor/interior data — parcel→floor→unit depth stays in the tower viewer (/3d). */
export default function CesiumCityViewer() {
  const token = (import.meta as any).env?.VITE_CESIUM_ION_TOKEN as string | undefined;
  const divRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const osmRef = useRef<any>(null);
  const [preset, setPreset] = useState<Preset>('context');
  const [center, setCenter] = useState({ x: GX, y: GY, label: 'Green Residency DL-SKT-0182' });
  const [sel, setSel] = useState<any>(null);
  const [count, setCount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { if (osmRef.current) applyStyle(osmRef.current, preset, center.x, center.y); }, [preset, center]);

  useEffect(() => {
    if (!token || !divRef.current) return;
    let dead = false;
    let viewer: any = null;
    let handler: any = null;
    (async () => {
      try {
        Cesium.Ion.defaultAccessToken = token;
        viewer = new Cesium.Viewer(divRef.current!, {
          terrain: Cesium.Terrain.fromWorldTerrain(),
          animation: false, timeline: false, fullscreenButton: false, vrButton: false,
        });
        viewerRef.current = viewer;
        viewer.scene.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(GX, GY, 1400),
          orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-45) },
        });
        const osm = await Cesium.createOsmBuildingsAsync();
        if (dead) return;
        viewer.scene.primitives.add(osm);
        osmRef.current = osm;
        applyStyle(osm, 'context', GX, GY);
        // Authoritative demo layer: extrude our cadastral buildings, colored by verification.
        const [blds, issues] = await Promise.all([
          api.get('/api/buildings'), api.get('/api/validation/issues'),
        ]);
        if (dead) return;
        const hot = new Set((issues || []).filter((i: any) => i.severity === 'High' && i.status === 'Open').map((i: any) => String(i.entity).slice(0, 14)));
        let n = 0;
        for (const b of blds) {
          try {
            const flat: number[] = [];
            for (const p of b.geometry) flat.push(p[0], p[1]);
            const col = hot.has(b.key) ? '#ef4444' : b.status === 'Verified' ? '#22c55e' : '#f59e0b';
            viewer.entities.add({
              name: b.name,
              polygon: { hierarchy: Cesium.Cartesian3.fromDegreesArray(flat), height: 0,
                extrudedHeight: b.height_m || 30,
                material: Cesium.Color.fromCssColorString(col).withAlpha(0.75),
                outline: true, outlineColor: Cesium.Color.WHITE },
              properties: { bhuKey: b.key, parcel: b.parcel, status: b.status, height: b.height_m, floors: b.floors, conf: b.confidence },
            });
            n++;
          } catch {}
        }
        setCount(`${n} cadastral buildings overlaid`);
        handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((mv: any) => {
          const picked = viewer.scene.pick(mv.position);
          if (!picked) { setSel(null); return; }
          const ent = picked.id;
          if (ent?.properties?.bhuKey) {
            const g = ent.properties;
            setSel({ kind: 'bhu', name: ent.name, key: g.bhuKey.getValue(), parcel: g.parcel.getValue(),
              status: g.status.getValue(), height: g.height.getValue(), floors: g.floors.getValue(), conf: g.conf.getValue() });
          } else if (picked.getProperty) {
            const lat = picked.getProperty('cesium#latitude'), lng = picked.getProperty('cesium#longitude');
            setSel({ kind: 'osm', type: picked.getProperty('building') || 'building', lat, lng });
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      } catch (e: any) { if (!dead) setError(e?.message || 'Failed to start Cesium (token or network).'); }
    })();
    return () => { dead = true; try { handler?.destroy(); } catch {} try { viewer?.destroy(); } catch {} viewerRef.current = null; osmRef.current = null; };
  }, [token]);

  if (!token) {
    return (
      <div className="bg-white border rounded-xl p-8 text-sm max-w-xl">
        <div className="font-bold text-navy text-lg">City 3D needs a Cesium Ion token</div>
        <div className="text-slate-500 mt-1">Add <code>VITE_CESIUM_ION_TOKEN</code> to <code>frontend/.env</code> (free at cesium.com/ion → Access Tokens) and restart <code>npm run dev</code>.</div>
        <Link to="/3d" className="inline-block mt-4 bg-navy text-white rounded-lg px-4 py-1.5">Open tower viewer instead →</Link>
      </div>
    );
  }

  return (
    <div className="grid xl:grid-cols-[1fr_320px] gap-3">
      <div>
        <div ref={divRef} className="w-full h-[560px] rounded-xl overflow-hidden border border-slate-700" />
        <div className="text-[11px] text-slate-500 bg-white border rounded-xl px-3 py-1.5 mt-2">Legend:
          <span className="inline-block w-2 h-2 rounded-sm bg-green-500 ml-1" /> cadastral verified
          <span className="inline-block w-2 h-2 rounded-sm bg-amber-500 ml-2" /> needs review
          <span className="inline-block w-2 h-2 rounded-sm bg-red-500 ml-2" /> open high-severity issue
          <span className="inline-block w-2 h-2 rounded-sm bg-cyan-400 ml-2" /> OSM residential (preset)
          <span className="ml-2">· {count} · click any extrusion or OSM building</span></div>
      </div>
      <div className="space-y-3 text-sm">
        <div className="bg-white border rounded-xl p-3">
          <label className="text-xs font-semibold">3D Tiles style preset</label>
          <select value={preset} onChange={e => setPreset(e.target.value as Preset)} className="w-full border rounded-lg px-2 py-1 mt-1 text-sm">
            {PRESETS.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
          </select>
          <div className="text-[11px] text-slate-500 mt-1">Risk center: {center.label}{preset === 'risk' && ' — click any OSM building to recenter.'}</div>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}<br /><Link to="/3d" className="underline">Fall back to tower viewer →</Link></div>}
        {!sel && !error && <div className="bg-white border rounded-xl p-3 text-xs text-slate-500">Click a colored extrusion for its cadastral record, or any grey OSM building for context (OSM tags are illustrative, not authoritative).</div>}
        {sel?.kind === 'bhu' && <div className="bg-white border rounded-xl p-3">
          <div className="font-bold">{sel.name}</div>
          <div className="text-xs text-slate-500">{sel.key} · Parcel {sel.parcel}</div>
          <div className="text-xs mt-1">{sel.floors} floors · {sel.height}m · {sel.conf}%</div>
          <div className="mt-1"><StatusBadge s={sel.status} /></div>
          <Link to={`/3d?b=${sel.key}`} className="block text-center mt-3 bg-orange-500 text-white rounded-lg py-1.5 font-semibold">Open tower → floors & units</Link>
        </div>}
        {sel?.kind === 'osm' && <div className="bg-white border rounded-xl p-3 text-xs">
          <div className="font-bold">OSM building (context)</div>
          <div className="text-slate-500">type: {sel.type} · {Number(sel.lat)?.toFixed(4)}, {Number(sel.lng)?.toFixed(4)}</div>
          <button onClick={() => { setCenter({ x: sel.lng, y: sel.lat, label: `OSM ${sel.type}` }); setPreset('risk'); }}
            className="mt-2 border rounded px-2 py-1 hover:bg-sky-50">Risk radius from here</button>
        </div>}
      </div>
    </div>
  );
}
