"""normalise(): turn provider rows into canonical Events.

Pure: no clock, no database, no network. `as_of` is supplied by the caller.
Rules (each has a named test in tests/twin/test_ledger.py):
  dedupe          same idempotency key collapses to one event
  pending->posted a posted row replaces a pending row with the same key
  reversal        a row that reverses another marks the original REVERSED
  own transfer    equal-and-opposite posted rows on two own accounts within a window
  rejection       missing/naive/future timestamps, missing/zero amounts, unknown status
Nothing is silently dropped: every rejected row is returned with a reason.
"""
from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from domain.clock import NaiveDatetimeError, require_aware
from domain.events import (Event, EventKind, EventStatus, Provenance, RawTransaction,
                           idem_key, payload_hash)

_STATUS = {"pending": EventStatus.PENDING, "posted": EventStatus.POSTED,
           "completed": EventStatus.POSTED, "reversed": EventStatus.REVERSED,
           "failed": EventStatus.FAILED}
FUTURE_GRACE = timedelta(minutes=5)


@dataclass(frozen=True)
class NormaliseResult:
    events: Tuple[Event, ...]
    rejected: Tuple[Tuple[int, str], ...]       # (input index, reason)
    duplicates_dropped: int
    unmatched_reversals: Tuple[str, ...]        # event ids of reversals whose original is unknown


def _key_for(r: RawTransaction) -> str:
    fallback = {"ts": r.occurred_at.isoformat() if r.occurred_at else None,
                "amt": r.amount.minor if r.amount else None,
                "ccy": r.amount.currency if r.amount else None,
                "desc": r.description}
    return idem_key(r.provider, r.account_id, r.provider_ref, fallback)


def _rank(s: EventStatus) -> int:
    return 0 if s is EventStatus.PENDING else 1


def normalise(raw_rows: Iterable[RawTransaction], as_of: datetime,
              own_account_ids: Sequence[str] = (), transfer_window: timedelta = timedelta(hours=48)
              ) -> NormaliseResult:
    require_aware(as_of, "as_of")
    rejected: List[Tuple[int, str]] = []
    chosen: Dict[str, Event] = {}
    dups = 0

    for i, r in enumerate(raw_rows):
        if r.amount is None:
            rejected.append((i, "missing_amount")); continue
        if r.amount.minor == 0:
            rejected.append((i, "zero_amount")); continue
        if r.occurred_at is None:
            rejected.append((i, "missing_timestamp")); continue
        try:
            require_aware(r.occurred_at)
        except NaiveDatetimeError:
            rejected.append((i, "naive_timestamp")); continue
        if r.occurred_at > as_of + FUTURE_GRACE:
            rejected.append((i, "future_timestamp")); continue
        status = _STATUS.get((r.status or "").lower())
        if status is None:
            rejected.append((i, "unknown_status")); continue

        key = _key_for(r)
        kind = EventKind.INCOME if r.amount.minor > 0 else EventKind.EXPENSE
        missing = tuple(n for n, v in (("description", r.description), ("merchant", r.merchant),
                                       ("category", r.category)) if not v)
        if r.time_precision == "date":
            missing += ("time_of_day",)
        ev = Event(id=key, account_id=r.account_id, occurred_at=r.occurred_at, amount=r.amount,
                   status=status, kind=kind,
                   provenance=Provenance(r.provider, r.provider_ref, payload_hash(r.payload)),
                   description=r.description, merchant=r.merchant, category=r.category,
                   category_confidence=r.category_confidence, missing_fields=missing)
        if r.reverses_ref:
            ev = replace(ev, kind=EventKind.REVERSAL, reverses_id=f"ref:{r.provider}|{r.account_id}|{r.reverses_ref}")
        prev = chosen.get(key)
        if prev is None:
            chosen[key] = ev
        else:
            dups += 1
            if _rank(ev.status) > _rank(prev.status):   # posted replaces pending
                chosen[key] = ev

    events = list(chosen.values())
    events, unmatched = _apply_reversals(events)
    events = _pair_own_transfers(events, set(own_account_ids), transfer_window)
    events.sort(key=lambda e: (e.occurred_at, e.id))
    return NormaliseResult(tuple(events), tuple(rejected), dups, tuple(unmatched))


def _apply_reversals(events: List[Event]) -> Tuple[List[Event], List[str]]:
    by_ref: Dict[str, int] = {}
    for idx, e in enumerate(events):
        if e.provenance.provider_ref and e.kind is not EventKind.REVERSAL:
            by_ref[f"ref:{e.provenance.provider}|{e.account_id}|{e.provenance.provider_ref}"] = idx
    unmatched: List[str] = []
    for idx, e in enumerate(events):
        if e.kind is not EventKind.REVERSAL:
            continue
        j = by_ref.get(e.reverses_id or "")
        if j is None:
            events[idx] = replace(e, reverses_id=None, missing_fields=e.missing_fields + ("reverses_id",))
            unmatched.append(e.id)
        else:
            events[idx] = replace(e, reverses_id=events[j].id)
            events[j] = replace(events[j], status=EventStatus.REVERSED)
    return events, unmatched


def _pair_own_transfers(events: List[Event], own: set, window: timedelta) -> List[Event]:
    if len(own) < 2:
        return events
    cand = [i for i, e in enumerate(events)
            if e.status is EventStatus.POSTED and e.kind in (EventKind.INCOME, EventKind.EXPENSE)
            and e.account_id in own]
    debits = [i for i in cand if events[i].amount.minor < 0]
    credits = [i for i in cand if events[i].amount.minor > 0]
    used = set()
    for d in sorted(debits, key=lambda i: events[i].occurred_at):
        best: Optional[int] = None
        best_gap: Optional[timedelta] = None
        for c in credits:
            if c in used:
                continue
            ed, ec = events[d], events[c]
            if ec.account_id == ed.account_id or ec.amount.currency != ed.amount.currency:
                continue
            if ec.amount.minor != -ed.amount.minor:
                continue
            gap = abs(ec.occurred_at - ed.occurred_at)
            if gap <= window and (best_gap is None or gap < best_gap):
                best, best_gap = c, gap
        if best is not None:
            used.add(best)
            ed, ec = events[d], events[best]
            events[d] = replace(ed, kind=EventKind.TRANSFER_OWN, transfer_pair_id=ec.id)
            events[best] = replace(ec, kind=EventKind.TRANSFER_OWN, transfer_pair_id=ed.id)
    return events
