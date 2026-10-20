"""Provider for data the caller supplies in the request (for example the ZELTA backend's own wallet records).

The data is self-reported or backend-held, not bank-verified, so this provider never claims to be live: the twin
adds a "not a live integration" warning to every snapshot built from it.
"""
from __future__ import annotations

from .mock import MockProvider


class InlineProvider(MockProvider):
    name = "self_reported"
    is_live = False
