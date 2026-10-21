from datetime import date, datetime, timedelta
from fractions import Fraction

import pytest

from domain.clock import LAGOS
from domain.events import Event, EventKind, EventStatus, Provenance
from domain.money import Money
from engines.buffer import buffer_status, minimum_safe_amount
from engines.forecast_summary import forecast_summary
from engines.genome import genome
from engines.position import Goal, current_position, goal_need
from engines.runway import IncomeStream, Obligation

AS_OF = datetime(2026, 10, 31, 20, 0, tzinfo=LAGOS)
N = lambda x: Money.from_major(str(x))  # noqa: E731
_n = [0]


def ev(day_offset, naira, kind=None, cat=None, merchant=None, status=EventStatus.POSTED):
    _n[0] += 1
    amt = N(naira)
    k = kind or (EventKind.INCOME if amt.minor > 0 else EventKind.EXPENSE)
    at = AS_OF - timedelta(days=day_offset)
    return Event(f"e{_n[0]}", "a", at, amt, status, k, Provenance("t", f"r{_n[0]}", "h"),
                 merchant=merchant, category=cat)


def history(days=60):
    """Daily 1000 spend (food on most days); weekend 2000; income 25,000 on the 1st and 15th; weekly 'gym' 1500."""
    out = []
    for i in range(1, days + 1):
        d = (AS_OF - timedelta(days=i)).date()
        out.append(ev(i, -(2000 if d.weekday() >= 5 else 1000), cat="food" if i % 2 else "transport"))
        if d.day in (1, 15):
            out.append(ev(i, 25000))
        if d.weekday() == 0:
            out.append(ev(i, -1500, cat="health", merchant="Gym Pass"))
    return out


FIRST = (AS_OF - timedelta(days=60)).date()


# ------------------------------------------------------------------ Day 6
def test_goal_need_is_linear_and_flags_overdue():
    g = Goal("laptop", N(60000), date(2026, 11, 30), N(0))
    n = goal_need(g, AS_OF)
    assert n.days_left == 30 and n.per_week == N(14000) and n.required_in_horizon == N(60000)
    late = goal_need(Goal("x", N(100), date(2026, 10, 1), N(0)), AS_OF)
    assert late.overdue and late.per_week is None and late.required_in_horizon == N(100)
    assert goal_need(Goal("done", N(100), date(2026, 12, 1), N(100)), AS_OF).remaining == N(0)


def test_position_counts_only_horizon_obligations_and_keeps_unknown_unknown():
    bills = [Obligation("a", N(5000), date(2026, 11, 10)), Obligation("b", N(9000), date(2026, 12, 25))]
    p = current_position(N(53500), history(), AS_OF, bills, Fraction(100000), N(8000))
    assert p.obligations_horizon == N(5000) and p.obligations_count == 1
    assert p.available_after_obligations == N(48500)
    assert p.inflow_28d.minor >= 0 and p.net_28d == p.inflow_28d - p.outflow_28d
    assert p.safe_flexible == N(53500 - 5000 - 30000 - 8000)
    u = current_position(None, history(), AS_OF)
    assert u.total is None and u.available_after_obligations is None and u.safe_flexible is None and u.notes
    no_ess = current_position(N(1000), [], AS_OF)
    assert no_ess.safe_flexible is None and no_ess.available_after_obligations == N(1000)


# ------------------------------------------------------------------ Day 7
def test_genome_detects_habits():
    g = genome(history(), AS_OF, FIRST)
    assert g.income_timing and g.income_timing.events == 4 and g.income_timing.spread_days == 14
    assert g.weekend_ratio is not None and 1 < g.weekend_ratio <= 2
    assert any(r.label == "gym pass" and r.cadence == "weekly" for r in g.recurring)
    assert g.category_share["food"] > 0 and sum(g.category_share.values()) == 1
    assert g.focus_weekly_minor["food"] > 0 and g.spending_change is not None and g.change_flag in ("up", "down", "steady")
    assert g.post_income_spike is not None


def test_genome_refuses_thin_evidence_and_ignores_non_posted():
    thin = genome(history(5), AS_OF, (AS_OF - timedelta(days=5)).date())
    assert thin.income_timing is None and thin.insufficient and thin.recurring == ()
    assert genome([], AS_OF, None).insufficient == ("no history",)
    pend = [ev(i, -500, status=EventStatus.PENDING) for i in range(1, 30)]
    g = genome(pend, AS_OF, FIRST)
    assert g.category_share == {} and g.spending_change is None


