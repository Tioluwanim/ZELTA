"""Bank-link lifecycle (Day 14): start -> complete -> sync -> webhook -> withdraw, with consent checked and every step audited.

STATUS: tested against fakes only. No live Mono call has ever been made from this code. Anything that depends on Mono's real
behaviour is marked UNVERIFIED below and must be confirmed against a sandbox before `is_live` is ever set.

Rules this module enforces:
  * No data is fetched without an ACTIVE, unexpired consent that covers the needed scopes (`require_consent`).
  * Missing credentials or a missing code exchanger raise NotConfigured. Success is never simulated.
  * A provider's "re-authorise" answer moves the consent to REAUTH_REQUIRED, so later syncs fail closed until the user reconnects.
  * Webhooks are authenticated with a constant-time secret check (fail closed with no secret), are idempotent by event id,
    and unknown event types are ignored (and audited), never acted on.
  * Audit entries are redacted before storage; raw provider payloads are never stored.
"""
from __future__ import annotations

import json
from collections import OrderedDict
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from typing import Any, Dict, FrozenSet, List, Mapping, Optional, Protocol, Tuple

from domain.clock import require_aware
from domain.events import Account, RawTransaction
from providers.base import FinancialProvider, NotConfigured, ProviderError, ReauthRequired
from .audit import AuditLog
from .consent import ConsentError, ConsentRecord, ConsentState, ConsentStore, require_consent, withdraw
from .secrets import SecretStr
from .webhook import MONO_HEADER, verify_shared_secret

DEFAULT_SCOPES = frozenset({"accounts", "balances", "transactions"})
CONSENT_DAYS = 90            # PROPOSED lifetime; the real limit depends on the provider and the regulator. Not validated.

# UNVERIFIED: Mono's real event names. Anything not listed is ignored on purpose.
EVENT_ACTIONS: Mapping[str, str] = {
    "mono.events.account_updated": "refresh",
    "mono.events.account_reauthorisation_required": "reauth",
}


class CodeExchanger(Protocol):
    """Turns the one-time code the bank-link widget returns into a connection reference. UNVERIFIED for Mono."""
    def exchange(self, code: str) -> str: ...


@dataclass(frozen=True)
class SyncResult:
    fetched_at: datetime
    accounts: Tuple[Account, ...]
    transactions: Dict[str, Tuple[RawTransaction, ...]]
    source: str                      # provider name; "live" is never claimed here
    live: bool


@dataclass(frozen=True)
class WebhookOutcome:
    accepted: bool
    action: str                      # refresh | reauth | ignored | duplicate | rejected
    event_id: Optional[str] = None
    connection_ref: Optional[str] = None


