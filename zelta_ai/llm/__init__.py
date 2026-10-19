"""Provider-independent LLM layer. Nothing outside this package imports a vendor SDK.

Swap, chain, shadow-test or remove models by configuration. The financial maths never depends on it:
with no provider configured every feature still works through deterministic templates.
"""
from .base import (LLMBadResponse, LLMError, LLMNotConfigured, LLMProvider, LLMRateLimited, LLMRequest,
                   LLMResponse, LLMTimeout, LLMUnavailable, Message, Usage)
from .factory import LLMStack, ProviderRegistry, build_stack
from .guard import GuardedProvider
from .numbers import numbers_supported
from .providers import CallableProvider, NullProvider, ScriptedProvider
from .resilience import CircuitBreaker, FallbackProvider, RetryProvider
from .shadow import ShadowLog, ShadowProvider
from .telemetry import CallLog, InstrumentedProvider

__all__ = [
    "LLMProvider", "LLMRequest", "LLMResponse", "Message", "Usage", "LLMError", "LLMNotConfigured",
    "LLMUnavailable", "LLMRateLimited", "LLMTimeout", "LLMBadResponse", "CallableProvider", "NullProvider",
    "ScriptedProvider", "RetryProvider", "CircuitBreaker", "FallbackProvider", "GuardedProvider",
    "ShadowProvider", "ShadowLog", "CallLog", "InstrumentedProvider", "ProviderRegistry", "LLMStack",
    "build_stack", "numbers_supported"]
