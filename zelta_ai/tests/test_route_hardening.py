"""Live-route hardening: key required on /api/*, no error leakage, rate limiting, CORS allow-list.

api.routes needs heavy ML dependencies, so those modules are replaced with light stand-ins here.
"""
import importlib
import sys
import types

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from config.cors import allowed_origins
from ratelimit import RateLimiter, rate_limit

KEY = "k-test"


class FakeClient:
    async def get_events(self):
        raise RuntimeError("upstream blew up with token=abc123secret")


class FakeMonitor:
    client = FakeClient()
    def get_signal(self): return {"score": 61, "status": "ELEVATED"}


@pytest.fixture
def routes(monkeypatch):
    stub = lambda name, **attrs: monkeypatch.setitem(sys.modules, name, types.SimpleNamespace(**attrs))  # noqa: E731
    stub("brain.pipeline", ZeltaPipeline=lambda: object())
    stub("brain.bayse.stress_signal", monitor=FakeMonitor())
    stub("brain.copilot.gemini", ZeltaCopilot=object)
    stub("brain.tools.hustle_templates", get_hustle_templates=lambda *a, **k: {}, HUSTLE_CATALOG={})
    sys.modules.pop("api.routes", None)
    mod = importlib.import_module("api.routes")
    sec = importlib.import_module("security")      # the module api.routes actually imported
    monkeypatch.setattr(sec, "INTERNAL_API_KEY", KEY)
    monkeypatch.setattr(sec, "DEBUG", False)
    app = FastAPI()
    app.include_router(mod.public_router)
    yield mod, TestClient(app, raise_server_exceptions=False)
    sys.modules.pop("api.routes", None)


@pytest.mark.parametrize("path", ["/api/stress", "/api/markets"])
def test_signal_endpoints_now_require_the_key(routes, path):
    _, c = routes
    assert c.get(path).status_code == 401
    assert c.get(path, headers={"x-api-key": "wrong"}).status_code == 401
    assert c.get(path, headers={"x-api-key": KEY}).status_code == 200


def test_markets_error_does_not_leak_exception_text(routes):
    _, c = routes
    r = c.get("/api/markets", headers={"x-api-key": KEY})
    assert r.json()["count"] == 0 and "abc123secret" not in r.text and "blew up" not in r.text


def test_rate_limit_returns_429_with_retry_after(routes):
    mod, c = routes
    mod._api_limit.limiter.limit = 2
    mod._api_limit.limiter._hits.clear()
    h = {"x-api-key": KEY}
    assert [c.get("/api/stress", headers=h).status_code for _ in range(3)] == [200, 200, 429]
    assert c.get("/api/stress", headers=h).headers["retry-after"] == "60"


def test_limiter_window_slides_and_keys_are_independent():
    t = [0.0]
    lim = RateLimiter(2, 10, clock=lambda: t[0])
    assert lim.allow("a") and lim.allow("a") and not lim.allow("a") and lim.allow("b")
    t[0] = 10.0
    assert lim.allow("a")
    with pytest.raises(ValueError):
        RateLimiter(0, 1)


def test_limiter_bounds_memory():
    t = [0.0]
    lim = RateLimiter(1, 1, clock=lambda: t[0], max_keys=5)
    for i in range(20):
        t[0] += 2
        lim.allow(f"k{i}")
    assert len(lim._hits) <= 6


def test_rate_limit_dependency_keys_by_api_key_not_shared_between_callers():
    app = FastAPI()
    dep = rate_limit(limit=1, window_s=60)

    @app.get("/x", dependencies=[__import__("fastapi").Depends(dep)])
    def x():
        return {}
    c = TestClient(app)
    assert c.get("/x", headers={"x-api-key": "a"}).status_code == 200
    assert c.get("/x", headers={"x-api-key": "a"}).status_code == 429
    assert c.get("/x", headers={"x-api-key": "b"}).status_code == 200


def test_cors_default_is_closed_and_wildcard_is_ignored():
    assert allowed_origins({}) == []
    assert allowed_origins({"ALLOWED_ORIGINS": "*"}) == []
    assert allowed_origins({"ALLOWED_ORIGINS": "https://zelta.app/, http://evil.com, http://localhost:3000, *"}) \
        == ["https://zelta.app", "http://localhost:3000"]
