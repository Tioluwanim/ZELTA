"""Day 7: Financial Genome (shown to users as "Your Spending Habits").

Descriptive statistics over posted income/expense events. No ML, no causal claims. Each signal returns None
with a reason when there is too little evidence. Thresholds are PROPOSED and not validated.
"""
from __future__ import annotations

import re
import statistics
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from fractions import Fraction
from typing import Dict, List, Optional, Sequence, Tuple

from domain.clock import lagos_date, require_aware
from domain.events import Event, EventKind, EventStatus

WINDOW_DAYS = 90
MIN_INCOME_EVENTS = 3
MIN_COVERAGE = 14
SPIKE_RATIO = Fraction(3, 2)
CHANGE_THRESHOLD = Fraction(1, 4)
FOCUS = ("food", "transport", "data")


@dataclass(frozen=True)
class IncomeTiming:
    typical_day_of_month: int
    spread_days: int
    events: int


@dataclass(frozen=True)
class Recurring:
    label: str
    cadence: str                  # weekly | monthly
    typical_minor: int
    occurrences: int


@dataclass(frozen=True)
class Genome:
    covered_days: int
    income_timing: Optional[IncomeTiming]
    post_income_spike: Optional[Fraction]        # spend/day in 3 days after income / baseline spend/day
    spike_flag: Optional[bool]
    category_share: Dict[str, Fraction]          # of total spend; "unknown" for uncategorised
    focus_weekly_minor: Dict[str, int]           # food/transport/data average weekly spend
    recurring: Tuple[Recurring, ...]
    weekend_ratio: Optional[Fraction]            # spend/day on Sat+Sun over Mon-Fri
    month_end_ratio: Optional[Fraction]          # spend/day in last 5 days of month over the other days
    spending_change: Optional[Fraction]          # last 14 days vs prior 14 days (+ = more)
    change_flag: Optional[str]                   # up | down | steady
    insufficient: Tuple[str, ...]


def _norm_label(e: Event) -> str:
    raw = (e.merchant or e.description or "").lower()
    return re.sub(r"[^a-z]+", " ", raw).strip()


def _spend_by_day(expenses: Sequence[Event]) -> Dict[date, int]:
    out: Dict[date, int] = defaultdict(int)
    for e in expenses:
        out[lagos_date(e.occurred_at)] += -e.amount.minor
    return out


