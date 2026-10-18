"""Income stability, emergency cushion, and safe flexible spending.

All formulas below are PROPOSED (not yet validated against real user data). When stability cannot be
computed, the cushion assumes the *least* stable case (S = 0): unknown must not look safe.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from fractions import Fraction
from typing import Optional, Sequence

from domain.money import Money

CUSHION_STEP = 500_00  # round up to the next 500 naira (in kobo)


@dataclass(frozen=True)
class Stability:
    score: Optional[Fraction]      # 0..1, None when there is no income history
    cv: Optional[float]
    months_observed: int
    note: str


def income_stability(monthly_totals: Sequence[Money], timing_hits: int, timing_expected: int) -> Stability:
    n = len(monthly_totals)
    if n == 0:
        return Stability(None, None, 0, "no income history")
    vals = [m.minor for m in monthly_totals]
    mean = sum(vals) / n
    if mean <= 0:
        return Stability(None, None, n, "non-positive mean income")
    cv = math.sqrt(sum((v - mean) ** 2 for v in vals) / n) / mean
    amount = 1 - min(1.0, cv / 0.35)
    timing = (timing_hits / timing_expected) if timing_expected else 0.0
    coverage = min(1.0, n / 6)
    s = 0.45 * amount + 0.35 * timing + 0.20 * coverage
    return Stability(Fraction(s).limit_denominator(10_000), cv, n, "ok")


def required_cushion(essential_per_day: Optional[Fraction], stability: Optional[Fraction],
                     safety_days: int = 7, known_shock: Optional[Money] = None, currency: str = "NGN"):
    """Returns (cushion Money or None, assumptions tuple). None when essential spend is unknown."""
    if essential_per_day is None:
        return None, ("essential spend unknown",)
    assumptions = []
    s = stability
    if s is None:
        s = Fraction(0)
        assumptions.append("stability unknown: assumed least stable (S=0)")
    factor = 1 + Fraction(1, 2) * (1 - s)
    raw = Fraction(essential_per_day) * safety_days * factor + (known_shock.minor if known_shock else 0)
    minor = -(-raw.numerator // raw.denominator)  # ceil
    step = CUSHION_STEP
    return Money(-(-minor // step) * step, currency), tuple(assumptions)


def safe_flexible(total: Money, obligations_h: Money, essentials_h: Money, cushion: Money,
                  goals_h: Money, income_credit_h: Money) -> Money:
    """Money that can be spent freely over the horizon without touching bills, essentials, cushion or goals."""
    raw = total + income_credit_h - obligations_h - essentials_h - cushion - goals_h
    return Money(max(0, raw.minor), total.currency)
