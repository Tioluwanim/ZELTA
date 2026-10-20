"""Day 11: Guardian. "Could this action hurt my financial position?" -> PROCEED | CAUTION | PROTECT.

Pure and deterministic over a TwinSnapshot. Each factor reports its own state and evidence; the overall state is the worst
factor. Unknown evidence never reads as safe: it yields CAUTION and `verified=False`. Thresholds are PROPOSED.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import List, Optional, Tuple

from domain.clock import lagos_date
from domain.money import Money
from engines.affordability import affordability
from engines.buffer import buffer_status, minimum_safe_amount
from engines.forecast_summary import forecast_summary
from engines.runway import InvalidScenario
from financial_twin.twin import TwinSnapshot

PROCEED, CAUTION, PROTECT = "PROCEED", "CAUTION", "PROTECT"
_RANK = {PROCEED: 0, CAUTION: 1, PROTECT: 2}
RUNWAY_PROTECT_DAYS = 7
RUNWAY_CAUTION_DAYS = 14
BILL_LOOKAHEAD = 14
KINDS = ("spend", "transfer_out", "lock_savings")


@dataclass(frozen=True)
class Action:
    kind: str
    amount: Money
    category: Optional[str] = None

    def __post_init__(self):
        if self.kind not in KINDS:
            raise ValueError(f"unknown action kind {self.kind!r}")
        if self.amount.minor <= 0:
            raise ValueError("amount must be positive")


@dataclass(frozen=True)
class Factor:
    name: str
    state: str
    detail: str
    known: bool = True


@dataclass(frozen=True)
class GuardianResult:
    state: str
    factors: Tuple[Factor, ...]
    verified: bool                          # False when any factor lacked evidence
    max_proceed_amount: Optional[Money]     # safe flexible money; None when unknown
    headline: str


def _worst(states) -> str:
    return max(states, key=_RANK.__getitem__, default=PROCEED)


def guardian(s: TwinSnapshot, action: Action) -> GuardianResult:
    f: List[Factor] = []
    total, inf = s.total, s.inferred
    today = lagos_date(s.as_of)
    pos = s.position()
    if total is None:
        f.append(Factor("affordability", CAUTION, "connected money is unknown, so this cannot be verified", False))
        return GuardianResult(CAUTION, tuple(f), False, None, "I can't verify this: your connected money is unknown.")
    if action.amount.currency != total.currency:
        raise ValueError("currency mismatch")
    after = total - action.amount

    # affordability
    a = affordability(total, s.as_of, action.amount, s.obligations, inf.essential_per_day, inf.cushion)
    f.append({"within_safe_flexible": Factor("affordability", PROCEED, "within your safe flexible spending"),
              "uses_cushion": Factor("affordability", CAUTION, "above safe flexible spending; it would dip into your cushion or bills"),
              "exceeds_connected_money": Factor("affordability", PROTECT, "more than all your connected money"),
              "unknown": Factor("affordability", CAUTION, "cannot be verified: " + " ".join(a.reasons), False)}[a.verdict])

    # runway
    try:
        w = s.simulate("purchase", action.amount)
        d = w.scenario.days
        if after.is_negative() or (d is not None and d < RUNWAY_PROTECT_DAYS):
            f.append(Factor("runway", PROTECT, f"runway would fall to about {0 if d is None else d:.1f} days"))
        elif d is not None and d < RUNWAY_CAUTION_DAYS:
            f.append(Factor("runway", CAUTION, f"runway would fall to about {d:.1f} days"))
        else:
            f.append(Factor("runway", PROCEED, f"runway stays about {d:.1f} days" if d is not None else "runway stays long"))
    except (ValueError, InvalidScenario):
        f.append(Factor("runway", CAUTION, "spending history is too short to project runway", False))

    # obligations
    due = Money(sum(o.amount.minor for o in s.obligations if 0 < (o.due - today).days <= BILL_LOOKAHEAD), total.currency)
    if due.minor and after < due:
        f.append(Factor("obligations", PROTECT, f"you would not cover {due} of bills due within {BILL_LOOKAHEAD} days"))
    else:
        f.append(Factor("obligations", PROCEED, f"bills due within {BILL_LOOKAHEAD} days stay covered ({due})"))

    # cushion and minimum safe amount
    b = buffer_status(after, inf.essential_per_day, inf.cushion, s.obligations, s.as_of)
    f.append({"healthy": Factor("cushion", PROCEED, "your cushion stays intact"),
              "below_cushion": Factor("cushion", CAUTION, f"you would drop below your emergency cushion ({b.cushion})"),
              "below_minimum": Factor("cushion", PROTECT, f"you would drop below the minimum safe amount ({b.minimum_safe})"),
              "unknown": Factor("cushion", CAUTION, "cushion cannot be verified yet", False)}[b.status])

    # goals and forecast
    # later days are judged against essentials only: bills already inside the path are subtracted by the forecast itself
    floor = minimum_safe_amount(inf.essential_per_day, (), s.as_of)
    base = forecast_summary(total, s.as_of, inf.burn.per_day, s.obligations, s.streams, s.goals, floor, inf.cushion)
    scen = forecast_summary(after if not after.is_negative() else Money(0, total.currency), s.as_of, inf.burn.per_day, s.obligations, s.streams,
                            s.goals, floor, inf.cushion)
    if base is None or scen is None:
        f.append(Factor("forecast", CAUTION, "no spending estimate yet, so the next weeks cannot be projected", False))
    else:
        horizon_end = today + timedelta(days=BILL_LOOKAHEAD)
        new_dip = scen.first_below_minimum is not None and scen.first_below_minimum <= horizon_end
        old_dip = base.first_below_minimum is not None and base.first_below_minimum <= horizon_end
        if new_dip and not old_dip:
            f.append(Factor("forecast", PROTECT, f"this pushes you below the minimum safe amount on {scen.first_below_minimum:%d %b}"))
        elif new_dip:
            f.append(Factor("forecast", CAUTION, "you were already heading below the minimum safe amount; this makes it earlier"))
        else:
            f.append(Factor("forecast", PROCEED, "the next two weeks stay above the minimum safe amount"))
        slipped = [g.name for g, h in zip(base.goals, scen.goals, strict=False) if g.status == "on_track" and h.status != "on_track"]
        if slipped:
            f.append(Factor("goals", CAUTION, f"this would put {', '.join(slipped)} off track"))
        elif s.goals:
            f.append(Factor("goals", PROCEED, "your goals stay on track"))

    # behaviour (a nudge; never decides alone)
    g = s.genome()
    if g.spike_flag and g.income_timing is not None and today.day in {((g.income_timing.typical_day_of_month - 1 + k) % 28) + 1 for k in range(0, 4)}:
        f.append(Factor("behaviour", CAUTION, "you tend to spend more in the days right after income"))
    elif action.category and g.category_share.get(action.category, 0) >= 0.4 and g.change_flag == "up":
        f.append(Factor("behaviour", CAUTION, f"{action.category} is already a large and rising share of your spending"))

    state = _worst(x.state for x in f)
    verified = all(x.known for x in f)
    head = {PROCEED: "This looks safe for your position.", CAUTION: "Proceed with care.", PROTECT: "Hold off: this could hurt your position."}[state]
    if state == PROCEED and not verified:
        state, head = CAUTION, "I can't fully verify this yet."
    return GuardianResult(state, tuple(f), verified, pos.safe_flexible, head)
