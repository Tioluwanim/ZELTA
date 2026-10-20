"""Stateless compute endpoints: the backend sends data, the AI service computes. No network, no storage."""
from decimal import Decimal

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import api.compute as compute
import api.twin as twin_mod
import security
from tests.twin import fixtures as fx
from tests.twin.fixtures import AS_OF, history_txns

KEY = "k"
H = {"x-api-key": KEY, "x-user-id": "u1"}


def naira(m):
    return str(Decimal(m.minor) / 100)


def payload(**over):
    p = {"as_of": AS_OF.isoformat(),
         "accounts": [{"id": a.id, "institution": a.institution, "balance_naira": naira(a.balance), "balance_as_of": a.balance_as_of.isoformat()}
                      for a in fx.accounts()],
         "transactions": [{"account_id": t.account_id, "amount_naira": naira(t.amount), "at": t.occurred_at.isoformat(),
                           "ref": t.provider_ref, "description": t.description, "category": t.category} for t in history_txns()],
         "bills": [{"name": o.name, "amount_naira": naira(o.amount), "due": o.due.isoformat()} for o in fx.obligations()],
         "essential_categories": ["food"]}
    p.update(over)
    return p


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(security, "INTERNAL_API_KEY", KEY)
    monkeypatch.setattr(security, "DEBUG", False)
    app = FastAPI()
    app.include_router(compute.router)
    return TestClient(app, raise_server_exceptions=False)


def test_compute_returns_exact_engine_numbers_and_labels_the_source(client):
    r = client.post("/brain/v1/twin/compute", json=payload(), headers=H)
    assert r.status_code == 200
    b = r.json()
    assert b["source"] == "self_reported" and b["runway"]["runway_days"] == 16.99
    assert b["summary"]["total_connected_money"]["minor"] == 5350000
    assert any("not a live integration" in w for w in b["summary"]["warnings"])
    assert b["recommendations"]["recommendations"][0]["kind"] == "reduce_spending"
    assert b["forecast"]["available"] and b["buffer"]["status"] in ("healthy", "below_cushion", "below_minimum")


def test_guardian_states(client):
    ok = client.post("/brain/v1/guardian", json={**payload(), "action": {"amount_naira": "3000"}}, headers=H).json()
    big = client.post("/brain/v1/guardian", json={**payload(), "action": {"amount_naira": "60000"}}, headers=H).json()
    assert ok["state"] == "PROCEED" and big["state"] == "PROTECT"
    bad = client.post("/brain/v1/guardian", json={**payload(), "action": {"amount_naira": "5", "kind": "gamble"}}, headers=H)
    assert bad.status_code == 422 and set(bad.json()) == {"code", "message"}


def test_whatif_is_bounded(client):
    ok = client.post("/brain/v1/whatif", json={**payload(), "scenarios": [{"kind": "receive", "amount_naira": "20000"}]}, headers=H).json()
    assert ok["feasible"] and ok["outcomes"][0]["runway_after_days"] > ok["outcomes"][0]["runway_before_days"]
    many = client.post("/brain/v1/whatif", json={**payload(), "scenarios": [{"kind": "receive", "amount_naira": "1"}] * 6}, headers=H)
    assert many.status_code == 422
    long = client.post("/brain/v1/whatif", json={**payload(), "scenarios": [{"kind": "receive", "amount_naira": "1"}], "horizon": 999}, headers=H)
    assert long.status_code == 422
    bad = client.post("/brain/v1/whatif", json={**payload(), "scenarios": [{"kind": "teleport", "amount_naira": "1"}]}, headers=H).json()
    assert bad["feasible"] is False


def test_agent_answers_without_any_model(client):
    r = client.post("/brain/v1/agent", json={**payload(), "message": "how long will my money last?"}, headers=H).json()
    assert "16.99" in r["text"] and r["used_llm"] is False and r["tools"] == [{"tool": "estimate_runway", "ok": True}]


def test_auth_validation_and_no_leaks(client):
    assert client.post("/brain/v1/twin/compute", json=payload()).status_code == 401
    assert client.post("/brain/v1/twin/compute", json=payload(), headers={"x-api-key": "wrong", "x-user-id": "u"}).status_code == 401
    for bad in (payload(accounts=[]), payload(extra="x"), payload(bills=[{"name": "a", "amount_naira": 5.5, "due": "2026-10-10"}]),
                payload(transactions=[{"account_id": "nope", "amount_naira": "-5", "at": AS_OF.isoformat()}]),
                payload(accounts=[{"id": "a", "institution": "X", "balance_naira": "12abc"}]),
                payload(as_of="2026-10-08T20:00:00")):
        r = client.post("/brain/v1/twin/compute", json=bad, headers=H)
        assert r.status_code == 422 and set(r.json()) == {"code", "message"}, bad
    r = client.post("/brain/v1/twin/compute", json=payload(transactions=[{"account_id": "nope", "amount_naira": "-5", "at": AS_OF.isoformat()}]), headers=H)
    assert "nope" not in r.text


def test_unknown_balance_stays_unknown(client):
    p = payload(accounts=[{"id": "acc_opay", "institution": "OPay", "balance_naira": None}], transactions=[])
    b = client.post("/brain/v1/twin/compute", json=p, headers=H).json()
    assert b["summary"]["total_connected_money"] is None and b["forecast"]["available"] is False
    assert twin_mod  # module imported for clock override symmetry
