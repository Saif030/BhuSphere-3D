"""BhuSphere 3D — FastAPI backend. Run: uvicorn app.main:app --reload (from backend/)."""
import os, json
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException, Query
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
         "public": {"password": "demo123", "role": "public"}}

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
def unit_detail(u):
    f = u.floor; b = f.building if f else None
    return {"prototype_ulpin": u.prototype_ulpin, "internal_id": u.id, "parcel": b.parcel_id if b else None,
            "building": b.building_id if b else None, "building_name": b.name if b else None,
            "floor": f.floor_number if f else None, "floor_label": f.floor_label if f else None,
            "unit": u.unit_number, "area_sqft": u.area_sqft, "unit_type": u.unit_type,
            "z_min": f.z_min if f else None, "z_max": f.z_max if f else None,
            "verification_status": u.verification_status, "confidence": u.confidence,
            "confidence_status": confidence_status(u.confidence or 0),
            "owner": {"reference": u.owner.owner_reference, "display_name": u.owner.display_name,
                      "ownership_type": u.owner.ownership_type} if u.owner else None}

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
    u = db.query(models.Unit).options(joinedload(models.Unit.floor), joinedload(models.Unit.owner)).filter(
        models.Unit.prototype_ulpin == ulpin).first()
    if not u: raise HTTPException(404, "Property not found")
    return unit_detail(u)

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
    # prototype: accept GeoJSON parcels, validate + preview count
    feats = payload.get("features") or payload.get("parcels") or []
    return {"received": len(feats), "status": "validated (prototype — detailed LiDAR parsing simulated)",
            "note": "Upload flow: select → validate → preview → map → process."}

@app.get("/api/health")
def health(): return {"ok": True}
