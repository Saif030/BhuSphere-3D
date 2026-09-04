"""Prototype 3D ULPIN / cadastral reference engine.
PROTOTYPE ONLY — not an official Government of India ULPIN."""
import hashlib, uuid

def floor_label(n: int) -> str:
    if n == 0: return "G"
    if n < 0: return f"B{abs(n)}"
    return f"F{n:02d}"

def make_prototype_ulpin(city="DL", locality="SKT", parcel="0182", building="B01",
                         floor_number=8, unit="804") -> dict:
    fl = floor_label(floor_number)
    # unit part: U + unit number
    proto = f"{city}-{locality}-{parcel}-{building}-{fl}-U{unit}"
    internal = str(uuid.uuid4())
    ghash = hashlib.sha256(proto.encode()).hexdigest()[:12]
    return {
        "internal_id": internal,
        "prototype_3d_ulpin": proto,
        "parent_parcel": f"{city}-{locality}-{parcel}",
        "building": building, "floor": floor_number, "floor_label": fl,
        "unit": str(unit), "geometry_hash": ghash,
        "disclaimer": "Prototype 3D cadastral reference — NOT an official Government of India ULPIN."
    }

def confidence_status(c: float) -> str:
    if c >= 95: return "VERIFIED"
    if c >= 80: return "HIGH CONFIDENCE"
    if c >= 60: return "NEEDS REVIEW"
    return "LOW CONFIDENCE"
