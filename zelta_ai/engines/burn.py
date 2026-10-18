"""Burn (spend per day) that respects how much history actually exists.

Burn is per *covered* day, not per calendar day of the window: with 12 days of data we divide by 12,
not 28. Below MIN_COVERAGE_DAYS we refuse to produce a number (confidence 'insufficient').

PROPOSED, unvalidated on real data: blend weights 0.7 / 0.3 and the coverage thresholds.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from fractions import Fraction
from typing import Iterable, Optional, Sequence

from domain.clock import lagos_date, require_aware
from domain.events import Event, EventKind, EventStatus
from domain.money import Money, round_fraction

BLEND_28 = Fraction(7, 10)
BLEND_7 = Fraction(3, 10)
MIN_COVERAGE_DAYS = 7


@dataclass(frozen=True)
class BurnResult:
    per_day: Optional[Fraction]        # exact minor units per day; None when evidence is insufficient
    b28: Optional[Fraction]
    b7: Optional[Fraction]
    coverage_28: int
    coverage_7: int
    confidence: str                    # insufficient | low | medium | high
    currency: str = "NGN"
    reason: Optional[str] = None

    def per_day_money(self) -> Optional[Money]:
        return None if self.per_day is None else round_fraction(self.per_day, self.currency)


def coverage_days(first_observed: date, as_of: datetime, window_days: int) -> int:
    end = lagos_date(as_of)
    start = max(end - timedelta(days=window_days), first_observed)
    return max(0, (end - start).days)


def first_observed_from(events: Sequence[Event]) -> Optional[date]:
    """Fallback only: the earliest event day. Prefer the real connection date from the provider."""
    return min((lagos_date(e.occurred_at) for e in events), default=None)


def _spend_in_window(events: Iterable[Event], as_of: datetime, days: int, currency: str,
                     only_categories: Optional[frozenset] = None) -> int:
    end = lagos_date(as_of)
    start = end - timedelta(days=days)
    total = 0
    for e in events:
        if not (e.status is EventStatus.POSTED and e.kind is EventKind.EXPENSE):
            continue
        if e.amount.currency != currency:
            continue
        if not (start <= lagos_date(e.occurred_at) < end):
            continue
        if only_categories is not None and (e.category or "") not in only_categories:
            continue
        total += -e.amount.minor
    return total


def burn(events: Sequence[Event], as_of: datetime, first_observed: Optional[date],
         currency: str = "NGN") -> BurnResult:
    require_aware(as_of, "as_of")
    if first_observed is None:
        return BurnResult(None, None, None, 0, 0, "insufficient", currency, "no_history")
    c28 = coverage_days(first_observed, as_of, 28)
    c7 = coverage_days(first_observed, as_of, 7)
    if c28 < MIN_COVERAGE_DAYS:
        return BurnResult(None, None, None, c28, c7, "insufficient", currency,
                          f"only {c28} covered days, need {MIN_COVERAGE_DAYS}")
    b28 = Fraction(_spend_in_window(events, as_of, 28, currency), c28)
    b7 = Fraction(_spend_in_window(events, as_of, 7, currency), c7) if c7 else b28
    blend = BLEND_28 * b28 + BLEND_7 * b7
    conf = "high" if c28 >= 28 else "medium" if c28 >= 14 else "low"
    return BurnResult(blend, b28, b7, c28, c7, conf, currency)


def essential_per_day(events: Sequence[Event], as_of: datetime, first_observed: Optional[date],
                      essential_categories: Iterable[str], currency: str = "NGN") -> Optional[Fraction]:
    """Daily spend on categories the caller classifies as essential (None if evidence is insufficient)."""
    if first_observed is None:
        return None
    c28 = coverage_days(first_observed, as_of, 28)
    if c28 < MIN_COVERAGE_DAYS:
        return None
    cats = frozenset(essential_categories)
    return Fraction(_spend_in_window(events, as_of, 28, currency, cats), c28)


def net_cash_flow(events: Sequence[Event], as_of: datetime, days: int, currency: str = "NGN"):
    """Inflow/outflow over the window, excluding own transfers, reversals, pending and failed rows."""
    end = lagos_date(as_of)
    start = end - timedelta(days=days)
    inflow = outflow = 0
    for e in events:
        if not e.counts_in_flows() or e.amount.currency != currency:
            continue
        if not (start <= lagos_date(e.occurred_at) < end):
            continue
        if e.amount.minor > 0:
            inflow += e.amount.minor
        else:
            outflow += -e.amount.minor
    return Money(inflow, currency), Money(outflow, currency), Money(inflow - outflow, currency)
