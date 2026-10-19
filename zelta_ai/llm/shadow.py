"""Shadow mode: the path to retiring third-party models.

The primary answers users. The candidate (e.g. ZELTA's own model) sees the same request, and its output is
compared and logged but NEVER returned. When the agreement rate and number-safety are good enough over enough
samples, promote the candidate to primary by configuration and drop the third-party provider.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

from .base import LLMError, LLMProvider, LLMRequest, LLMResponse
from .numbers import numbers_supported

_NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")


def _nums(t: str) -> frozenset:
    return frozenset(x.replace(",", "") for x in _NUM.findall(t))


@dataclass(frozen=True)
class ShadowResult:
    candidate_ok: bool
    error_code: str
    same_numbers: bool            # candidate used exactly the figures the primary used
    candidate_numbers_supported: Optional[bool]   # None when request carried no facts
    length_ratio: float


class ShadowLog:
    def __init__(self):
        self.results: List[ShadowResult] = []

    def stats(self) -> dict:
        n = len(self.results)
        if not n:
            return {"samples": 0}
        ok = [r for r in self.results if r.candidate_ok]
        checked = [r for r in ok if r.candidate_numbers_supported is not None]
        return {
            "samples": n,
            "candidate_success_rate": len(ok) / n,
            "number_agreement_rate": (sum(r.same_numbers for r in ok) / len(ok)) if ok else 0.0,
            "number_safety_rate": (sum(bool(r.candidate_numbers_supported) for r in checked) / len(checked))
            if checked else None,
        }

    def ready_to_promote(self, min_samples: int = 200, min_success: float = 0.98, min_safety: float = 1.0) -> bool:
        s = self.stats()
        if s["samples"] < min_samples:
            return False
        safety = s.get("number_safety_rate")
        return s["candidate_success_rate"] >= min_success and safety is not None and safety >= min_safety


class ShadowProvider(LLMProvider):
    def __init__(self, primary: LLMProvider, candidate: LLMProvider, log: Optional[ShadowLog] = None):
        self._p, self._c, self.log = primary, candidate, log or ShadowLog()
        self.name, self.model = primary.name, primary.model

    def generate(self, request: LLMRequest) -> LLMResponse:
        resp = self._p.generate(request)          # primary failure propagates; candidate never affects the user
        try:
            cand = self._c.generate(request)
        except LLMError as exc:
            self.log.results.append(ShadowResult(False, exc.code, False, None, 0.0))
            return resp
        except Exception:
            self.log.results.append(ShadowResult(False, "candidate_crash", False, None, 0.0))
            return resp
        supported = numbers_supported(cand.text, request.facts) if request.facts is not None else None
        self.log.results.append(ShadowResult(True, "", _nums(cand.text) == _nums(resp.text), supported,
                                             len(cand.text) / max(1, len(resp.text))))
        return resp
