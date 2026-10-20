from datetime import date, timedelta
from fractions import Fraction

import pytest

from domain.events import Account
from domain.money import Money
from engines.guardian import CAUTION, PROCEED, PROTECT, Action, guardian
from engines.position import Goal
from engines.recommendations import recommend
from engines.runway import InvalidScenario, IncomeStream, Obligation
from engines.whatif import MAX_SCENARIOS, Scenario, run_whatif
from financial_twin import FinancialTwinService
from providers.mock import MockProvider
from tests.twin import fixtures as fx
from tests.twin.fixtures import AS_OF, N, history_txns


def snap(total=None, goals=(), streams=None, obligations=None, history=True):
    accts = fx.accounts() if total is None else [Account("a", "mock", "X", "h-x", N(total), AS_OF - timedelta(hours=1))]
    txns = {a.id: (history_txns(account=a.id) if i == 0 and history else []) for i, a in enumerate(accts)}
    svc = FinancialTwinService(MockProvider(accts, txns), ())
    return svc.build("u1", "c", AS_OF, obligations=fx.obligations() if obligations is None else obligations,
                     streams=[fx.allowance()] if streams is None else streams, essential_categories=["food"],
                     monthly_incomes=[N(x) for x in (75000, 45000, 67000, 55000, 73000, 63000)], timing_hits=4, timing_expected=6,
                     goals=goals)


# ------------------------------------------------------------------ Day 10
def test_recommendations_come_from_state_and_state_their_effect():
    r = recommend(snap())
    kinds = [x.kind for x in r.items]
    assert kinds == ["reduce_spending"]
    cut = r.items[0]
    assert cut.amount == N(1500) and cut.effect and "more days of runway" in cut.effect and cut.because
    assert recommend(snap()) == r                                  # deterministic


def test_recommendation_bill_shortfall_and_cushion_paths():
    low = recommend(snap(total=9000))                              # bills of 17,000 due within 14 days vs 9,000 balance
    assert low.items[0].kind == "prepare_bill" and low.items[0].amount == N(8000)
    no_income = recommend(snap(total=5000, obligations=[], streams=[]))
    assert any(x.kind == "build_cushion" for x in no_income.items)
    with_income = recommend(snap(total=5000, obligations=[], streams=[IncomeStream("Allowance", N(45000), N(40000), N(45000), date(2026, 10, 20), 0.9)]))
    sa = next(x for x in with_income.items if x.kind == "set_aside")
    assert sa.amount.minor % 50000 == 0 and sa.amount.minor <= 900000


def test_goal_too_aggressive_and_withheld_when_unknown():
    g = Goal("laptop", N(500000), date(2026, 11, 8), N(0))
    r = recommend(snap(goals=[g]))
    assert any(x.kind == "goal_too_aggressive" for x in r.items)
    none = recommend(snap(history=False))
    assert not none.items and any("unknown" in w or "no recurring" in w for w in none.withheld)


# ------------------------------------------------------------------ Day 11
def test_guardian_three_states():
    s = snap()
    ok = guardian(s, Action("spend", N(3000)))
    assert ok.state == PROCEED and ok.verified and ok.max_proceed_amount is not None
    assert guardian(s, Action("spend", N(60000))).state == PROTECT
    big = guardian(s, Action("spend", N(20000)))
    assert big.state in (CAUTION, PROTECT) and any(f.state != PROCEED for f in big.factors)
    assert {f.name for f in ok.factors} >= {"affordability", "runway", "obligations", "cushion", "forecast"}


def test_guardian_obligations_and_unknown_never_read_as_safe():
    s = snap(total=20000)
    r = guardian(s, Action("spend", N(5000)))
    assert r.state == PROTECT and any(f.name == "obligations" and f.state == PROTECT for f in r.factors)
    unk = guardian(snap(history=False), Action("spend", N(1000)))
    assert unk.state == CAUTION and not unk.verified
    with pytest.raises(ValueError):
        Action("gamble", N(1))
    with pytest.raises(ValueError):
        Action("spend", N(0))


def test_guardian_goal_slip_is_a_caution():
    g = Goal("fees", N(2000), date(2026, 10, 18), N(0))
    s = snap(goals=[g])
    assert [f.state for f in guardian(s, Action("spend", N(500))).factors if f.name == "goals"] == [PROCEED]
    r = guardian(s, Action("spend", N(6000)))
    slip = [f for f in r.factors if f.name == "goals"]
    assert slip and slip[0].state == CAUTION and "fees" in slip[0].detail


# ------------------------------------------------------------------ Day 12
def test_whatif_kinds_and_directions():
    s = snap()
    out = run_whatif(s, [Scenario("spend_less_weekly", N(5000)), Scenario("receive", N(20000)), Scenario("save_weekly", N(3000)),
                         Scenario("purchase", N(8000)), Scenario("lose_income", name="Allowance")])
    less, rec, save, buy, lose = out
    assert less.runway_after.days > less.runway_before.days
    assert rec.runway_after.days > rec.runway_before.days
    assert save.runway_after.days < save.runway_before.days and "not lost" in " ".join(save.notes)
    assert buy.runway_after.days < buy.runway_before.days
    assert lose.balance_end_after.minor == lose.balance_end_before.minor - N(45000).minor
    assert run_whatif(s, [Scenario("receive", N(20000))]) == run_whatif(s, [Scenario("receive", N(20000))])


def test_whatif_category_increase_uses_history():
    s = snap()
    o = run_whatif(s, [Scenario("category_increase_pct", category="food", pct=50)])[0]
    assert o.runway_after.days < o.runway_before.days
    with pytest.raises(InvalidScenario):
        run_whatif(s, [Scenario("category_increase_pct", category="yachts", pct=10)])


def test_whatif_is_bounded_and_validates():
    s = snap()
    with pytest.raises(InvalidScenario):
        run_whatif(s, [Scenario("receive", N(1))] * (MAX_SCENARIOS + 1))
    with pytest.raises(InvalidScenario):
        run_whatif(s, [])
    with pytest.raises(InvalidScenario):
        run_whatif(s, [Scenario("receive", N(1))], horizon=500)
    for bad in (Scenario("receive", N(0.01) if False else Money(0)), Scenario("teleport", N(5)), Scenario("receive", Money(10**12)),
                Scenario("spend_less_weekly", N(999999)), Scenario("lose_income", name="Nobody"), Scenario("category_increase_pct", category="food", pct=500)):
        with pytest.raises(InvalidScenario):
            run_whatif(s, [bad])
    with pytest.raises(InvalidScenario):
        run_whatif(snap(history=False), [Scenario("receive", N(1))])
