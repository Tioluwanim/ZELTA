"""Input/output guard around any provider: scrub secrets from prompts, cap sizes, strip control characters."""
from __future__ import annotations

import re
from dataclasses import replace

from openbanking.redact import redact_text
from .base import LLMBadResponse, LLMProvider, LLMRequest, LLMResponse, Message

_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class GuardedProvider(LLMProvider):
    def __init__(self, inner: LLMProvider, max_prompt_chars: int = 8000, max_output_chars: int = 4000):
        self._inner, self._max_in, self._max_out = inner, max_prompt_chars, max_output_chars
        self.name, self.model = inner.name, inner.model

    def generate(self, request: LLMRequest) -> LLMResponse:
        msgs = tuple(Message(m.role, _CTRL.sub("", redact_text(m.content))[: self._max_in]) for m in request.messages)
        resp = self._inner.generate(replace(request, messages=msgs))
        text = _CTRL.sub("", resp.text).strip()[: self._max_out]
        if not text:
            raise LLMBadResponse("empty output after sanitising")
        return replace(resp, text=text)
