"""Concrete providers that need no vendor SDK.

CallableProvider is the integration point: wrap ANY model (a vendor SDK call, a local model, an HTTP endpoint,
your own trained model) in a function `fn(request) -> str | LLMResponse`. No vendor code lives in this repo.
"""
from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from typing import Callable, List, Optional, Sequence, Union

from .base import (LLMBadResponse, LLMError, LLMNotConfigured, LLMProvider, LLMRequest, LLMResponse, LLMTimeout,
                   LLMUnavailable)


class NullProvider(LLMProvider):
    """No model configured. Callers fall back to deterministic text."""
    name, model = "none", "none"

    def generate(self, request: LLMRequest) -> LLMResponse:
        raise LLMNotConfigured("no model provider configured")


class ScriptedProvider(LLMProvider):
    """Deterministic test double: returns queued responses (or raises queued LLMErrors)."""
    name, model = "scripted", "scripted"

    def __init__(self, responses: Sequence[Union[str, LLMError]], latency_s: float = 0.0):
        self._q: List[Union[str, LLMError]] = list(responses)
        self.requests: List[LLMRequest] = []
        self._latency = latency_s

    def generate(self, request: LLMRequest) -> LLMResponse:
        self.requests.append(request)
        if not self._q:
            raise LLMUnavailable("script exhausted")
        item = self._q.pop(0)
        if isinstance(item, LLMError):
            raise item
        return LLMResponse(item, self.name, self.model, latency_s=self._latency)


class CallableProvider(LLMProvider):
    def __init__(self, fn: Callable[[LLMRequest], Union[str, LLMResponse]], name: str = "callable",
                 model: str = "custom", timeout_s: Optional[float] = None,
                 clock: Callable[[], float] = time.monotonic):
        self._fn, self.name, self.model, self._timeout, self._clock = fn, name, model, timeout_s, clock
        self._pool = ThreadPoolExecutor(max_workers=2) if timeout_s else None

    def generate(self, request: LLMRequest) -> LLMResponse:
        start = self._clock()
        try:
            if self._pool is not None:
                out = self._pool.submit(self._fn, request).result(timeout=self._timeout)
            else:
                out = self._fn(request)
        except LLMError:
            raise
        except (FutureTimeout, TimeoutError):
            raise LLMTimeout("model call timed out") from None
        except Exception as exc:                  # never leak vendor exception text (may contain prompts/keys)
            raise LLMUnavailable(f"model call failed ({type(exc).__name__})") from None
        if isinstance(out, LLMResponse):
            return out
        if not isinstance(out, str) or not out.strip():
            raise LLMBadResponse("model returned no text")
        return LLMResponse(out, self.name, self.model, latency_s=self._clock() - start)
