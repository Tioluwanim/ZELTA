"""External context contract. Context is NOT transaction data and never feeds the deterministic maths
unless a caller passes it in explicitly. Missing or stale context is simply absent, never zero.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Callable, List, Mapping, Optional, Protocol

from domain.clock import require_aware

ORIGINS = ("verified_provider", "user_reported", "model_inferred")


@dataclass(frozen=True)
class ContextSignal:
    kind: str                         # economic_indicator | calendar | user_reported | market_sentiment
    name: str
    value: Any
    source: str                       # who produced it (provider name, "user_conversation", ...)
    origin: str                       # one of ORIGINS; model_inferred is never treated as fact
    observed_at: datetime
    fresh_for: Optional[timedelta] = None     # None = no stated shelf life -> treated as unverifiable
    confidence: Optional[float] = None        # only when a source actually states one
    consent_scope: Optional[str] = None       # e.g. "conversation_use"

    def __post_init__(self):
        require_aware(self.observed_at, "observed_at")
        if self.origin not in ORIGINS:
            raise ValueError(f"origin must be one of {ORIGINS}")
        if self.confidence is not None and not 0.0 <= self.confidence <= 1.0:
            raise ValueError("confidence must be within [0, 1]")

    def is_fresh(self, as_of: datetime) -> bool:
        if self.fresh_for is None:
            return False
        return self.observed_at <= as_of and as_of - self.observed_at <= self.fresh_for


class ContextProvider(Protocol):
    name: str
    def fetch(self, as_of: datetime) -> List[ContextSignal]: ...


class UserReportedContext:
    """Facts the user stated in conversation (upcoming expense, expected income...). Origin is kept."""
    name = "user_reported"

    def __init__(self):
        self._signals: List[ContextSignal] = []

    def add(self, name: str, value: Any, observed_at: datetime, valid_for_days: int = 30) -> ContextSignal:
        sig = ContextSignal("user_reported", name, value, "user_conversation", "user_reported",
                            observed_at, timedelta(days=valid_for_days), None, "conversation_use")
        self._signals.append(sig)
        return sig

    def fetch(self, as_of):
        return list(self._signals)


class BayseStressContext:
    """Wraps the existing Bayse stress monitor WITHOUT importing it (no network at import time).

    `get_signal` is injected, e.g. `monitor.get_signal`. The dict shape is whatever that monitor returns:
    only 'score' and 'status' are read, and a missing/invalid score yields no signal (not a neutral 50).
    """
    name = "bayse_stress"

    def __init__(self, get_signal: Callable[[], Mapping[str, Any]], max_age: timedelta = timedelta(minutes=30)):
        self._get = get_signal
        self._max_age = max_age

    def fetch(self, as_of):
        try:
            raw = self._get() or {}
        except Exception:
            return []
        score = raw.get("score")
        if isinstance(score, bool) or not isinstance(score, (int, float)):
            return []
        return [ContextSignal("market_sentiment", "bayse_stress_score", float(score), "bayse",
                              "verified_provider", as_of, self._max_age, None, None)]
