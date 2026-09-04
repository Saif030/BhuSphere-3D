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
