"""Number guard: model text may only contain figures that appear in the engine-computed facts."""
from __future__ import annotations

import re
from typing import Any

_NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")


def _norm(tok: str) -> str:
    t = tok.replace(",", "")
    if "." in t:
        t = t.rstrip("0").rstrip(".")
    return t or "0"


def _collect(obj: Any, out: set) -> None:
    if isinstance(obj, bool) or obj is None:
        return
    if isinstance(obj, (int, float)):
        out.update({_norm(str(obj)), _norm(str(round(obj, 0))), _norm(str(round(obj, 1)))})
    elif isinstance(obj, str):
        out.update(_norm(t) for t in _NUM.findall(obj))
    elif isinstance(obj, dict):
        for v in obj.values():
            _collect(v, out)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            _collect(v, out)


def numbers_supported(text: str, facts: Any, user_text: str = "") -> bool:
    allowed: set = set()
    _collect(facts, allowed)
    _collect(user_text, allowed)
    return all(_norm(tok) in allowed for tok in _NUM.findall(text))
