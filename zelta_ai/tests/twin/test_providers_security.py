import logging
from datetime import timedelta

import pytest

from domain.clock import LAGOS
from domain.events import RawTransaction
from domain.money import Money
from openbanking.audit import InMemoryAuditLog
from openbanking.consent import (ConsentError, ConsentRecord, ConsentState, InMemoryConsentStore,
                                 require_consent, withdraw)
from openbanking.redact import RedactingFilter, redact, redact_text, safe_error
from openbanking.secrets import SecretStr, load_secret
from openbanking.webhook import verify_hmac_sha256, verify_shared_secret
from providers import mono
from providers.base import (AuthRejected, InvalidResponse, NotConfigured, ProviderError, RateLimited, Unavailable)
from providers.context import BayseStressContext, ContextSignal, UserReportedContext
from providers.mock import MockProvider
from tests.twin.fixtures import AS_OF


# ------------------------------------------------------------------ Mono mapping + failures
def good_row(**kw):
    row = {"id": "m1", "narration": "POS Canteen", "amount": 150000, "type": "debit",
           "date": "2026-10-07T10:30:00.000Z", "category": "food"}
    row.update(kw)
    return row


def test_mono_debit_maps_to_negative_money_and_keeps_original_payload():
    r = mono.map_transaction("a1", good_row())
    assert r.amount == Money(-150000) and r.occurred_at.tzinfo is not None and r.payload["id"] == "m1"
    assert mono.map_transaction("a1", good_row(type="credit")).amount == Money(150000)


@pytest.mark.parametrize("bad", [
    {"amount": 15.5}, {"amount": True}, {"amount": -5}, {"type": "weird"}, {"date": "nonsense"},
    {"date": "2026-10-07T10:30:00"}, {"id": None}])
def test_mono_invalid_rows_raise_invalid_response(bad):
    with pytest.raises(InvalidResponse):
        mono.map_transaction("a1", good_row(**bad))


def test_mono_date_only_is_placed_at_lagos_midnight_and_flagged():
    r = mono.map_transaction("a1", good_row(date="2026-10-07"))
    assert r.time_precision == "date" and r.occurred_at.astimezone(LAGOS).hour == 0
    from ledger import normalise
    assert "time_of_day" in normalise([r], AS_OF).events[0].missing_fields


def test_mono_adapter_without_credentials_never_pretends_to_be_live():
    a = mono.MonoAdapter()
    assert a.is_live is False
    for call in (lambda: a.list_accounts("c", AS_OF), lambda: a.fetch_transactions("c", "a"),
                 lambda: a.refresh("c", "a"), lambda: a.revoke("c")):
        with pytest.raises(NotConfigured):
            call()


class FakeTransport:
    def __init__(self, status, body): self.status, self.body, self.calls = status, body, []
    def request(self, method, path, *, params=None, headers=None):
        self.calls.append((method, path, dict(headers or {})))
        return self.status, self.body


@pytest.mark.parametrize("status,exc", [(401, AuthRejected), (429, RateLimited), (503, Unavailable), (418, InvalidResponse)])
def test_http_errors_are_normalised(status, exc):
    a = mono.MonoAdapter(SecretStr("test_sk_abcdefgh12345"), FakeTransport(status, {}))
    with pytest.raises(exc):
        a.fetch_transactions("c", "a")


def test_invalid_provider_body_is_rejected():
    a = mono.MonoAdapter(SecretStr("test_sk_abcdefgh12345"), FakeTransport(200, {"unexpected": 1}))
    with pytest.raises(InvalidResponse):
        a.fetch_transactions("c", "a")
    ok = mono.MonoAdapter(SecretStr("test_sk_abcdefgh12345"), FakeTransport(200, {"data": [good_row()]}))
    assert len(ok.fetch_transactions("c", "a")) == 1


# ------------------------------------------------------------------ secrets, redaction, leakage
def test_secret_never_leaks_through_repr_str_or_fstring():
    s = SecretStr("super-secret-value-123")
    assert "super-secret" not in repr(s) and "super-secret" not in f"{s}" and "super-secret" not in str(s)
    assert load_secret("X", {}) is None and load_secret("X", {"X": ""}) is None
    assert load_secret("X", {"X": "v"}).reveal() == "v"


def test_redaction_masks_secrets_account_numbers_and_financial_fields():
    out = redact({"Authorization": "Bearer abc.def.ghi", "mono-sec-key": "test_sk_zzzzzzzzzzzz",
                  "account_number": "0123456789", "amount": 5000, "nested": {"note": "acct 0123456789 ok"},
                  "warnings": ["kept"], "pin": "1234"})
    flat = str(out)
    assert "abc.def" not in flat and "zzzz" not in flat and "5000" not in flat
    assert out["warnings"] == ["kept"] and out["nested"]["note"].endswith("ok") and "0123456789" not in flat
    assert redact_text("token Bearer abc123 end") == "token Bearer *** end"


