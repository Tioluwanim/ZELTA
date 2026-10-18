"""Day 5: GET /brain/v1/twin. Fixture repository; no network, no real provider."""
import inspect
from dataclasses import replace
from datetime import timedelta
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import api.twin as twin_mod
import security
from financial_twin import repository as repo_mod
from financial_twin.repository import TwinInputs
from providers.base import Unavailable
from providers.mock import MockProvider
from tests.twin import fixtures as fx
from tests.twin.fixtures import AS_OF, history_txns

KEY = "test-internal-key"
H = {"x-api-key": KEY, "x-user-id": "u1"}


class FixtureRepo:
    def __init__(self, provider=None):
        self.provider = provider or MockProvider(fx.accounts(), {"acc_opay": history_txns()})

    def load(self, user_id, as_of):
        return TwinInputs(self.provider, "conn1", tuple(fx.obligations()), (fx.allowance(),), ("food",))


class ExplodingRepo:
    def load(self, user_id, as_of):
        raise RuntimeError("secret-internal-detail postgres://user:pw@db/prod")


@pytest.fixture
def make_client(monkeypatch):
    monkeypatch.setattr(security, "INTERNAL_API_KEY", KEY)
    monkeypatch.setattr(security, "DEBUG", False)

    def _make(repo=None):
        app = FastAPI()
        app.include_router(twin_mod.router)
        if repo is not None:
            app.dependency_overrides[twin_mod.get_twin_repository] = lambda: repo
        return TestClient(app, raise_server_exceptions=False)
    return _make


def get(client, headers=H, **params):
    params.setdefault("as_of", AS_OF.isoformat())
    return client.get("/brain/v1/twin", params=params, headers=headers)


def test_200_exact_numbers_from_fixture(make_client):
    r = get(make_client(FixtureRepo()))
    assert r.status_code == 200
    body = r.json()
    assert body["total_kobo"] == 5350000 and body["burn_kobo_per_day"] == 214800
    assert body["runway_days"] == 16.99 and body["freshness"] == "fresh" and body["burn_confidence"] == "high"
    assert set(body) == {"as_of", "total_kobo", "burn_kobo_per_day", "runway_days", "burn_confidence",
                         "freshness", "warnings"}


def test_default_as_of_uses_the_injected_clock(make_client):
    client = make_client(FixtureRepo())
    client.app.dependency_overrides[twin_mod.get_clock] = lambda: AS_OF
    r = client.get("/brain/v1/twin", headers=H)
    assert r.status_code == 200 and r.json()["runway_days"] == 16.99


@pytest.mark.parametrize("headers", [{"x-user-id": "u1"}, {**H, "x-api-key": "wrong"}, {"x-api-key": ""}])
def test_401_without_or_with_wrong_key(make_client, headers):
    r = get(make_client(FixtureRepo()), headers=headers)
    assert r.status_code == 401 and r.json() == {"code": "unauthorized", "message": "Authentication failed."}
    assert KEY not in r.text


@pytest.mark.parametrize("params,headers", [({"as_of": "not-a-date"}, H), ({"as_of": "2026-10-08T20:00:00"}, H),
                                            ({}, {"x-api-key": KEY})])
def test_422_for_bad_as_of_or_missing_user(make_client, params, headers):
    client = make_client(FixtureRepo())
    r = client.get("/brain/v1/twin", params=params, headers=headers)
    assert r.status_code == 422 and set(r.json()) == {"code", "message"} and r.json()["code"] == "invalid_request"


def test_500_hides_exception_text_and_traceback(make_client):
    r = get(make_client(ExplodingRepo()))
    assert r.status_code == 500 and r.json() == {"code": "internal_error", "message": "Something went wrong."}
    assert "secret-internal-detail" not in r.text and "postgres" not in r.text and "Traceback" not in r.text


def test_503_when_no_data_source_is_configured(make_client):
    r = get(make_client())                       # default repository is UnconfiguredRepository
    assert r.status_code == 503 and r.json()["code"] == "twin_unavailable"


def test_server_misconfiguration_is_not_described_to_the_caller(make_client, monkeypatch):
    monkeypatch.setattr(security, "INTERNAL_API_KEY", None)
    r = get(make_client(FixtureRepo()))
    assert r.status_code == 500 and "INTERNAL_API_KEY" not in r.text


def test_insufficient_history_returns_nulls_not_zeros(make_client):
    r = get(make_client(FixtureRepo(MockProvider(fx.accounts(), {}))))
    b = r.json()
    assert r.status_code == 200 and b["total_kobo"] == 5350000
    assert b["burn_kobo_per_day"] is None and b["runway_days"] is None and b["burn_confidence"] == "insufficient"


def test_provider_failure_gives_unknown_not_error_text(make_client):
    r = get(make_client(FixtureRepo(MockProvider(fail_with=Unavailable("host=10.0.0.5 token=abc")))))
    b = r.json()
    assert r.status_code == 200 and b["total_kobo"] is None and b["freshness"] == "unknown"
    assert "10.0.0.5" not in r.text and "abc" not in r.text


def test_stale_and_incomplete_freshness(make_client):
    accts = fx.accounts()
    stale = [replace(accts[0], balance_as_of=AS_OF - timedelta(hours=30)), *accts[1:]]
    assert get(make_client(FixtureRepo(MockProvider(stale, {})))).json()["freshness"] == "stale"
    gone = [replace(accts[0], balance_as_of=AS_OF - timedelta(hours=80)), *accts[1:]]
    assert get(make_client(FixtureRepo(MockProvider(gone, {})))).json()["freshness"] == "incomplete"


def test_docs_and_openapi_describe_the_response_and_errors(make_client):
    client = make_client(FixtureRepo())
    assert client.get("/docs").status_code == 200
    spec = client.get("/openapi.json").json()
    op = spec["paths"]["/brain/v1/twin"]["get"]
    assert "TwinOut" in str(op["responses"]["200"]) and {"401", "422", "500", "503"} <= set(op["responses"])


def test_new_code_never_returns_exception_text():
    for mod in (twin_mod, repo_mod):
        src = inspect.getsource(mod)
        assert "str(e" not in src and "str(exc" not in src and "detail=f" not in src
