"""Webhook authentication. Constant-time comparison; fail closed when no secret is configured.

Mono (per earlier documentation research) authenticates webhooks with a shared secret in the
`mono-webhook-secret` header. verify_hmac_sha256 is provided for providers that sign bodies.
Not implemented: replay protection / timestamp tolerance (listed as outstanding in docs/SECURITY.md).
"""
from __future__ import annotations

import hashlib
import hmac
from typing import Optional

from .secrets import SecretStr

MONO_HEADER = "mono-webhook-secret"


def verify_shared_secret(header_value: Optional[str], expected: Optional[SecretStr]) -> bool:
    if expected is None or not header_value:
        return False
    return hmac.compare_digest(header_value.encode(), expected.reveal().encode())


def verify_hmac_sha256(body: bytes, signature_hex: Optional[str], secret: Optional[SecretStr]) -> bool:
    if secret is None or not signature_hex:
        return False
    digest = hmac.new(secret.reveal().encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature_hex.lower())
