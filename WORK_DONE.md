# BhuSphere 3D — Work Done (detailed log)

**Project:** SIH 2026 · PS-26011 · 3D ULPIN Generation & Vertical Property Mapping
**Folder:** `sih4/` · **Date:** 2026-09-04 · **Status:** working prototype, verified end-to-end
**Tagline:** "From 2D Land Parcels to 3D Property Intelligence."

> **Disclaimer (applies to whole build):** identifiers labelled *Prototype 3D ULPIN / Prototype 3D
> cadastral reference* (e.g. `DL-SKT-0182-B01-F08-U804`) are **demo identifiers only, NOT official
> Government of India ULPINs**. Owner names are fictional. AI output is *AI-assisted assessment —
> requires official verification*. No LLM SDK is used anywhere (see §9).

---

## 1. What was built (summary)

A full-stack, demo-runnable **3D cadastral digital twin**:

- **Backend** — FastAPI + SQLAlchemy + SQLite (zero-setup; PostGIS-ready), 7 modules, ~850 lines,
  20+ REST endpoints, auto docs at `/docs`.
- **Frontend** — React 18 + TypeScript + Vite + Tailwind, MapLibre 2D map, Three.js procedural 3D
  building viewer, 8 routes, AI copilot panel, QR public identity.
- **Demo data** — deterministic synthetic generator: 14 parcels, 30 buildings, 378 floors,
  2,529 units, 60 fictional owners, 14 utilities, 130 validation issues.
- **Flagship demo site** — Green Residency `DL-SKT-0182`: towers A (12 fl) / B (10 fl) / C (15 fl),
  basements B1/B2, anchor unit `DL-SKT-0182-B01-F08-U804` (1,245 sq.ft, 24–27 m, 96.4%).
- **Verification** — backend smoke suite 5/5 passing; frontend `tsc --noEmit` clean, `vite build`
  succeeds (`dist/` ~2 MB, 2,429 modules).

---

## 2. Tech stack (actual, as installed)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 18, TypeScript 5, Vite 5, Tailwind 3, react-router 6, TanStack Query 5 | `frontend/package.json` (225 npm pkgs) |
| 2D map | MapLibre GL 4, Carto dark-matter basemap (no key) | `src/components/Map2D.tsx` |
| 3D | Three.js 0.169 + OrbitControls, procedural floor volumes | `src/components/Building3D.tsx`; structured so Cesium Ion + 3D Tiles can replace it |
| Charts | Recharts 2 | dashboard bars/pie |
| QR | qrcode.react 4 | 3D viewer tab + public identity page |
| Icons | lucide-react | nav, copilot, layout |
| Backend | FastAPI, Uvicorn, SQLAlchemy 2, Pydantic 2, python-jose, Shapely, NumPy, qrcode, Pillow | `backend/requirements.txt` |
| DB | SQLite file `backend/bhu.db` (demo); `database.py` isolates the engine so `DATABASE_URL` can point at Postgres/PostGIS | geometry stored as GeoJSON JSON columns |
| Auth | Mock demo login → JWT (12 h) | users below; no real IdP |
| AI | **None — deterministic rules engine**, no external calls | `app/aicopilot.py`; `LLM_API_KEY` in `.env.example` is an unused placeholder |

---

## 3. Backend in detail (`backend/app/`)

| File (lines) | Responsibility |
|---|---|
| `database.py` (18) | engine/session/`get_db`; SQLite `check_same_thread=False`; comment marks PostGIS swap point |
| `models.py` (159) | 13 tables: Parcel, Building, Floor, Unit, Owner, Right, Utility, DataSource, PropertySource, ValidationIssue, PropertyHistory, AuditLog (+ history). Geometry = JSON GeoJSON ring/line + `center`; `z_min/z_max` on floors = the 3D-volume concept |
| `ulpin.py` (30) | `make_prototype_ulpin()` → `{internal_id (UUID), prototype_3d_ulpin, parent_parcel, building, floor, unit, geometry_hash, disclaimer}`; `floor_label()` (B2/B1/G/F01…); `confidence_status()` thresholds 95/80/60 |
| `seed.py` (192) | deterministic (`random.seed(2026)`) generator: 7 sources, 60 owners, 3 localities (Saket/Malviya/Hauz Khas), 14 parcels, 30 buildings, floors −2…N, units per residential floor + rights + source links; forces anchor unit to 1,245 sq.ft / 96.4%; 6 named + 8 random utilities; history rows; then runs validation engine |
| `validation.py` (97) | 12 prototype checks: parcel overlap, building-outside-parcel, floor overlap, missing floor, invalid z-range, height mismatch (>2 m), unit-outside-floor (structural), duplicate ID, utility-crossing, missing ownership, self-intersection, GNSS note; each issue carries severity/evidence/AI-confidence/action/status |
| `aicopilot.py` (80) | NL → safe tool handlers (no raw SQL): height-mismatch, conflicts, utilities/parcel, above-floor-N, needs-verification, A804 explainer, Saket counter, ULPIN lookup, helpful fallback. Returns `{answer, count, rows, highlights, confidence}` |
| `main.py` (276) | FastAPI app + CORS + all routes (see §4) + `audit()` helper + auto-seed on first stats/AI call |

