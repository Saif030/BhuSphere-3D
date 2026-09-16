"""Property Data Submission intake services.
Intake-only helpers: submissions feed existing cadastral tables via apply_submission().
No second ULPIN engine / validator / map lives here — all reused."""
import uuid
from sqlalchemy.orm import Session
from . import models

SQFT_PER_SQM = 10.7639


def _max_suffix(db: Session, model, col: str, prefix: str) -> int:
    best = 0
    for (v,) in db.query(getattr(model, col)).filter(getattr(model, col).like(f"{prefix}%")).all():
        try:
            best = max(best, int(str(v).rsplit("-", 1)[-1]))
        except (ValueError, IndexError):
            continue
    return best


def next_submission_id(db: Session) -> str:
    return f"SUB-2026-{_max_suffix(db, models.Submission, 'submission_id', 'SUB-2026-') + 1:06d}"


def next_fv_id(db: Session) -> str:
    return f"FV-2026-{_max_suffix(db, models.FieldVerification, 'verification_id', 'FV-2026-') + 1:04d}"


def notify(db: Session, username: str, title: str, body: str = "", link: str = ""):
    db.add(models.SubmissionNotification(username=username, title=title, body=body, link=link))
    db.commit()


def auto_validate(payload: dict, measurements: dict) -> dict:
    """Technical/system validation (runs for BOTH citizen and government).
    Returns {"errors": [...], "warnings": [...]}. Errors block submission/integration."""
    errors, warnings = [], []
    p = payload or {}
    if not p.get("property_type"):
        errors.append("Property type is required.")
    if not (p.get("parcel_id") or p.get("existing_ulpin") or p.get("unit_number")):
        errors.append("At least one identifier is required (parcel, ULPIN/reference or unit).")
    lat, lng = p.get("latitude"), p.get("longitude")
    if lat is not None or lng is not None:
        try:
            latf, lngf = float(lat), float(lng)
            if not (-90 <= latf <= 90 and -180 <= lngf <= 180):
                errors.append("Coordinates out of range.")
        except (TypeError, ValueError):
            errors.append("Coordinates must be numeric.")
    for key, m in (measurements or {}).items():
        try:
            v = float((m or {}).get("sqm", 0))
            if v < 0:
                errors.append(f"Measurement '{key}' cannot be negative.")
            elif v == 0:
                warnings.append(f"Measurement '{key}' is zero.")
        except (TypeError, ValueError):
            errors.append(f"Measurement '{key}' must be numeric.")
    zmin, zmax = p.get("z_min"), p.get("z_max")
    if zmin is not None and zmax is not None:
        try:
            if float(zmax) <= float(zmin):
                errors.append("Z-Max must be greater than Z-Min.")
            if float(zmax) - float(zmin) > 12:
                warnings.append("Vertical extent exceeds 12 m — confirm floor height.")
        except (TypeError, ValueError):
            errors.append("Z-Min/Z-Max must be numeric.")
    try:
        if p.get("building_height_m") is not None and float(p["building_height_m"]) <= 0:
            errors.append("Building height must be positive.")
    except (TypeError, ValueError):
        errors.append("Building height must be numeric.")
    if p.get("floor_number") is not None:
        try:
            int(p["floor_number"])
        except (TypeError, ValueError):
            errors.append("Floor number must be an integer.")
    return {"errors": errors, "warnings": warnings}