def test_genome_flags_spike_after_income_and_rising_spend():
    evs = []
    for i in range(1, 61):
        d = (AS_OF - timedelta(days=i)).date()
        evs.append(ev(i, -1000))
        if d.day == 1:
            evs.append(ev(i, 50000))
            for k in (1, 2, 3):                   # extra spending right after income (earlier dates = i-k)
                evs.append(ev(i - k, -6000))
    g = genome(evs, AS_OF, FIRST)
    assert g.spike_flag is True and g.post_income_spike >= Fraction(3, 2)


# ------------------------------------------------------------------ Day 8
def test_forecast_summary_is_deterministic_and_explicit_about_time():
    args = (N(53500), AS_OF, Fraction(214800), [Obligation("levy", N(15000), date(2026, 11, 17))],
            [IncomeStream("Allowance", N(45000), N(40000), N(45000), date(2026, 11, 10), 0.92)])
    a = forecast_summary(*args, horizon=30)
    assert a == forecast_summary(*args, horizon=30)
    assert a.timezone == "Africa/Lagos" and set(a.expected_balance) == {7, 14, 30}
    assert a.likely_runout is None and a.upcoming_expenses[0].name == "levy"
    assert a.next_income and a.next_income.balance_gain_at_horizon == N(45000)
    assert a.next_income.runout_day_without is not None and a.next_income.runout_day_with is None
    bare = forecast_summary(N(53500), AS_OF, Fraction(214800), [], horizon=30)
    assert bare.likely_runout and bare.runout_range[0] <= bare.likely_runout <= bare.runout_range[1]
    assert "assumes none" in " ".join(bare.notes)


def test_forecast_summary_unknown_inputs_and_bad_timezone():
    assert forecast_summary(None, AS_OF, Fraction(1), []) is None
    assert forecast_summary(N(1), AS_OF, None, []) is None
    with pytest.raises(ValueError):
        forecast_summary(N(1000), AS_OF, Fraction(1), [], timezone="UTC")
    with pytest.raises(ValueError):
        forecast_summary(N(1000), AS_OF.replace(tzinfo=None), Fraction(1), [])


def test_goal_trajectory_and_buffer_breach_dates():
    goals = [Goal("fees", N(20000), date(2026, 11, 20), N(0)), Goal("far", N(1), date(2027, 6, 1), N(0)),
             Goal("done", N(5), date(2026, 11, 20), N(5))]
    s = forecast_summary(N(53500), AS_OF, Fraction(100000), [], goals=goals, minimum_safe=N(30000),
                         cushion=N(8000), horizon=30)
    st = {g.name: g.status for g in s.goals}
    assert st == {"fees": "on_track", "far": "beyond_horizon", "done": "complete"}
    assert s.first_below_minimum is not None and s.first_below_cushion is None
    low = forecast_summary(N(53500), AS_OF, Fraction(170000), [], minimum_safe=N(30000), cushion=N(8000))
    assert low.first_below_cushion >= low.first_below_minimum
    tight = forecast_summary(N(53500), AS_OF, Fraction(214800), [], goals=goals[:1], cushion=N(8000))
    assert tight.goals[0].status == "off_track"


# ------------------------------------------------------------------ Day 9
def test_minimum_safe_and_buffer_status_levels():
    bills = [Obligation("levy", N(15000), date(2026, 11, 5))]
    ms = minimum_safe_amount(Fraction(93571), bills, AS_OF)
    assert ms == Money(93571 * 3, "NGN") + N(15000)
    base = dict(essential_per_day=Fraction(93571), cushion=N(8000), obligations=bills, as_of=AS_OF)
    assert buffer_status(N(53500), **base).status == "healthy"
    assert buffer_status(N(20000), **base).status == "below_cushion" or buffer_status(N(20000), **base).status == "below_minimum"
    assert buffer_status(N(16000), **base).status == "below_minimum"
    assert buffer_status(None, **base).status == "unknown"
    assert buffer_status(N(10000), None, None, [], AS_OF).status == "unknown"


def test_daily_spend_series_is_28_days_and_sums_to_outflow():
    from engines.position import daily_spend
    series = daily_spend(history(), AS_OF)
    assert len(series) == 28 and series[0][0] < series[-1][0] and all(m >= 0 for _, m in series)
    p = current_position(N(1000), history(), AS_OF)
    assert sum(m for _, m in p.daily_spend) == p.outflow_28d.minor