def genome(events: Sequence[Event], as_of: datetime, first_observed: Optional[date],
           window_days: int = WINDOW_DAYS, currency: str = "NGN") -> Genome:
    require_aware(as_of, "as_of")
    end = lagos_date(as_of)
    if first_observed is None:
        return Genome(0, None, None, None, {}, {}, (), None, None, None, None, ("no history",))
    start = max(end - timedelta(days=window_days), first_observed)
    covered = max(0, (end - start).days)
    evs = [e for e in events if e.status is EventStatus.POSTED and e.amount.currency == currency
           and start <= lagos_date(e.occurred_at) < end]
    income = [e for e in evs if e.kind is EventKind.INCOME and e.amount.minor > 0]
    expenses = [e for e in evs if e.kind is EventKind.EXPENSE and e.amount.minor < 0]
    missing: List[str] = []
    if covered < MIN_COVERAGE:
        return Genome(covered, None, None, None, {}, {}, (), None, None, None, None,
                      (f"only {covered} covered days, need {MIN_COVERAGE}",))
    by_day = _spend_by_day(expenses)
    total_spend = sum(by_day.values())

    # income timing
    timing = None
    months = {(lagos_date(e.occurred_at).year, lagos_date(e.occurred_at).month) for e in income}
    if len(income) >= MIN_INCOME_EVENTS and len(months) >= 2:
        days = [lagos_date(e.occurred_at).day for e in income]
        timing = IncomeTiming(int(statistics.median(days)), max(days) - min(days), len(income))
    else:
        missing.append("income timing: need 3+ income events across 2+ months")

    # post-income spike
    spike: Optional[Fraction] = None
    flag: Optional[bool] = None
    if len(income) >= 2 and total_spend > 0:
        baseline = Fraction(total_spend, covered)
        after = []
        for e in income:
            d0 = lagos_date(e.occurred_at)
            if d0 + timedelta(days=3) <= end:
                after.append(Fraction(sum(by_day.get(d0 + timedelta(days=k), 0) for k in (1, 2, 3)), 3))
        if after:
            spike = Fraction(sum(after, Fraction(0)) / len(after)) / baseline
            flag = spike >= SPIKE_RATIO
    else:
        missing.append("post-income spending: need 2+ income events and some spending")

    # category habits
    share: Dict[str, Fraction] = {}
    if total_spend > 0:
        cats: Dict[str, int] = defaultdict(int)
        for e in expenses:
            cats[e.category or "unknown"] += -e.amount.minor
        share = {c: Fraction(v, total_spend) for c, v in sorted(cats.items())}
    weeks = Fraction(covered, 7)
    focus = {c: int(sum(-e.amount.minor for e in expenses if e.category == c) / weeks) for c in FOCUS}

    # recurring expenses
    groups: Dict[str, List[Event]] = defaultdict(list)
    for e in expenses:
        lab = _norm_label(e)
        if lab:
            groups[lab].append(e)
    rec: List[Recurring] = []
    for lab, g in groups.items():
        if len(g) < 3:
            continue
        g.sort(key=lambda x: x.occurred_at)
        gaps = [(lagos_date(b.occurred_at) - lagos_date(a.occurred_at)).days for a, b in zip(g, g[1:], strict=False)]
        amts = [-x.amount.minor for x in g]
        med = statistics.median(amts)
        if any(abs(a - med) > 0.10 * med for a in amts):
            continue
        cadence = "weekly" if all(6 <= x <= 8 for x in gaps) else "monthly" if all(26 <= x <= 35 for x in gaps) else ""
        if cadence:
            rec.append(Recurring(lab, cadence, int(med), len(g)))

    # weekend vs weekday
    wk_days = [start + timedelta(days=i) for i in range(covered)]
    we = [d for d in wk_days if d.weekday() >= 5]
    wd = [d for d in wk_days if d.weekday() < 5]
    ratio = None
    if len(we) >= 4 and len(wd) >= 8:
        w_end = Fraction(sum(by_day.get(d, 0) for d in we), len(we))
        w_day = Fraction(sum(by_day.get(d, 0) for d in wd), len(wd))
        ratio = w_end / w_day if w_day > 0 else None
    if ratio is None:
        missing.append("weekend behaviour: need 4+ weekend days and 8+ weekdays with spending")

    # month end
    def _is_end(d: date) -> bool:
        return (d + timedelta(days=5)).month != d.month
    ends = [d for d in wk_days if _is_end(d)]
    rest = [d for d in wk_days if not _is_end(d)]
    me = None
    if len(ends) >= 4 and len(rest) >= 8:
        e_avg = Fraction(sum(by_day.get(d, 0) for d in ends), len(ends))
        r_avg = Fraction(sum(by_day.get(d, 0) for d in rest), len(rest))
        me = e_avg / r_avg if r_avg > 0 else None
    if me is None:
        missing.append("month-end behaviour: need a month end in the window")

    # change
    change: Optional[Fraction] = None
    cflag: Optional[str] = None
    if covered >= 28:
        last = sum(v for d, v in by_day.items() if end - timedelta(days=14) <= d < end)
        prev = sum(v for d, v in by_day.items() if end - timedelta(days=28) <= d < end - timedelta(days=14))
        if prev > 0:
            change = Fraction(last - prev, prev)
            cflag = "up" if change >= CHANGE_THRESHOLD else "down" if change <= -CHANGE_THRESHOLD else "steady"
    else:
        missing.append("spending change: need 28 covered days")

    return Genome(covered, timing, spike, flag, share, focus, tuple(sorted(rec, key=lambda r: r.label)),
                  ratio, me, change, cflag, tuple(missing))
