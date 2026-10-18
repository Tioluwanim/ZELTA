"""Redaction for logs, error messages and traces. Over-redacts on purpose."""
from __future__ import annotations

import logging
import re
from typing import Any

SENSITIVE_KEYS = ("secret", "token", "authorization", "password", "api_key", "apikey", "x-api-key",
                  "account_number", "accountnumber", "mono-sec-key", "mono-webhook-secret", "private_key",
                  "credential")                      # substring match
SENSITIVE_WORDS = frozenset({"bvn", "nin", "pin", "otp", "cvv", "card"})   # whole-word match only
MONEY_KEYS = ("balance", "amount", "narration", "description", "merchant")   # financial payload fields
MASK = "***"

_DIGITS = re.compile(r"\b\d{10,}\b")
_BEARER = re.compile(r"(?i)\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]+")
_KEYLIKE = re.compile(r"\b(?:sk|pk|test_sk|live_sk|test_pk|live_pk)[_-][A-Za-z0-9_-]{8,}\b")
_LONGTOKEN = re.compile(r"\b[A-Za-z0-9_-]{32,}\b")


def _is_sensitive(key: str) -> bool:
    k = key.lower()
    return any(s in k for s in SENSITIVE_KEYS) or bool(SENSITIVE_WORDS & set(re.split(r"[^a-z0-9]+", k)))


def redact_text(text: str) -> str:
    t = _BEARER.sub(lambda m: f"{m.group(1)} {MASK}", text)
    t = _KEYLIKE.sub(MASK, t)
    t = _DIGITS.sub(lambda m: "*" * (len(m.group()) - 4) + m.group()[-4:], t)
    return _LONGTOKEN.sub(MASK, t)


def redact(obj: Any, hide_financial: bool = True) -> Any:
    """Recursively mask secrets and (by default) financial payload fields in dicts/lists/strings."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            ks = str(k)
            if _is_sensitive(ks) or (hide_financial and ks.lower() in MONEY_KEYS):
                out[k] = MASK
            else:
                out[k] = redact(v, hide_financial)
        return out
    if isinstance(obj, (list, tuple)):
        return [redact(v, hide_financial) for v in obj]
    if isinstance(obj, str):
        return redact_text(obj)
    return obj


def safe_error(exc: BaseException) -> str:
    """Error text safe to log or return: exception type plus a redacted message."""
    return f"{type(exc).__name__}: {redact_text(str(exc))[:200]}"


class RedactingFilter(logging.Filter):
    """Attach to a logger/handler to scrub formatted messages before they are emitted."""
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact_text(record.getMessage())
        record.args = ()
        return True
