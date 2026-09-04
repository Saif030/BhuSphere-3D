import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type BData = { key: string; name: string; floor_list: any[]; center: any; height_m: number };

/** Procedural 3D building: stacked floor volumes, exploded selection, unit subdivision, underground utilities.
 *  Architecture mirrors a Cesium 3D-Tiles loader: replace <ProceduralTiles> with Cesium Ion + 3D Tiles for production. */
export default function Building3D({ building, selectedFloor, onFloor, selectedUnit, onUnit, exploded, underground, utilities }:
  { building: BData; selectedFloor: string | null; onFloor: (fid: string) => void; selectedUnit: string | null;
    onUnit: (u: string) => void; exploded: boolean; underground: boolean; utilities: any[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !building) return;
    ref.current.innerHTML = '';
    const W = ref.current.clientWidth || 700, H = ref.current.clientHeight || 520;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1e3a);
    scene.fog = new THREE.Fog(0x0b1e3a, 60, 140);
    const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
    cam.position.set(26, 24, 30);
    const ren = new THREE.WebGLRenderer({ antialias: true });
    ren.setSize(W, H); ref.current.appendChild(ren.domElement);
    const ctl = new OrbitControls(cam, ren.domElement);
    ctl.target.set(0, 8, 0); ctl.enableDamping = true;
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(20, 40, 15); scene.add(sun);
    // ground (semi-transparent in underground mode)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90),
      new THREE.MeshStandardMaterial({ color: underground ? 0x1e3a5f : 0x14324f, transparent: true, opacity: underground ? 0.25 : 1 }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const grid = new THREE.GridHelper(90, 30, 0x38bdf8, 0x1e3a5f); grid.position.y = 0.01; scene.add(grid);

    const floors = [...building.floor_list].sort((a, b) => a.number - b.number);
    const group = new THREE.Group(); scene.add(group);
    const click: THREE.Mesh[] = [];
    const fw = 10, fd = 8, fh = 2.2;
    const makeLabel = (text: string) => {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 48;
      const g = cv.getContext('2d')!;
      g.fillStyle = 'rgba(11,30,58,0.9)'; g.fillRect(0, 0, 128, 48);
      g.fillStyle = '#fff'; g.font = 'bold 26px Inter,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, 64, 26);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
      sp.scale.set(3.4, 1.3, 1);
      return sp;
    };
    floors.forEach((f, i) => {
      const isSel = f.floor_id === selectedFloor;
      const lift = exploded && isSel ? 3.2 : exploded ? (f.number > (floors.find(x => x.floor_id === selectedFloor)?.number ?? 999) ? 1.6 : -0.4) : 0;
      const y = (i + 0.5) * (fh + 0.25) + lift;
      const col = f.number < 0 ? 0x64748b : isSel ? 0xf97316 : f.status === 'Verified' ? 0x38bdf8 : 0xf59e0b;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd),
        new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: isSel ? 0.95 : 0.72, roughness: 0.4 }));
      mesh.position.y = y; mesh.userData = { kind: 'floor', id: f.floor_id };
      group.add(mesh); click.push(mesh);
      const lb = makeLabel(f.label); lb.position.set(fw / 2 + 2.4, y, fd / 2 + 0.5); group.add(lb);
      // edge
      const eg = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
      eg.position.copy(mesh.position); group.add(eg);
      // units on selected floor: subdivide top face
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
    // underground utilities as colored tubes
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
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();    // Distinguish click from orbit-drag: only select when press+release are close together.
    let downX = 0, downY = 0;
    const onDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; };
    const handler = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const r = ren.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, cam);
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
    return () => { run = false; window.removeEventListener('resize', onR); ren.domElement.removeEventListener('click', handler); ren.domElement.removeEventListener('pointerdown', onDown);
      scene.traverse((o: any) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((mm: any) => { mm.map?.dispose?.(); mm.dispose?.(); }); });
      ren.dispose(); };
  }, [building?.key, selectedFloor, selectedUnit, exploded, underground]);

  return <div ref={ref} className="w-full h-[520px] rounded-xl overflow-hidden border border-slate-700 cursor-pointer" />;
}
