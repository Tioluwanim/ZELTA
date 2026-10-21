"""Domain tools over a TwinSnapshot. All numbers come from the deterministic engines."""
from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from domain.money import Money
from engines.affordability import affordability
from engines.guardian import Action, guardian
from engines.recommendations import recommend
from engines.runway import InvalidScenario
from engines.whatif import KINDS as WHATIF_KINDS, Scenario, run_whatif
from .registry import Tool, ToolContext, ToolRegistry

READ = "twin:read"
SIMULATE = "twin:simulate"
OPPS = "opportunities:read"


def money_out(m: Optional[Money]) -> Optional[Dict[str, Any]]:
    return None if m is None else {"minor": m.minor, "currency": m.currency, "display": str(m)}


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class NoArgs(_Strict):
    pass


class AmountArgs(_Strict):
    amount_naira: str            # decimal string, never a float

    @field_validator("amount_naira")
    @classmethod
    def _valid(cls, v: str) -> str:
        m = Money.from_major(v)
        if m.minor <= 0:
            raise ValueError("amount must be positive")
        return v


class ScenarioArgs(AmountArgs):
    kind: str

    @field_validator("kind")
    @classmethod
    def _kind(cls, v: str) -> str:
        if v not in ("spend_less_weekly", "spend_more_weekly", "receive", "purchase", "unexpected_expense"):
            raise ValueError("unknown scenario kind")
        return v


class GuardArgs(AmountArgs):
    kind: str = "spend"
    category: Optional[str] = None

    @field_validator("kind")
    @classmethod
    def _gk(cls, v: str) -> str:
        if v not in ("spend", "transfer_out", "lock_savings"):
            raise ValueError("unknown action kind")
        return v


