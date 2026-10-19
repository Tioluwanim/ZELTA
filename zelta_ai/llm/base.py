"""The contract every model backend implements. Keep it small: text in, text out, typed failures."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Mapping, Optional, Tuple


@dataclass(frozen=True)
class Message:
    role: str            # "system" | "user" | "assistant"
    content: str

    def __post_init__(self):
        if self.role not in ("system", "user", "assistant"):
            raise ValueError("role must be system, user or assistant")


@dataclass(frozen=True)
class LLMRequest:
    messages: Tuple[Message, ...]
    max_tokens: int = 512
    temperature: float = 0.0
    purpose: str = "explain"                 # explain | plan | other: for telemetry and routing
    facts: Optional[Mapping[str, Any]] = None  # structured numbers the answer must stay consistent with

    @classmethod
    def simple(cls, system: str, user: str, **kw) -> "LLMRequest":
        return cls((Message("system", system), Message("user", user)), **kw)

    @property
    def system(self) -> str:
        return "\n".join(m.content for m in self.messages if m.role == "system")

    @property
    def user(self) -> str:
        return "\n".join(m.content for m in self.messages if m.role != "system")


@dataclass(frozen=True)
class Usage:
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None


@dataclass(frozen=True)
class LLMResponse:
    text: str
    provider: str
    model: str
    usage: Usage = field(default_factory=Usage)
    latency_s: float = 0.0
    finish_reason: str = "stop"


class LLMError(Exception):
    """Base failure. `code` is stable and safe to log; messages never carry prompts or secrets."""
    code = "llm_error"
    retryable = False

    def __init__(self, message: str = ""):
        super().__init__(message or self.code)


class LLMNotConfigured(LLMError):
    code = "not_configured"


class LLMUnavailable(LLMError):
    code = "unavailable"
    retryable = True


class LLMRateLimited(LLMError):
    code = "rate_limited"
    retryable = True


class LLMTimeout(LLMError):
    code = "timeout"
    retryable = True


class LLMBadResponse(LLMError):
    code = "bad_response"


class LLMProvider(ABC):
    name: str = "abstract"
    model: str = "unknown"

    @abstractmethod
    def generate(self, request: LLMRequest) -> LLMResponse:
        """Return a response or raise an LLMError subclass. Never return None or raise anything else."""

    def complete(self, system: str, user: str) -> str:
        """Backward-compatible text interface used by the first agent version."""
        return self.generate(LLMRequest.simple(system, user)).text
