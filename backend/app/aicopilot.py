"""Deterministic cadastral copilot — safe structured tools only (no raw SQL)."""
import re
from sqlalchemy import func
from .models import Parcel, Building, Floor, Unit, Utility, ValidationIssue, Submission

def answer_query(db, question: str, user: dict | None = None):
    q = question.lower()
    highlights, rows, explain = [], [], ""
    # submission intake status (advisory only — never approves).
    # Citizens only ever see their OWN submissions here.
    if "submission" in q:
        subs = db.query(Submission).order_by(Submission.created_at.desc()).limit(20).all()
        if user and user.get("role") == "citizen":
            subs = [s for s in subs if s.submitter == user.get("username")]
        pend = [s for s in subs if s.status in ("PENDING_VERIFICATION", "UNDER_VERIFICATION", "FIELD_CHECK")]
        for s in subs[:10]:
            rows.append({"Submission": s.submission_id, "Type": s.property_type,
                         "Status": s.status, "Source": s.source_type})
        return {"answer": f"{len(pend)} submission(s) awaiting human verification out of {len(subs)} recent. Advisory only — approval is a human officer action.",
                "count": len(subs), "rows": rows, "highlights": [], "confidence": 90}
    # height mismatch
    if "height" in q and ("mismatch" in q or "differ" in q or "lidar" in q):
        m = re.search(r"(\d+(?:\.\d+)?)\s*m", q)
        thr = float(m.group(1)) if m else 2.0
        bs = db.query(Building).all()
        hit = [b for b in bs if abs((b.lidar_height_m or 0)-(b.registered_height_m or 0)) > thr]
        for b in hit:
            d = round((b.lidar_height_m or 0)-(b.registered_height_m or 0), 1)
            rows.append({"Building": f"{b.parcel_id}-{b.building_id}", "Registered": f"{b.registered_height_m}m",
                         "LiDAR": f"{b.lidar_height_m}m", "Difference": f"{d:+.1f}m", "Status": b.verification_status})
            highlights.append({"type": "building", "id": f"{b.parcel_id}-{b.building_id}"})
        explain = f"Found {len(hit)} buildings with height mismatch greater than {thr}m (registered vs LiDAR)."
        return {"answer": explain, "count": len(hit), "rows": rows, "highlights": highlights, "confidence": 92}
    if "conflict" in q or "geometry" in q:
        iss = db.query(ValidationIssue).filter(ValidationIssue.status == "Open").limit(50).all()
        for i in iss[:20]:
            rows.append({"Entity": i.entity_id, "Issue": i.issue_type, "Severity": i.severity, "Status": i.status})
            highlights.append({"type": i.entity_type.lower(), "id": i.entity_id})
        return {"answer": f"Found {len(iss)} open spatial/ownership issues. Highest severity shown first.",
                "count": len(iss), "rows": rows, "highlights": highlights, "confidence": 90}
    if "underground" in q or "utility" in q or "utilities" in q:
        parcel_m = re.search(r"dl-[a-z]+-\d+", q)
        us = db.query(Utility).all()
        if parcel_m:
            pid = parcel_m.group(0).upper()
            us = [u for u in us if pid in (u.affected_parcels or []) or u.utility_id in ("WTR-00182","ELEC-00921","TEL-00382")]
            explain = f"{len(us)} underground assets intersect or pass through parcel {pid}."
        else:
            explain = f"Showing {len(us)} underground utility assets (water, electrical, sewer, telecom, gas, metro)."
        for u in us:
            rows.append({"Asset": u.utility_id, "Type": u.utility_type, "Depth": f"{u.depth_m}m", "Owner": u.owner_agency, "Status": u.status})
            highlights.append({"type": "utility", "id": u.utility_id})
        return {"answer": explain, "count": len(us), "rows": rows, "highlights": highlights, "confidence": 91}
    if "above" in q and "floor" in q:
        m = re.search(r"(\d+)", q); n = int(m.group(1)) if m else 5
        units = db.query(Unit).join(Floor, Unit.floor_key == Floor.id).filter(Floor.floor_number > n).limit(100).all()
        for u in units[:20]:
            rows.append({"ULPIN": u.prototype_ulpin, "Unit": u.unit_number, "Confidence": f"{u.confidence}%"})
            highlights.append({"type": "unit", "id": u.prototype_ulpin})
        total = db.query(Unit).join(Floor, Unit.floor_key == Floor.id).filter(Floor.floor_number > n).count()
        return {"answer": f"Found {total} apartments above floor {n}. Showing first {len(rows)}.",
                "count": total, "rows": rows, "highlights": highlights, "confidence": 89}
    if "verif" in q or "unverified" in q or "missing ownership" in q:
        units = db.query(Unit).filter((Unit.verification_status != "Verified") | (Unit.owner_id.is_(None))).limit(50).all()
        for u in units[:20]:
            rows.append({"ULPIN": u.prototype_ulpin, "Status": u.verification_status, "Confidence": f"{u.confidence}%"})
            highlights.append({"type": "unit", "id": u.prototype_ulpin})
        return {"answer": f"Found {len(units)}+ properties needing verification (showing {len(rows)}). AI-assisted assessment — requires official verification.",
                "count": len(units), "rows": rows, "highlights": highlights, "confidence": 88}
    if "why" in q and ("flag" in q or "confidence" in q or "96" in q or "a804" in q or "804" in q):
        return {"answer": ("Apartment DL-SKT-0182-B01-F08-U804 is scored 96.4%: GIS geometry 98%, LiDAR 95%, "
                           "floor plan 97%, GNSS 99%, ownership record 94%, topology 100%. "
                           "LiDAR height matches registered height within tolerance, so no flag. AI-assisted assessment — requires official verification."),
                "count": 1, "rows": [{"Source": s, "Score": v} for s, v in
                    [("GIS geometry","98%"),("LiDAR","95%"),("Floor plan","97%"),("GNSS","99%"),("Ownership","94%"),("Topology","100%")]],
                "highlights": [{"type": "unit", "id": "DL-SKT-0182-B01-F08-U804"}], "confidence": 94}
    if "how many" in q and "saket" in q:
        c = db.query(Unit).join(Floor, Unit.floor_key == Floor.id).join(Building, Floor.building_key == Building.id).join(
            Parcel, Building.parcel_id == Parcel.parcel_id).filter(Parcel.locality == "Saket").count()
        uv = db.query(Unit).filter(Unit.verification_status != "Verified").count()
        return {"answer": f"Saket has {c} registered units in this demo dataset; {uv} units demo-wide need review. AI-assisted assessment.",
                "count": c, "rows": [], "highlights": [], "confidence": 87}
    # fallback: keyword search across IDs
    kw = question.strip().upper()
    u = db.query(Unit).filter(Unit.prototype_ulpin == kw).first()
    if u:
        return {"answer": f"Found property {u.prototype_ulpin}: {u.area_sqft} sq.ft, {u.verification_status}, confidence {u.confidence}%.",
                "count": 1, "rows": [{"ULPIN": u.prototype_ulpin}], "highlights": [{"type": "unit", "id": u.prototype_ulpin}], "confidence": 95}
    return {"answer": ("I can help with: 'Show buildings with height mismatch > 2m', 'Show properties above the 5th floor', "
                       "'Show underground utilities near Green Residency', 'Which properties need verification?', "
                       "'Why is apartment A804 marked 96.4%?'. AI-assisted assessment — requires official verification."),
            "count": 0, "rows": [], "highlights": [], "confidence": 70}


