"""Provider-independent model interface. No vendor SDK is imported here."""
from __future__ import annotations

from typing import List, Protocol, Sequence


class LLMUnavailable(RuntimeError):
    """No model is configured or the call failed. The orchestrator falls back to templates."""


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
