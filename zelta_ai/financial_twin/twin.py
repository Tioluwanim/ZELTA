"""FinancialTwinService: the single composition boundary.

observed  = what providers reported (accounts, balances, normalised events)
inferred  = what deterministic engines derived from observed data (burn, runway, cushion), with confidence
context   = external signals, with provenance and freshness (kept separate; never mixed into observed)
simulated = hypothetical outcomes, produced only by `simulate()` and never stored as fact
Failures degrade to explicit warnings: unknown stays unknown.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from fractions import Fraction
from typing import Iterable, List, Optional, Sequence, Tuple

from domain.events import Account, Event
from domain.money import Money
from engines.burn import BurnResult, burn, essential_per_day, first_observed_from
from engines.buffer import BufferResult, buffer_status
from engines.cushion import Stability, income_stability, required_cushion
from engines.forecast_summary import ForecastSummary, forecast_summary
from engines.genome import Genome, genome
from engines.position import Goal, Position, current_position
from engines.runway import IncomeStream, Obligation, RunwayResult, WhatIfResult, runway_days, what_if
from ledger import ConnectedMoney, NormaliseResult, normalise, total_connected_money
from openbanking.audit import AuditLog
from openbanking.consent import ConsentError, ConsentStore, require_consent
from openbanking.redact import safe_error
from providers.base import FinancialProvider, ProviderError
from providers.context import ContextProvider, ContextSignal


@dataclass(frozen=True)
class Observed:
    accounts: Tuple[Account, ...]
    connected: Optional[ConnectedMoney]
    events: Tuple[Event, ...]
    rejected_rows: int
    first_observed: Optional[date]


@dataclass(frozen=True)
class Inferred:
    burn: BurnResult
    essential_per_day: Optional[Fraction]
    stability: Optional[Stability]
    cushion: Optional[Money]
    cushion_assumptions: Tuple[str, ...]
    runway: RunwayResult
    runway_to_cushion: Optional[RunwayResult]


@dataclass(frozen=True)
class TwinSnapshot:
    as_of: datetime
    user_id: str
    observed: Observed
    inferred: Inferred
    context_fresh: Tuple[ContextSignal, ...]
    context_stale: Tuple[ContextSignal, ...]
    warnings: Tuple[str, ...]
    obligations: Tuple[Obligation, ...] = ()
    streams: Tuple[IncomeStream, ...] = ()
    goals: Tuple[Goal, ...] = ()

    @property
    def total(self) -> Optional[Money]:
        return self.observed.connected.total if self.observed.connected else None

    # Days 6-9 views: pure functions of the snapshot (as_of is the snapshot's, never the clock)
    def position(self) -> Position:
        return current_position(self.total, self.observed.events, self.as_of, self.obligations,
                                self.inferred.essential_per_day, self.inferred.cushion, self.goals)

    def genome(self) -> Genome:
        return genome(self.observed.events, self.as_of, self.observed.first_observed)

    def forecast(self, horizon: int = 30) -> Optional[ForecastSummary]:
        from engines.buffer import minimum_safe_amount
        ms = minimum_safe_amount(self.inferred.essential_per_day, (), self.as_of)   # essentials only; bills are already in the path
        return forecast_summary(self.total, self.as_of, self.inferred.burn.per_day, self.obligations, self.streams,
                                self.goals, ms, self.inferred.cushion, horizon)

    def buffer(self) -> BufferResult:
        pos = self.position()
        return buffer_status(self.total, self.inferred.essential_per_day, self.inferred.cushion, self.obligations,
                             self.as_of, pos.safe_flexible)

    def simulate(self, kind: str, amount: Money, horizon: int = 30) -> WhatIfResult:
        """Hypothetical only. Needs a known total and burn; otherwise refuses rather than guessing."""
        if self.total is None or self.inferred.burn.per_day is None:
            raise ValueError("cannot simulate: balance or burn is unknown (insufficient evidence)")
        return what_if(self.total, self.as_of, self.inferred.burn.per_day, self.obligations, self.streams,
                       kind, amount, horizon)


class FinancialTwinService:
    def __init__(self, provider: FinancialProvider, context_providers: Iterable[ContextProvider] = (),
                 consents: Optional[ConsentStore] = None, audit: Optional[AuditLog] = None):
        self._p = provider
        self._ctx = list(context_providers)
        self._consents = consents
        self._audit = audit

    def build(self, user_id: str, connection_ref: str, as_of: datetime,
              obligations: Sequence[Obligation] = (), streams: Sequence[IncomeStream] = (),
              essential_categories: Iterable[str] = (), monthly_incomes: Sequence[Money] = (),
              timing_hits: int = 0, timing_expected: int = 0, first_observed: Optional[date] = None,
              goals: Sequence[Goal] = ()) -> TwinSnapshot:
        warnings: List[str] = []
        accounts: List[Account] = []
        norm = NormaliseResult((), (), 0, ())

        try:
            if self._consents is not None:
                require_consent(self._consents, user_id, self._p.name, "accounts", as_of)
                require_consent(self._consents, user_id, self._p.name, "transactions", as_of)
            accounts = self._p.list_accounts(connection_ref, as_of)
            raw = []
            for a in accounts:
                raw.extend(self._p.fetch_transactions(connection_ref, a.id))
            norm = normalise(raw, as_of, own_account_ids=[a.id for a in accounts])
            self._log(as_of, user_id, "build_twin", "ok")
        except ConsentError as exc:
            warnings.append(f"consent: {safe_error(exc)}")
            self._log(as_of, user_id, "build_twin", "denied")
        except ProviderError as exc:
            warnings.append(f"provider_{exc.code}")
            self._log(as_of, user_id, "build_twin", f"error:{exc.code}")
        if not getattr(self._p, "is_live", False):
            warnings.append(f"provider '{self._p.name}' is not a live integration")

        connected = total_connected_money(accounts, as_of) if accounts else None
        if connected is not None and not connected.included:
            # nothing contributed a balance: the total is unknown, not zero
            reasons = ", ".join(sorted({r for _, r in connected.excluded})) or "no accounts"
            warnings.append(f"no account contributed a usable balance ({reasons})")
            connected = None
        if connected is not None and not connected.complete:
            warnings.append("connected money is incomplete: some accounts are stale, excluded or unknown")
        if connected is None:
            warnings.append("no account data: total is unknown (not zero)")
        if norm.rejected:
            warnings.append(f"{len(norm.rejected)} provider rows rejected during normalisation")
        events = norm.events
        fo = first_observed or first_observed_from(events)

        b = burn(events, as_of, fo)
        ess = essential_per_day(events, as_of, fo, essential_categories)
        stab = income_stability(monthly_incomes, timing_hits, timing_expected) if monthly_incomes else None
        cushion, assume = required_cushion(ess, stab.score if stab else None)
        rw = runway_days(connected.total, as_of, b.per_day, obligations, confidence=b.confidence) \
            if connected else RunwayResult(None, False, 120, "insufficient")
        rwc = runway_days(connected.total, as_of, b.per_day, obligations, floor=cushion, confidence=b.confidence) \
            if (connected and cushion) else None
        if b.per_day is None:
            warnings.append(f"burn unavailable: {b.reason}")

        fresh: List[ContextSignal] = []
        stale: List[ContextSignal] = []
        for cp in self._ctx:
            try:
                for sig in cp.fetch(as_of):
                    (fresh if sig.is_fresh(as_of) else stale).append(sig)
            except Exception as exc:     # context is optional: never break the twin
                warnings.append(f"context '{getattr(cp, 'name', '?')}' unavailable: {type(exc).__name__}")

        return TwinSnapshot(as_of, user_id,
                            Observed(tuple(accounts), connected, events, len(norm.rejected), fo),
                            Inferred(b, ess, stab, cushion, assume, rw, rwc),
                            tuple(fresh), tuple(stale), tuple(warnings), tuple(obligations), tuple(streams), tuple(goals))

    def _log(self, at, user_id, action, outcome):
        if self._audit:
            self._audit.record(at, user_id, action, self._p.name, outcome)
