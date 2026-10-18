"""Domain tools over a TwinSnapshot. All numbers come from the deterministic engines."""
from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from domain.money import Money
from engines.affordability import affordability
from engines.runway import InvalidScenario
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


def opportunities(ctx: ToolContext, _: NoArgs) -> Dict[str, Any]:
    s = _snap(ctx)
    if ctx.opportunity_engine is None:
        return {"opportunities": [], "note": "no opportunity source is configured"}
    ranked = ctx.opportunity_engine.find(s, ctx.as_of)
    return {"opportunities": [{"rank": r.rank, "category": r.opportunity.category, "title": r.opportunity.title,
                               "provenance": r.opportunity.provenance, "source": r.opportunity.source,
                               "expected_benefit": money_out(r.opportunity.expected_benefit),
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
        Tool("list_opportunities", "Earn/Save/Grow opportunities with provenance.", NoArgs, opportunities, OPPS),
        Tool("ask_user", "Ask the user for missing information.", AskArgs, ask_user, READ),
    ):
        reg.register(t)
    return reg