Seeded counts (verified 2026-09-04): **parcels 14 · buildings 30 · floors 378 · units 2,529 ·
utilities 14 · validation issues 130 · owners 60**.

---

## 4. API catalogue (all live, see `/docs`)

- Auth/ops: `POST /api/auth/login`, `POST /api/seed`, `GET /api/health`, `GET /api/audit`, `POST /api/data/import` (prototype: counts features, returns validate→preview→map→process note).
- Cadastre: `GET /api/parcels (?locality)`, `GET /api/parcels/{pid}` (incl. buildings + intersecting utilities), `GET /api/buildings`, `GET /api/buildings/{parcel}/{bcode}` (incl. `floor_list`), `GET /api/floors/{fid}` (incl. units), `GET /api/units/{ulpin}`, `GET /api/properties/{ulpin}{/sources,/history,/validation}`.
- ULPIN: `POST /api/ulpin/generate` → demo default returns `DL-SKT-0182-B01-F08-U804` + disclaimer.
- Validation: `GET /api/validation/issues (?status&severity)`, `POST /api/validation/run`, `POST /api/validation/{id}/review` (Under Review/Resolved/Rejected + audit row).
- AI/search: `POST /api/ai/query`, `GET|POST /api/search?q=` (units/buildings/parcels/utilities).
- Dashboard: `GET /api/dashboard/stats` → `{display: {12482 parcels, 3428 buildings, 18764 units, 15892 verified, 1247 review, 214 spatial, 86 ownership, 2318 underground, 94.2%}, demo_counts: {live DB numbers}}`.

---

## 5. Frontend in detail (`frontend/src/`, ~730 lines)

| File | What it does |
|---|---|
| `main.tsx` / `App.tsx` | entry; QueryClient + auth Store + router; unauthenticated users get Login except public `/property/:ulpin` |
| `lib/api.ts` | fetch wrapper (JWT header) + `login/search/ai` helpers; dev proxy `/api → 127.0.0.1:8000` |
| `lib/store.tsx` | auth (localStorage) + cross-page map `highlights` |
| `components/Layout.tsx` | navy sidebar (Overview/Map/3D/Validation/Infrastructure/Reports/Admin + AI Copilot button), header with SIH demo badge, role footer, logout |
| `components/ui.tsx` | `ConfidenceRing` (SVG donut, green/blue/amber/red by 95/80/60), `StatusBadge` |
| `components/Map2D.tsx` | MapLibre map: parcel/building/utility GeoJSON layers, click building/parcel → detail, layer toggles, AI-highlight flyTo |
| `components/Building3D.tsx` | Three.js scene: ground+grid, stacked translucent floor boxes (B2→roof), click floor, exploded offset of selection, unit subdivision on selected floor (green = selected), underground utility tubes in underground mode, OrbitControls |
| `components/Copilot.tsx` | floating panel, 5 suggested questions, Q&A log, result tables, pushes `highlights` to map |
| `pages/Login.tsx` | 4 demo roles × `demo123`, mock JWT, prototype disclaimer |
| `pages/Dashboard.tsx` | 9 KPI cards (spec display numbers + live demo counts), severity bar + verification pie (Recharts), recent-issues feed, Green-Residency shortcuts |
| `pages/Map.tsx` | search bar + result chips + layer checkboxes + 2D map + side drawer (building card with Open-3D; parcel card with buildings + intersecting-assets note) |
| `pages/Viewer3D.tsx` | building selector, exploded/underground toggles, 3D canvas, vertical floor list (label/units/z-range), unit grid, tabs: Info (ULPIN + internal UUID + area/z/owner + confidence ring + evidence scores) / Evidence / History (2024→2026 time machine) / QR (deep link) / Report (print) |
| `pages/Ops.tsx` | Validation Center (severity filter, run-engine, issue cards with evidence + resolve workflow → audit), Infrastructure (type filter cards), Admin (live demo-counts JSON, import test button, audit trail, role matrix) |
| `pages/Property.tsx` | public QR identity: safe fields only (reference, parcel/bld/floor/unit, area, z, confidence), no owner PII |