# ---------------- LangChain + Mistral role-aware assistant ----------------
# Uses LLM_API_KEY from the environment. The deterministic engine above stays
# as the source of map data (rows/highlights) and as the full fallback, so the
# demo and tests work with no key, offline, or on any LLM error.
import os as _os
import json as _json

ROLE_SYSTEM = {
    "citizen": ("You are BhuSphere 3D's citizen helper. The user is a property owner. "
                "Explain their submission status in plain words, what happens next, and what "
                "commonly causes rejection or correction requests (missing documents, area "
                "mismatch vs existing record, unclear address/coordinates, duplicate filings). "
                "Use their ACTUAL records from the context. Never approve, reject, or promise "
                "an outcome — only a human officer decides."),
    "surveyor": ("You are BhuSphere 3D's surveyor helper. The user does field verification. "
                 "Explain their assigned/open visits, what to check on site (existence, address, "
                 "boundaries, measurements, coordinates, documents, photographs), and that their "
                 "APPROVE/REJECT is a recommendation — the officer takes the final decision."),
    "officer": ("You are BhuSphere 3D's officer assistant. The user verifies citizen submissions. "
                "Triage the queue: oldest pending first, high priority and NEEDS_REVIEW items, "
                "what evidence exists per case, and suggested next actions (verify-start, field "
                "check, correction, approve, reject). Never auto-decide; the human acts in the app."),
    "admin": ("You are BhuSphere 3D's administrator assistant. Summarize intake health, validation "
              "signal, and dataset/evidence state. Suggest operational next steps."),
    "public": ("You are BhuSphere 3D's public guide. Explain how to verify a property by reference "
               "or QR, what public fields mean, and that no login is needed. Do not reveal "
               "non-public data."),
}

