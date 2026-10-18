"""Day 1: the AI service must not be open by default."""
import importlib
import sys

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient


def load(monkeypatch, debug, key):
    for name, val in (("DEBUG", debug), ("INTERNAL_API_KEY", key)):
        if val is None:
            monkeypatch.delenv(name, raising=False)
        else:
            monkeypatch.setenv(name, val)
    sys.modules.pop("security", None)
    sec = importlib.import_module("security")
    app = FastAPI()

    @app.get("/x", dependencies=[Depends(sec.verify_internal_request)])
    def x():
        return {"ok": True}
    return TestClient(app)


def test_unconfigured_service_fails_closed_by_default(monkeypatch):
    c = load(monkeypatch, None, None)           # DEBUG unset, no key: previously this was fully open
    assert c.get("/x").status_code == 500


def test_debug_bypass_only_when_explicitly_enabled(monkeypatch):
    assert load(monkeypatch, "true", None).get("/x").status_code == 200
    assert load(monkeypatch, "false", None).get("/x").status_code == 500


def test_key_is_required_and_checked(monkeypatch):
    c = load(monkeypatch, None, "k-123")
    assert c.get("/x").status_code == 401
    assert c.get("/x", headers={"x-api-key": "wrong"}).status_code == 401
    assert c.get("/x", headers={"x-api-key": "k-123"}).status_code == 200
