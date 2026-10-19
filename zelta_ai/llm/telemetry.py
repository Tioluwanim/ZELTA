"""Call log without prompts or outputs: only metadata, so it is safe to keep and export."""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable, List

from .base import LLMError, LLMProvider, LLMRequest, LLMResponse


@dataclass(frozen=True)
class CallRecord:
    provider: str
    model: str
    purpose: str
    ok: bool
    error_code: str
    latency_s: float
    input_chars: int
    output_chars: int


class CallLog:
    def __init__(self, max_records: int = 1000):
        self._max = max_records
        self.records: List[CallRecord] = []

    def add(self, r: CallRecord) -> None:
        self.records.append(r)
        del self.records[: max(0, len(self.records) - self._max)]

    def summary(self) -> dict:
        n = len(self.records)
        ok = sum(r.ok for r in self.records)
        return {"calls": n, "ok": ok, "failed": n - ok}


class InstrumentedProvider(LLMProvider):
    def __init__(self, inner: LLMProvider, log: CallLog, clock: Callable[[], float] = time.monotonic):
        self._inner, self._log, self._clock = inner, log, clock
        self.name, self.model = inner.name, inner.model

    def generate(self, request: LLMRequest) -> LLMResponse:
        start = self._clock()
        size = sum(len(m.content) for m in request.messages)
        try:
            resp = self._inner.generate(request)
        except LLMError as exc:
            self._log.add(CallRecord(self.name, self.model, request.purpose, False, exc.code,
                                     self._clock() - start, size, 0))
            raise
        self._log.add(CallRecord(resp.provider, resp.model, request.purpose, True, "", self._clock() - start,
                                 size, len(resp.text)))
        return resp
