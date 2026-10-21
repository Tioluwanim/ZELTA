"""Day 14: bank-link lifecycle against fakes. No live Mono call exists anywhere in this code."""
import json
from datetime import datetime, timedelta, timezone

import pytest

from domain.events import Account
from domain.money import Money
from openbanking.audit import InMemoryAuditLog
from openbanking.consent import ConsentError, ConsentState, InMemoryConsentStore
from openbanking.link import LinkService
from openbanking.secrets import SecretStr
from providers.base import NotConfigured, ReauthRequired, Unavailable
from providers.mock import MockProvider

T0 = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)
SECRET = SecretStr("whsec-test")
OK = {"mono-webhook-secret": "whsec-test"}


class Ex:
    def exchange(self, code):
        return "acct-1" if code == "good" else ""


def acct():
    return Account("a1", "mono", "GTBank", "1234:a1", Money(5_000_00, "NGN"), T0)


def svc(provider=None, exchanger=Ex()):
    p = provider or MockProvider([acct()])
    p.name = "mono"
    return LinkService(p, InMemoryConsentStore(), InMemoryAuditLog(), exchanger, SECRET), p


def connected(**kw):
    s, p = svc(**kw)
    s.start("u1", T0)
    s.complete("u1", "good", T0)
    return s, p


def test_start_complete_makes_an_active_consent_and_audits_without_leaking_the_code():
    s, _ = connected()
    rec = s._c.get("u1", "mono")
    assert rec.state is ConsentState.ACTIVE and rec.connection_ref == "acct-1" and rec.expires_at == T0 + timedelta(days=90)
    assert [e.action for e in s._a.entries] == ["link.start", "link.complete"]
    assert "good" not in repr(s._a.entries) and "acct-1" not in repr(s._a.entries)


def test_complete_without_exchanger_or_pending_link_never_simulates_success():
    s, _ = svc(exchanger=None)
    s.start("u1", T0)
    with pytest.raises(NotConfigured):
        s.complete("u1", "good", T0)
    assert s._c.get("u1", "mono").state is ConsentState.PENDING
    s2, _ = svc()
    with pytest.raises(ConsentError):
        s2.complete("u1", "good", T0)                                # nothing pending
    s3, _ = svc()
    s3.start("u1", T0)
    with pytest.raises(ConsentError):
        s3.complete("u1", "good", T0 + timedelta(days=91))           # request expired
    s4, _ = svc()
    s4.start("u1", T0)
    with pytest.raises(Exception):
        s4.complete("u1", "bad", T0)                                 # exchanger returns empty ref


def test_cannot_start_twice_while_connected():
    s, _ = connected()
    with pytest.raises(ConsentError):
        s.start("u1", T0)


def test_sync_requires_active_consent_and_never_labels_data_live():
    s, _ = svc()
    with pytest.raises(ConsentError):
        s.sync("u1", T0)                                             # no consent
    s.start("u1", T0)
    with pytest.raises(ConsentError):
        s.sync("u1", T0)                                             # pending is not active
    s.complete("u1", "good", T0)
    r = s.sync("u1", T0)
    assert r.accounts[0].balance.minor == 500000 and r.live is False and r.source == "mono"
    with pytest.raises(ConsentError):
        s.sync("u1", T0 + timedelta(days=91))                        # expired
    assert any(e.outcome == "denied" for e in s._a.entries)


def test_balances_are_dropped_when_that_scope_was_not_granted():
    s, _ = svc()
    s.start("u1", T0, scopes=frozenset({"accounts", "transactions"}))
    s.complete("u1", "good", T0)
    r = s.sync("u1", T0)
    assert r.accounts[0].balance is None and r.accounts[0].balance_as_of is None


def test_reauth_moves_consent_and_blocks_later_syncs():
    s, p = connected(provider=MockProvider([acct()], fail_with=ReauthRequired()))
    with pytest.raises(ReauthRequired):
        s.sync("u1", T0)
    assert s._c.get("u1", "mono").state is ConsentState.REAUTH_REQUIRED
    p._fail = None
    with pytest.raises(ConsentError):
        s.sync("u1", T0)                                             # fails closed until the user reconnects


def test_provider_outage_is_audited_and_consent_untouched():
    s, _ = connected(provider=MockProvider([acct()], fail_with=Unavailable()))
    with pytest.raises(Unavailable):
        s.sync("u1", T0)
    assert s._c.get("u1", "mono").state is ConsentState.ACTIVE and s._a.entries[-1].outcome == "error:unavailable"


def test_disconnect_withdraws_first_then_revokes_at_the_provider():
    s, p = connected()
    s.disconnect("u1", T0)
    assert s._c.get("u1", "mono").state is ConsentState.WITHDRAWN and p.revoked == ["acct-1"]
    with pytest.raises(ConsentError):
        s.sync("u1", T0)
    with pytest.raises(ConsentError):
        s.disconnect("u1", T0)                                       # terminal: cannot withdraw twice


def event(i="e1", name="mono.events.account_updated"):
    return json.dumps({"id": i, "event": name, "data": {"account": {"id": "acct-1"}}}).encode()


def test_webhook_rejects_bad_or_missing_secret_and_garbage():
    s, _ = connected()
    assert not s.on_webhook({}, event(), T0).accepted
    assert not s.on_webhook({"mono-webhook-secret": "nope"}, event(), T0).accepted
    assert not s.on_webhook(OK, b"not json", T0).accepted
    assert not s.on_webhook(OK, b"[1]", T0).accepted
    nosecret = LinkService(MockProvider(), InMemoryConsentStore(), InMemoryAuditLog(), None, None)
    assert not nosecret.on_webhook(OK, event(), T0).accepted         # fail closed with no secret configured


def test_webhook_is_idempotent_ignores_unknown_events_and_needs_an_id():
    s, _ = connected()
    first = s.on_webhook(OK, event(), T0)
    assert first.accepted and first.action == "refresh" and first.connection_ref == "acct-1"
    assert s.on_webhook(OK, event(), T0).action == "duplicate"
    assert s.on_webhook(OK, event("e2", "something.else"), T0).action == "ignored"
    assert s.on_webhook(OK, json.dumps({"event": "mono.events.account_updated"}).encode(), T0).action == "ignored"   # no id


def test_applying_webhooks_is_scoped_to_the_owning_connection():
    s, p = connected()
    s.apply_webhook(s.on_webhook(OK, event("r1", "mono.events.account_reauthorisation_required"), T0), "u1", T0)
    assert s._c.get("u1", "mono").state is ConsentState.REAUTH_REQUIRED
    s2, p2 = connected()
    other = json.dumps({"id": "x", "event": "mono.events.account_updated", "data": {"account": {"id": "someone-else"}}}).encode()
    s2.apply_webhook(s2.on_webhook(OK, other, T0), "u1", T0)
    assert p2.refreshes == [] and s2._a.entries[-1].outcome == "denied"
    s2.apply_webhook(s2.on_webhook(OK, event("r2"), T0), "u1", T0)
    assert p2.refreshes == [""]