def find_duplicates(db: Session, payload: dict) -> list:
    """Possible existing matches. Never auto-merges — caller decides."""
    p = payload or {}
    out = []
    if p.get("existing_ulpin"):
        u = db.query(models.Unit).filter(
            models.Unit.prototype_ulpin == p["existing_ulpin"]).first()
        if u:
            out.append({"kind": "unit", "id": u.prototype_ulpin,
                        "label": f"Unit {u.unit_number} — {u.prototype_ulpin}"})
    if p.get("parcel_id"):
        pc = db.query(models.Parcel).filter(models.Parcel.parcel_id == p["parcel_id"]).first()
        if pc:
            out.append({"kind": "parcel", "id": pc.parcel_id,
                        "label": f"Parcel {pc.parcel_id} ({pc.locality})"})
    if p.get("survey_number"):
        for pc in db.query(models.Parcel).filter(
                models.Parcel.survey_number == p["survey_number"]).limit(3).all():
            out.append({"kind": "parcel", "id": pc.parcel_id,
                        "label": f"Parcel {pc.parcel_id} via survey {p['survey_number']}"})
    if p.get("unit_number") and p.get("floor_id"):
        u = db.query(models.Unit).join(models.Floor, models.Unit.floor_key == models.Floor.id).filter(
            models.Unit.unit_number == p["unit_number"],
            models.Floor.floor_id == p["floor_id"]).first()
        if u:
            out.append({"kind": "unit", "id": u.prototype_ulpin,
                        "label": f"Unit {u.unit_number} on {p['floor_id']}"})
    # coordinate proximity against parcel centers (~50 m box)
    try:
        if p.get("latitude") is not None and p.get("longitude") is not None:
            latf, lngf = float(p["latitude"]), float(p["longitude"])
            seen = {m["id"] for m in out}
            for pc in db.query(models.Parcel).limit(500).all():
                c = pc.center or []
                if len(c) == 2 and abs(c[0] - lngf) < 0.0005 and abs(c[1] - latf) < 0.0005 \
                        and pc.parcel_id not in seen:
                    out.append({"kind": "parcel", "id": pc.parcel_id,
                                "label": f"Parcel {pc.parcel_id} near submitted coordinates"})
                    seen.add(pc.parcel_id)
    except (TypeError, ValueError):
        pass
    return out[:10]


def _source(db: Session, source_type: str, name: str) -> models.DataSource:
    s = db.query(models.DataSource).filter(models.DataSource.source_type == source_type).first()
    if not s:
        s = models.DataSource(source_type=source_type, name=name, capture_date="2026-09-09",
                              resolution="Submission", provider="Intake", quality="Pending")
        db.add(s)
        db.flush()
    return s


def _link_source(db: Session, entity_ulpin: str, source_type: str, name: str, score: float):
    s = _source(db, source_type, name)
    exists = db.query(models.PropertySource).filter(
        models.PropertySource.entity_ulpin == entity_ulpin,
        models.PropertySource.source_id == s.id).first()
    if not exists:
        db.add(models.PropertySource(entity_ulpin=entity_ulpin, source_id=s.id, score=score))


def _hist(db: Session, entity_id: str, event: str, desc: str):
    db.add(models.PropertyHistory(entity_id=entity_id, event_type=event,
                                  description=desc, timestamp="2026-09-09"))


