"""Day 1: the unauthenticated /dev token routes must be closed unless APP_ENV is exactly 'local'.

Run from zelta_backend/:  python -m pytest tests -q
"""
import importlib
import os
import sys

import pytest
from fastapi.testclient import TestClient

ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


def load_app(monkeypatch, app_env):
    if app_env is None:
        monkeypatch.delenv("APP_ENV", raising=False)
    else:
        monkeypatch.setenv("APP_ENV", app_env)
    for mod in [m for m in sys.modules if m in ("main", "config.settings")]:
        del sys.modules[mod]
    return importlib.import_module("main").app       # no lifespan => Firebase is not initialised


@pytest.mark.parametrize("env", [None, "development", "production", "staging", "LOCALHOST"])
def test_dev_routes_are_closed_by_default_and_in_every_non_local_env(monkeypatch, env):
    client = TestClient(load_app(monkeypatch, env))
    assert client.get("/dev/custom-token/someuid").status_code == 404
    assert client.get("/dev/id-token/whatever").status_code == 404


def test_dev_routes_not_listed_in_openapi_when_closed(monkeypatch):
    schema = TestClient(load_app(monkeypatch, None)).get("/openapi.json").json()
    assert not [p for p in schema["paths"] if p.startswith("/dev")]


def test_dev_routes_exist_only_for_explicit_local(monkeypatch):
    client = TestClient(load_app(monkeypatch, "local"))
    schema = client.get("/openapi.json").json()
    assert any(p.startswith("/dev") for p in schema["paths"])
