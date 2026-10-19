"""Retry, circuit breaker and ordered fallback. Time and sleeping are injectable for tests."""
from __future__ import annotations

import time
from typing import Callable, List, Optional, Sequence

from .base import LLMError, LLMProvider, LLMRequest, LLMResponse, LLMUnavailable


class CircuitBreaker:
    """Opens after `threshold` consecutive failures; lets one trial call through after `cooldown_s`."""

    def __init__(self, threshold: int = 3, cooldown_s: float = 30.0, clock: Callable[[], float] = time.monotonic):
        self.threshold, self.cooldown, self._clock = threshold, cooldown_s, clock
        self._fails = 0
        self._opened_at: Optional[float] = None

    @property
    def is_open(self) -> bool:
        if self._opened_at is None:
            return False
        return self._clock() - self._opened_at < self.cooldown       # past cooldown: half-open, allow a trial

    def success(self) -> None:
        self._fails, self._opened_at = 0, None

    def failure(self) -> None:
        self._fails += 1
        if self._fails >= self.threshold:
            self._opened_at = self._clock()


class RetryProvider(LLMProvider):
    """Retries only retryable errors, with exponential backoff."""

    def __init__(self, inner: LLMProvider, attempts: int = 2, base_delay_s: float = 0.2,
                 sleep: Callable[[float], None] = time.sleep):
        self._inner, self._attempts, self._delay, self._sleep = inner, max(1, attempts), base_delay_s, sleep
        self.name, self.model = inner.name, inner.model

    def generate(self, request: LLMRequest) -> LLMResponse:
        last: LLMError = LLMUnavailable()
        for i in range(self._attempts):
            try:
                return self._inner.generate(request)
            except LLMError as exc:
                last = exc
                if not exc.retryable or i == self._attempts - 1:
                    raise
                self._sleep(self._delay * (2 ** i))
        raise last


class FallbackProvider(LLMProvider):
    """Tries providers in order; skips any whose breaker is open. Raises LLMUnavailable if none answers."""
    name = "fallback"

    def __init__(self, providers: Sequence[LLMProvider], threshold: int = 3, cooldown_s: float = 30.0,
                 clock: Callable[[], float] = time.monotonic):
        if not providers:
            raise ValueError("at least one provider is required")
        self._ps = list(providers)
        self._br = {id(p): CircuitBreaker(threshold, cooldown_s, clock) for p in providers}
        self.model = providers[0].model
        self.last_errors: List[str] = []

    def generate(self, request: LLMRequest) -> LLMResponse:
        self.last_errors = []
        for p in self._ps:
            br = self._br[id(p)]
            if br.is_open:
                self.last_errors.append(f"{p.name}:circuit_open")
                continue
            try:
                resp = p.generate(request)
            except LLMError as exc:
                br.failure()
                self.last_errors.append(f"{p.name}:{exc.code}")
                continue
            br.success()
            return resp
        raise LLMUnavailable("all providers failed: " + ", ".join(self.last_errors))

    def breaker_open(self, provider_name: str) -> bool:
        return any(self._br[id(p)].is_open for p in self._ps if p.name == provider_name)
