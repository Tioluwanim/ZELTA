"""Secrets are wrapped so they cannot leak through repr(), str(), logging or f-strings."""
from __future__ import annotations

import os
from typing import Mapping, Optional


class SecretStr:
    __slots__ = ("_v",)
    _v: str

    def __init__(self, value: str):
        if not isinstance(value, str) or not value:
            raise ValueError("secret must be a non-empty string")
        object.__setattr__(self, "_v", value)

    def reveal(self) -> str:
        return self._v

    def __repr__(self) -> str:
        return "SecretStr('**********')"

    __str__ = __repr__

    def __setattr__(self, *_):
        raise AttributeError("SecretStr is immutable")

    def __eq__(self, other):   # constant-time comparison lives in webhook.py; never compare with ==
        return NotImplemented

    __hash__ = None  # type: ignore[assignment]


def load_secret(name: str, env: Optional[Mapping[str, str]] = None) -> Optional[SecretStr]:
    """Read a secret from the environment (or an injected mapping). Absent or empty -> None, never ''."""
    value = (env if env is not None else os.environ).get(name, "")
    return SecretStr(value) if value else None