class LinkService:
    def __init__(self, provider: FinancialProvider, consents: ConsentStore, audit: AuditLog,
                 exchanger: Optional[CodeExchanger] = None, webhook_secret: Optional[SecretStr] = None,
                 seen_limit: int = 2048):
        self._p, self._c, self._a = provider, consents, audit
        self._x, self._secret = exchanger, webhook_secret
        self._seen: "OrderedDict[str, None]" = OrderedDict()
        self._seen_limit = seen_limit

    # -- consent lifecycle -------------------------------------------------------------------------------------------
    def start(self, user_id: str, at: datetime, scopes: FrozenSet[str] = DEFAULT_SCOPES) -> ConsentRecord:
        require_aware(at, "at")
        existing = self._c.get(user_id, self._p.name)
        if existing is not None and existing.state in (ConsentState.ACTIVE, ConsentState.REAUTH_REQUIRED):
            self._a.record(at, user_id, "link.start", self._p.name, "denied", {"reason": "already connected"})
            raise ConsentError("an account is already connected; withdraw it first")
        rec = ConsentRecord(user_id, self._p.name, "pending", frozenset(scopes), ConsentState.PENDING, None,
                            at + timedelta(days=CONSENT_DAYS))
        self._c.put(rec)
        self._a.record(at, user_id, "link.start", self._p.name, "ok", {"scopes": sorted(scopes)})
        return rec

    def complete(self, user_id: str, code: str, at: datetime) -> ConsentRecord:
        require_aware(at, "at")
        rec = self._c.get(user_id, self._p.name)
        if rec is None or rec.state is not ConsentState.PENDING:
            self._a.record(at, user_id, "link.complete", self._p.name, "denied", {"reason": "no pending link"})
            raise ConsentError("there is no pending link to complete")
        if rec.expires_at is not None and at >= rec.expires_at:
            self._a.record(at, user_id, "link.complete", self._p.name, "denied", {"reason": "expired"})
            raise ConsentError("this link request expired; start again")
        if self._x is None or not code:
            self._a.record(at, user_id, "link.complete", self._p.name, "error:not_configured")
            raise NotConfigured("bank linking is not configured")
        try:
            ref = self._x.exchange(code)
        except ProviderError as e:
            self._a.record(at, user_id, "link.complete", self._p.name, f"error:{e.code}")
            raise
        if not ref:
            self._a.record(at, user_id, "link.complete", self._p.name, "error:invalid_response")
            raise ProviderError("empty connection reference")
        active = replace(rec.transition(ConsentState.ACTIVE, at), connection_ref=ref)
        self._c.put(active)
        self._a.record(at, user_id, "link.complete", self._p.name, "ok")      # the code and ref are never logged
        return active

    def disconnect(self, user_id: str, at: datetime) -> ConsentRecord:
        try:
            rec = withdraw(self._c, self._p, user_id, self._p.name, at)
        except ConsentError:
            self._a.record(at, user_id, "link.withdraw", self._p.name, "denied")
            raise
        except ProviderError as e:                  # consent is already WITHDRAWN (fail closed); provider disconnect failed
            self._a.record(at, user_id, "link.withdraw", self._p.name, f"error:{e.code}", {"consent": "withdrawn"})
            raise
        self._a.record(at, user_id, "link.withdraw", self._p.name, "ok")
        return rec

    # -- data access ---------------------------------------------------------------------------------------------------
    def sync(self, user_id: str, as_of: datetime, since: Optional[datetime] = None) -> SyncResult:
        rec: Optional[ConsentRecord] = None
        try:
            rec = require_consent(self._c, user_id, self._p.name, "accounts", as_of)
            require_consent(self._c, user_id, self._p.name, "transactions", as_of)
        except ConsentError as e:
            self._a.record(as_of, user_id, "sync", self._p.name, "denied", {"reason": str(e)})
            raise
        try:
            accounts = self._p.list_accounts(rec.connection_ref, as_of)
            txns = {a.id: tuple(self._p.fetch_transactions(rec.connection_ref, a.id, since, as_of)) for a in accounts}
        except ReauthRequired:
            self._c.put(rec.transition(ConsentState.REAUTH_REQUIRED, as_of))
            self._a.record(as_of, user_id, "sync", self._p.name, "error:reauth_required")
            raise
        except ProviderError as e:
            self._a.record(as_of, user_id, "sync", self._p.name, f"error:{e.code}")
            raise
        if "balances" not in rec.scopes:             # least privilege: drop balances the user did not consent to share
            accounts = [replace(a, balance=None, balance_as_of=None) for a in accounts]
        self._a.record(as_of, user_id, "sync", self._p.name, "ok",
                       {"accounts": len(accounts), "transactions": sum(len(v) for v in txns.values())})
        return SyncResult(as_of, tuple(accounts), txns, self._p.name, self._p.is_live)

    # -- webhooks ----------------------------------------------------------------------------------------------------------
    def on_webhook(self, headers: Mapping[str, str], body: bytes, at: datetime) -> WebhookOutcome:
        """Authenticate, de-duplicate, and translate a provider event. Returns what to do; never raises on bad input."""
        require_aware(at, "at")
        lowered = {k.lower(): v for k, v in headers.items()}
        if not verify_shared_secret(lowered.get(MONO_HEADER), self._secret):
            self._a.record(at, "webhook", "webhook", self._p.name, "denied", {"reason": "bad or missing secret"})
            return WebhookOutcome(False, "rejected")
        try:
            doc = json.loads(body)
            if not isinstance(doc, dict):
                raise ValueError
        except (ValueError, UnicodeDecodeError):
            self._a.record(at, "webhook", "webhook", self._p.name, "error:invalid_response")
            return WebhookOutcome(False, "rejected")
        event = str(doc.get("event") or "")
        data: Dict[str, Any] = doc["data"] if isinstance(doc.get("data"), dict) else {}
        acct: Dict[str, Any] = data["account"] if isinstance(data.get("account"), dict) else {}
        ref = str(acct.get("id") or data.get("id") or "") or None                 # UNVERIFIED payload shape
        eid = str(doc.get("id") or data.get("event_id") or "") or None            # UNVERIFIED
        if eid is None:                                                           # cannot de-duplicate: refuse to act
            self._a.record(at, "webhook", "webhook", self._p.name, "denied", {"reason": "no event id", "event": event[:60]})
            return WebhookOutcome(False, "ignored")
        if eid in self._seen:
            return WebhookOutcome(True, "duplicate", eid, ref)
        self._seen[eid] = None
        while len(self._seen) > self._seen_limit:
            self._seen.popitem(last=False)
        action = EVENT_ACTIONS.get(event, "ignored")
        self._a.record(at, "webhook", "webhook", self._p.name, "ok", {"event": event[:60], "action": action})
        return WebhookOutcome(True, action, eid, ref)

    def apply_webhook(self, outcome: WebhookOutcome, user_id: str, at: datetime) -> None:
        """Act on an authenticated outcome for the user who owns the connection (the caller resolves the owner)."""
        rec = self._c.get(user_id, self._p.name)
        if rec is None or outcome.connection_ref not in (None, rec.connection_ref):
            self._a.record(at, "webhook", "webhook.apply", self._p.name, "denied", {"reason": "connection mismatch"})
            return
        if outcome.action == "reauth" and rec.state is ConsentState.ACTIVE:
            self._c.put(rec.transition(ConsentState.REAUTH_REQUIRED, at))
            self._a.record(at, user_id, "webhook.apply", self._p.name, "ok", {"action": "reauth"})
        elif outcome.action == "refresh":
            require_consent(self._c, user_id, self._p.name, "transactions", at)
            self._p.refresh(rec.connection_ref, "")            # UNVERIFIED: per-account refresh target
            self._a.record(at, user_id, "webhook.apply", self._p.name, "ok", {"action": "refresh"})
