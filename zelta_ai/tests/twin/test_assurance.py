from datetime import timedelta

import pytest

from agent_tools import ToolContext, build_default_registry
from assurance import (Evidence, Family, Level, Status, assess, check_behaviour, check_contact,
                       check_institution_email, check_name_match, permissions_for)
from domain.events import Event, EventKind, EventStatus, Provenance
from domain.money import Money
from tests.twin.fixtures import AS_OF


def ev(family, status=Status.VERIFIED, age_days=0, fresh_days=90):
    return Evidence(family, "t", status, AS_OF - timedelta(days=age_days), timedelta(days=fresh_days))


# ---- name comparison (existing bank record vs claim)
@pytest.mark.parametrize("declared,bank,expected", [
    ("Adeagbo Tioluwanimi Ayomide", "TIOLUWANIMI AYOMIDE ADEAGBO", Status.VERIFIED),     # order-insensitive
    ("Tioluwanimi Adeagbo", "ADEAGBO TIOLUWANIMI AYOMIDE", Status.VERIFIED),             # subset
    ("T. Adeagbo", "Tioluwanimi Ayomide Adeagbo", Status.VERIFIED),                      # initial
    ("Mr Tioluwanimi Adeagbo", "Tioluwanimi Adeagbo", Status.VERIFIED),                  # title ignored
    ("Ayòmidé Adéagbo", "Ayomide Adeagbo", Status.VERIFIED),                             # diacritics
    ("Tioluwanimi Adeagbo", "Chinedu Okafor", Status.CONTRADICTED),
    ("Tioluwanimi Okafor", "Chinedu Okafor", Status.INCONCLUSIVE),                       # one shared token
    ("Tioluwanimi", "Tioluwanimi", Status.INCONCLUSIVE),                                 # single token is too weak
    (None, "Chinedu Okafor", Status.UNAVAILABLE), ("Tola", None, Status.UNAVAILABLE), ("123 !!", "Chinedu Okafor", Status.UNAVAILABLE),
])
def test_name_match(declared, bank, expected):
    assert check_name_match(declared, bank, AS_OF).status is expected


def test_evidence_never_contains_personal_data():
    e = check_name_match("Tioluwanimi Adeagbo", "Tioluwanimi Adeagbo", AS_OF)
    assert "Tioluwanimi" not in repr(e) and "Adeagbo" not in repr(e)


# ---- other checks
def test_institution_email():
    ok = check_institution_email("a@students.oauife.edu.ng", True, ["oauife.edu.ng"], AS_OF)
    assert ok.status is Status.VERIFIED
    assert check_institution_email("a@gmail.com", True, ["oauife.edu.ng"], AS_OF).status is Status.INCONCLUSIVE
    assert check_institution_email("a@evil-oauife.edu.ng", True, ["oauife.edu.ng"], AS_OF).status is Status.INCONCLUSIVE
    assert check_institution_email("a@oauife.edu.ng", False, ["oauife.edu.ng"], AS_OF).status is Status.UNAVAILABLE


def test_contact_check():
    assert check_contact(True, AS_OF).status is Status.VERIFIED
    assert check_contact(False, AS_OF).status is Status.UNAVAILABLE


def _event(days_ago, i):
    ts = AS_OF - timedelta(days=days_ago)
    return Event(f"e{i}", "a", ts, Money(-100), EventStatus.POSTED, EventKind.EXPENSE, Provenance("m", None, "h"))


def test_behaviour_needs_depth_and_spread_and_never_contradicts():
    deep = [_event(d, d) for d in range(1, 80, 3)]
    assert check_behaviour(deep, AS_OF).status is Status.VERIFIED
    assert check_behaviour(deep[:5], AS_OF).status is Status.INCONCLUSIVE
    assert check_behaviour([], AS_OF).status is Status.UNAVAILABLE


# ---- stacking
def test_levels_stack_by_independent_families():
    assert assess([], AS_OF).level is Level.NONE
    assert assess([ev(Family.CONTACT)], AS_OF).level is Level.BASIC
    assert assess([ev(Family.CONTACT), ev(Family.BEHAVIOUR)], AS_OF).level is Level.STANDARD
    assert assess([ev(Family.CONTACT), ev(Family.ACCOUNT_OWNERSHIP), ev(Family.INSTITUTION)], AS_OF).level is Level.STRONG


def test_same_family_twice_does_not_stack():
    a = assess([ev(Family.CONTACT), ev(Family.CONTACT, age_days=1)], AS_OF)
    assert a.level is Level.BASIC and a.families_used == (Family.CONTACT,)


def test_behaviour_plus_institution_alone_is_not_enough_without_contact_or_ownership():
    assert assess([ev(Family.BEHAVIOUR), ev(Family.INSTITUTION)], AS_OF).level is Level.NONE


def test_strong_needs_ownership_and_institution_or_registry():
    assert assess([ev(Family.CONTACT), ev(Family.BEHAVIOUR), ev(Family.INSTITUTION)], AS_OF).level is Level.STANDARD
    assert assess([ev(Family.CONTACT), ev(Family.ACCOUNT_OWNERSHIP), ev(Family.EXTERNAL_REGISTRY)], AS_OF).level is Level.STRONG


def test_a_contradiction_caps_the_level_and_is_reported():
    a = assess([ev(Family.CONTACT), ev(Family.INSTITUTION), ev(Family.BEHAVIOUR),
                ev(Family.ACCOUNT_OWNERSHIP, Status.CONTRADICTED)], AS_OF)
    assert a.level is Level.BASIC and a.contradictions == (Family.ACCOUNT_OWNERSHIP,)
    assert any("capped" in r for r in a.reasons)


def test_stale_evidence_is_ignored_and_missing_families_are_listed():
    a = assess([ev(Family.CONTACT, age_days=200)], AS_OF)
    assert a.level is Level.NONE and Family.CONTACT in a.missing
    b = assess([ev(Family.CONTACT)], AS_OF)
    assert Family.ACCOUNT_OWNERSHIP in b.missing and Family.CONTACT not in b.missing


def test_future_dated_evidence_is_ignored():
    assert assess([ev(Family.CONTACT, age_days=-1)], AS_OF).level is Level.NONE


# ---- gating the agent tools
def _ctx(level_evidence, snapshot):
    perms = permissions_for(assess(level_evidence, AS_OF))
    return ToolContext("u1", AS_OF, perms, snapshot)


def test_assurance_level_gates_tools_and_never_unlocks_money_movement():
    from tests.twin.test_twin_agents import build
    snap, reg = build(), build_default_registry()
    assert reg.call("estimate_runway", {}, _ctx([], snap)).error == "permission_denied"            # NONE
    basic = _ctx([ev(Family.CONTACT)], snap)
    assert reg.call("estimate_runway", {}, basic).ok
    assert reg.call("run_scenario", {"kind": "receive", "amount_naira": "100"}, basic).error == "permission_denied"
    std = _ctx([ev(Family.CONTACT), ev(Family.BEHAVIOUR)], snap)
    assert reg.call("run_scenario", {"kind": "receive", "amount_naira": "100"}, std).ok
    from assurance.gating import _LEVEL_SCOPES
    assert all(not any(w in scope for w in ("transfer", "pay", "withdraw"))
               for scopes in _LEVEL_SCOPES.values() for scope in scopes)
