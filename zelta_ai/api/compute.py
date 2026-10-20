"""Stateless compute endpoints: the caller (the ZELTA backend) sends the user's data, this service computes.

POST /brain/v1/twin/compute   full view: summary, position, buffer, forecast, habits, recommendations
POST /brain/v1/guardian       PROCEED / CAUTION / PROTECT for one action
POST /brain/v1/whatif         up to 5 bounded hypothetical scenarios
POST /brain/v1/agent          one chat turn through the orchestrator (no model unless one is configured)

No database, no state, nothing stored. Authentication is the internal key (the backend authenticates end users and asserts
x-user-id). Every error is {code, message}; exception text is never returned. All amounts are naira decimal STRINGS; floats are rejected.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from agent_tools import ToolContext, build_default_registry
from agents import Orchestrator
from api.twin import ContractRoute, ErrorOut, get_clock
from domain.clock import NaiveDatetimeError, require_aware
from domain.events import Account, RawTransaction
from domain.money import Money
from engines.position import Goal
from engines.runway import IncomeStream, InvalidScenario, Obligation
from engines.whatif import Scenario, run_whatif
from financial_twin import FinancialTwinService
from financial_twin.twin import TwinSnapshot
from llm import LLMProvider, NullProvider
from providers.inline import InlineProvider
from ratelimit import rate_limit
from security import verify_internal_request

router = APIRouter(prefix="/brain/v1", tags=["Financial Twin compute"], route_class=ContractRoute)
_limit = rate_limit(limit=60, window_s=60.0)
_DEPS = [Depends(verify_internal_request), Depends(_limit)]
_RESP: Dict[int | str, Dict[str, Any]] = {401: {"model": ErrorOut}, 422: {"model": ErrorOut}, 429: {"model": ErrorOut}, 500: {"model": ErrorOut}}


def _money(v: str) -> Money:
    try:
        return Money.from_major(v)
    except Exception:
        raise ValueError("invalid naira amount") from None


class _S(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AccountIn(_S):
    id: str = Field(min_length=1, max_length=64)
    institution: str = Field(min_length=1, max_length=64)
    balance_naira: Optional[str] = None            # null = unknown, never zero
    balance_as_of: Optional[datetime] = None

    @field_validator("balance_naira")
    @classmethod
    def _b(cls, v):
        if v is not None:
            _money(v)
        return v


class TxnIn(_S):
    account_id: str = Field(min_length=1, max_length=64)
    amount_naira: str                               # signed: expense negative, income positive
    at: datetime
    ref: Optional[str] = Field(None, max_length=128)
    description: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=40)

    @field_validator("amount_naira")
    @classmethod
    def _a(cls, v):
        _money(v)
        return v


class BillIn(_S):
    name: str = Field(min_length=1, max_length=80)
    amount_naira: str
    due: date

    @field_validator("amount_naira")
    @classmethod
    def _a(cls, v):
        if _money(v).minor <= 0:
            raise ValueError("amount must be positive")
        return v


class StreamIn(_S):
    name: str = Field(min_length=1, max_length=80)
    typical_naira: str
    low_naira: str
    high_naira: str
    next_expected: date
    hit_rate: float = Field(ge=0, le=1)

    @field_validator("typical_naira", "low_naira", "high_naira")
    @classmethod
    def _a(cls, v):
        _money(v)
        return v


class GoalIn(_S):
    name: str = Field(min_length=1, max_length=80)
    target_naira: str
    saved_naira: str = "0"
    deadline: date

    @field_validator("target_naira", "saved_naira")
    @classmethod
    def _a(cls, v):
        _money(v)
        return v


class TwinInput(_S):
    as_of: Optional[datetime] = None
    accounts: List[AccountIn] = Field(min_length=1, max_length=10)
    transactions: List[TxnIn] = Field(default_factory=list, max_length=3000)
    bills: List[BillIn] = Field(default_factory=list, max_length=50)
    streams: List[StreamIn] = Field(default_factory=list, max_length=10)
    goals: List[GoalIn] = Field(default_factory=list, max_length=10)
    essential_categories: List[str] = Field(default_factory=lambda: ["food", "transport", "data", "utilities", "education"], max_length=20)
    monthly_incomes_naira: List[str] = Field(default_factory=list, max_length=12)
    first_observed: Optional[date] = None


class ActionIn(_S):
    kind: str = "spend"
    amount_naira: str
    category: Optional[str] = Field(None, max_length=40)


class GuardianIn(TwinInput):
    action: ActionIn


class ScenarioIn(_S):
    kind: str
    amount_naira: Optional[str] = None
    category: Optional[str] = Field(None, max_length=40)
    pct: Optional[int] = None
    name: Optional[str] = Field(None, max_length=80)


class WhatIfIn(TwinInput):
    scenarios: List[ScenarioIn] = Field(min_length=1, max_length=5)
    horizon: int = Field(30, ge=7, le=120)


class AgentIn(TwinInput):
    message: str = Field(min_length=1, max_length=500)


def get_llm() -> LLMProvider:
    return NullProvider()          # override in deployment with llm.build_stack(...).provider


def _build(inp: TwinInput, as_of: datetime) -> TwinSnapshot:
    try:
        return _build_unchecked(inp, as_of)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid data") from None


def _build_unchecked(inp: TwinInput, as_of: datetime) -> TwinSnapshot:
    accounts = [Account(a.id, "self_reported", a.institution, f"{a.institution}:{a.id}",
                        None if a.balance_naira is None else _money(a.balance_naira), a.balance_as_of) for a in inp.accounts]
    ids = {a.id for a in accounts}
    txns: Dict[str, List[RawTransaction]] = {i: [] for i in ids}
    for t in inp.transactions:
        if t.account_id not in ids:
            raise ValueError("transaction refers to an unknown account")
        txns[t.account_id].append(RawTransaction("self_reported", t.account_id, _money(t.amount_naira), t.at, "posted", t.ref,
                                                 t.description, None, t.category))
    bills = [Obligation(b.name, _money(b.amount_naira), b.due) for b in inp.bills]
    streams = [IncomeStream(s.name, _money(s.typical_naira), _money(s.low_naira), _money(s.high_naira), s.next_expected, s.hit_rate)
               for s in inp.streams]
    goals = [Goal(g.name, _money(g.target_naira), g.deadline, _money(g.saved_naira)) for g in inp.goals]
    incomes = [_money(x) for x in inp.monthly_incomes_naira]
    return FinancialTwinService(InlineProvider(accounts, txns)).build(
        "caller", "inline", as_of, bills, streams, inp.essential_categories, incomes, 0, 0, inp.first_observed, goals)


def _as_of(inp: TwinInput, now: datetime) -> datetime:
    ref = inp.as_of or now
    try:
        require_aware(ref, "as_of")
    except NaiveDatetimeError:
        raise HTTPException(status_code=422, detail="as_of must include a timezone") from None
    return ref


def _ctx(user_id: str, snap: TwinSnapshot) -> ToolContext:
    return ToolContext(user_id, snap.as_of, frozenset({"twin:read", "twin:simulate", "opportunities:read"}), snap)


@router.post("/twin/compute", dependencies=_DEPS, responses=_RESP)
async def compute(inp: TwinInput, x_user_id: str = Header(..., min_length=1, max_length=128), now: datetime = Depends(get_clock)) -> Dict[str, Any]:
    snap = _build(inp, _as_of(inp, now))
    reg, ctx = build_default_registry(), _ctx(x_user_id, snap)
    out: Dict[str, Any] = {"as_of": snap.as_of.isoformat(), "source": "self_reported"}
    for key, tool in (("summary", "get_financial_summary"), ("runway", "estimate_runway"), ("cushion", "evaluate_cushion"),
                      ("position", "get_current_position"), ("buffer", "get_buffer"), ("forecast", "get_forecast"),
                      ("habits", "get_spending_habits"), ("recommendations", "get_recommendations")):
        r = reg.call(tool, {}, ctx)
        out[key] = dict(r.data) if r.ok else {"unavailable": r.error}
    return out


@router.post("/guardian", dependencies=_DEPS, responses=_RESP)
async def guard(inp: GuardianIn, x_user_id: str = Header(..., min_length=1, max_length=128), now: datetime = Depends(get_clock)) -> Dict[str, Any]:
    snap = _build(inp, _as_of(inp, now))
    r = build_default_registry().call("check_action", {"amount_naira": inp.action.amount_naira, "kind": inp.action.kind,
                                                      "category": inp.action.category}, _ctx(x_user_id, snap))
    if not r.ok:
        raise HTTPException(status_code=422, detail="invalid action")
    return dict(r.data)


@router.post("/whatif", dependencies=_DEPS, responses=_RESP)
async def whatif(inp: WhatIfIn, x_user_id: str = Header(..., min_length=1, max_length=128), now: datetime = Depends(get_clock)) -> Dict[str, Any]:
    snap = _build(inp, _as_of(inp, now))
    try:
        outs = run_whatif(snap, [Scenario(s.kind, None if s.amount_naira is None else _money(s.amount_naira), s.category, s.pct, s.name)
                                 for s in inp.scenarios], inp.horizon)
    except InvalidScenario as exc:
        return {"feasible": False, "reason": str(exc), "outcomes": []}
    return {"feasible": True, "simulated": True, "outcomes": [{
        "scenario": o.label, "runway_before_days": o.runway_before.days and round(o.runway_before.days, 2),
        "runway_after_days": o.runway_after.days and round(o.runway_after.days, 2),
        "runout_before": o.runout_before and o.runout_before.isoformat(), "runout_after": o.runout_after and o.runout_after.isoformat(),
        "balance_end_before_kobo": o.balance_end_before.minor, "balance_end_after_kobo": o.balance_end_after.minor,
        "notes": list(o.notes)} for o in outs]}


@router.post("/agent", dependencies=_DEPS, responses=_RESP)
async def agent(inp: AgentIn, x_user_id: str = Header(..., min_length=1, max_length=128), now: datetime = Depends(get_clock),
                llm: LLMProvider = Depends(get_llm)) -> Dict[str, Any]:
    snap = _build(inp, _as_of(inp, now))
    r = Orchestrator(build_default_registry(), llm).handle(inp.message, _ctx(x_user_id, snap))
    return {"text": r.text, "intents": list(r.intents), "used_llm": r.used_llm, "warnings": list(r.warnings),
            "suggestions": list(r.suggestions), "needs_user_input": r.needs_user_input,
            "tools": [{"tool": t.tool, "ok": t.ok} for t in r.trace], "as_of": snap.as_of.isoformat()}


