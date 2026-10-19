"""Backward-compatible model interface for the agent.

The real abstraction now lives in the `llm` package (providers, fallback, shadow mode). This module keeps the
small `complete(system, user)` interface and test doubles working, and adapts any LLMProvider to it.
"""
from __future__ import annotations

from typing import List, Protocol, Sequence

from llm.base import LLMProvider, LLMRequest, LLMUnavailable  # noqa: F401  (re-exported)


class LLMClient(Protocol):
    def complete(self, system: str, user: str) -> str: ...


class NullLLM:
    """Used when no provider is configured."""
    def complete(self, system: str, user: str) -> str:
        raise LLMUnavailable("no model provider configured")


class ScriptedLLM:
    """Test double: returns queued responses and records prompts."""
    def __init__(self, responses: Sequence[str]):
        self._r = list(responses)
        self.prompts: List[str] = []

    def complete(self, system: str, user: str) -> str:
        self.prompts.append(user)
        if not self._r:
            raise LLMUnavailable("script exhausted")
        return self._r.pop(0)


def as_client(provider: LLMProvider) -> LLMClient:
    return provider
