"""Day 9: cost buffer (safety layer). Used by the forecast (breach day) and, later, by Guardian.

PROPOSED constants, not validated: minimum safe = essentials for 3 days + bills due in the next 7 days.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from fractions import Fraction
from typing import Optional, Sequence, Tuple

from domain.clock import lagos_date, require_aware
from domain.money import Money, round_fraction
from engines.runway import Obligation

MIN_SAFE_ESSENTIAL_DAYS = 3
MIN_SAFE_BILL_LOOKAHEAD_DAYS = 7


@dataclass(frozen=True)
class BufferResult:
    status: str                              # unknown | below_minimum | below_cushion | healthy
    minimum_safe: Optional[Money]
    cushion: Optional[Money]
    buffer_after_obligations: Optional[Money]   # total minus bills due within the horizon (signed)
    flexible_room: Optional[Money]
    notes: Tuple[str, ...]


def minimum_safe_amount(essential_per_day: Optional[Fraction], obligations: Sequence[Obligation], as_of: datetime,
                        currency: str = "NGN") -> Optional[Money]:
    require_aware(as_of, "as_of")
    if essential_per_day is None:
        return None
    today = lagos_date(as_of)
    bills = sum(o.amount.minor for o in obligations
                if 0 < (o.due - today).days <= MIN_SAFE_BILL_LOOKAHEAD_DAYS and o.amount.currency == currency)
    return round_fraction(Fraction(essential_per_day) * MIN_SAFE_ESSENTIAL_DAYS, currency) + Money(bills, currency)


def buffer_status(total: Optional[Money], essential_per_day: Optional[Fraction], cushion: Optional[Money],
                  obligations: Sequence[Obligation], as_of: datetime, flexible_room: Optional[Money] = None,
                  horizon: int = 30, currency: str = "NGN") -> BufferResult:
    require_aware(as_of, "as_of")
    today = lagos_date(as_of)
    min_safe = minimum_safe_amount(essential_per_day, obligations, as_of, currency)
    if total is None:
        return BufferResult("unknown", min_safe, cushion, None, flexible_room,
                            ("connected money unknown: buffer not assessed",))
    due = sum(o.amount.minor for o in obligations
              if 0 < (o.due - today).days <= horizon and o.amount.currency == currency)
    after = total - Money(due, currency)
    if min_safe is None or cushion is None:
        return BufferResult("unknown", min_safe, cushion, after, flexible_room,
                            ("essential spend unknown: thresholds not computed",))
    status = ("below_minimum" if after < min_safe else "below_cushion" if after < cushion else "healthy")
    return BufferResult(status, min_safe, cushion, after, flexible_room, ())