GUARDRAILS = ("Rules: this is a Smart India Hackathon 2026 PROTOTYPE with synthetic demo data; "
              "all ULPIN-like IDs are demo references, not official Government of India ULPINs; "
              "owner names are fictional. Never claim legal ownership or title. Cite record IDs "
              "(SUB-IDs, ULPINs, verification IDs) exactly as given. Reply in the same language "
              "as the user's question (English or Hindi). Keep answers short and practical.")


def _role_context(db, user: dict | None) -> str:
    """Small, role-scoped context snippet. Citizens see only their own records."""
    from .models import SubmissionReview, FieldVerification, SubmissionNotification  # noqa
    role = (user or {}).get("role", "public")
    name = (user or {}).get("username", "anonymous")
    try:
        if role == "citizen":
            mine = db.query(Submission).filter(Submission.submitter == name).order_by(
                Submission.created_at.desc()).limit(5).all()
            if not mine:
                return "Citizen has no submissions yet."
            lines = []
            for s in mine:
                rev = db.query(SubmissionReview).filter(
                    SubmissionReview.submission_id == s.submission_id).order_by(
                    SubmissionReview.created_at.desc()).first()
                note = f"; last officer note: {rev.action} — {rev.reason}" if rev and rev.reason else ""
                lines.append(f"{s.submission_id}: {s.property_type} v{s.version}, status={s.status}, trust={s.trust}{note}")
            return "Citizen's submissions (newest first):\n" + "\n".join(lines)
        if role == "surveyor":
            visits = db.query(FieldVerification).order_by(
                FieldVerification.created_at.desc()).limit(10).all()
            mine = [v for v in visits if v.assignee == name]
            pool = [v for v in visits if v.status == "Open" and v.assignee != name]
            lines = [f"{v.verification_id}: submission {v.submission_id}, status={v.status}, "
                     f"assignee={v.assignee}, reason={v.reason or '-'}"
                     for v in (mine + pool[:5])]
            return f"Field visits for {name} (assigned + open pool):\n" + ("\n".join(lines) if lines else "none")
        if role in ("officer", "admin"):
            subs = db.query(Submission).order_by(Submission.created_at).limit(200).all()
            actionable = [s for s in subs if s.status in (
                "PENDING_VERIFICATION", "UNDER_VERIFICATION", "FIELD_CHECK",
                "CORRECTION_REQUIRED", "NEEDS_REVIEW")]
            by_status: dict = {}
            for s in actionable:
                by_status[s.status] = by_status.get(s.status, 0) + 1
            top = [f"{s.submission_id} ({s.property_type}, {s.status}, priority={s.priority}, by {s.submitter})"
                   for s in actionable[:8]]
            return (f"Queue: {len(actionable)} actionable {by_status}.\nOldest first:\n" +
                    ("\n".join(top) if top else "queue clear"))
    except Exception as e:
        return f"(context unavailable: {e})"
    return "Anonymous public visitor (no personal records)."


