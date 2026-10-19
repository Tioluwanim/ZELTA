"""CORS allow-list from the ALLOWED_ORIGINS env var (comma separated). Default: no browser origins.

This service is called by the ZELTA backend, not by browsers, so the safe default is an empty list.
A wildcard is ignored: it is not valid together with credentials and is never what you want here.
"""
from __future__ import annotations

import os
from typing import List, Mapping, Optional


def allowed_origins(env: Optional[Mapping[str, str]] = None) -> List[str]:
    raw = (env if env is not None else os.environ).get("ALLOWED_ORIGINS", "")
    out = []
    for item in raw.split(","):
        o = item.strip().rstrip("/")
        if o and o != "*" and (o.startswith("https://") or o.startswith("http://localhost")
                               or o.startswith("http://127.0.0.1")):
            out.append(o)
    return out