def apply_submission(db: Session, sub: models.Submission, reviewer: str) -> dict:
    """Apply an APPROVED (citizen) or AUTHORIZED (government) submission to live records.
    Whitelisted fields only. Returns {"applied": [...], "target": ...}."""
    from .ulpin import make_prototype_ulpin  # local import: reuse existing ULPIN engine
    p = sub.payload or {}
    m = sub.measurements or {}
    applied: list = []
    govt = sub.source_type == "GOVERNMENT_DEPARTMENT"

    def sqm(key: str):
        try:
            return float((m.get(key) or {}).get("sqm", 0) or 0)
        except (TypeError, ValueError):
            return 0.0

    target = sub.target_unit or sub.target_floor or sub.target_building or sub.target_parcel or ""

    # --- parcel-level updates ---
    parcel = None
    if sub.target_parcel:
        parcel = db.query(models.Parcel).filter(
            models.Parcel.parcel_id == sub.target_parcel).first()
        if parcel:
            if sqm("plot_area"):
                parcel.area_sqft = round(sqm("plot_area") * SQFT_PER_SQM, 2)
                applied.append(f"parcel area → {parcel.area_sqft} sq.ft")
            if p.get("land_use"):
                parcel.land_use = p["land_use"]
                applied.append(f"land use → {p['land_use']}")

    # --- building-level updates ---
    building = None
    if sub.target_building and "-" in sub.target_building:
        pp = sub.target_building.split("-")
        bcode, parcel_id = pp[-1], "-".join(pp[:-1])
        building = db.query(models.Building).filter(
            models.Building.parcel_id == parcel_id,
            models.Building.building_id == bcode).first()
        if building:
            if p.get("building_height_m"):
                try:
                    h = float(p["building_height_m"])
                except (TypeError, ValueError):
                    raise ValueError(f"Invalid building_height_m: {p['building_height_m']!r}")
                building.registered_height_m = h
                building.height_m = h
                applied.append(f"building height → {p['building_height_m']} m")
            if p.get("num_floors"):
                try:
                    n = int(p["num_floors"])
                except (TypeError, ValueError):
                    raise ValueError(f"Invalid num_floors: {p['num_floors']!r}")
                building.num_floors = n
                applied.append(f"floors → {p['num_floors']}")

    # --- floor + unit updates ---
    unit = None
    if sub.target_unit:
        unit = db.query(models.Unit).filter(
            models.Unit.prototype_ulpin == sub.target_unit).first()
        if unit:
            if sqm("carpet_area") or sqm("unit_area"):
                unit.area_sqft = round((sqm("carpet_area") or sqm("unit_area")) * SQFT_PER_SQM, 2)
                applied.append(f"unit area → {unit.area_sqft} sq.ft")
            fl = unit.floor
            if fl and p.get("z_min") is not None and p.get("z_max") is not None:
                try:
                    fl.z_min, fl.z_max = float(p["z_min"]), float(p["z_max"])
                except (TypeError, ValueError):
                    raise ValueError(f"Invalid z_min/z_max: {p['z_min']!r}/{p['z_max']!r}")
                applied.append(f"vertical range → {p['z_min']}–{p['z_max']} m")
            # ownership claim becomes a real link only after human/government approval (this point)
            if p.get("owner_name"):
                owner = db.query(models.Owner).filter(
                    models.Owner.owner_reference == (p.get("owner_reference") or "")).first() \
                    if p.get("owner_reference") else None
                if not owner:
                    owner = models.Owner(
                        owner_reference=p.get("owner_reference") or f"OWN-{uuid.uuid4().hex[:6].upper()}",
                        display_name=p["owner_name"] + (" (Verified)" if govt else " (Owner-claimed, verified)"),
                        ownership_type=p.get("ownership_type", "Freehold"),
                        verification_status="Verified")
                    db.add(owner)
                    db.flush()
                unit.owner_id = owner.id
                if not db.query(models.Right).filter(
                        models.Right.spatial_unit_id == unit.prototype_ulpin,
                        models.Right.owner_id == owner.id).first():
                    db.add(models.Right(spatial_unit_id=unit.prototype_ulpin,
                                        owner_id=owner.id,
                                        right_type=p.get("right_type", "Ownership")))
                applied.append(f"ownership → {owner.display_name}")

    # --- evidence: submission becomes another source entry, never a replacement ---
    if target:
        if govt:
            _link_source(db, target, "GOVERNMENT_DEPARTMENT",
                         f"Dept submission {sub.submission_id}", 95.0)
        else:
            _link_source(db, target, "PROPERTY_OWNER",
                         f"Owner submission {sub.submission_id}", 82.0)
            _link_source(db, target, "HUMAN_VERIFICATION",
                         f"Verified by {reviewer} via {sub.submission_id}", 93.0)
        applied.append("evidence sources appended")

    # --- confidence: nudge within existing bands (documented prototype rule) ---
    for ent in [x for x in (parcel, building, unit) if x is not None]:
        floor = 93.0 if govt else 88.0
        cap = 98.0 if govt else 97.0
        ent.confidence = round(min(cap, max(ent.confidence or 0, floor)), 1)
        if (ent.confidence or 0) >= 95:
            ent.verification_status = "Verified"
    if target:
        applied.append("confidence recomputed")

    # --- ULPIN/reference for brand-new unit claims via existing engine ---
    if sub.kind == "new" and not sub.target_unit and p.get("parcel_id") and p.get("building_id") \
            and p.get("floor_number") is not None and p.get("unit_number"):
        gen = make_prototype_ulpin("DL",
                                   (p.get("locality_code") or "GEN"),
                                   p["parcel_id"].split("-")[-1] if "-" in p["parcel_id"] else p["parcel_id"],
                                   p["building_id"], int(p["floor_number"]), p["unit_number"])
        sub.target_unit = gen["prototype_3d_ulpin"]
        applied.append(f"prototype reference issued → {gen['prototype_3d_ulpin']}")

    if target:
        _hist(db, target, "Submission approved",
              f"{sub.submission_id} approved by {reviewer}; record updated.")
    db.commit()
    return {"applied": applied, "target": target or sub.target_unit}
