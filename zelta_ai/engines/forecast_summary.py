"""Day 8: forecast view. as_of and timezone are always explicit; there is no clock read here.

Builds on the day-by-day `forecast()`. Income counts only per the case rules in runway.CASES. Goal trajectory
is a surplus check against the baseline path, not a savings prediction.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from fractions import Fraction
from typing import Dict, Optional, Sequence, Tuple

from domain.clock import lagos_date, require_aware
from domain.money import Money
from engines.runway import ForecastResult, IncomeStream, Obligation, forecast
from engines.position import Goal

SUPPORTED_TZ = "Africa/Lagos"


@dataclass(frozen=True)
class IncomeEffect:
    stream: str
    arrives: date
    runout_day_without: Optional[int]
    runout_day_with: Optional[int]
    balance_gain_at_horizon: Money


@dataclass(frozen=True)
class GoalTrajectory:
    name: str
    status: str                   # on_track | off_track | beyond_horizon | complete
    projected_surplus: Optional[Money]
    remaining: Money


@dataclass(frozen=True)
class ForecastSummary:
    as_of: datetime
    timezone: str
    horizon: int
    expected_balance: Dict[int, Money]            # days ahead -> baseline balance
    likely_runout: Optional[date]                 # baseline
    runout_range: Tuple[Optional[date], Optional[date]]   # (conservative, optimistic)
    upcoming_expenses: Tuple[Obligation, ...]
    next_income: Optional[IncomeEffect]
    goals: Tuple[GoalTrajectory, ...]
    first_below_minimum: Optional[date]
    first_below_cushion: Optional[date]
    notes: Tuple[str, ...]


def _runout_date(f: ForecastResult, start: date) -> Optional[date]:
    return None if f.runout_day is None else f.series[f.runout_day - 1][0]


def _first_below(f: ForecastResult, threshold: Optional[Money]) -> Optional[date]:
    if threshold is None:
        return None
    for d, b in f.series:
        if b < threshold:
            return d
    return None


def forecast_summary(total: Optional[Money], as_of: datetime, per_day: Optional[Fraction],
                     obligations: Sequence[Obligation], streams: Sequence[IncomeStream] = (),
                     goals: Sequence[Goal] = (), minimum_safe: Optional[Money] = None,
                     cushion: Optional[Money] = None, horizon: int = 30,
                     timezone: str = SUPPORTED_TZ) -> Optional[ForecastSummary]:
    """None when balance or burn is unknown: the caller must say 'not enough data', not guess."""
    require_aware(as_of, "as_of")
    if timezone != SUPPORTED_TZ:
        raise ValueError(f"unsupported timezone {timezone!r}; only {SUPPORTED_TZ} is implemented")
    if total is None or per_day is None:
        return None
    start = lagos_date(as_of)
    base = forecast(total, as_of, per_day, obligations, streams, horizon, "baseline")
    cons = forecast(total, as_of, per_day, obligations, streams, horizon, "conservative")
    opt = forecast(total, as_of, per_day, obligations, streams, horizon, "optimistic")
    marks = {k: base.balance_on_day(k) for k in (7, 14, 30) if k <= horizon}
    upcoming = tuple(sorted((o for o in obligations if 0 < (o.due - start).days <= horizon),
                            key=lambda o: o.due))

    effect: Optional[IncomeEffect] = None
    pending = sorted((s for s in streams if 0 < (s.next_expected - start).days <= horizon),
                     key=lambda s: s.next_expected)
    if pending:
        s = pending[0]
        without = forecast(total, as_of, per_day, obligations, [x for x in streams if x is not s], horizon)
        effect = IncomeEffect(s.name, s.next_expected, without.runout_day, base.runout_day,
                              base.series[-1][1] - without.series[-1][1])

    gt = []
    for g in goals:
        remaining = Money(max(0, g.target.minor - g.saved.minor), g.target.currency)
        if remaining.minor == 0:
            gt.append(GoalTrajectory(g.name, "complete", None, remaining))
            continue
        days = (g.deadline - start).days
        if days > horizon or days < 1:
            gt.append(GoalTrajectory(g.name, "beyond_horizon" if days > horizon else "off_track", None, remaining))
            continue
        surplus = base.balance_on_day(days) - (cushion or Money(0, total.currency))
        surplus = Money(max(0, surplus.minor), total.currency)
        gt.append(GoalTrajectory(g.name, "on_track" if surplus >= remaining else "off_track", surplus, remaining))

    notes = ["projection uses proposed case multipliers; it is a what-could-happen path, not a prediction"]
    if not streams:
        notes.append("no expected income was supplied: the path assumes none")
    return ForecastSummary(as_of, timezone, horizon, marks, _runout_date(base, start),
                           (_runout_date(cons, start), _runout_date(opt, start)), upcoming, effect, tuple(gt),
                           _first_below(base, minimum_safe), _first_below(base, cushion), tuple(notes))
