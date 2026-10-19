"""Build the model stack from configuration. Default: no model (deterministic templates only).

Env:
  LLM_PROVIDERS   comma list of registered provider names, in fallback order (default empty = none)
  LLM_SHADOW      optional registered name of a candidate (e.g. your own model) to shadow-test
Providers are registered in code by name (ProviderRegistry.register), so no vendor SDK is imported here.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Callable, Dict, Mapping, Optional

from .base import LLMProvider
from .guard import GuardedProvider
from .providers import NullProvider
from .resilience import FallbackProvider, RetryProvider
from .shadow import ShadowLog, ShadowProvider
from .telemetry import CallLog, InstrumentedProvider


class ProviderRegistry:
    def __init__(self):
        self._f: Dict[str, Callable[[], LLMProvider]] = {}

    def register(self, name: str, factory: Callable[[], LLMProvider]) -> None:
        self._f[name.strip().lower()] = factory

    def create(self, name: str) -> LLMProvider:
        try:
            return self._f[name.strip().lower()]()
        except KeyError:
            raise ValueError(f"unknown LLM provider: {name!r}") from None


@dataclass
class LLMStack:
    provider: LLMProvider
    call_log: CallLog
    shadow_log: Optional[ShadowLog]
    configured: bool


def build_stack(registry: ProviderRegistry, env: Optional[Mapping[str, str]] = None,
                retries: int = 2) -> LLMStack:
    env = os.environ if env is None else env
    names = [n for n in (env.get("LLM_PROVIDERS") or "").split(",") if n.strip()]
    log = CallLog()
    if not names:
        return LLMStack(NullProvider(), log, None, False)
    chain = [RetryProvider(registry.create(n), attempts=retries) for n in names]
    prov: LLMProvider = chain[0] if len(chain) == 1 else FallbackProvider(chain)
    shadow_log = None
    cand = (env.get("LLM_SHADOW") or "").strip()
    if cand:
        sp = ShadowProvider(prov, registry.create(cand))
        shadow_log, prov = sp.log, sp
    prov = GuardedProvider(InstrumentedProvider(prov, log))
    return LLMStack(prov, log, shadow_log, True)