---

## 6. Demo-script coverage (§52 of the brief)

Steps 1–16 all executable: dashboard KPIs → map search Green Residency → Building A card → Open 3D →
B2…F12 stack → F08 explode → unit 804 → ULPIN/area/z/96.4% → Evidence (GIS/LiDAR/Drone/GNSS/plan/DEM/registry) →
Copilot why-96.4 + height-mismatch>2 m with map highlight → Underground (WTR-00182/ELEC-00921/TEL-00382) →
parcel "3 assets intersect" → Validation B03 (+3.4 m, Review) → History 2024→2026 → QR → closing line.

---

## 7. Verification evidence

- `cd backend && python -m pytest tests/ -q` → **5 passed** (`test_smoke.py`: health, auth, parcel→building→unit chain incl. 96.4 assertion, AI count ≥ 1, ULPIN default).
- Manual TestClient run: health ok, login keys ok, stats keys ok, parcel 3 buildings, B01 name ok, A804 ULPIN ok, AI count 7, issues 130, utilities 14.
- `cd frontend && npx tsc --noEmit` → clean (one `rsplit` bug found and fixed in `Map.tsx`).
- `npm run build` → success, 2,429 modules, `dist/` ~2 MB (expected; three + maplibre). One benign chunk-size warning.

---

## 8. How to run / files of interest

```bat
scripts\run-backend.bat    :: pip install + uvicorn :8000  (docs: http://127.0.0.1:8000/docs)
scripts\run-frontend.bat   :: npm install + vite :5173     (app:  http://localhost:5173)
```
Logins: `officer|surveyor|admin|public` / `demo123`. Reset demo: `POST /api/seed` or delete `backend/bhu.db`.
Root files: `README.md` (setup/demo/API/prod path), `.env.example`, `docker-compose.yml` (postgis+api+web),
`frontend/Dockerfile`, `backend/Dockerfile`, `docs/FUTURE.md`, `ml/README.md`, `data/` (empty, reserved).

## 9. LLM question (asked 2026-09-04)

**No LLM SDK is used.** Copilot is offline/deterministic; `LLM_API_KEY` is an unused placeholder for a
future LangGraph + pgvector RAG layer. Suggested insertion point: `aicopilot.py::answer_query()` behind the
current rule handlers as fallback, keeping safe-tool (no-raw-SQL) and "requires official verification" guardrails.

## 10. Known limits / next steps (remaining)

Mobile 3D is desktop-first; basemap needs internet (Carto); `/api/seed` +
`/api/validation/run` are open demo endpoints (guard before any shared deployment).

## 14. Iteration 5 — Property Data Submission intake (2026-09-09)

Intake layer feeding the existing cadastre — no second map/viewer/ULPIN/validator.
Backend: 6 new tables (submissions, documents, reviews, field_verifications, versions,
notifications); first JWT role guard (new routes only); `citizen` demo login; 14 intake
endpoints incl. duplicates check, multipart upload to `backend/uploads/`, field-result,
notifications, submission dashboard stats; citizen PENDING_VERIFICATION vs govt
AUTHORIZED→INTEGRATED/NEEDS_REVIEW; single `apply_submission()` writes live records,
appends evidence sources, recomputes confidence, history, audit, notifications.
Frontend: Submit Data nav (role-filtered), landing, 7-step conditional wizard with
embedded map picker, live m² conversion, ownership-claim banner, review diff +
duplicate cards, drafts, success screen; My Submissions + tracker timeline; officer
Verification Queue + side-by-side compare workspace with 2D/3D deep links, decision bar,
correction fields, field-verification checklist flow; header notification bell; dashboard
intake widgets; copilot answers submission-status questions.
Verification: **pytest 14/14 · tsc clean · vitest 14/14 · vite build ok**.

## 13. Iteration 4 — Demo-win pack (2026-09-05)

