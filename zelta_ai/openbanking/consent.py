"""Consent lifecycle and least-privilege scope checks.

States: PENDING -> ACTIVE -> (REAUTH_REQUIRED -> ACTIVE) | WITHDRAWN | REVOKED | EXPIRED.
Terminal states cannot be re-activated: a new consent must be created.
This is a data-access gate, not legal compliance: regulatory requirements are listed in docs/SECURITY.md.
"""
from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
from enum import Enum
from typing import Dict, FrozenSet, Optional, Protocol, Tuple

from domain.clock import require_aware

SCOPES = frozenset({"accounts", "balances", "transactions", "identity"})


class ConsentError(PermissionError):
    pass


class ConsentState(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    REAUTH_REQUIRED = "reauth_required"
    WITHDRAWN = "withdrawn"     # the user withdrew consent
    REVOKED = "revoked"         # ZELTA or the provider revoked access
    EXPIRED = "expired"


_ALLOWED = {
    ConsentState.PENDING: {ConsentState.ACTIVE, ConsentState.WITHDRAWN, ConsentState.REVOKED},
    ConsentState.ACTIVE: {ConsentState.REAUTH_REQUIRED, ConsentState.WITHDRAWN, ConsentState.REVOKED,
                          ConsentState.EXPIRED},
    ConsentState.REAUTH_REQUIRED: {ConsentState.ACTIVE, ConsentState.WITHDRAWN, ConsentState.REVOKED,
                                   ConsentState.EXPIRED},
    ConsentState.WITHDRAWN: set(), ConsentState.REVOKED: set(), ConsentState.EXPIRED: set(),
}


@dataclass(frozen=True)
class ConsentRecord:
    user_id: str
    provider: str
    connection_ref: str
    scopes: FrozenSet[str]
    state: ConsentState = ConsentState.PENDING
    granted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    def __post_init__(self):
        bad = set(self.scopes) - SCOPES
        if bad:
            raise ValueError(f"unknown scopes: {sorted(bad)}")

    def transition(self, to: ConsentState, at: datetime) -> "ConsentRecord":
        require_aware(at, "at")
        if to not in _ALLOWED[self.state]:
            raise ConsentError(f"illegal consent transition {self.state.value} -> {to.value}")
        return replace(self, state=to, granted_at=at if to is ConsentState.ACTIVE and self.granted_at is None
                       else self.granted_at)


class ConsentStore(Protocol):
    def get(self, user_id: str, provider: str) -> Optional[ConsentRecord]: ...
    def put(self, record: ConsentRecord) -> None: ...


class InMemoryConsentStore:
    def __init__(self):
        self._d: Dict[Tuple[str, str], ConsentRecord] = {}

    def get(self, user_id, provider):
        return self._d.get((user_id, provider))

    def put(self, record):
        self._d[(record.user_id, record.provider)] = record


def require_consent(store: ConsentStore, user_id: str, provider: str, scope: str, as_of: datetime
                    ) -> ConsentRecord:
    """Raise ConsentError unless an ACTIVE, unexpired consent covers `scope`. Used before any data access."""
    require_aware(as_of, "as_of")
    rec = store.get(user_id, provider)
    if rec is None:
        raise ConsentError("no consent on record")
    if rec.expires_at is not None and as_of >= rec.expires_at:
        raise ConsentError("consent expired")
    if rec.state is not ConsentState.ACTIVE:
        raise ConsentError(f"consent is {rec.state.value}")
    if scope not in rec.scopes:
        raise ConsentError(f"scope '{scope}' not granted")
    return rec


def withdraw(store: ConsentStore, provider_obj, user_id: str, provider: str, at: datetime) -> ConsentRecord:
    """Withdraw consent: mark it WITHDRAWN first (fail closed), then ask the provider to disconnect."""
    rec = store.get(user_id, provider)
    if rec is None:
        raise ConsentError("no consent on record")
    updated = rec.transition(ConsentState.WITHDRAWN, at)
    store.put(updated)
    provider_obj.revoke(rec.connection_ref)
    return updated
