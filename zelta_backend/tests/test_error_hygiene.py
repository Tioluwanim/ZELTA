"""500 responses must never echo exception text (it can carry paths, project ids or provider payloads)."""
import importlib
import os
import re
import sys

import pytest
from fastapi.testclient import TestClient

ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


def test_no_route_returns_raw_exception_text_in_a_500():
    pat = re.compile(r"(status_code=(?:status\.HTTP_500_INTERNAL_SERVER_ERROR|500),\s*detail=)(f?\"[^\"]*(?:\{str\((?:e|exc)\)\}|\{e\}|\{exc\})[^\"]*\"|str\((?:e|exc)\))")
    bad = []
    for name in sorted(os.listdir(os.path.join(ROOT, "routes"))):
        if name.endswith(".py"):
            text = open(os.path.join(ROOT, "routes", name)).read()
            bad += [f"{name}: {m.group(0)[:80]}" for m in pat.finditer(text)]
    assert bad == []


def test_wallet_500_hides_the_underlying_error(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    for m in [m for m in sys.modules if m in ("main", "config.settings", "routes.wallet")]:
        del sys.modules[m]
    main = importlib.import_module("main")
    wallet = importlib.import_module("routes.wallet")
    deps = importlib.import_module("core.dependencies")

    async def boom(*a, **k):
        raise RuntimeError("secret-project-id-123 permission denied at /srv/key.json")
    monkeypatch.setattr(wallet, "get_wallet_summary", boom)
    main.app.dependency_overrides[deps.get_current_user] = lambda: {"uid": "u1", "email": "t@x.com", "name": "T"}
    main.app.dependency_overrides[deps.get_db] = lambda: object()
    r = TestClient(main.app, raise_server_exceptions=False).get("/api/wallet", headers={"Authorization": "Bearer x"})
    assert r.status_code == 500 and "secret-project" not in r.text and "key.json" not in r.text
