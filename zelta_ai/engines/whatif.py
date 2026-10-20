"""Day 12: bounded, deterministic "what happens if...?" runs.

Hypothetical only: results are never stored as fact. Runs are bounded (scenario count, horizon, amount, percentage) so a caller
cannot request unbounded work. Multipliers and the "set aside" treatment are PROPOSED. Reuses the exact day-step maths of `forecast`.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from fractions import Fraction
from typing import Optional, Sequence, Tuple

from domain.money import Money
from engines.runway import InvalidScenario, RunwayResult, forecast, runway_days
from financial_twin.twin import TwinSnapshot

MAX_SCENARIOS = 5
MIN_HORIZON, MAX_HORIZON = 7, 120
MAX_AMOUNT_MINOR = 1_000_000_000_00      # ₦1 billion
KINDS = ("spend_less_weekly", "spend_more_weekly", "receive", "purchase", "unexpected_expense", "save_weekly",
         "category_increase_pct", "lose_income")


@dataclass(frozen=True)
class Scenario:
    kind: str
    amount: Optional[Money] = None
    category: Optional[str] = None
    pct: Optional[int] = None
    name: Optional[str] = None

    def label(self) -> str:
        return {"spend_less_weekly": f"spend {self.amount} less each week", "spend_more_weekly": f"spend {self.amount} more each week",
                "receive": f"receive {self.amount}", "purchase": f"buy something for {self.amount}",
                "unexpected_expense": f"an unexpected {self.amount} expense", "save_weekly": f"set aside {self.amount} each week",
                "category_increase_pct": f"{self.category} spending rises {self.pct}%",
                "lose_income": f"lose the {self.name} income"}[self.kind]


@dataclass(frozen=True)
class Outcome:
    scenario: Scenario
    label: str
    runway_before: RunwayResult
    runway_after: RunwayResult
    runout_before: Optional[date]
    runout_after: Optional[date]
    balance_end_before: Money
    balance_end_after: Money
    min_balance_after: Money
    notes: Tuple[str, ...]


def _validate(sc: Scenario) -> None:
    if sc.kind not in KINDS:
        raise InvalidScenario(f"unknown scenario kind {sc.kind!r}")
    if sc.kind == "category_increase_pct":
        if not sc.category or sc.pct is None or not 1 <= sc.pct <= 100:
            raise InvalidScenario("category_increase_pct needs a category and a percentage from 1 to 100")
    elif sc.kind == "lose_income":
        if not sc.name:
            raise InvalidScenario("lose_income needs the income name")
    else:
        if sc.amount is None or sc.amount.minor <= 0:
            raise InvalidScenario("scenario amount must be positive")
        if sc.amount.minor > MAX_AMOUNT_MINOR:
            raise InvalidScenario("scenario amount is above the allowed limit")


def run_whatif(s: TwinSnapshot, scenarios: Sequence[Scenario], horizon: int = 30) -> Tuple[Outcome, ...]:
    if not 1 <= len(scenarios) <= MAX_SCENARIOS:
        raise InvalidScenario(f"run between 1 and {MAX_SCENARIOS} scenarios at a time")
    if not MIN_HORIZON <= horizon <= MAX_HORIZON:
        raise InvalidScenario(f"horizon must be between {MIN_HORIZON} and {MAX_HORIZON} days")
    total, per_day = s.total, s.inferred.burn.per_day
    if total is None or per_day is None:
        raise InvalidScenario("cannot simulate: balance or spending estimate is unknown (insufficient evidence)")
    base_f = forecast(total, s.as_of, per_day, s.obligations, s.streams, horizon)
    base_r = runway_days(total, s.as_of, per_day, s.obligations)
    out = []
    for sc in scenarios:
        _validate(sc)
        t, b, streams, notes = total, Fraction(per_day), list(s.streams), []
        weekly = None if sc.amount is None else Fraction(sc.amount.minor, 7)
        if sc.amount is not None and sc.amount.currency != total.currency:
            raise InvalidScenario("scenario currency differs from the balance currency")
        if sc.kind == "spend_less_weekly":
            assert weekly is not None
            if weekly > b:
                raise InvalidScenario("cannot cut more per week than is currently spent per week")
            b -= weekly
        elif sc.kind == "spend_more_weekly":
            assert weekly is not None
            b += weekly
        elif sc.kind == "save_weekly":
            assert weekly is not None
            b += weekly
            notes.append("money set aside leaves spendable money; it is not lost")
        elif sc.kind == "receive":
            assert sc.amount is not None
            t = total + sc.amount
        elif sc.kind in ("purchase", "unexpected_expense"):
            assert sc.amount is not None
            t = total - sc.amount
            if t.is_negative():
                notes.append("this exceeds connected money; the balance would be negative immediately")
        elif sc.kind == "category_increase_pct":
            share = s.genome().category_share.get(sc.category or "")
            if share is None:
                raise InvalidScenario(f"no spending history for category {sc.category!r}")
            assert sc.pct is not None
            b += Fraction(per_day) * share * Fraction(sc.pct, 100)
        elif sc.kind == "lose_income":
            streams = [x for x in streams if x.name != sc.name]
            if len(streams) == len(s.streams):
                raise InvalidScenario(f"no expected income named {sc.name!r}")
        f = forecast(t, s.as_of, b, s.obligations, streams, horizon)
        r = runway_days(t, s.as_of, b, s.obligations)
        ro_b = None if base_f.runout_day is None else base_f.series[base_f.runout_day - 1][0]
        ro_a = None if f.runout_day is None else f.series[f.runout_day - 1][0]
        out.append(Outcome(sc, sc.label(), base_r, r, ro_b, ro_a, base_f.series[-1][1], f.series[-1][1], f.min_balance, tuple(notes)))
    return tuple(out)
