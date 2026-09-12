"""Backend smoke tests: run from backend/ with: python -m pytest tests/ -q"""
from fastapi.testclient import TestClient
from app.main import app
c = TestClient(app)

def test_health(): assert c.get("/api/health").json()["ok"] is True
def test_auth(): assert "token" in c.post("/api/auth/login", json={"username": "officer", "password": "demo123"}).json()
def test_chain():
    assert c.get("/api/parcels/DL-SKT-0182").status_code == 200
    assert c.get("/api/buildings/DL-SKT-0182/B01").status_code == 200
    u = c.get("/api/units/DL-SKT-0182-B01-F08-U804").json()
    assert u["prototype_ulpin"] == "DL-SKT-0182-B01-F08-U804" and u["confidence"] == 96.4
def test_ai(): assert c.post("/api/ai/query", json={"question": "Show buildings with height mismatch greater than 2m"}).json()["count"] >= 1
def test_ulpin():
    r = c.post("/api/ulpin/generate", json={}).json()
    assert r["prototype_3d_ulpin"] == "DL-SKT-0182-B01-F08-U804" and "disclaimer" in r
def test_validation_run_and_review():
    n = c.post("/api/validation/run").json()["issues"]
    assert n >= 1
    first = c.get("/api/validation/issues?limit=1").json()[0]
    r = c.post(f"/api/validation/{first['id']}/review", json={"status": "Under Review"}).json()
    assert r["status"] == "Under Review"
    assert len(c.get("/api/audit?limit=5").json()) >= 1
def test_pagination():
    assert len(c.get("/api/buildings?limit=5").json()) == 5
    assert len(c.get("/api/validation/issues?severity=High&limit=3").json()) <= 3
def test_ai_fallback():
    r = c.post("/api/ai/query", json={"question": "hello, what can you do?"}).json()
    assert r["count"] == 0 and "height mismatch" in r["answer"]
def _token(u):
    return c.post("/api/auth/login", json={"username": u, "password": "demo123"}).json()["token"]
def _h(u):
    return {"Authorization": f"Bearer {_token(u)}"}
def _wipe_submission(sid):
    from app.database import SessionLocal
    from app import models
    db = SessionLocal()
    for m, col in [(models.SubmissionReview, "submission_id"), (models.SubmissionVersion, "submission_id"),
                   (models.FieldVerification, "submission_id")]:
        db.query(m).filter(getattr(m, col) == sid).delete()
    db.query(models.SubmissionNotification).filter(
        models.SubmissionNotification.link.like(f"%{sid}%")).delete()
    db.query(models.Submission).filter(models.Submission.submission_id == sid).delete()
    db.commit(); db.close()
def test_submission_citizen_approve_flow():
    h, ho = _h("citizen"), _h("officer")
    # pick a non-flagship unit to update
    res = c.get("/api/search?q=DL-SKT-0182-B01-F01").json()["results"]
    ulpin = [r["id"] for r in res if r["kind"] == "unit"][0]
    old_area = c.get(f"/api/units/{ulpin}").json()["area_sqft"]
    r = c.post("/api/submissions", json={"kind": "update", "property_type": "Apartment / Flat",
        "payload": {"parcel_id": "DL-SKT-0182", "unit_number": "101"},
        "measurements": {"carpet_area": {"value": 120, "unit": "sqm", "sqm": 120}},
        "target_unit": ulpin}, headers=h).json()
    sid = r["submission_id"]
    assert sid.startswith("SUB-2026-") and r["status"] == "DRAFT" and r["trust"] == "UNVERIFIED"
    assert any(x["submission_id"] == sid for x in c.get("/api/submissions/my", headers=h).json())
    assert c.post(f"/api/submissions/{sid}/submit", headers=h).json()["status"] == "PENDING_VERIFICATION"
    assert c.post(f"/api/submissions/{sid}/review", json={"action": "approve", "reason": "x"}, headers=h).status_code == 403
    assert c.get("/api/submissions/my").status_code == 401
    assert any(x["submission_id"] == sid for x in c.get("/api/submissions/queue", headers=ho).json())
    # correction loop → version 2
    assert c.post(f"/api/submissions/{sid}/review", json={"action": "correction", "reason": "Recheck area", "fields": ["carpet_area"]}, headers=ho).json()["status"] == "CORRECTION_REQUIRED"
    r = c.post(f"/api/submissions/{sid}/resubmit", json={"kind": "update", "property_type": "Apartment / Flat",
        "payload": {"parcel_id": "DL-SKT-0182", "unit_number": "101"},
        "measurements": {"carpet_area": {"value": 120, "unit": "sqm", "sqm": 120}},
        "target_unit": ulpin}, headers=h).json()
    assert r["status"] == "PENDING_VERIFICATION" and r["version"] == 2
    # approve → live record updated + evidence + history + audit + notify
    r = c.post(f"/api/submissions/{sid}/review", json={"action": "approve", "reason": "Verified on site"}, headers=ho).json()
    assert r["status"] == "INTEGRATED" and len(r["applied"]) >= 2
    assert abs(c.get(f"/api/units/{ulpin}").json()["area_sqft"] - round(120 * 10.7639, 2)) < 0.01
    assert len(c.get(f"/api/submissions/{sid}/history", headers=ho).json()["reviews"]) >= 2
    assert any("approved" in n["title"].lower() for n in c.get("/api/notifications", headers=h).json())
    # restore demo data + clean up
    from app.database import SessionLocal
    from app import models
    db = SessionLocal()
    db.query(models.Unit).filter(models.Unit.prototype_ulpin == ulpin).update({"area_sqft": old_area})
    db.commit(); db.close()
    _wipe_submission(sid)
