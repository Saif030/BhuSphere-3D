import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type BData = { key: string; name: string; floor_list: any[]; center: any; height_m: number };

const STEP = 2.45;   // natural slab spacing (fh 2.2 + 0.25 gap)
const SPREAD = 1.4;  // extra explode gap per floor — uniform, overlap-free (2.45+1.4 > 2.2)

/** Procedural 3D building: stacked floor volumes, symmetric exploded view, unit subdivision,
 *  isolated single-floor mode with room tags, underground utilities.
 *  Architecture mirrors a Cesium 3D-Tiles loader: replace <ProceduralTiles> with Cesium Ion + 3D Tiles for production. */
export default function Building3D({ building, selectedFloor, onFloor, selectedUnit, onUnit, exploded, underground, utilities, isolateFloor }:
  { building: BData; selectedFloor: string | null; onFloor: (fid: string) => void; selectedUnit: string | null;
    onUnit: (u: string) => void; exploded: boolean; underground: boolean; utilities: any[];
    isolateFloor?: any | null }) {
  const ref = useRef<HTMLDivElement>(null);
  // Preserve the user's orbit position across scene rebuilds (rebuilds happen on every selection).
  const camPos = useRef<number[] | null>(null);

  useEffect(() => {
    if (!ref.current || !building) return;
    ref.current.innerHTML = '';
    const W = ref.current.clientWidth || 700, H = ref.current.clientHeight || 520;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1e3a);
    const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 800);
    const ren = new THREE.WebGLRenderer({ antialias: true });
    ren.setSize(W, H); ref.current.appendChild(ren.domElement);
    const ctl = new OrbitControls(cam, ren.domElement);
    ctl.enableDamping = true;
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(20, 40, 15); scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90),
      new THREE.MeshStandardMaterial({ color: underground ? 0x1e3a5f : 0x14324f, transparent: true, opacity: underground ? 0.25 : 1 }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const grid = new THREE.GridHelper(90, 30, 0x38bdf8, 0x1e3a5f); grid.position.y = 0.01; scene.add(grid);

    const makeLabel = (text: string, bg = 'rgba(11,30,58,0.9)', s = 1) => {
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 56;
      const g = cv.getContext('2d')!;
      g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, 160, 56, 12); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 28px Inter,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, 80, 30);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
      sp.scale.set(3.4 * s, 1.19 * s, 1);
      return sp;
    };
    const click: THREE.Mesh[] = [];
    const pin = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, parent: THREE.Object3D) => {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2)]);
      parent.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })));
    };

    if (isolateFloor) {
      // ---- isolated single floor: slab + every registered unit with room-number tags ----
      const units: any[] = isolateFloor.units || [];
      const fw = 14, fd = 10, fh = 1.2, slabY = 1.0;
      const slabCol = isolateFloor.status === 'Verified' ? 0x1d4ed8 : 0xb45309;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd),
        new THREE.MeshStandardMaterial({ color: slabCol, transparent: true, opacity: 0.9, roughness: 0.4 }));
      slab.position.y = slabY; scene.add(slab);
      const slabEdge = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      scene.add(slabEdge);
      const fl = makeLabel(`${isolateFloor.label} · ${isolateFloor.z_min}–${isolateFloor.z_max}m`, 'rgba(249,115,22,0.95)', 1.1);
      fl.position.set(0, slabY + 5.6, 0); scene.add(fl);
      if (units.length) {
        const cols = units.length <= 2 ? units.length : units.length <= 6 ? 3 : units.length <= 12 ? 4 : 5;
        const rows = Math.ceil(units.length / cols);
        const uw = (fw - 2) / cols - 0.35, ud = (fd - 2) / rows - 0.35, uh = 1.0;
        const topY = slabY + fh / 2;
        units.forEach((u, k) => {
          const cx = -((cols - 1) * (uw + 0.35)) / 2 + (k % cols) * (uw + 0.35);
          const cz = -((rows - 1) * (ud + 0.35)) / 2 + Math.floor(k / cols) * (ud + 0.35);
          const isU = u.ulpin === selectedUnit;
          const ucol = isU ? 0x22c55e : u.status === 'Unverified' ? 0xf87171 : 0xfde68a;
          const um = new THREE.Mesh(new THREE.BoxGeometry(uw, uh, ud),
            new THREE.MeshStandardMaterial({ color: ucol, roughness: 0.3, emissive: isU ? 0x14532d : 0x000000, emissiveIntensity: 0.6 }));
          um.position.set(cx, topY + uh / 2, cz);
          um.userData = { kind: 'unit', id: u.ulpin };
          scene.add(um); click.push(um);
          const tag = makeLabel(String(u.unit), isU ? 'rgba(34,197,94,0.95)' : 'rgba(11,30,58,0.92)', isU ? 0.85 : 0.7);
          tag.position.set(cx, topY + uh + 1.15, cz); scene.add(tag);
          pin(cx, topY + uh + 0.55, cz, cx, topY + uh, cz, scene);
        });
      }
      scene.fog = new THREE.Fog(0x0b1e3a, 60, 160);
      cam.position.set(13, 11, 15);
      ctl.target.set(0, 2.2, 0);
    } else {
      // ---- full tower with symmetric explode ----
      const floors = [...building.floor_list].sort((a, b) => a.number - b.number);
      const selIdx = floors.findIndex(f => f.floor_id === selectedFloor);
      const totalH = floors.length * STEP;
      scene.fog = new THREE.Fog(0x0b1e3a, totalH * 1.8, totalH * 4.5);
      const group = new THREE.Group(); scene.add(group);
      const fw = 10, fd = 8, fh = 2.2;
      let selY = totalH / 2;
      floors.forEach((f, i) => {
        const isSel = f.floor_id === selectedFloor;
        // Symmetric spread around the selected index: uniform gaps, no overlap, top floor safe.
        const lift = exploded && selIdx >= 0 ? (i - selIdx) * SPREAD : 0;
        const y = (i + 0.5) * STEP + lift;
        if (isSel) selY = y;
        const col = f.number < 0 ? 0x64748b : isSel ? 0xf97316 : f.status === 'Verified' ? 0x38bdf8 : 0xf59e0b;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd),
          new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: isSel ? 0.95 : 0.72, roughness: 0.4 }));
        mesh.position.y = y; mesh.userData = { kind: 'floor', id: f.floor_id };
        group.add(mesh); click.push(mesh);
        const lb = makeLabel(f.label); lb.position.set(fw / 2 + 2.4, y, fd / 2 + 0.5); group.add(lb);
        const eg = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
        eg.position.copy(mesh.position); group.add(eg);
        if (isSel && f.units?.length) {
          const n = Math.min(f.units.length, 8);
          for (let k = 0; k < n; k++) {
            const uw = fw / n;
            const ucol = f.units[k].ulpin === selectedUnit ? 0x22c55e : 0xfde68a;
            const um = new THREE.Mesh(new THREE.BoxGeometry(uw - 0.15, 0.5, fd - 0.6),
              new THREE.MeshStandardMaterial({ color: ucol, roughness: 0.3 }));
            um.position.set(-fw / 2 + uw * (k + 0.5), y + fh / 2 + 0.28, 0);
            um.userData = { kind: 'unit', id: f.units[k].ulpin };
            group.add(um); click.push(um);
          }
        }
      });
      if (underground) {
        const cmap: any = { Water: 0x38bdf8, Electrical: 0xfacc15, Sewer: 0xa78bfa, Telecom: 0x34d399, Gas: 0xfb7185, Transport: 0xe2e8f0 };
        (utilities || []).slice(0, 8).forEach((u: any, i: number) => {
          const pts = [new THREE.Vector3(-22, u.depth_m * 0.9 || -3, -10 + i * 3), new THREE.Vector3(22, (u.depth_m * 0.9 || -3) - 0.4, -8 + i * 3)];
          const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.28, 8),
            new THREE.MeshStandardMaterial({ color: cmap[u.type] ?? 0xe2e8f0, emissive: cmap[u.type] ?? 0x666666, emissiveIntensity: 0.5 }));
          tube.userData = { kind: 'utility', id: u.utility_id };
          scene.add(tube); click.push(tube);
        });
      }
      if (camPos.current) cam.position.fromArray(camPos.current);
      else { const R = totalH * 0.85 + 16; cam.position.set(R * 0.62, totalH * 0.55 + 12, R * 0.72); }
      ctl.target.set(0, selY, 0);
    }

    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    // Distinguish click from orbit-drag: only select when press+release are close together.
    let downX = 0, downY = 0;
    const onDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; };
    const handler = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const r = ren.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, cam);
      // Sprites (labels) aren't clickable — only slabs and unit boxes.
      const hit = ray.intersectObjects(click)[0];
      if (hit) { const { kind, id } = hit.object.userData;
        if (kind === 'floor') onFloor(id); if (kind === 'unit') onUnit(id); }
    };
    ren.domElement.addEventListener('pointerdown', onDown);
    ren.domElement.addEventListener('click', handler);
    let run = true;
    const anim = () => { if (!run) return; requestAnimationFrame(anim); ctl.update(); ren.render(scene, cam); };
    anim();
    const onR = () => { const w = ref.current!.clientWidth, h = ref.current!.clientHeight;
      cam.aspect = w / h; cam.updateProjectionMatrix(); ren.setSize(w, h); };
    window.addEventListener('resize', onR);
    return () => { run = false; camPos.current = cam.position.toArray();
      window.removeEventListener('resize', onR); ren.domElement.removeEventListener('click', handler); ren.domElement.removeEventListener('pointerdown', onDown);
      scene.traverse((o: any) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((mm: any) => { mm.map?.dispose?.(); mm.dispose?.(); }); });
      ren.dispose(); };
  }, [building?.key, selectedFloor, selectedUnit, exploded, underground, isolateFloor?.floor_id]);

  return <div ref={ref} className="w-full h-[520px] rounded-xl overflow-hidden border border-slate-700 cursor-pointer" />;
}
