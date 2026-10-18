"""Provider contract. Provider-specific fields and authentication stay inside adapters."""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional

from domain.events import Account, RawTransaction


class ProviderError(Exception):
    """Normalised provider failure. `code` is stable; `message` must never contain secrets or payloads."""
    code = "provider_error"
    retryable = False

    def __init__(self, message: str = ""):
        super().__init__(message or self.code)


class NotConfigured(ProviderError):
    code = "not_configured"          # credentials or live integration missing: never simulate success


class AuthRejected(ProviderError):
    code = "auth_rejected"


class ReauthRequired(ProviderError):
    code = "reauth_required"         # the user must re-authorise the connection


class RateLimited(ProviderError):
    code = "rate_limited"
    retryable = True


class Unavailable(ProviderError):
    code = "unavailable"
    retryable = True


class InvalidResponse(ProviderError):
    code = "invalid_response"        # provider returned data that fails validation


class FinancialProvider(ABC):
    """What the Financial Twin needs from any open-banking provider."""

    name: str = "abstract"
    is_live: bool = False            # True only for a verified, credentialled integration

    @abstractmethod
    def list_accounts(self, connection_ref: str, as_of: datetime) -> List[Account]: ...

    @abstractmethod
    def fetch_transactions(self, connection_ref: str, account_id: str,
                           start: Optional[datetime] = None, end: Optional[datetime] = None
                           ) -> List[RawTransaction]: ...

    @abstractmethod
    def refresh(self, connection_ref: str, account_id: str) -> None:
        """Ask the provider to pull fresh data. May raise RateLimited or ReauthRequired."""

    @abstractmethod
    def revoke(self, connection_ref: str) -> None:
        """Disconnect the account/consent at the provider."""
