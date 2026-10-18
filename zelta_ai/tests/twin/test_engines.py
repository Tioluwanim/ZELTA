from dataclasses import replace
from datetime import date, datetime, timedelta
from fractions import Fraction

import pytest

from domain.events import Event, EventKind, EventStatus, Provenance
from domain.money import Money
from engines.burn import MIN_COVERAGE_DAYS, burn, coverage_days, net_cash_flow
from engines.cushion import income_stability, required_cushion, safe_flexible
from engines.runway import InvalidScenario, forecast, runway_days, what_if
from tests.twin import fixtures as fx
from tests.twin.fixtures import AS_OF, N


def spend(day: date, kobo: int, i: int, kind=EventKind.EXPENSE, status=EventStatus.POSTED, cat="food"):
    ts = datetime(day.year, day.month, day.day, 12, tzinfo=AS_OF.tzinfo)
    return Event(f"e{i}", "a1", ts, Money(-kobo), status, kind, Provenance("mock", None, "h"), category=cat)


def daily_history(n_days, kobo=100_00):
    start = AS_OF.date() - timedelta(days=n_days)
    return [spend(start + timedelta(days=i), kobo, i) for i in range(n_days)], start


# ---- coverage / burn
@pytest.mark.parametrize("observed_days,expected", [(5, 5), (12, 12), (28, 28), (60, 28)])
def test_coverage_days(observed_days, expected):
    assert coverage_days(AS_OF.date() - timedelta(days=observed_days), AS_OF, 28) == expected


def test_burn_divides_by_covered_days_not_28():
    ev, start = daily_history(12)
    r = burn(ev, AS_OF, start)
    assert r.coverage_28 == 12 and r.per_day == Fraction(100_00) and r.confidence == "low"


def test_burn_confidence_tiers_and_28_day_blend():
    ev, start = daily_history(28)
    r = burn(ev, AS_OF, start)
    assert r.confidence == "high" and r.b28 == r.b7 == r.per_day == 100_00
    ev14, s14 = daily_history(14)
    assert burn(ev14, AS_OF, s14).confidence == "medium"


def test_burn_blend_weights():
    ev, start = daily_history(28)
    ev = [replace(e, amount=Money(-300_00)) if e.occurred_at.date() >= AS_OF.date() - timedelta(days=7) else e for e in ev]
    r = burn(ev, AS_OF, start)
    assert r.b7 == 300_00 and r.per_day == Fraction(7, 10) * r.b28 + Fraction(3, 10) * 300_00


def test_empty_and_tiny_history_is_insufficient_not_zero():
    assert burn([], AS_OF, None).confidence == "insufficient"
    ev, start = daily_history(MIN_COVERAGE_DAYS - 1)
    r = burn(ev, AS_OF, start)
    assert r.per_day is None and r.per_day_money() is None and "only" in r.reason


def test_zero_spend_over_enough_coverage_is_zero_burn_not_a_crash():
    r = burn([], AS_OF, AS_OF.date() - timedelta(days=28))
    assert r.per_day == 0
    assert runway_days(N(1000), AS_OF, r.per_day, []).capped


def test_pending_reversed_transfer_and_foreign_currency_do_not_count_as_burn():
    ev, start = daily_history(28)
    junk = [spend(AS_OF.date() - timedelta(days=2), 999_00, 900, status=EventStatus.PENDING),
            spend(AS_OF.date() - timedelta(days=2), 999_00, 901, status=EventStatus.REVERSED),
            spend(AS_OF.date() - timedelta(days=2), 999_00, 902, kind=EventKind.TRANSFER_OWN),
            replace(spend(AS_OF.date() - timedelta(days=2), 999_00, 903), amount=Money(-99900, "USD"))]
    assert burn(ev + junk, AS_OF, start).per_day == 100_00


def test_net_cash_flow_excludes_transfers():
    ev, _ = daily_history(10)
    inc = replace(spend(AS_OF.date() - timedelta(days=3), 5000_00, 800, kind=EventKind.INCOME), amount=N(5000))
    tr = replace(inc, id="t", kind=EventKind.TRANSFER_OWN)
    i, o, n = net_cash_flow(ev + [inc, tr], AS_OF, 28)
    assert i == N(5000) and o == Money(10 * 100_00) and n == i - o


