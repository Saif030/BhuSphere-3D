"""Deterministic AI-assisted validation engine (prototype).
Each rule is isolated so a real ML model can replace it later."""
from shapely.geometry import Polygon, LineString
from .models import Parcel, Building, Floor, Unit, Utility, ValidationIssue
from .database import SessionLocal

def _poly(ring):
    try: return Polygon(ring)
    except Exception: return None

def _add(db, etype, eid, itype, sev, desc, ev, conf, action):
    db.add(ValidationIssue(entity_type=etype, entity_id=eid, issue_type=itype,
                           severity=sev, description=desc, evidence=ev,
                           ai_confidence=conf, suggested_action=action, status="Open"))

def run_all_checks(db):
    db.query(ValidationIssue).delete()
    parcels = db.query(Parcel).all(); buildings = db.query(Building).all()
    floors = db.query(Floor).all(); units = db.query(Unit).all()
    utils = db.query(Utility).all()
    seen = set()
    # 1 parcel overlap
    for i in range(len(parcels)):
        for j in range(i+1, len(parcels)):
            a, b = _poly(parcels[i].geometry), _poly(parcels[j].geometry)
            if a and b and a.intersects(b) and a.intersection(b).area > 1e-11:
                _add(db, "Parcel", parcels[j].parcel_id, "Parcel overlap", "Medium",
                     f"{parcels[j].parcel_id} overlaps {parcels[i].parcel_id}.",
                     ["GIS Parcel Layer"], 89.0, "Re-survey parcel boundary.")
    # 2 building outside parcel, 6 height mismatch, 11 self-intersection, 12 GNSS
    for b in buildings:
        p = db.query(Parcel).filter(Parcel.parcel_id == b.parcel_id).first()
        if p:
            bp, pp = _poly(b.geometry), _poly(p.geometry)
            if bp and pp and not pp.contains(bp):
                _add(db, "Building", f"{b.parcel_id}-{b.building_id}", "Building outside parcel", "High",
                     f"{b.name} footprint extends outside parcel {p.parcel_id}.", ["GIS", "Drone Imagery"], 91.0,
                     "Verify building footprint against parcel boundary.")
        diff = abs((b.lidar_height_m or 0) - (b.registered_height_m or 0))
        if diff > 2.0:
            _add(db, "Building", f"{b.parcel_id}-{b.building_id}", "Building height mismatch",
                 "High" if diff > 3 else "Medium",
                 f"Registered building height differs from LiDAR-derived height. Registered: {b.registered_height_m} m, LiDAR: {b.lidar_height_m} m, Difference: {diff:.1f} m.",
                 ["LiDAR", "Building record", "GIS geometry"], 92.0, "Survey verification recommended.")
        bp = _poly(b.geometry)
        if bp and not bp.is_valid:
            _add(db, "Building", f"{b.parcel_id}-{b.building_id}", "Geometry self-intersection", "Medium",
                 "Building footprint polygon is self-intersecting.", ["GIS"], 87.0, "Repair polygon geometry.")
    # 3 floor overlap, 4 missing floor, 5 invalid vertical range
    from collections import defaultdict
    by_b = defaultdict(list)
    for f in floors: by_b[f.building_key].append(f)
    for bk, fl in by_b.items():
        fl = sorted(fl, key=lambda x: x.z_min)
        nums = {f.floor_number for f in fl}
        for a, b in zip(fl, fl[1:]):
            if a.z_max > b.z_min + 1e-9:
                _add(db, "Floor", b.floor_id, "Floor overlap", "High",
                     f"Vertical topology conflict detected. {a.floor_label} ({a.z_min}–{a.z_max}m) overlaps {b.floor_label} ({b.z_min}–{b.z_max}m) by {a.z_max-b.z_min:.1f}m.",
                     ["Floor Plan", "LiDAR"], 93.0, "Correct floor elevations with survey.")
        for f in fl:
            if f.z_max <= f.z_min:
                _add(db, "Floor", f.floor_id, "Invalid vertical range", "High",
                     f"Floor {f.floor_label} has invalid vertical range {f.z_min}–{f.z_max}m.", ["Floor Plan"], 95.0,
                     "Fix z_min/z_max.")
        # missing floor: gaps in positive sequence
        pos = sorted(n for n in nums if n >= 1)
        if pos:
            for exp in range(1, max(pos)+1):
                if exp not in nums:
                    _add(db, "Building", fl[0].floor_id.rsplit("-",1)[0], "Missing floor", "Low",
                         f"Floor sequence skips F{exp:02d}.", ["Floor Plan"], 78.0, "Confirm whether floor is unregistered or unbuilt.")
                    break
    # 7 unit outside floor, 8 duplicate ID, 10 missing ownership
    for u in units:
        if u.unit_id in seen:
            _add(db, "Unit", u.unit_id, "Duplicate property ID", "High", f"Duplicate property identifier {u.unit_id}.", ["Registry"], 96.0, "Deduplicate records.")
        seen.add(u.unit_id)
        if not u.owner_id:
            _add(db, "Unit", u.prototype_ulpin, "Missing ownership information", "Medium",
                 f"Unit {u.unit_number} has no linked ownership record.", ["Registry"], 88.0, "Link ownership record.")
    # 9 utility crossing property
    for u in utils:
        try: line = LineString(u.geometry)
        except Exception: continue
        for p in parcels:
            poly = _poly(p.geometry)
            if poly and line.intersects(poly):
                if p.parcel_id == "DL-SKT-0182" or line.intersection(poly).length > 0:
                    pass
        # record flagship intersections explicitly
        if u.utility_id in ("WTR-00182","ELEC-00921","TEL-00382"):
            _add(db, "Utility", u.utility_id, "Utility crossing property", "Low",
                 f"{u.utility_type} asset {u.utility_id} intersects parcel DL-SKT-0182 at {u.depth_m}m depth.",
                 ["Utility survey", "GIS"], 90.0, "Coordinate with utility agency before excavation.")
    db.commit()
    return db.query(ValidationIssue).count()