**Guided tour:** header **Present** button runs an 8-step spotlight tour (KPIs → map search →
tower → explode F08 → isolate floor → copilot auto-ask with map highlights → validation →
B03 case finale), driving the real UI via deep links, with progress dots, auto-play (9 s/step)
and Esc to exit (`DemoTour.tsx`, `tourSteps.ts`, `data-tour` anchors).
**B03 case file:** `GET /api/validation/case/{entity}` (issues + snapshot + history + audit) and
`/validation/case/:entity` page — registered-vs-LiDAR bars, evidence chain, resolve actions with
the audit trail growing live underneath; linked from every issue card.
**KPI honesty toggle:** City scale / Live demo switch (persisted) so display numbers survive scrutiny.
Verification: **pytest 11/11 · tsc clean · vitest 7/7 · vite build ok**.

## 12. Iteration 3 — City 3D removed + dark command-center redesign (2026-09-04)

City 3D (`/city`, Cesium) removed: tiles never loaded in the demo environment (black canvas),
so the page, route, nav entry, `cesium`/`vite-plugin-cesium` deps and 16 MB asset payload are gone.
Cesium Ion + 3D Tiles stay documented as the production path (`docs/FUTURE.md`); the Ion token in
`.env` files is reserved for that. Full UI pass to a dark ops-console theme: design tokens
(`night`/`accent` scales, Inter, favicon), shared `.panel/.btn/.input` classes, grouped sidebar +
header with global search, split-screen login, dark dashboard/charts/drawer/copilot/QR pages,
map legend overlay + hover popups kept, print stylesheet forced to light for reports.
Verification: **tsc clean · vitest 4/4** (backend untouched, still 8/8).

`data/` empty; mobile 3D is desktop-first; basemap needs internet (Carto); OSM footprints won't
align 1:1 with demo parcels (tower viewer stays system of record); `/api/seed` + `/validation/run`
are open demo endpoints (guard before any shared deployment).

## 11. Iteration 2 — gaps closed + City 3D (2026-09-04, scope: phases A–E)

**A · demo-trust:** evidence scores now come from the `/sources` API (no hardcoded string);
floor/unit auto-default per building (prefers F08, else first floor with units); map highlights +
fly-to for unit/parcel/utility/floor (was buildings-only); utility layer clickable with a drawer card;
all search chips work (units deep-link to `/3d?b=&f=&u=`); 3D click-vs-drag disambiguation;
"showing X of N" counts; "PostGIS" label corrected to cadastral database.
**B · navigation & feedback:** URL synced (`b/f/u`) + breadcrumbs parcel→unit; tower-rail floor
selector (roof-up, status-colored); clickable copilot rows → 3D/validation; autoscroll,
clear-highlights, collapsible suggestions; toasts; skeletons + error/empty states (incl. bad ULPIN);
ErrorBoundary + 404 page.
**C · polish:** map hover popups + legend; in-scene 3D floor labels + reset view + 3D legend;
clickable dashboard KPIs/issues; validation status filter + pagination + Open-in-3D + toast feedback;
real file upload; audit filter + CSV export; print stylesheet; icon-only sidebar on small screens;
focus-visible + aria labels.
**E · City 3D (`/city`, lazy chunk):** Cesium OSM buildings + world terrain over Saket, 3D-Tiles
style presets (context / residential highlight / risk radius with click-recenter / office-apartment
filters), our 30 demo buildings extruded and colored by verification (red = open high-severity issue),
click extrusion → tower viewer. Token via `VITE_CESIUM_ION_TOKEN`; no-token/offline fallback included.
**D · hardening:** Three.js GPU disposal on rebuild; `lib/nav.ts` shared deep-link helpers;
vitest (4 tests); list endpoints paginated (`skip/limit`); timezone-aware JWT expiry; stray
`backend/package-lock.json` removed; `tsconfig noEmit` (stops stray `.js` shadowing sources).
Verification: **pytest 8/8 · tsc clean · vitest 4/4 · vite build ok** (Cesium split to own chunk,
main bundle unchanged).

Stray `backend/package-lock.json` (harmless, ignore); `data/` empty; mobile 3D is desktop-first;
basemap needs internet (Carto); anchor-unit counts are illustrative vs live DB counts (both shown);
datetime `utcnow` deprecation warnings (cosmetic). Natural next: PostGIS swap, Cesium/3D-Tiles, Keycloak,
report PDF export, ingestion parsers, LLM+RAG copilot upgrade.
