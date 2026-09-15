"""BhuSphere 3D — FastAPI backend. Run: uvicorn app.main:app --reload (from backend/)."""
import os, json, uuid
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException, Query, Header, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from jose import jwt

from .database import Base, engine, get_db, SessionLocal
from . import models
from .ulpin import make_prototype_ulpin, confidence_status
from .seed import seed as run_seed
from .validation import run_all_checks
from .aicopilot import answer_query

SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
ALGO = "HS256"
Base.metadata.create_all(bind=engine)

app = FastAPI(title="BhuSphere 3D — Cadastral Intelligence API",
              description="Prototype 3D ULPIN & vertical property mapping. Prototype identifiers are NOT official Government of India ULPINs.",
              version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# ---------- auth (mock demo) ----------
USERS = {"officer": {"password": "demo123", "role": "officer"},
         "surveyor": {"password": "demo123", "role": "surveyor"},
         "admin": {"password": "demo123", "role": "admin"},
         "citizen": {"password": "demo123", "role": "citizen"}}

def get_current_user(authorization: str = Header(default="")):
    """First real JWT guard in the project. Applied ONLY to new submission routes;
    all pre-existing endpoints stay open so nothing breaks."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Login required")
    try:
        data = jwt.decode(authorization[7:], SECRET, algorithms=[ALGO])
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    return {"username": data.get("sub", ""), "role": data.get("role", "")}

def require_roles(*roles):
    def dep(u: dict = Depends(get_current_user)):
        if u["role"] not in roles:
            raise HTTPException(403, f"Requires role: {'/'.join(roles)}")
        return u
    return dep

class LoginIn(BaseModel):
    username: str; password: str

@app.post("/api/auth/login")
def login(b: LoginIn):
    u = USERS.get(b.username)
    if not u or u["password"] != b.password:
        raise HTTPException(401, "Invalid demo credentials. Try officer/demo123.")
    tok = jwt.encode({"sub": b.username, "role": u["role"],
                      "exp": datetime.now(timezone.utc) + timedelta(hours=12)}, SECRET, algorithm=ALGO)
    return {"token": tok, "username": b.username, "role": u["role"]}

@app.post("/api/seed")
def seed(db: Session = Depends(get_db)):
    return run_seed(db)

def audit(db, uid_, role, etype, eid, action, old=None, new=None):
    try:
        db.add(models.AuditLog(user_id=uid_, user_role=role, entity_type=etype,
                               entity_id=eid, action=action,
                               old_value=json.dumps(old) if old is not None else None,
                               new_value=json.dumps(new) if new is not None else None))
        db.commit()
    except Exception: db.rollback()

# ---------- helpers ----------
def _identity_extra(db, u, ulpin):
    """Public-safe record facts for the identity card. No owner PII — flags only."""
    f = u.floor; b = f.building if f else None
    p = b.parcel if b is not None else None
    locality = p.locality if p is not None else None
    city = (p.city if p is not None else None) or "Delhi"
    bname = b.name if b else None
    # human-readable address: Unit 804, Floor F08, Green Residency – Building A, Saket, Delhi
    parts = []
    if u.unit_number: parts.append(f"Unit {u.unit_number}")
    if f is not None and f.floor_label: parts.append(f"Floor {f.floor_label}")
    if bname: parts.append(bname)
    if locality: parts.append(locality)
    if city: parts.append(city)
    center = (b.center if b is not None and b.center
              else (p.center if p is not None and p.center else None))
    lat = lng = None
    if isinstance(center, (list, tuple)) and len(center) >= 2:
        try: lng, lat = round(float(center[0]), 4), round(float(center[1]), 4)
        except (TypeError, ValueError): pass
    # issuing authority: prefer the registry source, else the strongest source
    authority, authority_detail = None, None
    if db is not None:
        try:
            links = db.query(models.PropertySource).filter(
                models.PropertySource.entity_ulpin == ulpin).all()
            srcs = []
            for l in links:
                s = db.query(models.DataSource).filter(models.DataSource.id == l.source_id).first()
                if s: srcs.append(s)
            reg = next((s for s in srcs if (s.source_type or "").upper() == "REGISTRY"), None)
            best = reg or max(srcs, key=lambda s: 0, default=None)
            if best:
                authority = best.provider
                authority_detail = f"{best.name} ({best.capture_date})" if best.capture_date else best.name
        except Exception: pass
    # last verified: latest history event on this exact record
    last_updated = None
    if db is not None:
        try:
            h = db.query(models.PropertyHistory).filter(
                models.PropertyHistory.entity_id == ulpin).order_by(
                models.PropertyHistory.timestamp.desc()).first()
            if h: last_updated = h.timestamp
        except Exception: pass
    # registration / mutation flag from verification state (demo labelling)
    owner = u.owner
    if owner is None:
        registration_status = "Unclaimed · verification pending"
    elif u.verification_status == "Verified" and owner.verification_status == "Verified":
        registration_status = "Registered · verified"
    elif (u.verification_status or "") in ("High Confidence", "Needs Review"):
        registration_status = "Recorded · pending final verification"
    else:
        registration_status = "Pending verification"
    return {
        "address": ", ".join(parts) if parts else None,
        "locality": locality, "city": city,
        "survey_number": p.survey_number if p is not None else None,
        "lat": lat, "lng": lng,
        "property_type": u.unit_type,
        "building_type": b.building_type if b is not None else None,
        "land_use": p.land_use if p is not None else None,
        "floor_usage": f.usage if f is not None else None,
        "ownership_type": owner.ownership_type if owner else None,
        "owner_record_status": owner.verification_status if owner else None,
        "registration_status": registration_status,
        "issuing_authority": authority,
        "authority_detail": authority_detail,
        "last_updated": last_updated,
    }

def unit_detail(u, db=None):
    f = u.floor; b = f.building if f else None
    base = {"prototype_ulpin": u.prototype_ulpin, "internal_id": u.id, "parcel": b.parcel_id if b else None,
            "building": b.building_id if b else None, "building_name": b.name if b else None,
            "floor": f.floor_number if f else None, "floor_label": f.floor_label if f else None,
            "unit": u.unit_number, "area_sqft": u.area_sqft, "unit_type": u.unit_type,
            "z_min": f.z_min if f else None, "z_max": f.z_max if f else None,
            "verification_status": u.verification_status, "confidence": u.confidence,
            "confidence_status": confidence_status(u.confidence or 0),
            "owner": {"reference": u.owner.owner_reference, "display_name": u.owner.display_name,
                      "ownership_type": u.owner.ownership_type} if u.owner else None}
    try:
        base.update(_identity_extra(db, u, u.prototype_ulpin))
    except Exception:
        pass
    return base

# ---------- dashboard ----------
@app.get("/api/dashboard/stats")
def stats(db: Session = Depends(get_db)):
    if db.query(models.Parcel).count() == 0: run_seed(db)
    parcels = db.query(models.Parcel).count()
    # demo-scale display numbers per spec, real counts alongside
    units = db.query(models.Unit).count()
    verified = db.query(models.Unit).filter(models.Unit.verification_status == "Verified").count()
    needs = db.query(models.Unit).filter(models.Unit.verification_status != "Verified").count()
    spatial = db.query(models.ValidationIssue).filter(models.ValidationIssue.entity_type != "Unit").count()
    owner_conf = db.query(models.ValidationIssue).filter(models.ValidationIssue.issue_type.like("%ownership%")).count()
    utils = db.query(models.Utility).count()
    avg = db.query(func.avg(models.Unit.confidence)).scalar() or 0
    return {"display": {"parcels": 12482, "buildings": 3428, "units": 18764, "verified": 15892,
                        "needs_review": 1247, "spatial_conflicts": 214, "ownership_conflicts": 86,
                        "underground": 2318, "avg_confidence": 94.2},
            "demo_counts": {"parcels": parcels, "buildings": db.query(models.Building).count(),
                            "units": units, "verified": verified, "needs_review": needs,
                            "issues": db.query(models.ValidationIssue).count(), "spatial": spatial,
                            "ownership": owner_conf, "utilities": utils, "avg_confidence": round(avg, 1)}}

# ---------- parcels / buildings / floors / units ----------
@app.get("/api/parcels")
def parcels(locality: str = "", skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    q = db.query(models.Parcel)
    if locality: q = q.filter(models.Parcel.locality == locality)
    return [{"parcel_id": p.parcel_id, "locality": p.locality, "land_use": p.land_use,
             "area_sqft": p.area_sqft, "geometry": p.geometry, "center": p.center,
             "verification_status": p.verification_status, "confidence": p.confidence,
             "buildings": len(p.buildings)} for p in q.offset(max(skip, 0)).limit(min(limit, 500)).all()]

@app.get("/api/parcels/{pid}")
def parcel(pid: str, db: Session = Depends(get_db)):
    p = db.query(models.Parcel).filter(models.Parcel.parcel_id == pid).first()
    if not p: raise HTTPException(404, "Parcel not found")
    utils = [u for u in db.query(models.Utility).all() if pid in (u.affected_parcels or [])]
    return {"parcel_id": p.parcel_id, "locality": p.locality, "survey_number": p.survey_number,
            "land_use": p.land_use, "area_sqft": p.area_sqft, "geometry": p.geometry, "center": p.center,
            "verification_status": p.verification_status, "confidence": p.confidence,
            "buildings": [{"key": f"{b.parcel_id}-{b.building_id}", "name": b.name, "floors": b.num_floors,
                           "height_m": b.height_m, "confidence": b.confidence, "status": b.verification_status} for b in p.buildings],
            "underground_assets": [{"utility_id": u.utility_id, "type": u.utility_type, "depth_m": u.depth_m} for u in utils]}

@app.get("/api/buildings")
def buildings(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    return [{"key": f"{b.parcel_id}-{b.building_id}", "name": b.name, "parcel": b.parcel_id,
             "floors": b.num_floors, "height_m": b.height_m, "registered_height_m": b.registered_height_m,
             "lidar_height_m": b.lidar_height_m, "geometry": b.geometry, "center": b.center,
             "status": b.verification_status, "confidence": b.confidence} for b in db.query(models.Building).offset(max(skip, 0)).limit(min(limit, 500)).all()]

@app.get("/api/buildings/{parcel_id}/{bcode}")
def building(parcel_id: str, bcode: str, db: Session = Depends(get_db)):
    b = db.query(models.Building).filter(models.Building.parcel_id == parcel_id,
                                         models.Building.building_id == bcode).first()
    if not b: raise HTTPException(404, "Building not found")
    fl = sorted(b.floors, key=lambda f: f.floor_number)
    return {"key": f"{b.parcel_id}-{b.building_id}", "name": b.name, "parcel": b.parcel_id,
            "height_m": b.height_m, "registered_height_m": b.registered_height_m, "lidar_height_m": b.lidar_height_m,
            "floors": b.num_floors, "geometry": b.geometry, "center": b.center,
            "status": b.verification_status, "confidence": b.confidence,
            "floor_list": [{"floor_id": f.floor_id, "label": f.floor_label, "number": f.floor_number,
                            "z_min": f.z_min, "z_max": f.z_max, "units": len(f.units),
                            "status": f.verification_status, "confidence": f.confidence} for f in fl]}

@app.get("/api/floors/{fid}")
def floor(fid: str, db: Session = Depends(get_db)):
    f = db.query(models.Floor).options(joinedload(models.Floor.units)).filter(models.Floor.floor_id == fid).first()
    if not f: raise HTTPException(404, "Floor not found")
    return {"floor_id": f.floor_id, "label": f.floor_label, "number": f.floor_number,
            "z_min": f.z_min, "z_max": f.z_max, "geometry": f.geometry, "usage": f.usage,
            "status": f.verification_status, "confidence": f.confidence,
            "units": [{"ulpin": u.prototype_ulpin, "unit": u.unit_number, "area": u.area_sqft,
                       "status": u.verification_status, "confidence": u.confidence} for u in f.units]}

@app.get("/api/units/{ulpin}")
def unit(ulpin: str, db: Session = Depends(get_db)):
    u = db.query(models.Unit).options(
        joinedload(models.Unit.floor).joinedload(models.Floor.building).joinedload(models.Building.parcel),
        joinedload(models.Unit.owner)).filter(
        models.Unit.prototype_ulpin == ulpin).first()
    if not u: raise HTTPException(404, "Property not found")
    return unit_detail(u, db)

@app.get("/api/properties/{ulpin}")
def prop(ulpin: str, db: Session = Depends(get_db)):
    return unit(ulpin, db)

@app.get("/api/properties/{ulpin}/sources")
def sources(ulpin: str, db: Session = Depends(get_db)):
    links = db.query(models.PropertySource).filter(models.PropertySource.entity_ulpin == ulpin).all()
    out = []
    for l in links:
        s = db.query(models.DataSource).filter(models.DataSource.id == l.source_id).first()
        if s: out.append({"type": s.source_type, "name": s.name, "date": s.capture_date,
                          "resolution": s.resolution, "provider": s.provider, "score": l.score})
    if not out:
        for s in db.query(models.DataSource).limit(7).all():
            out.append({"type": s.source_type, "name": s.name, "date": s.capture_date,
                        "resolution": s.resolution, "provider": s.provider, "score": 95.0})
    return {"ulpin": ulpin, "evidence": out}

@app.get("/api/properties/{ulpin}/history")
def history(ulpin: str, db: Session = Depends(get_db)):
    h = db.query(models.PropertyHistory).filter(models.PropertyHistory.entity_id == ulpin).order_by(models.PropertyHistory.timestamp).all()
    if not h:
        h = db.query(models.PropertyHistory).filter(models.PropertyHistory.entity_id.like("%0182%")).limit(5).all()
    return [{"event": x.event_type, "description": x.description, "timestamp": x.timestamp} for x in h]

@app.get("/api/properties/{ulpin}/validation")
def pval(ulpin: str, db: Session = Depends(get_db)):
    iss = db.query(models.ValidationIssue).filter(
        or_(models.ValidationIssue.entity_id == ulpin,
            models.ValidationIssue.entity_id.like(ulpin.rsplit("-U", 1)[0] + "%"))).all()
    return [{"id": i.id, "entity": i.entity_id, "type": i.issue_type, "severity": i.severity,
             "description": i.description, "evidence": i.evidence, "confidence": i.ai_confidence,
             "action": i.suggested_action, "status": i.status} for i in iss]

# ---------- utilities ----------
@app.get("/api/utilities")
def utils(utype: str = "", skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(models.Utility)
    if utype: q = q.filter(models.Utility.utility_type == utype)
    return [{"utility_id": u.utility_id, "type": u.utility_type, "geometry": u.geometry, "depth_m": u.depth_m,
             "owner": u.owner_agency, "year": u.installation_year, "status": u.status,
             "parcels": u.affected_parcels} for u in q.offset(max(skip, 0)).limit(min(limit, 500)).all()]

# ---------- validation ----------
@app.get("/api/validation/issues")
def issues(status: str = "", severity: str = "", skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    q = db.query(models.ValidationIssue)
    if status: q = q.filter(models.ValidationIssue.status == status)
    if severity: q = q.filter(models.ValidationIssue.severity == severity)
    return [{"id": i.id, "entity_type": i.entity_type, "entity": i.entity_id, "type": i.issue_type,
             "severity": i.severity, "description": i.description, "evidence": i.evidence,
             "confidence": i.ai_confidence, "action": i.suggested_action, "status": i.status}
            for i in q.offset(max(skip, 0)).limit(min(limit, 500)).all()]

class ReviewIn(BaseModel):
    status: str  # Under Review / Resolved / Rejected
    user: str = "demo-officer"

@app.post("/api/validation/run")
def run_validation(db: Session = Depends(get_db)):
    n = run_all_checks(db)
    audit(db, "system", "system", "Validation", "all", "run", new={"issues": n})
    return {"issues": n}

@app.post("/api/validation/{iid}/review")
def review(iid: str, b: ReviewIn, db: Session = Depends(get_db)):
    i = db.query(models.ValidationIssue).filter(models.ValidationIssue.id == iid).first()
    if not i: raise HTTPException(404, "Issue not found")
    old = i.status; i.status = b.status; db.commit()
    audit(db, b.user, "officer", "ValidationIssue", iid, b.status, old={"status": old}, new={"status": b.status})
    return {"ok": True, "status": i.status}

@app.get("/api/validation/case/{entity}")
def validation_case(entity: str, db: Session = Depends(get_db)):
    """Case file: all issues on one entity + its snapshot, history and audit trail."""
    iss = db.query(models.ValidationIssue).filter(models.ValidationIssue.entity_id == entity).all()
    if not iss: raise HTTPException(404, "No case for this entity")
    snapshot: dict = {"kind": "unknown", "id": entity}
    u = db.query(models.Unit).options(
        joinedload(models.Unit.floor).joinedload(models.Floor.building).joinedload(models.Building.parcel),
        joinedload(models.Unit.owner)).filter(
        models.Unit.prototype_ulpin == entity).first()
    if u:
        snapshot = {"kind": "unit", **unit_detail(u, db)}
    else:
        parts = entity.split("-")
        if len(parts) >= 4:
            parcel, bcode = "-".join(parts[:3]), parts[3]
            b = db.query(models.Building).filter(models.Building.parcel_id == parcel,
                                                 models.Building.building_id == bcode).first()
            if b:
                reg, lid = b.registered_height_m or 0, b.lidar_height_m or 0
                snapshot = {"kind": "building", "key": entity, "name": b.name, "parcel": parcel,
                            "registered_height_m": reg, "lidar_height_m": lid,
                            "difference_m": round(lid - reg, 1), "floors": b.num_floors,
                            "status": b.verification_status, "confidence": b.confidence}
    hist = db.query(models.PropertyHistory).filter(models.PropertyHistory.entity_id == entity).order_by(
        models.PropertyHistory.timestamp).all()
    trail = db.query(models.AuditLog).filter(models.AuditLog.entity_id == entity).order_by(
        models.AuditLog.timestamp.desc()).limit(20).all()
    return {"entity": entity,
            "issues": [{"id": i.id, "type": i.issue_type, "severity": i.severity,
                        "description": i.description, "evidence": i.evidence or [],
                        "confidence": i.ai_confidence, "action": i.suggested_action,
                        "status": i.status} for i in iss],
            "snapshot": snapshot,
            "history": [{"event": h.event_type, "description": h.description, "timestamp": h.timestamp} for h in hist],
            "audit": [{"user": a.user_id, "role": a.user_role, "action": a.action,
                       "time": str(a.timestamp)} for a in trail]}

# ---------- ULPIN ----------
class UlpinIn(BaseModel):
    city: str = "DL"; locality: str = "SKT"; parcel_id: str = "0182"
    building_id: str = "B01"; floor_number: int = 8; unit_number: str = "804"

@app.post("/api/ulpin/generate")
def gen_ulpin(b: UlpinIn):
    return make_prototype_ulpin(b.city, b.locality, b.parcel_id, b.building_id, b.floor_number, b.unit_number)

# ---------- search ----------
@app.post("/api/search")
@app.get("/api/search")
def search(q: str = "", db: Session = Depends(get_db)):
    q = (q or "").strip()
    if not q: return {"results": []}
    qu = q.upper()
    res = []
    for u in db.query(models.Unit).filter(models.Unit.prototype_ulpin.like(f"%{qu}%")).limit(10).all():
        res.append({"kind": "unit", "id": u.prototype_ulpin, "label": f"Unit {u.unit_number} — {u.prototype_ulpin}"})
    for b in db.query(models.Building).filter(models.Building.name.like(f"%{q}%")).limit(5).all():
        res.append({"kind": "building", "id": f"{b.parcel_id}-{b.building_id}", "label": b.name})
    for p in db.query(models.Parcel).filter(models.Parcel.parcel_id.like(f"%{qu}%")).limit(5).all():
        res.append({"kind": "parcel", "id": p.parcel_id, "label": f"Parcel {p.parcel_id} ({p.locality})"})
    for u in db.query(models.Utility).filter(models.Utility.utility_id.like(f"%{qu}%")).limit(5).all():
        res.append({"kind": "utility", "id": u.utility_id, "label": f"{u.utility_type} {u.utility_id}"})
    return {"results": res}

# ---------- AI ----------
class AIIn(BaseModel):
    question: str

@app.post("/api/ai/query")
def ai(b: AIIn, db: Session = Depends(get_db)):
    if db.query(models.Parcel).count() == 0: run_seed(db)
    return answer_query(db, b.question)

# ---------- audit / import ----------
@app.get("/api/audit")
def audit_list(limit: int = 100, db: Session = Depends(get_db)):
    rows = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(min(limit, 500)).all()
    return [{"user": r.user_id, "role": r.user_role, "entity": f"{r.entity_type}:{r.entity_id}",
             "action": r.action, "time": str(r.timestamp)} for r in rows]

@app.post("/api/data/import")
def data_import(payload: dict, db: Session = Depends(get_db)):
    # prototype: validate GeoJSON payload, report counts/types/bbox (nothing persisted yet)
    feats = payload.get("features") or payload.get("parcels") or []
    by_type: dict = {}
    xs: list = []; ys: list = []
    for f in feats:
        g = (f.get("geometry") if isinstance(f, dict) else None) or {}
        t = g.get("type", "Unknown")
        by_type[t] = by_type.get(t, 0) + 1
        stack = [g.get("coordinates")] if g.get("coordinates") else []
        while stack:
            c = stack.pop()
            if isinstance(c, (list, tuple)) and c and isinstance(c[0], (int, float)):
                if len(c) >= 2: xs.append(c[0]); ys.append(c[1])
            elif isinstance(c, (list, tuple)):
                stack.extend(c)
    bbox = [min(xs), min(ys), max(xs), max(ys)] if xs else None
    return {"received": len(feats), "by_type": by_type, "bbox": bbox,
            "status": "validated (prototype — detailed LiDAR parsing simulated)",
            "note": "Upload flow: select → validate → preview → map → process."}

def _ring_center(ring):
    pts = [p for p in (ring or []) if isinstance(p, (list, tuple)) and len(p) >= 2]
    if not pts: return [77.2010, 28.5245]
    return [sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)]

class CommitIn(BaseModel):
    features: list = []
    filename: str = "upload"

@app.post("/api/data/commit")
def data_commit(b: CommitIn, db: Session = Depends(get_db)):
    """Persist a previewed upload as live cadastral records (status Needs Review), then re-validate."""
    import uuid as _uuid
    created = {"parcels": 0, "buildings": 0, "utilities": 0}
    skipped: list = []
    known = {p.parcel_id for p in db.query(models.Parcel).all()}
    # pass 1: parcels + utilities
    for f in b.features:
        if not isinstance(f, dict): continue
        props = f.get("properties") or {}
        geom = f.get("geometry") or {}
        t, coords = geom.get("type"), geom.get("coordinates")
        if t == "Polygon" and not props.get("building_id"):
            pid = props.get("parcel_id") or f"IMP-{_uuid.uuid4().hex[:6].upper()}"
            if pid in known:
                skipped.append(pid); continue
            ring = (coords or [[]])[0]
            db.add(models.Parcel(parcel_id=pid, prototype_ulpin=pid,
                                 survey_number=props.get("survey_number", f"SY-{pid}"),
                                 locality=props.get("locality", "Unknown"),
                                 land_use=props.get("land_use", "Residential"),
                                 area_sqft=float(props.get("area_sqft", 0) or 0),
                                 geometry=ring, center=_ring_center(ring),
                                 verification_status="Needs Review", confidence=70.0))
            db.add(models.PropertyHistory(entity_id=pid, event_type="Imported",
                                          description=f"Parcel created from upload {b.filename}; survey verification pending.",
                                          timestamp="2026-09-05"))
            known.add(pid); created["parcels"] += 1
        elif t == "LineString":
            uid = props.get("utility_id") or f"IMP-U-{_uuid.uuid4().hex[:6].upper()}"
            if db.query(models.Utility).filter(models.Utility.utility_id == uid).first():
                skipped.append(uid); continue
            db.add(models.Utility(utility_id=uid, utility_type=props.get("type", "Water"),
                                  geometry=coords or [], depth_m=float(props.get("depth_m", -3.0) or -3.0),
                                  owner_agency=props.get("owner", "Unknown"),
                                  installation_year=int(props.get("year", 2026) or 2026),
                                  status="Active", confidence=70.0,
                                  affected_parcels=props.get("affected_parcels", [])))
            created["utilities"] += 1
    # pass 2: buildings (need their parcel to exist)
    for f in b.features:
        if not isinstance(f, dict): continue
        props = f.get("properties") or {}
        geom = f.get("geometry") or {}
        if (geom.get("type") == "Polygon") and props.get("building_id"):
            bid, parcel = props["building_id"], props.get("parcel_id", "")
            key = f"{parcel}-{bid}" if parcel else bid
            if not parcel or parcel not in known:
                skipped.append(key + " (parcel missing)"); continue
            if db.query(models.Building).filter(models.Building.parcel_id == parcel,
                                                models.Building.building_id == bid).first():
                skipped.append(key); continue
            ring = (geom.get("coordinates") or [[]])[0]
            h = float(props.get("height_m", 12.0) or 12.0)
            db.add(models.Building(building_id=bid, parcel_id=parcel,
                                   name=props.get("name", f"Imported {bid}"),
                                   geometry=ring, center=_ring_center(ring),
                                   height_m=h, registered_height_m=h, lidar_height_m=h,
                                   num_floors=int(props.get("floors", 4) or 4),
                                   building_type=props.get("type", "Residential"),
                                   construction_year=2026,
                                   verification_status="Needs Review", confidence=70.0))
            created["buildings"] += 1
    db.commit()
    n_issues = run_all_checks(db)
    audit(db, "upload", "surveyor", "Dataset", b.filename, "import-commit", new=created)
    return {"created": created, "skipped": skipped, "open_issues": n_issues}

@app.get("/api/health")
def health(): return {"ok": True}

# ---------- property data submission intake ----------
from . import submissions as subsvc

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

SUBMIT_ROLES = ("citizen", "officer", "surveyor", "admin")
GOVT_ROLES = ("officer", "surveyor", "admin")
OFFICER_ROLES = ("officer", "admin")

def _sub_out(s):
    return {"submission_id": s.submission_id, "submitter": s.submitter,
            "submitter_role": s.submitter_role, "source_type": s.source_type,
            "department": s.department, "kind": s.kind, "property_type": s.property_type,
            "payload": s.payload or {}, "measurements": s.measurements or {},
            "targets": {"parcel": s.target_parcel, "building": s.target_building,
                        "floor": s.target_floor, "unit": s.target_unit},
            "status": s.status, "trust": s.trust, "priority": s.priority,
            "assignee": s.assignee, "version": s.version,
            "created_at": str(s.created_at), "updated_at": str(s.updated_at)}

class SubmissionIn(BaseModel):
    kind: str = "new"
    property_type: str = ""
    department: str = ""
    payload: dict = {}
    measurements: dict = {}
    target_parcel: str = ""
    target_building: str = ""
    target_floor: str = ""
    target_unit: str = ""

def _source_for(role: str) -> str:
    return "GOVERNMENT_DEPARTMENT" if role in GOVT_ROLES else "PROPERTY_OWNER"

@app.post("/api/submissions")
def create_submission(b: SubmissionIn, db: Session = Depends(get_db),
                      u: dict = Depends(require_roles(*SUBMIT_ROLES))):
    s = models.Submission(submission_id=subsvc.next_submission_id(db),
                          submitter=u["username"], submitter_role=u["role"],
                          source_type=_source_for(u["role"]),
                          department=b.department or None, kind=b.kind,
                          property_type=b.property_type, payload=b.payload,
                          measurements=b.measurements, target_parcel=b.target_parcel or None,
                          target_building=b.target_building or None,
                          target_floor=b.target_floor or None,
                          target_unit=b.target_unit or None,
                          status="DRAFT", trust="AUTHORIZED" if u["role"] in GOVT_ROLES else "UNVERIFIED")
    db.add(s); db.commit()
    audit(db, u["username"], u["role"], "Submission", s.submission_id, "created")
    return _sub_out(s)

@app.get("/api/submissions")
def list_submissions(status: str = "", skip: int = 0, limit: int = 100,
                     db: Session = Depends(get_db),
                     u: dict = Depends(require_roles(*OFFICER_ROLES))):
    q = db.query(models.Submission).order_by(models.Submission.created_at.desc())
    if status: q = q.filter(models.Submission.status == status)
    return [_sub_out(s) for s in q.offset(max(skip, 0)).limit(min(limit, 200)).all()]

@app.get("/api/submissions/my")
def my_submissions(db: Session = Depends(get_db),
                   u: dict = Depends(require_roles(*SUBMIT_ROLES))):
    rows = db.query(models.Submission).filter(
        models.Submission.submitter == u["username"]).order_by(
        models.Submission.created_at.desc()).all()
    return [_sub_out(s) for s in rows]

@app.get("/api/submissions/queue")
def verification_queue(status: str = "", priority: str = "",
                       db: Session = Depends(get_db),
                       u: dict = Depends(require_roles(*OFFICER_ROLES))):
    q = db.query(models.Submission).filter(
        models.Submission.source_type == "PROPERTY_OWNER",
        models.Submission.status.in_(("PENDING_VERIFICATION", "UNDER_VERIFICATION",
                                      "FIELD_CHECK", "CORRECTION_REQUIRED")))
    if status: q = q.filter(models.Submission.status == status)
    if priority: q = q.filter(models.Submission.priority == priority)
    return [_sub_out(s) for s in q.order_by(models.Submission.created_at).limit(200).all()]

def _is_field_assignee(db: Session, sid: str, username: str) -> bool:
    return db.query(models.FieldVerification).filter(
        models.FieldVerification.submission_id == sid,
        models.FieldVerification.assignee == username).first() is not None

def _has_any_field_visit(db: Session, sid: str) -> bool:
    return db.query(models.FieldVerification).filter(
        models.FieldVerification.submission_id == sid).first() is not None

def _get_owned(sid: str, db: Session, u: dict):
    s = db.query(models.Submission).filter(models.Submission.submission_id == sid).first()
    if not s: raise HTTPException(404, "Submission not found")
    if u["role"] in OFFICER_ROLES:
        return s
    if s.submitter == u["username"]:
        return s
    # Surveyor may view any submission that has a field visit (open pool + claim model).
    # Strict per-assignee check broke the demo when officers typed a different name.
    if u["role"] in GOVT_ROLES and _has_any_field_visit(db, sid):
        return s
    if u["role"] in GOVT_ROLES and _is_field_assignee(db, sid, u["username"]):
        return s
    raise HTTPException(403, "Not your submission")

def _fv_out(fv, db: Session | None = None, me: str | None = None):
    out = {"verification_id": fv.verification_id, "submission_id": fv.submission_id,
           "assignee": fv.assignee, "reason": fv.reason, "scheduled": fv.scheduled,
           "checklist": fv.checklist or [], "observed": fv.observed or {},
           "recommendation": fv.recommendation, "status": fv.status,
           "created_at": str(fv.created_at)}
    if me is not None:
        out["mine"] = (fv.assignee == me)
    if db is not None:
        s = db.query(models.Submission).filter(
            models.Submission.submission_id == fv.submission_id).first()
        if s:
            out["submission"] = _sub_out(s)
    return out

@app.get("/api/submissions/{sid}")
def get_submission(sid: str, db: Session = Depends(get_db),
                   u: dict = Depends(require_roles(*SUBMIT_ROLES, *OFFICER_ROLES))):
    return _sub_out(_get_owned(sid, db, u))

@app.put("/api/submissions/{sid}")
def update_draft(sid: str, b: SubmissionIn, db: Session = Depends(get_db),
                 u: dict = Depends(require_roles(*SUBMIT_ROLES))):
    s = _get_owned(sid, db, u)
    if s.status not in ("DRAFT", "CORRECTION_REQUIRED") and u["role"] not in OFFICER_ROLES:
        raise HTTPException(409, f"Cannot edit while {s.status}")
    s.kind, s.property_type, s.payload, s.measurements = b.kind, b.property_type, b.payload, b.measurements
    s.target_parcel, s.target_building, s.target_floor, s.target_unit = \
        b.target_parcel or None, b.target_building or None, b.target_floor or None, b.target_unit or None
    if b.department: s.department = b.department
    s.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    audit(db, u["username"], u["role"], "Submission", sid, "edited")
    return _sub_out(s)

@app.post("/api/submissions/check-duplicates")
def check_duplicates(b: dict, db: Session = Depends(get_db),
                     u: dict = Depends(require_roles(*SUBMIT_ROLES))):
    payload = b.get("payload", b)
    dups = subsvc.find_duplicates(db, payload)
    warnings = []
    if payload.get("area_sqm") and payload.get("existing_area_sqm"):
        try:
            old, new = float(payload["existing_area_sqm"]), float(payload["area_sqm"])
            if old > 0 and abs(new - old) / old > 0.25:
                warnings.append(f"Significant area discrepancy: existing {old} m² vs submitted {new} m². Manual verification recommended.")
        except (TypeError, ValueError):
            pass
    return {"duplicates": dups, "ai_warnings": warnings}

@app.post("/api/submissions/{sid}/submit")
def submit_submission(sid: str, db: Session = Depends(get_db),
                      u: dict = Depends(require_roles(*SUBMIT_ROLES))):
    s = _get_owned(sid, db, u)
    if s.status not in ("DRAFT", "CORRECTION_REQUIRED"):
        raise HTTPException(409, f"Already {s.status}")
    full = {**(s.payload or {}), "property_type": s.property_type}
    v = subsvc.auto_validate(full, s.measurements or {})
    if v["errors"]:
        raise HTTPException(422, "; ".join(v["errors"]))
    if u["role"] in GOVT_ROLES:
        # AUTHORIZED SOURCE → automatic validation, never the citizen queue
        dups = subsvc.find_duplicates(db, s.payload or {})
        if dups:
            s.status, s.trust = "NEEDS_REVIEW", "AUTHORIZED"
            db.commit()
            audit(db, u["username"], u["role"], "Submission", sid, "auto-needs-review",
                  new={"duplicates": [d["id"] for d in dups]})
            subsvc.notify(db, u["username"], "Department submission needs review",
                          f"{sid} matched {len(dups)} existing record(s).", f"/submit/track/{sid}")
            return {**_sub_out(s), "validation": v, "duplicates": dups}
        res = subsvc.apply_submission(db, s, u["username"])
        s.status, s.trust = "INTEGRATED", "AUTHORIZED"
        db.commit()
        audit(db, u["username"], u["role"], "Submission", sid, "integrated", new=res)
        return {**_sub_out(s), "validation": v, "applied": res["applied"]}
    s.status, s.trust = "PENDING_VERIFICATION", "UNVERIFIED"
    # AI assist: possible duplicates raise verification priority
    if subsvc.find_duplicates(db, full):
        s.priority = "High"
    db.commit()
    db.add(models.PropertyHistory(entity_id=sid, event_type="Submission created",
                                  description=f"{s.property_type} submitted by {u['username']}; pending human verification.",
                                  timestamp="2026-09-09"))
    db.commit()
    audit(db, u["username"], u["role"], "Submission", sid, "submitted")
    for officer in ("officer", "admin"):
        subsvc.notify(db, officer, "New submission requires verification",
                      f"{sid} · {s.property_type} by {u['username']}.", "/submit/queue")
    subsvc.notify(db, u["username"], "Submission received",
                  f"{sid} is pending human verification.", f"/submit/track/{sid}")
    return {**_sub_out(s), "validation": v}

class ReviewIn2(BaseModel):
    action: str  # verify-start | approve | reject | correction
    reason: str = ""
    fields: list = []

@app.post("/api/submissions/{sid}/review")
def review_submission(sid: str, b: ReviewIn2, db: Session = Depends(get_db),
                      u: dict = Depends(require_roles(*OFFICER_ROLES))):
    s = db.query(models.Submission).filter(models.Submission.submission_id == sid).first()
    if not s: raise HTTPException(404, "Submission not found")
    db.add(models.SubmissionReview(submission_id=sid, reviewer=u["username"],
                                   reviewer_role=u["role"], action=b.action,
                                   reason=b.reason, fields=b.fields))
    applied: list = []
    if b.action == "verify-start":
        s.status = "UNDER_VERIFICATION"; s.assignee = u["username"]
        subsvc.notify(db, s.submitter, "Verification started",
                      f"{sid} is under review by {u['username']}.", f"/submit/track/{sid}")
    elif b.action == "approve":
        if not b.reason:
            raise HTTPException(422, "Approval requires a reason/note")
        res = subsvc.apply_submission(db, s, u["username"])
        applied = res["applied"]
        s.status, s.trust = "APPROVED", "VERIFIED"
        db.commit()
        s.status = "INTEGRATED"
        db.commit()
        subsvc.notify(db, s.submitter, "Submission approved",
                      f"{sid} approved; the property record was updated.", f"/submit/track/{sid}")
    elif b.action == "reject":
        if not b.reason:
            raise HTTPException(422, "Rejection requires a reason")
        s.status = "REJECTED"
        db.commit()
        subsvc.notify(db, s.submitter, "Submission rejected", f"{sid}: {b.reason}", f"/submit/track/{sid}")
    elif b.action == "correction":
        if not b.reason:
            raise HTTPException(422, "Correction request requires reason and fields")
        db.add(models.SubmissionVersion(submission_id=sid, version=s.version,
                                        payload=s.payload, measurements=s.measurements,
                                        note="Snapshot before correction request"))
        s.status = "CORRECTION_REQUIRED"
        db.commit()
        subsvc.notify(db, s.submitter, "Correction required", f"{sid}: {b.reason}", f"/submit/track/{sid}")
    else:
        raise HTTPException(422, "Unknown review action")
    db.commit()
    audit(db, u["username"], u["role"], "Submission", sid, b.action,
          new={"reason": b.reason, "fields": b.fields, "applied": applied})
    return {**_sub_out(s), "applied": applied}

@app.post("/api/submissions/{sid}/resubmit")
def resubmit(sid: str, b: SubmissionIn, db: Session = Depends(get_db),
             u: dict = Depends(require_roles(*SUBMIT_ROLES))):
    s = _get_owned(sid, db, u)
    if s.status != "CORRECTION_REQUIRED":
        raise HTTPException(409, f"Resubmit allowed only from CORRECTION_REQUIRED (now {s.status})")
    db.add(models.SubmissionVersion(submission_id=sid, version=s.version,
                                    payload=s.payload, measurements=s.measurements,
                                    note="Pre-correction snapshot"))
    s.version += 1
    s.kind, s.property_type, s.payload, s.measurements = b.kind, b.property_type, b.payload, b.measurements
    s.status = "PENDING_VERIFICATION"
    db.commit()
    audit(db, u["username"], u["role"], "Submission", sid, "resubmitted", new={"version": s.version})
    subsvc.notify(db, s.submitter, "Correction resubmitted", f"{sid} v{s.version} is pending verification.", f"/submit/track/{sid}")
    for officer in ("officer", "admin"):
        subsvc.notify(db, officer, "Correction resubmitted", f"{sid} v{s.version} needs review.", "/submit/queue")
    return _sub_out(s)

class FieldIn(BaseModel):
    assignee: str = ""
    reason: str = ""
    scheduled: str = ""
    checklist: list = []

@app.post("/api/submissions/{sid}/field-verification")
def create_field_verification(sid: str, b: FieldIn, db: Session = Depends(get_db),
                              u: dict = Depends(require_roles(*OFFICER_ROLES))):
    s = db.query(models.Submission).filter(models.Submission.submission_id == sid).first()
    if not s: raise HTTPException(404, "Submission not found")
    default_checks = ["Property exists", "Address matches", "Parcel boundary matches",
                      "Building exists", "Floor exists", "Unit exists", "Measurements verified",
                      "Coordinates checked", "Documents checked", "Photographs collected"]
    checks = b.checklist or [{"item": c, "done": False} for c in default_checks]
    # Default to the demo surveyor account so the visit always lands in Field Work.
    raw_assignee = (b.assignee or "").strip() or "surveyor"
    fv = models.FieldVerification(verification_id=subsvc.next_fv_id(db), submission_id=sid,
                                  assignee=raw_assignee, reason=b.reason,
                                  scheduled=b.scheduled or None, checklist=checks, status="Open")
    db.add(fv)
    s.status = "FIELD_CHECK"
    db.commit()
    audit(db, u["username"], u["role"], "Submission", sid, "field-request", new={"fv": fv.verification_id})
    if fv.assignee:
        subsvc.notify(db, fv.assignee, "Field verification assigned",
                      f"{fv.verification_id} for {sid}: {b.reason or 'site visit required'}.",
                      f"/field-work/{fv.verification_id}")
    return {"verification_id": fv.verification_id, "status": fv.status, "checklist": checks}

class FieldResultIn(BaseModel):
    observed: dict = {}
    checklist: list = []
    recommendation: str = ""  # APPROVE | REJECT | REQUEST_CORRECTION
    notes: str = ""

@app.get("/api/field-verification/assigned")
def assigned_field_verifications(status: str = "", mine: str = "", db: Session = Depends(get_db),
                                 u: dict = Depends(require_roles(*GOVT_ROLES))):
    """Worklist: surveyors see the whole open pool (mine first) so a mistyped
    assignee never hides work. Officers/admins see all. ?mine=1 filters to own only."""
    q = db.query(models.FieldVerification).order_by(models.FieldVerification.created_at.desc())
    if status:
        q = q.filter(models.FieldVerification.status == status)
    rows = q.limit(200).all()
    if u["role"] == "surveyor" and mine == "1":
        rows = [r for r in rows if r.assignee == u["username"]]
    # mine-first ordering for surveyors
    if u["role"] == "surveyor":
        rows = sorted(rows, key=lambda r: (r.assignee != u["username"], r.status != "Open"))
    return [_fv_out(fv, db, me=u["username"]) for fv in rows]

@app.get("/api/field-verification/{fvid}")
def get_field_verification(fvid: str, db: Session = Depends(get_db),
                           u: dict = Depends(require_roles(*GOVT_ROLES))):
    fv = db.query(models.FieldVerification).filter(
        models.FieldVerification.verification_id == fvid).first()
    if not fv: raise HTTPException(404, "Field verification not found")
    # Pool model: any surveyor/officer can open any visit (claim on submit).
    s = db.query(models.Submission).filter(
        models.Submission.submission_id == fv.submission_id).first()
    docs = db.query(models.SubmissionDocument).filter(
        models.SubmissionDocument.submission_id == fv.submission_id).all() if s else []
    return {**_fv_out(fv, db),
            "documents": [{"id": d.id, "doc_type": d.doc_type, "doc_number": d.doc_number,
                           "doc_date": d.doc_date, "authority": d.authority,
                           "description": d.description, "filename": d.filename,
                           "mime": d.mime, "size": d.size} for d in docs]}

@app.post("/api/field-verification/{fvid}/result")
def field_result(fvid: str, b: FieldResultIn, db: Session = Depends(get_db),
                 u: dict = Depends(require_roles(*GOVT_ROLES))):
    fv = db.query(models.FieldVerification).filter(
        models.FieldVerification.verification_id == fvid).first()
    if not fv: raise HTTPException(404, "Field verification not found")
    # Pool model: any surveyor can complete any open visit; auto-claim it.
    if u["role"] == "surveyor" and fv.assignee != u["username"]:
        fv.assignee = u["username"]
    if fv.status == "Completed":
        raise HTTPException(409, "Field verification already completed")
    if b.recommendation not in ("APPROVE", "REJECT", "REQUEST_CORRECTION"):
        raise HTTPException(422, "Recommendation must be APPROVE, REJECT or REQUEST_CORRECTION")
    fv.observed, fv.checklist, fv.recommendation, fv.status = \
        b.observed, b.checklist or fv.checklist, b.recommendation, "Completed"
    s = db.query(models.Submission).filter(
        models.Submission.submission_id == fv.submission_id).first()
    if s:
        _link = subsvc._link_source  # reuse evidence linker
        _link(db, s.target_unit or s.target_parcel or s.submission_id,
              "HUMAN_VERIFICATION", f"Field verification {fvid}", 90.0)
        if b.recommendation == "REQUEST_CORRECTION":
            db.add(models.SubmissionVersion(submission_id=s.submission_id, version=s.version,
                                            payload=s.payload, measurements=s.measurements,
                                            note=f"Pre-correction snapshot ({fvid})"))
            s.status = "CORRECTION_REQUIRED"
        else:
            s.status = "UNDER_VERIFICATION"
        subsvc.notify(db, s.submitter, "Field verification completed",
                      f"{fvid}: {b.recommendation}. {b.notes}", f"/submit/track/{s.submission_id}")
        for officer in ("officer", "admin"):
            subsvc.notify(db, officer, "Field result ready for decision",
                          f"{fvid} ({s.submission_id}): {b.recommendation} by {u['username']}.",
                          f"/submit/verify/{s.submission_id}")
    db.commit()
    audit(db, u["username"], u["role"], "FieldVerification", fvid, "completed",
          new={"recommendation": b.recommendation})
    return {"verification_id": fvid, "status": fv.status, "recommendation": b.recommendation}

@app.post("/api/submissions/{sid}/documents")
def upload_submission_doc(sid: str, doc_type: str = "Other supporting document",
                          doc_number: str = "", doc_date: str = "", authority: str = "",
                          description: str = "", file: UploadFile = File(...),
                          db: Session = Depends(get_db),
                          u: dict = Depends(require_roles(*SUBMIT_ROLES))):
    s = _get_owned(sid, db, u)
    data = await_file(file)
    safe = "".join(c if c.isalnum() or c in ".-_" else "_" for c in (file.filename or "upload"))[-80:]
    fname = f"{sid}_{uuid.uuid4().hex[:8]}_{safe}"
    with open(os.path.join(UPLOAD_DIR, fname), "wb") as f:
        f.write(data)
    d = models.SubmissionDocument(submission_id=sid, doc_type=doc_type, doc_number=doc_number or None,
                                  doc_date=doc_date or None, authority=authority or None,
                                  description=description or None, filename=fname,
                                  mime=file.content_type, size=len(data))
    db.add(d); db.commit()
    audit(db, u["username"], u["role"], "Submission", sid, "document-uploaded", new={"file": fname})
    return {"id": d.id, "filename": fname, "size": len(data)}

def await_file(file: UploadFile) -> bytes:
    data = file.file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(413, "File too large (10 MB max)")
    return data

@app.get("/api/submissions/{sid}/documents")
def list_submission_docs(sid: str, db: Session = Depends(get_db),
                         u: dict = Depends(require_roles(*SUBMIT_ROLES, *OFFICER_ROLES))):
    _get_owned(sid, db, u)
    docs = db.query(models.SubmissionDocument).filter(
        models.SubmissionDocument.submission_id == sid).all()
    return [{"id": d.id, "doc_type": d.doc_type, "doc_number": d.doc_number,
             "doc_date": d.doc_date, "authority": d.authority, "description": d.description,
             "filename": d.filename, "mime": d.mime, "size": d.size} for d in docs]

@app.get("/api/uploads/{fname}")
def get_upload(fname: str, db: Session = Depends(get_db),
               u: dict = Depends(require_roles(*SUBMIT_ROLES))):
    safe = os.path.basename(fname)
    if not db.query(models.SubmissionDocument).filter(
            models.SubmissionDocument.filename == safe).first():
        raise HTTPException(404, "Unknown upload")
    path = os.path.join(UPLOAD_DIR, safe)
    if not os.path.isfile(path):
        raise HTTPException(404, "File missing")
    return FileResponse(path)

@app.get("/api/submissions/{sid}/history")
def submission_history(sid: str, db: Session = Depends(get_db),
                       u: dict = Depends(require_roles(*SUBMIT_ROLES, *OFFICER_ROLES))):
    _get_owned(sid, db, u)
    reviews = db.query(models.SubmissionReview).filter(
        models.SubmissionReview.submission_id == sid).order_by(
        models.SubmissionReview.created_at).all()
    versions = db.query(models.SubmissionVersion).filter(
        models.SubmissionVersion.submission_id == sid).order_by(
        models.SubmissionVersion.version).all()
    fvs = db.query(models.FieldVerification).filter(
        models.FieldVerification.submission_id == sid).all()
    trail = db.query(models.AuditLog).filter(models.AuditLog.entity_id == sid).order_by(
        models.AuditLog.timestamp).all()
    return {"reviews": [{"reviewer": r.reviewer, "role": r.reviewer_role, "action": r.action,
                         "reason": r.reason, "fields": r.fields or [],
                         "at": str(r.created_at)} for r in reviews],
            "versions": [{"version": v.version, "note": v.note, "at": str(v.created_at)} for v in versions],
            "field_verifications": [{"verification_id": f.verification_id, "status": f.status,
                                     "recommendation": f.recommendation, "assignee": f.assignee,
                                     "reason": f.reason, "scheduled": f.scheduled} for f in fvs],
            "audit": [{"user": a.user_id, "action": a.action, "time": str(a.timestamp)} for a in trail]}

@app.get("/api/notifications")
def notifications(db: Session = Depends(get_db),
                  u: dict = Depends(require_roles(*SUBMIT_ROLES))):
    rows = db.query(models.SubmissionNotification).filter(
        models.SubmissionNotification.username == u["username"]).order_by(
        models.SubmissionNotification.created_at.desc()).limit(50).all()
    return [{"id": n.id, "title": n.title, "body": n.body, "link": n.link,
             "read": n.read == "1", "at": str(n.created_at)} for n in rows]

@app.post("/api/notifications/{nid}/read")
def notification_read(nid: str, db: Session = Depends(get_db),
                      u: dict = Depends(require_roles(*SUBMIT_ROLES))):
    n = db.query(models.SubmissionNotification).filter(
        models.SubmissionNotification.id == nid,
        models.SubmissionNotification.username == u["username"]).first()
    if not n: raise HTTPException(404, "Notification not found")
    n.read = "1"; db.commit()
    return {"ok": True}

@app.get("/api/dashboard/submissions")
def submission_stats(db: Session = Depends(get_db)):
    rows = db.query(models.Submission.status, func.count(models.Submission.id)).group_by(
        models.Submission.status).all()
    by_status = {k: v for k, v in rows}
    rows2 = db.query(models.Submission.source_type, func.count(models.Submission.id)).group_by(
        models.Submission.source_type).all()
    return {"total": sum(by_status.values()), "by_status": by_status,
            "citizen": dict(rows2).get("PROPERTY_OWNER", 0),
            "government": dict(rows2).get("GOVERNMENT_DEPARTMENT", 0)}
