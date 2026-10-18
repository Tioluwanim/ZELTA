"""Canonical, provider-independent records.

RawTransaction  : what an adapter extracted from a provider, plus the untouched payload.
Event           : the normalised ledger entry ZELTA's engines read.
Sign convention : inflow positive, outflow negative (Money.minor).
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Mapping, Optional, Tuple

from .money import Money


class EventStatus(str, Enum):
    PENDING = "pending"
    POSTED = "posted"
    REVERSED = "reversed"   # an original that a later reversal cancelled
    FAILED = "failed"


class EventKind(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER_OWN = "transfer_own"   # between the user's own connected accounts
    REVERSAL = "reversal"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class Provenance:
    provider: str
    provider_ref: Optional[str]      # provider's own id, if any
    payload_hash: str                # hash of the original provider record (kept for audit)
    received_at: Optional[datetime] = None


def payload_hash(payload: Mapping[str, Any]) -> str:
    blob = json.dumps(payload, sort_keys=True, default=str, separators=(",", ":"))
    return hashlib.sha256(blob.encode()).hexdigest()


@dataclass(frozen=True)
class RawTransaction:
    """Adapter output. Fields may be None; normalisation decides what is acceptable."""
    provider: str
    account_id: str
    amount: Optional[Money]              # signed: debit negative, credit positive
    occurred_at: Optional[datetime]      # aware instant, if the provider gave one
    status: str = "posted"               # provider-neutral hint: pending|posted|reversed|failed
    provider_ref: Optional[str] = None
    description: Optional[str] = None
    merchant: Optional[str] = None
    category: Optional[str] = None
    category_confidence: Optional[float] = None
    reverses_ref: Optional[str] = None   # provider_ref of the original this row reverses
    time_precision: str = "instant"      # "instant" or "date" (provider gave only a day, no time)
    payload: Mapping[str, Any] = field(default_factory=dict)  # original record, untouched


@dataclass(frozen=True)
class Event:
    id: str                       # stable: equals idem_key
    account_id: str
    occurred_at: datetime
    amount: Money                 # signed
    status: EventStatus
    kind: EventKind
    provenance: Provenance
    description: Optional[str] = None
    merchant: Optional[str] = None
    category: Optional[str] = None
    category_confidence: Optional[float] = None
    reverses_id: Optional[str] = None
    transfer_pair_id: Optional[str] = None
    missing_fields: Tuple[str, ...] = ()

    def counts_in_flows(self) -> bool:
        """Only posted income/expense affect burn and net cash flow."""
        return self.status is EventStatus.POSTED and self.kind in (EventKind.INCOME, EventKind.EXPENSE)


@dataclass(frozen=True)
class Account:
    id: str
    provider: str
    institution: str
    account_ref: str                       # provider-stable account identity (for duplicate detection)
    balance: Optional[Money]               # None = unknown, never "zero"
    balance_as_of: Optional[datetime]
    active: bool = True
    pending_debits: Optional[Money] = None


def idem_key(provider: str, account_id: str, provider_ref: Optional[str], fallback: Mapping[str, Any]) -> str:
    """Stable idempotency key: provider id when present, else a hash of identifying fields."""
    base = provider_ref if provider_ref else payload_hash(fallback)
    return hashlib.sha256(f"{provider}|{account_id}|{base}".encode()).hexdigest()[:32]