# ---- runway: Tola fixture
def test_tola_runway_is_16_99_not_naive_24_9():
    total = N(53500)
    r = runway_days(total, AS_OF, Fraction(fx.BURN_PER_DAY_KOBO), fx.obligations())
    assert round(r.days, 2) == 16.99 and not r.capped
    naive = total.minor / fx.BURN_PER_DAY_KOBO        # ignores dated bills
    assert round(naive, 1) == 24.9


def test_runway_to_cushion_is_13_27():
    r = runway_days(N(53500), AS_OF, Fraction(fx.BURN_PER_DAY_KOBO), fx.obligations(), floor=Money(800_000))
    assert round(r.days, 2) == 13.27


def test_obligation_before_first_payday_moves_runway_by_the_right_amount():
    base = runway_days(N(53500), AS_OF, Fraction(fx.BURN_PER_DAY_KOBO), []).days
    with_bill = runway_days(N(53500), AS_OF, Fraction(fx.BURN_PER_DAY_KOBO), fx.obligations()).days
    assert round(base - with_bill, 2) == round(17_000_00 / fx.BURN_PER_DAY_KOBO, 2)


def test_runway_unknown_when_burn_unknown_and_zero_when_balance_not_positive():
    assert runway_days(N(1000), AS_OF, None, []).days is None
    assert runway_days(N(0), AS_OF, Fraction(100), []).days == 0.0


def test_forecast_cases_are_ordered_and_runout_date_is_oct_25():
    fc = {c: forecast(N(53500), AS_OF, Fraction(fx.BURN_PER_DAY_KOBO), fx.obligations(), [fx.allowance()], 30, c)
          for c in ("conservative", "baseline", "optimistic")}
    assert fc["conservative"].runout_day < fc["baseline"].runout_day < fc["optimistic"].runout_day
    assert fc["baseline"].runout_day == 17 and fc["baseline"].series[16][0] == date(2026, 10, 25)
    with pytest.raises(ValueError):
        forecast(N(1), AS_OF, Fraction(1), [], [], 30, "bogus")


# ---- what-if
def test_what_if_spend_less_extends_runway():
    w = what_if(N(53500), AS_OF, Fraction(fx.BURN_PER_DAY_KOBO), fx.obligations(), [], "spend_less_weekly", N(3000))
    assert round(w.scenario.days, 2) > round(w.base.days, 2)


def test_what_if_receive_extends_runway():
    w = what_if(N(53500), AS_OF, Fraction(fx.BURN_PER_DAY_KOBO), fx.obligations(), [], "receive", N(10000))
    assert round(w.scenario.days, 2) == 21.65


@pytest.mark.parametrize("kind,amount", [("spend_less_weekly", N(50000)), ("receive", N(-5)),
                                          ("receive", Money(5, "USD")), ("nonsense", N(5))])
def test_invalid_or_infeasible_scenarios_are_rejected(kind, amount):
    with pytest.raises(InvalidScenario):
        what_if(N(53500), AS_OF, Fraction(fx.BURN_PER_DAY_KOBO), fx.obligations(), [], kind, amount)


def test_purchase_larger_than_balance_is_noted():
    w = what_if(N(1000), AS_OF, Fraction(100), [], [], "purchase", N(5000))
    assert w.notes and w.scenario.days == 0.0


# ---- stability, cushion, safe flexible
def test_tola_stability_and_cushion():
    st = income_stability([N(x) for x in (75000, 45000, 67000, 55000, 73000, 63000)], 4, 6)
    assert round(float(st.score), 3) == 0.671
    cushion, assumptions = required_cushion(Fraction(fx.ESSENTIAL_PER_DAY_KOBO), st.score)
    assert cushion == N(8000) and assumptions == ()


def test_unknown_stability_assumes_least_stable_and_says_so():
    c, a = required_cushion(Fraction(fx.ESSENTIAL_PER_DAY_KOBO), None)
    assert c >= N(8000) and "assumed least stable" in a[0]
    assert required_cushion(None, None)[0] is None


def test_no_income_history_gives_no_stability_score():
    assert income_stability([], 0, 0).score is None


def test_safe_flexible_never_negative_and_tola_h14_is_about_12400():
    sf = safe_flexible(N(53500), N(17000), Money(1309994), N(8000), N(3000), Money(0))
    assert sf == Money(1240006)
    assert safe_flexible(N(100), N(5000), N(0), N(0), N(0), N(0)) == Money(0)
