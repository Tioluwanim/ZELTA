"""Can the user afford a spend without touching bills, essentials or the emergency cushion?

Verdicts are conservative: unknown inputs give 'unknown', never 'within_safe_flexible'.
This is a feasibility check on money, not a behavioural score (the earlier 'Guardian' score is not ported).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from fractions import Fraction
from typing import Optional, Sequence, Tuple

from domain.clock import lagos_date
from domain.money import Money, round_fraction
from .cushion import safe_flexible
from .runway import Obligation


@dataclass(frozen=True)
class Affordability:
    verdict: str                    # within_safe_flexible | uses_cushion | exceeds_connected_money | unknown
    safe_flexible: Optional[Money]
    horizon_days: int
    reasons: Tuple[str, ...]


def affordability(total: Optional[Money], as_of: datetime, amount: Money,
                  obligations: Sequence[Obligation], essential_per_day: Optional[Fraction],
                  cushion: Optional[Money], horizon_days: int = 14, goals: Optional[Money] = None) -> Affordability:
    if amount.minor <= 0:
        raise ValueError("amount must be positive")
    if total is None:
        return Affordability("unknown", None, horizon_days, ("connected money is unknown",))
    if amount.currency != total.currency:
        raise ValueError("currency mismatch")
    if amount > total:
        return Affordability("exceeds_connected_money", Money(0, total.currency), horizon_days,
                             ("amount is larger than all connected money",))
    if essential_per_day is None or cushion is None:
        return Affordability("unknown", None, horizon_days,
                             ("essential spend or cushion cannot be estimated from the available history",))
    start = lagos_date(as_of)
    end = start + timedelta(days=horizon_days)
    obl = Money(sum(o.amount.minor for o in obligations if start <= o.due <= end), total.currency)
    ess = round_fraction(Fraction(essential_per_day) * horizon_days, total.currency)
    sf = safe_flexible(total, obl, ess, cushion, goals or Money(0, total.currency), Money(0, total.currency))
    reasons = (f"bills due within {horizon_days} days: {obl}", f"essentials for {horizon_days} days: {ess}",
               f"emergency cushion: {cushion}")
    if amount <= sf:
        return Affordability("within_safe_flexible", sf, horizon_days, reasons)
    return Affordability("uses_cushion", sf, horizon_days,
                         reasons + ("amount is above safe flexible spending, so it would dip into the cushion or bills",))
