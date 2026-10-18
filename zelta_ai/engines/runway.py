"""Day-by-day forecast, runway, and what-if scenarios. Deterministic and exact (Fractions).

A day-step: balance -= burn, balance -= obligations due that day, balance += credited income.
Runway interpolates inside the day the balance crosses the floor.
Scenario multipliers are PROPOSED; see docs/RESEARCH.md for what is and is not validated.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from fractions import Fraction
from typing import Dict, List, Optional, Sequence, Tuple

from domain.clock import lagos_date, require_aware
from domain.money import Money, round_fraction


@dataclass(frozen=True)
class Obligation:
    name: str
    amount: Money
    due: date


@dataclass(frozen=True)
class IncomeStream:
    name: str
    typical: Money
    low: Money
    high: Money
    next_expected: date
    hit_rate: float        # P(arrives within the expected window); a prior unless measured


CASES: Dict[str, Tuple[Fraction, float, int]] = {
    # case: (burn multiplier, minimum hit_rate to count the income, delay in days)
    "conservative": (Fraction(11, 10), 0.85, 3),
    "baseline": (Fraction(1), 0.60, 0),
    "optimistic": (Fraction(23, 25), 0.40, 0),
}


@dataclass(frozen=True)
class ForecastResult:
    case: str
    series: Tuple[Tuple[date, Money], ...]
    runout_day: Optional[int]       # 1-based day the balance first reaches <= 0
    min_balance: Money
    min_day: int

    def balance_on_day(self, k: int) -> Money:
        return self.series[min(k, len(self.series)) - 1][1]


@dataclass(frozen=True)
class RunwayResult:
    days: Optional[float]           # None = unknown (no burn estimate)
    capped: bool                    # True when the balance never crossed within the horizon
    horizon: int
    confidence: str


def forecast(total: Money, as_of: datetime, per_day: Fraction, obligations: Sequence[Obligation],
             streams: Sequence[IncomeStream] = (), horizon: int = 30, case: str = "baseline") -> ForecastResult:
    require_aware(as_of, "as_of")
    if case not in CASES:
        raise ValueError(f"unknown case {case!r}")
    if horizon < 1:
        raise ValueError("horizon must be >= 1")
    mult, p_min, delay = CASES[case]
    start = lagos_date(as_of)
    bal = Fraction(total.minor)
    series: List[Tuple[date, Money]] = []
    runout: Optional[int] = None
    for k in range(1, horizon + 1):
        day = start + timedelta(days=k)
        bal -= Fraction(per_day) * mult
        bal -= sum(o.amount.minor for o in obligations if o.due == day)
        for s in streams:
            if s.hit_rate >= p_min and s.next_expected + timedelta(days=delay) == day:
                bal += {"conservative": s.low, "baseline": s.typical, "optimistic": s.high}[case].minor
        series.append((day, round_fraction(bal, total.currency)))
        if runout is None and bal <= 0:
            runout = k
    low_idx = min(range(len(series)), key=lambda i: series[i][1].minor)
    return ForecastResult(case, tuple(series), runout, series[low_idx][1], low_idx + 1)


def runway_days(total: Money, as_of: datetime, per_day: Optional[Fraction], obligations: Sequence[Obligation],
                floor: Optional[Money] = None, horizon: int = 120, confidence: str = "high") -> RunwayResult:
    """Days until balance (minus `floor`) reaches zero, counting dated obligations but no income."""
    if per_day is None:
        return RunwayResult(None, False, horizon, "insufficient")
    require_aware(as_of, "as_of")
    start_bal = Fraction(total.minor - (floor.minor if floor else 0))
    if start_bal <= 0:
        return RunwayResult(0.0, False, horizon, confidence)
    start = lagos_date(as_of)
    prev = start_bal
    for k in range(1, horizon + 1):
        day = start + timedelta(days=k)
        cur = prev - Fraction(per_day) - sum(o.amount.minor for o in obligations if o.due == day)
        if cur <= 0:
            frac = prev / (prev - cur) if prev > cur else Fraction(1)
            return RunwayResult(float((k - 1) + frac), False, horizon, confidence)
        prev = cur
    return RunwayResult(float(horizon), True, horizon, confidence)


# ---------------------------------------------------------------------------- what-if
class InvalidScenario(ValueError):
    pass


@dataclass(frozen=True)
class WhatIfResult:
    base: RunwayResult
    scenario: RunwayResult
    base_forecast: ForecastResult
    scenario_forecast: ForecastResult
    notes: Tuple[str, ...]


def what_if(total: Money, as_of: datetime, per_day: Fraction, obligations: Sequence[Obligation],
            streams: Sequence[IncomeStream], kind: str, amount: Money, horizon: int = 30) -> WhatIfResult:
    """kind: spend_less_weekly | spend_more_weekly | receive | purchase | unexpected_expense."""
    if amount.currency != total.currency:
        raise InvalidScenario("scenario currency differs from the balance currency")
    if amount.minor <= 0:
        raise InvalidScenario("scenario amount must be positive")
    t, b, notes = total, Fraction(per_day), []
    weekly = Fraction(amount.minor, 7)
    if kind == "spend_less_weekly":
        if weekly > b:
            raise InvalidScenario("cannot cut more per week than is currently spent per week")
        b -= weekly
    elif kind == "spend_more_weekly":
        b += weekly
    elif kind == "receive":
        t = total + amount
    elif kind in ("purchase", "unexpected_expense"):
        t = total - amount
        if t.is_negative():
            notes.append("this exceeds connected money; the balance would be negative immediately")
    else:
        raise InvalidScenario(f"unknown scenario kind {kind!r}")
    base_f = forecast(total, as_of, per_day, obligations, streams, horizon)
    scen_f = forecast(t, as_of, b, obligations, streams, horizon)
    return WhatIfResult(runway_days(total, as_of, per_day, obligations),
                        runway_days(t, as_of, b, obligations), base_f, scen_f, tuple(notes))
