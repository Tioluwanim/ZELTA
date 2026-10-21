"""Backend <-> AI service bridge: payload building, route behaviour, Guardian-backed intercept check. No network, no Firestore."""
import importlib
import os
import sys
from datetime import datetime, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

NOW = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)


@pytest.fixture
def env(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    for m in [m for m in sys.modules if m in ("main", "config.settings", "routes.twin")]:
        del sys.modules[m]
    main = importlib.import_module("main")
    svc = importlib.import_module("routes.twin").svc      # the exact module object the routes use
    deps = importlib.import_module("core.dependencies")
    main.app.dependency_overrides[deps.get_current_user] = lambda: {"uid": "u1", "email": "t@x.com", "name": "T"}
    main.app.dependency_overrides[deps.get_db] = lambda: object()
    return main.app, svc


def test_build_payload_is_pure_and_skips_non_spending_rows(env):
    _, svc = env
    wallet = {"total_income": 45000.0, "total_expenses": 15040.5}
    txs = [{"id": "a", "type": "expense", "amount": 1800, "category": "food", "description": "Lunch", "date": NOW},
           {"id": "b", "type": "income", "amount": 45000, "category": "parent_transfer", "date": "2026-10-01T09:00:00"},
           {"id": "c", "type": "lock", "amount": 8000, "category": "savings", "date": NOW},
           {"id": "d", "type": "expense", "amount": -5, "category": "food", "date": NOW},
           {"id": "e", "type": "expense", "amount": 10, "category": "food", "date": None}]
    profile = {"financial": {"fee_obligations": [{"label": "Levy", "amount": 15000, "due_date": "2026-10-30"}, {"label": "bad", "amount": "x", "due_date": "nope"}]}}
    p = svc.build_payload(wallet, txs, profile, NOW)
    assert p["accounts"][0]["balance_naira"] == "29959.50"
    assert [t["amount_naira"] for t in p["transactions"]] == ["-1800.00", "45000.00"]
    assert p["transactions"][1]["at"].endswith("+00:00")                    # naive timestamps become explicit UTC
    assert p["bills"] == [{"name": "Levy", "amount_naira": "15000.00", "due": "2026-10-30"}]
    assert p["first_observed"] == "2026-10-01" and p["as_of"] == NOW.isoformat()
    assert svc.build_payload(wallet, txs, profile, NOW) == p


def test_routes_call_ai_service_and_validate_input(env, monkeypatch):
    app, svc = env
    sent = {}

    async def fake_payload(db, uid):
        return {"accounts": [], "as_of": NOW.isoformat()}

    async def fake_call(path, body, uid):
        sent.update(path=path, body=body, uid=uid)
        return {"state": "PROCEED"}
    monkeypatch.setattr(svc, "payload_for", fake_payload)
    monkeypatch.setattr(svc, "call", fake_call)
    c = TestClient(app)
    r = c.post("/api/twin/guardian", json={"amount": 3000.5, "category": "food"}, headers={"Authorization": "Bearer t"})
    assert r.status_code == 200 and r.json()["data"]["state"] == "PROCEED"
    assert sent["path"] == "/brain/v1/guardian" and sent["body"]["action"] == {"kind": "spend", "amount_naira": "3000.50", "category": "food"} and sent["uid"] == "u1"
    assert c.post("/api/twin/guardian", json={"amount": -1}, headers={"Authorization": "Bearer t"}).status_code == 422
    assert c.post("/api/twin/guardian", json={"amount": 5, "bogus": 1}, headers={"Authorization": "Bearer t"}).status_code == 422
    assert c.post("/api/twin/whatif", json={"scenarios": []}, headers={"Authorization": "Bearer t"}).status_code == 422
    assert c.post("/api/twin/agent", json={"message": "x" * 501}, headers={"Authorization": "Bearer t"}).status_code == 422


def test_failures_are_safe_and_do_not_leak(env, monkeypatch):
    app, svc = env

    async def fake_payload(db, uid):
        return {}
    monkeypatch.setattr(svc, "payload_for", fake_payload)
    monkeypatch.setattr(svc.settings, "internal_api_key", "SECRET-KEY-123")
    monkeypatch.setattr(svc.settings, "ai_brain_url", "https://internal.example.invalid")

    class Boom:
        def __init__(self, *a, **k): ...
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, *a, **k): raise httpx.ConnectError("connect to https://internal.example.invalid failed key SECRET-KEY-123")
    monkeypatch.setattr(svc.httpx, "AsyncClient", Boom)
    r = TestClient(app).get("/api/twin", headers={"Authorization": "Bearer t"})
    assert r.status_code == 503 and "SECRET" not in r.text and "internal.example" not in r.text
    monkeypatch.setattr(svc.settings, "internal_api_key", "")
    assert TestClient(app).get("/api/twin", headers={"Authorization": "Bearer t"}).status_code == 503