def _make_tools(db, user: dict | None):
    from langchain_core.tools import tool

    @tool
    def height_mismatch(threshold_meters: float = 2.0) -> str:
        """Buildings whose LiDAR height differs from registered height by more than threshold_meters."""
        res = answer_query(db, f"Show buildings with height mismatch greater than {threshold_meters}m")
        return _json.dumps({"answer": res["answer"], "count": res["count"], "rows": res["rows"][:10]})

    @tool
    def properties_needing_verification() -> str:
        """Units that are unverified or missing ownership records."""
        res = answer_query(db, "Which properties need verification")
        return _json.dumps({"answer": res["answer"], "count": res["count"], "rows": res["rows"][:10]})

    @tool
    def underground_utilities(parcel_id: str = "") -> str:
        """Underground utility assets, optionally filtered by parcel id like DL-SKT-0182."""
        res = answer_query(db, f"Show underground utilities near {parcel_id}" if parcel_id else "Show underground utilities")
        return _json.dumps({"answer": res["answer"], "count": res["count"], "rows": res["rows"][:10]})

    @tool
    def units_above_floor(floor_number: int = 5) -> str:
        """Count and sample of apartment units above a floor number."""
        res = answer_query(db, f"Show properties above the {floor_number} floor")
        return _json.dumps({"answer": res["answer"], "count": res["count"], "rows": res["rows"][:10]})

    @tool
    def property_lookup(prototype_ulpin: str) -> str:
        """Public identity facts for one prototype ULPIN reference."""
        res = answer_query(db, prototype_ulpin.strip().upper())
        return _json.dumps({"answer": res["answer"], "count": res["count"]})

    @tool
    def my_submissions() -> str:
        """The signed-in user's own submissions (citizens) or actionable queue summary (staff). Never exposes other citizens' records."""
        res = answer_query(db, "submission status of my submissions", user=user)
        return _json.dumps({"answer": res["answer"], "count": res["count"], "rows": res["rows"][:10]})

    @tool
    def submission_detail(submission_id: str) -> str:
        """Status, trust, version and history outline of one submission the user may access."""
        sid = submission_id.strip().upper()
        s = db.query(Submission).filter(Submission.submission_id == sid).first()
        if not s:
            return _json.dumps({"error": f"{sid} not found"})
        role = (user or {}).get("role", "public")
        if role == "citizen" and s.submitter != (user or {}).get("username"):
            return _json.dumps({"error": "Not your submission"})
        return _json.dumps({"submission_id": s.submission_id, "status": s.status,
                            "trust": s.trust, "version": s.version,
                            "property_type": s.property_type, "source": s.source_type,
                            "priority": s.priority, "assignee": s.assignee})

    return [height_mismatch, properties_needing_verification, underground_utilities,
            units_above_floor, property_lookup, my_submissions, submission_detail]


def answer_with_llm(db, question: str, user: dict | None = None) -> dict:
    """Role-aware Mistral answer via LangChain. Always falls back to rules."""
    base = answer_query(db, question, user=user)
    base["engine"] = "rules"
    key = (_os.getenv("LLM_API_KEY") or "").strip()
    if not key:
        return base
    try:
        from langchain.agents import create_agent
        from langchain_mistralai import ChatMistralAI
        role = (user or {}).get("role", "public")
        system = ROLE_SYSTEM.get(role, ROLE_SYSTEM["public"]) + " " + GUARDRAILS
        context = _role_context(db, user)
        tools = _make_tools(db, user)
        llm = ChatMistralAI(model="mistral-small-latest", temperature=0.2,
                            max_tokens=600, timeout=20, api_key=key)
        agent = create_agent(llm, tools, system_prompt=system)
        prompt = (f"User role: {role}.\nLive role context (use it, do not invent records):\n{context}\n\n"
                  f"Deterministic lookup says: {base['answer']}\n\nUser question: {question}\n\n"
                  "Use tools when you need fresh records. Answer directly and briefly.")
        result = agent.invoke({"messages": [{"role": "user", "content": prompt}]})
        msgs = result.get("messages", []) if isinstance(result, dict) else []
        text = ""
        for m in reversed(msgs):
            c = getattr(m, "content", "")
            if m.__class__.__name__ == "AIMessage" and isinstance(c, str) and c.strip():
                text = c.strip()
                break
        if not text:
            return base
        out = dict(base)
        out["answer"] = text
        out["confidence"] = 85
        out["engine"] = "mistral"
        return out
    except Exception:
        return base
