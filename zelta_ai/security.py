import hmac
import os
from fastapi import Header, HTTPException

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")
# Secure by default: the auth bypass exists only when DEBUG is explicitly set to "true".
DEBUG = os.getenv("DEBUG", "false").lower() == "true"


def verify_internal_request(x_api_key: str = Header(None)):
    """
    Verifies that the request comes from the ZELTA backend.
    Only the backend should call the AI Brain — never the frontend directly.

    In DEBUG mode (local dev): allows all requests.
    In production: requires x-api-key header matching INTERNAL_API_KEY.
    """
    # Dev mode — skip security
    if DEBUG and not INTERNAL_API_KEY:
        return None

    if not INTERNAL_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="INTERNAL_API_KEY not configured on server."
        )

    if not x_api_key or not hmac.compare_digest(x_api_key.encode(), INTERNAL_API_KEY.encode()):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized. Only the ZELTA backend can call this service."
        )