class WhatIfArgs(_Strict):
    kind: str
    amount_naira: Optional[str] = None
    category: Optional[str] = None
    pct: Optional[int] = None
    name: Optional[str] = None

    @field_validator("kind")
    @classmethod
    def _wk(cls, v: str) -> str:
        if v not in WHATIF_KINDS:
            raise ValueError("unknown scenario kind")
        return v

    @field_validator("amount_naira")
    @classmethod
    def _wa(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            Money.from_major(v)
        return v


class AskArgs(_Strict):
    question: str


def _snap(ctx: ToolContext):
    if ctx.snapshot is None:
        raise LookupError("no financial snapshot available")
    return ctx.snapshot


def summary(ctx: ToolContext, _: NoArgs) -> Dict[str, Any]:
    s = _snap(ctx)
    inf = s.inferred
    return {"total_connected_money": money_out(s.total),
            "accounts_complete": bool(s.observed.connected and s.observed.connected.complete),
            "burn_per_day": money_out(inf.burn.per_day_money()), "burn_confidence": inf.burn.confidence,
            "covered_days": inf.burn.coverage_28, "runway_days": inf.runway.days,
            "warnings": list(s.warnings), "context_signals": len(s.context_fresh)}


def runway(ctx: ToolContext, _: NoArgs) -> Dict[str, Any]:
    s = _snap(ctx)
    r = s.inferred.runway
    return {"runway_days": None if r.days is None else round(r.days, 2), "never_crosses_in_horizon": r.capped,
            "horizon_days": r.horizon, "confidence": r.confidence,
            "assumptions": ["no new income counted", "burn is the 0.7/0.3 blend of 28- and 7-day averages (proposed)",
                            f"{len(s.obligations)} dated bills counted"],
            "insufficient_evidence": r.days is None}


def cushion(ctx: ToolContext, _: NoArgs) -> Dict[str, Any]:
    s = _snap(ctx)
    i = s.inferred
    return {"required_cushion": money_out(i.cushion), "assumptions": list(i.cushion_assumptions),
            "covered": None if (i.cushion is None or s.total is None) else s.total >= i.cushion,
            "runway_to_cushion_days": None if not i.runway_to_cushion or i.runway_to_cushion.days is None
            else round(i.runway_to_cushion.days, 2)}


def can_afford(ctx: ToolContext, a: AmountArgs) -> Dict[str, Any]:
    s = _snap(ctx)
    i = s.inferred
    r = affordability(s.total, s.as_of, Money.from_major(a.amount_naira), s.obligations,
                      i.essential_per_day, i.cushion)
    return {"verdict": r.verdict, "safe_flexible": money_out(r.safe_flexible), "horizon_days": r.horizon_days,
            "reasons": list(r.reasons)}


def scenario(ctx: ToolContext, a: ScenarioArgs) -> Dict[str, Any]:
    s = _snap(ctx)
    try:
        w = s.simulate(a.kind, Money.from_major(a.amount_naira))
    except (InvalidScenario, ValueError) as exc:
        return {"feasible": False, "reason": str(exc)}
    return {"feasible": True, "simulated": True, "kind": a.kind,
            "runway_before_days": round(w.base.days, 2), "runway_after_days": round(w.scenario.days, 2),
            "notes": list(w.notes)}


def _r(x, n=2):
    return None if x is None else round(float(x), n)


def position(ctx: ToolContext, _: NoArgs) -> Dict[str, Any]:
    p = _snap(ctx).position()
    return {"total_connected_money": money_out(p.total), "inflow_28d": money_out(p.inflow_28d),
            "outflow_28d": money_out(p.outflow_28d), "net_28d": money_out(p.net_28d),
            "bills_due_in_horizon": money_out(p.obligations_horizon), "bills_count": p.obligations_count,
            "available_after_bills": money_out(p.available_after_obligations),
            "goals_required_horizon": money_out(p.goals_required_horizon), "cushion": money_out(p.cushion),
            "safe_flexible": money_out(p.safe_flexible), "horizon_days": p.horizon_days, "notes": list(p.notes),
            "daily_spend_28d": [{"date": d.isoformat(), "minor": m} for d, m in p.daily_spend]}


def habits(ctx: ToolContext, _: NoArgs) -> Dict[str, Any]:
    g = _snap(ctx).genome()
    t = g.income_timing
    return {"covered_days": g.covered_days,
            "income_timing": None if t is None else {"typical_day_of_month": t.typical_day_of_month,
                                                    "spread_days": t.spread_days, "events": t.events},
            "post_income_spend_multiple": _r(g.post_income_spike), "post_income_spike": g.spike_flag,
            "category_share_pct": {k: _r(v * 100, 1) for k, v in g.category_share.items()},
            "focus_weekly_spend": {k: money_out(Money(v)) for k, v in g.focus_weekly_minor.items()},
            "recurring": [{"label": r.label, "cadence": r.cadence, "typical": money_out(Money(r.typical_minor)),
                           "occurrences": r.occurrences} for r in g.recurring],
            "weekend_vs_weekday_multiple": _r(g.weekend_ratio), "month_end_multiple": _r(g.month_end_ratio),
            "spending_change_pct": _r(None if g.spending_change is None else g.spending_change * 100, 1),
            "spending_change": g.change_flag, "not_enough_data_for": list(g.insufficient)}


def forecast_tool(ctx: ToolContext, _: NoArgs) -> Dict[str, Any]:
    f = _snap(ctx).forecast()
    if f is None:
        return {"available": False, "reason": "balance or spending estimate is unknown (insufficient evidence)"}
    ni = f.next_income
    return {"available": True, "timezone": f.timezone, "horizon_days": f.horizon,
            "expected_balance": {str(k): money_out(v) for k, v in f.expected_balance.items()},
            "likely_runout_date": f.likely_runout.isoformat() if f.likely_runout else None,
            "runout_range": [d.isoformat() if d else None for d in f.runout_range],
            "upcoming_expenses": [{"name": o.name, "amount": money_out(o.amount), "due": o.due.isoformat()}
                                  for o in f.upcoming_expenses],
            "next_income": None if ni is None else {"name": ni.stream, "arrives": ni.arrives.isoformat(),
                                                    "runout_day_without": ni.runout_day_without,
                                                    "runout_day_with": ni.runout_day_with,
                                                    "gain_at_horizon": money_out(ni.balance_gain_at_horizon)},
            "goals": [{"name": g.name, "status": g.status, "remaining": money_out(g.remaining)} for g in f.goals],
            "first_below_minimum_safe": f.first_below_minimum.isoformat() if f.first_below_minimum else None,
            "first_below_cushion": f.first_below_cushion.isoformat() if f.first_below_cushion else None,
            "notes": list(f.notes)}


def buffer_tool(ctx: ToolContext, _: NoArgs) -> Dict[str, Any]:
    b = _snap(ctx).buffer()
    return {"status": b.status, "minimum_safe": money_out(b.minimum_safe), "cushion": money_out(b.cushion),
            "buffer_after_bills": money_out(b.buffer_after_obligations),
            "flexible_room": money_out(b.flexible_room), "notes": list(b.notes)}


def recommendations(ctx: ToolContext, _: NoArgs) -> Dict[str, Any]:
    r = recommend(_snap(ctx))
    return {"recommendations": [{"kind": x.kind, "priority": x.priority, "title": x.title, "amount": money_out(x.amount),
                                 "because": list(x.because), "effect": x.effect, "confidence": x.confidence} for x in r.items],
            "withheld": list(r.withheld)}


def check_action(ctx: ToolContext, a: GuardArgs) -> Dict[str, Any]:
    g = guardian(_snap(ctx), Action(a.kind, Money.from_major(a.amount_naira), a.category))
    return {"state": g.state, "headline": g.headline, "verified": g.verified, "max_proceed_amount": money_out(g.max_proceed_amount),
            "factors": [{"name": f.name, "state": f.state, "detail": f.detail} for f in g.factors]}


def whatif(ctx: ToolContext, a: WhatIfArgs) -> Dict[str, Any]:
    sc = Scenario(a.kind, None if a.amount_naira is None else Money.from_major(a.amount_naira), a.category, a.pct, a.name)
    try:
        o = run_whatif(_snap(ctx), [sc])[0]
    except InvalidScenario as exc:
        return {"feasible": False, "reason": str(exc)}
    return {"feasible": True, "simulated": True, "scenario": o.label,
            "runway_before_days": None if o.runway_before.days is None else round(o.runway_before.days, 2),
            "runway_after_days": None if o.runway_after.days is None else round(o.runway_after.days, 2),
            "runout_before": o.runout_before.isoformat() if o.runout_before else None,
            "runout_after": o.runout_after.isoformat() if o.runout_after else None,
            "balance_end_before": money_out(o.balance_end_before), "balance_end_after": money_out(o.balance_end_after),
            "notes": list(o.notes)}


def opportunities(ctx: ToolContext, _: NoArgs) -> Dict[str, Any]:
    s = _snap(ctx)
    if ctx.opportunity_engine is None:
        return {"opportunities": [], "note": "no opportunity source is configured"}
    ranked = ctx.opportunity_engine.find(s, ctx.as_of)
    return {"opportunities": [{"rank": r.rank, "category": r.opportunity.category, "title": r.opportunity.title,
                               "provenance": r.opportunity.provenance, "source": r.opportunity.source,
                               "expected_benefit": money_out(r.opportunity.expected_benefit),
                               "id": r.opportunity.id, "rationale": r.opportunity.rationale, "cost": money_out(r.opportunity.cost),
                               "confidence": r.opportunity.confidence, "eligibility": list(r.opportunity.eligibility),
                               "expires_at": r.opportunity.expires_at.isoformat() if r.opportunity.expires_at else None,
                               "risk": r.opportunity.risk, "reasons": list(r.reasons)} for r in ranked]}


def ask_user(ctx: ToolContext, a: AskArgs) -> Dict[str, Any]:
    return {"needs_user_input": True, "question": a.question[:300]}


def build_default_registry() -> ToolRegistry:
    reg = ToolRegistry()
    for t in (
        Tool("get_financial_summary", "Normalised summary: connected money, burn, runway, warnings.", NoArgs, summary, READ),
        Tool("estimate_runway", "Days until money runs out, with stated assumptions.", NoArgs, runway, READ),
        Tool("evaluate_cushion", "Emergency cushion requirement and whether it is covered.", NoArgs, cushion, READ),
        Tool("can_afford", "Whether an amount fits within safe flexible spending.", AmountArgs, can_afford, READ),
        Tool("run_scenario", "Hypothetical what-if on runway. Simulated, never fact.", ScenarioArgs, scenario, SIMULATE),
        Tool("get_current_position", "Inflow, outflow, bills due, availability, goals, flexible money.", NoArgs, position, READ),
        Tool("get_spending_habits", "Descriptive spending habits (Financial Genome) with data sufficiency.", NoArgs, habits, READ),
        Tool("get_forecast", "Expected balance, likely runout, next-income effect, goal trajectory.", NoArgs, forecast_tool, READ),
        Tool("get_buffer", "Minimum safe amount, cushion and buffer status.", NoArgs, buffer_tool, READ),
        Tool("get_recommendations", "Deterministic next steps from the calculated financial state.", NoArgs, recommendations, READ),
        Tool("check_action", "Guardian: PROCEED, CAUTION or PROTECT for a spend, transfer or lock.", GuardArgs, check_action, READ),
        Tool("run_whatif", "Bounded hypothetical (spend less, receive, save weekly, lose income...). Simulated, never fact.", WhatIfArgs, whatif, SIMULATE),
        Tool("list_opportunities", "Earn/Save/Grow opportunities with provenance.", NoArgs, opportunities, OPPS),
        Tool("ask_user", "Ask the user for missing information.", AskArgs, ask_user, READ),
    ):
        reg.register(t)
    return reg