def test_call_maps_upstream_statuses(env, monkeypatch):
    import asyncio
    _, svc = env
    monkeypatch.setattr(svc.settings, "internal_api_key", "k")

    def client_for(status, body=None):
        class C:
            def __init__(self, *a, **k): ...
            async def __aenter__(self): return self
            async def __aexit__(self, *a): return False
            async def post(self, *a, **k): return httpx.Response(status, json=body or {"x": 1})
        return C
    for status, expect in [(401, 503), (500, 503), (429, 429), (422, 422)]:
        monkeypatch.setattr(svc.httpx, "AsyncClient", client_for(status))
        with pytest.raises(svc.TwinUnavailable) as e:
            asyncio.run(svc.call("/x", {}, "u"))
        assert e.value.status == expect
    monkeypatch.setattr(svc.httpx, "AsyncClient", client_for(200, {"ok": True}))
    assert asyncio.run(svc.call("/x", {}, "u")) == {"ok": True}


def test_gig_catalogue_maps_only_real_open_gigs(env):
    _, svc = env
    gigs = [{"id": "g1", "task": "Print 20 copies", "location": "Campus gate", "payout": 4000, "status": "OPEN", "time_estimate": "2 hours"},
            {"id": "g2", "task": "Mine", "payout": 5000, "status": "OPEN", "extracted_by_uid": "u1"},
            {"id": "g3", "task": "Done", "payout": 5000, "status": "COMPLETED"},
            {"id": "g4", "task": "Free", "payout": 0, "status": "OPEN"}, {"id": "g5", "task": "Bad", "payout": "x", "status": "OPEN"},
            {"id": "", "task": "No id", "payout": 100, "status": "OPEN"}]
    cat = svc.gig_catalogue(gigs, "u1")
    assert [c["id"] for c in cat] == ["g1"]
    assert cat[0]["provenance"] == "sourced" and "not verified" in cat[0]["source"] and cat[0]["expected_benefit_naira"] == "4000.00"


def test_opportunities_route_forwards_catalogue_and_never_fabricates(env, monkeypatch):
    app, svc = env
    seen = {}

    async def fake_payload(db, uid):
        return {"accounts": []}

    async def fake_call(path, body, uid):
        seen.update(path=path, body=body)
        return {"opportunities": []}
    monkeypatch.setattr(svc, "payload_for", fake_payload)
    monkeypatch.setattr(svc, "call", fake_call)
    monkeypatch.setattr(svc, "load_gigs", lambda db, limit=30: [{"id": "g1", "task": "Print", "payout": 4000, "status": "OPEN"}])
    r = TestClient(app).get("/api/twin/opportunities", headers={"Authorization": "Bearer x"})
    assert r.status_code == 200 and seen["path"] == "/brain/v1/opportunities" and seen["body"]["catalogue"][0]["id"] == "g1"
    monkeypatch.setattr(svc, "load_gigs", lambda db, limit=30: [])
    TestClient(app).get("/api/twin/opportunities", headers={"Authorization": "Bearer x"})
    assert seen["body"]["catalogue"] == []