def test_error_text_is_redacted():
    msg = safe_error(RuntimeError("failed for 0123456789012 with Bearer tok_abc"))
    assert "0123456789012" not in msg and "tok_abc" not in msg


def test_logging_filter_scrubs_messages(caplog):
    log = logging.getLogger("zelta.test.redact")
    log.addFilter(RedactingFilter())
    with caplog.at_level(logging.INFO, logger="zelta.test.redact"):
        log.info("calling with key test_sk_abcdefghijkl and acct 0123456789")
    assert "abcdefghijkl" not in caplog.text and "0123456789" not in caplog.text


# ------------------------------------------------------------------ webhooks
def test_webhook_shared_secret_and_hmac():
    sec = SecretStr("whsec_1")
    assert verify_shared_secret("whsec_1", sec)
    assert not verify_shared_secret("nope", sec) and not verify_shared_secret(None, sec)
    assert not verify_shared_secret("whsec_1", None)           # fail closed with no secret configured
    import hashlib, hmac
    sig = hmac.new(b"whsec_1", b"{}", hashlib.sha256).hexdigest()
    assert verify_hmac_sha256(b"{}", sig, sec) and not verify_hmac_sha256(b"{x}", sig, sec)
    assert not verify_hmac_sha256(b"{}", None, sec)


# ------------------------------------------------------------------ consent lifecycle
def active(store, scopes=("accounts", "transactions"), expires=None):
    rec = ConsentRecord("u1", "mock", "conn1", frozenset(scopes), expires_at=expires).transition(ConsentState.ACTIVE, AS_OF)
    store.put(rec)
    return rec


def test_unauthorised_access_is_denied():
    store = InMemoryConsentStore()
    with pytest.raises(ConsentError):
        require_consent(store, "u1", "mock", "transactions", AS_OF)          # no consent at all
    active(store, scopes=("accounts",))
    with pytest.raises(ConsentError):
        require_consent(store, "u1", "mock", "transactions", AS_OF)          # scope not granted
    with pytest.raises(ConsentError):
        require_consent(store, "other-user", "mock", "accounts", AS_OF)      # another user's data


def test_expired_and_withdrawn_consent_is_denied_and_terminal():
    store = InMemoryConsentStore()
    active(store, expires=AS_OF - timedelta(seconds=1))
    with pytest.raises(ConsentError):
        require_consent(store, "u1", "mock", "accounts", AS_OF)
    store2 = InMemoryConsentStore()
    active(store2)
    p = MockProvider()
    rec = withdraw(store2, p, "u1", "mock", AS_OF)
    assert rec.state is ConsentState.WITHDRAWN and p.revoked == ["conn1"]
    with pytest.raises(ConsentError):
        require_consent(store2, "u1", "mock", "accounts", AS_OF)
    with pytest.raises(ConsentError):
        rec.transition(ConsentState.ACTIVE, AS_OF)                            # terminal: cannot revive


def test_unknown_scope_rejected():
    with pytest.raises(ValueError):
        ConsentRecord("u", "p", "c", frozenset({"everything"}))


def test_audit_entries_are_redacted():
    log = InMemoryAuditLog()
    log.record(AS_OF, "u1", "x", "mock", "ok", {"token": "abc", "amount": 5})
    assert log.entries[0].detail["token"] == "***" and log.entries[0].detail["amount"] == "***"


# ------------------------------------------------------------------ external context
def test_context_freshness_and_validation():
    s = ContextSignal("economic_indicator", "inflation", 21.0, "x", "verified_provider", AS_OF - timedelta(days=2),
                      timedelta(days=1))
    assert not s.is_fresh(AS_OF)
    assert not ContextSignal("calendar", "c", 1, "x", "verified_provider", AS_OF).is_fresh(AS_OF)  # no shelf life
    with pytest.raises(ValueError):
        ContextSignal("calendar", "c", 1, "x", "made_up", AS_OF)
    with pytest.raises(ValueError):
        ContextSignal("calendar", "c", 1, "x", "user_reported", AS_OF, confidence=2)
    with pytest.raises(Exception):
        ContextSignal("calendar", "c", 1, "x", "user_reported", AS_OF.replace(tzinfo=None))


def test_user_reported_context_keeps_origin():
    u = UserReportedContext()
    sig = u.add("upcoming_fee", "school fees in November", AS_OF)
    assert sig.origin == "user_reported" and sig.confidence is None and sig.is_fresh(AS_OF)


def test_bayse_adapter_missing_or_broken_signal_is_absent_not_neutral():
    assert BayseStressContext(lambda: {}).fetch(AS_OF) == []
    assert BayseStressContext(lambda: {"score": "x"}).fetch(AS_OF) == []
    def boom(): raise RuntimeError("down")
    assert BayseStressContext(boom).fetch(AS_OF) == []
    sig = BayseStressContext(lambda: {"score": 72}).fetch(AS_OF)[0]
    assert sig.value == 72.0 and sig.origin == "verified_provider" and sig.is_fresh(AS_OF)
