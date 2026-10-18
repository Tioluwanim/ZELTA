"""Deterministic in-memory provider for tests and local development. Never reports itself as live."""
from __future__ import annotations

from typing import Dict, List, Optional

from domain.events import Account, RawTransaction
from .base import FinancialProvider, ProviderError


class MockProvider(FinancialProvider):
    name = "mock"
    is_live = False

    def __init__(self, accounts: Optional[List[Account]] = None,
                 transactions: Optional[Dict[str, List[RawTransaction]]] = None,
                 fail_with: Optional[ProviderError] = None):
        self._accounts = list(accounts or [])
        self._txns = dict(transactions or {})
        self._fail = fail_with
        self.revoked: List[str] = []
        self.refreshes: List[str] = []

    def _maybe_fail(self):
        if self._fail:
            raise self._fail

    def list_accounts(self, connection_ref, as_of):
        self._maybe_fail()
        return list(self._accounts)

    def fetch_transactions(self, connection_ref, account_id, start=None, end=None):
        self._maybe_fail()
        rows = self._txns.get(account_id, [])
        return [r for r in rows if (start is None or (r.occurred_at and r.occurred_at >= start))
                and (end is None or (r.occurred_at and r.occurred_at <= end))]

    def refresh(self, connection_ref, account_id):
        self._maybe_fail()
        self.refreshes.append(account_id)

    def revoke(self, connection_ref):
        self.revoked.append(connection_ref)
