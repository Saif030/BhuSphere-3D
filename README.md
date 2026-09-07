# BhuSphere 3D — 3D Cadastral Intelligence Platform
**SIH 2026 · Problem Statement 26011 · 3D ULPIN Generation & Vertical Property Mapping**

> "From 2D Land Parcels to 3D Property Intelligence."

An interoperable 3D cadastral digital twin that extends conventional 2D parcel records into
vertically structured property identities — GIS + LiDAR + drone + floor plans + GNSS + AI validation.

⚠️ **Disclaimer:** all identifiers labelled *Prototype 3D ULPIN / Prototype 3D cadastral reference*
(e.g. `DL-SKT-0182-B01-F08-U804`) are **demo identifiers only, NOT official Government of India ULPINs**.
Owner names are fictional. AI output is *AI-assisted assessment — requires official verification*.

## Architecture
```
React (Vite+TS+Tailwind+MapLibre+Three.js) → FastAPI → SQLAlchemy → SQLite (demo) / PostGIS (prod)
Services: ULPIN engine · property · spatial queries · validation engine · AI copilot (safe tools) · audit
3D: procedural floor volumes + exploded view + underground tubes (swap for Cesium Ion + 3D Tiles in prod)
```

## Quick start (Windows)
```bat
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
:: new terminal
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 · login `officer / demo123` (also `surveyor`, `admin`, `public`).
API docs: http://127.0.0.1:8000/docs
(Cesium City 3D was removed from this build; Cesium Ion + 3D Tiles remain the documented production path.)

Seed/reset demo DB: `POST /api/seed` or delete `backend/bhu.db` and restart.

## 3-minute demo script
1. Dashboard → 12,482 parcels · 3,428 buildings · 18,764 units · 214 conflicts · 94.2%.
2. Map → search `Green Residency` → click **Building A** → **Open 3D View**.
3. 3D → floors B2…F12 → click **F08** (exploded) → click unit **804**.
4. Property: `DL-SKT-0182-B01-F08-U804`, 1,245 sq.ft, 24–27m, 96.4% + evidence tab.
5. Copilot: *"Why is apartment A804 marked 96.4%?"* then *"Show buildings with height mismatch > 2m"* (map highlights).
6. Tick **Underground mode** → water/electrical/telecom tubes; parcel shows 3 intersecting assets.
7. Validation → B03: registered 29.4m vs LiDAR 32.8m (+3.4m) → Resolve.
8. History (2024→2026) → QR tab → scan → public identity → Admin audit trail.

## Project tree
```
frontend/  React+TS+Vite (Map2D, Building3D, Copilot, Dashboard/Map/Viewer3D/Ops/Property)
backend/app/  main.py models.py seed.py ulpin.py validation.py aicopilot.py database.py
ml/  extraction/validation architecture notes (prototype uses deterministic rules; swap in PyTorch/Open3D later)
data/ docs/ scripts/ docker-compose.yml .env.example
```

## API (see /docs)
`GET /api/parcels /parcels/{id} /buildings /buildings/{p}/{b} /floors/{id} /units/{ulpin} /properties/{ulpin}{/sources,/history,/validation} /utilities /dashboard/stats /validation/issues /audit`
`POST /api/auth/login /api/seed /api/validation/run /validation/{id}/review /api/ulpin/generate /api/search /api/ai/query /api/data/import`

## Production path
PostGIS+pgvector, Cesium Ion + 3D Tiles, CityGML/LADM, Bhu-Naksha/registration/CORS integrations,
Keycloak/Merkle audit, LangGraph RAG over approval/floor-plan docs. See `docs/FUTURE.md`.

## Tests
`cd backend && python -m pytest tests/ -q` (8 tests: health, auth, parcel→unit chain, AI, ULPIN, validation run+review, pagination, AI fallback).
`cd frontend && npm test` (vitest: ULPIN deep-link helper).
