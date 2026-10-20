"""Day 6: current financial position. Pure and deterministic; unknown stays None (never zero).

Horizon constants and the linear goal-funding rule are PROPOSED, not validated.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from fractions import Fraction
from typing import Optional, Sequence, Tuple

from domain.clock import lagos_date, require_aware
from domain.events import Event
from domain.money import Money, round_fraction
from engines.burn import net_cash_flow
from engines.cushion import safe_flexible
from engines.runway import Obligation

HORIZON_DAYS = 30


@dataclass(frozen=True)
class Goal:
    name: str
    target: Money
    deadline: date
    saved: Money


@dataclass(frozen=True)
class GoalNeed:
    name: str
    remaining: Money
    days_left: int
    per_week: Optional[Money]      # None when the deadline has passed (whole remainder is due now)
    required_in_horizon: Money
    overdue: bool


def goal_need(goal: Goal, as_of: datetime, horizon: int = HORIZON_DAYS) -> GoalNeed:
    require_aware(as_of, "as_of")
    cur = goal.target.currency
    remaining = Money(max(0, goal.target.minor - goal.saved.minor), cur)
    days_left = (goal.deadline - lagos_date(as_of)).days
    if remaining.minor == 0:
        return GoalNeed(goal.name, remaining, max(days_left, 0), Money(0, cur), Money(0, cur), False)
    if days_left <= 0:
        return GoalNeed(goal.name, remaining, 0, None, remaining, True)
    per_week = round_fraction(Fraction(remaining.minor * 7, days_left), cur)
    due = round_fraction(Fraction(remaining.minor * min(horizon, days_left), days_left), cur)
    return GoalNeed(goal.name, remaining, days_left, per_week, due, False)


@dataclass(frozen=True)
class Position:
    total: Optional[Money]
    inflow_28d: Money
    outflow_28d: Money
    net_28d: Money
    obligations_horizon: Money
    obligations_count: int
    available_after_obligations: Optional[Money]   # signed: negative means a shortfall
    goals: Tuple[GoalNeed, ...]
    goals_required_horizon: Money
    cushion: Optional[Money]
    safe_flexible: Optional[Money]
    horizon_days: int
    notes: Tuple[str, ...]


def current_position(total: Optional[Money], events: Sequence[Event], as_of: datetime,
                     obligations: Sequence[Obligation] = (), essential_per_day: Optional[Fraction] = None,
                     cushion: Optional[Money] = None, goals: Sequence[Goal] = (),
                     horizon: int = HORIZON_DAYS, currency: str = "NGN") -> Position:
    require_aware(as_of, "as_of")
    today = lagos_date(as_of)
    inflow, outflow, net = net_cash_flow(events, as_of, 28, currency)
    due = [o for o in obligations if 0 < (o.due - today).days <= horizon and o.amount.currency == currency]
    oblig = Money(sum(o.amount.minor for o in due), currency)
    needs = tuple(goal_need(g, as_of, horizon) for g in goals if g.target.currency == currency)
    goals_h = Money(sum(n.required_in_horizon.minor for n in needs), currency)
    notes = []
    available = flex = None
    if total is None:
        notes.append("connected money unknown: availability not computed")
    else:
        available = total - oblig
        if cushion is None or essential_per_day is None:
            notes.append("essential spend unknown: cushion and flexible money not computed")
        else:
            ess_h = round_fraction(Fraction(essential_per_day) * horizon, currency)
            flex = safe_flexible(total, oblig, ess_h, cushion, goals_h, Money(0, currency))
    return Position(total, inflow, outflow, net, oblig, len(due), available, needs, goals_h, cushion, flex,
                    horizon, tuple(notes))