def test_submission_govt_fast_path():
    ho = _h("officer")
    r = c.post("/api/submissions", json={"kind": "new", "property_type": "Apartment / Flat",
        "department": "Survey Department",
        "payload": {"parcel_id": "DL-SKT-0999", "building_id": "B09", "floor_number": 1,
                    "unit_number": "101", "locality_code": "SKT"},
        "measurements": {}}, headers=ho).json()
    sid = r["submission_id"]
    assert r["source_type"] == "GOVERNMENT_DEPARTMENT"
    r = c.post(f"/api/submissions/{sid}/submit", headers=ho).json()
    assert r["status"] == "INTEGRATED" and r["trust"] == "AUTHORIZED"
    assert r["targets"]["unit"] == "DL-SKT-0999-B09-F01-U101"
    assert any("prototype reference issued" in a for a in r.get("applied", []))
    assert not any(x["submission_id"] == sid for x in c.get("/api/submissions/queue", headers=ho).json())
    _wipe_submission(sid)
def test_submission_validation_and_duplicates():
    h = _h("citizen")
    r = c.post("/api/submissions", json={"kind": "new", "property_type": "", "payload": {}, "measurements": {}}, headers=h).json()
    sid = r["submission_id"]
    assert c.post(f"/api/submissions/{sid}/submit", headers=h).status_code == 422
    d = c.post("/api/submissions/check-duplicates", json={"payload": {"parcel_id": "DL-SKT-0182"}}, headers=h).json()
    assert any(m["id"] == "DL-SKT-0182" for m in d["duplicates"])
    _wipe_submission(sid)
def test_validation_case_b03():
    r = c.get("/api/validation/case/DL-SKT-0182-B03").json()
    assert r["entity"] == "DL-SKT-0182-B03" and r["snapshot"]["kind"] == "building"
    assert r["snapshot"]["difference_m"] >= 2.0 and len(r["issues"]) >= 1
    assert c.get("/api/validation/case/NOPE-NOT-REAL").status_code == 404
def test_data_commit_preview_then_live():
    feats = [{"type": "Feature",
              "geometry": {"type": "Polygon", "coordinates": [[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]]},
              "properties": {"parcel_id": "TST-0001", "locality": "Test"}}]
    r = c.post("/api/data/commit", json={"features": feats, "filename": "t"}).json()
    assert r["created"]["parcels"] == 1
    assert c.get("/api/parcels/TST-0001").json()["verification_status"] == "Needs Review"
    r2 = c.post("/api/data/commit", json={"features": feats, "filename": "t"}).json()
    assert r2["created"]["parcels"] == 0 and "TST-0001" in r2["skipped"]
    from app.database import SessionLocal
    from app import models
    db = SessionLocal()
    db.query(models.PropertyHistory).filter(models.PropertyHistory.entity_id == "TST-0001").delete()
    db.query(models.Parcel).filter(models.Parcel.parcel_id == "TST-0001").delete()
    db.commit(); db.close()
def test_data_import_reports_breakdown():
    import json, os
    for name, n, t in [("sample-parcels.geojson", 5, "Polygon"),
                       ("sample-buildings.geojson", 6, "Polygon"),
                       ("sample-utilities.geojson", 2, "LineString")]:
        p = os.path.join(os.path.dirname(__file__), "../../data", name)
        with open(p) as f: payload = json.load(f)
        r = c.post("/api/data/import", json=payload).json()
        assert r["received"] == n and r["by_type"].get(t) == n and r["bbox"] is not None
    r = c.post("/api/data/import", json={"features": []}).json()
    assert r["received"] == 0 and r["bbox"] is None
