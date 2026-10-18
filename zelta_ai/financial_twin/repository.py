"""Where a user's twin inputs come from. A Protocol so the route never knows about Firestore or Mono."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional, Protocol, Tuple

from domain.money import Money
from engines.runway import IncomeStream, Obligation
from providers.base import FinancialProvider


class TwinDataUnavailable(Exception):
    """No data source is configured or reachable for this user."""


@dataclass(frozen=True)
class TwinInputs:
    provider: FinancialProvider
    connection_ref: str
    obligations: Tuple[Obligation, ...] = ()
    streams: Tuple[IncomeStream, ...] = ()
    essential_categories: Tuple[str, ...] = ()
    monthly_incomes: Tuple[Money, ...] = ()
    timing_hits: int = 0
    timing_expected: int = 0
    first_observed: Optional[date] = None


class TwinRepository(Protocol):
    def load(self, user_id: str, as_of: datetime) -> TwinInputs: ...


class UnconfiguredRepository:
    """Default in deployments: refuses rather than serving made-up numbers."""
    def load(self, user_id: str, as_of: datetime) -> TwinInputs:
        raise TwinDataUnavailable("no twin data source is configured")
