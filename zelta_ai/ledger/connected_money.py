"""Total connected money with an explicit staleness policy.

Policy (ADR-4, PROPOSED not yet validated on real data): a balance older than `stale_after_h`
is included but flagged; older than `exclude_after_h` it is excluded and reported.
An unknown balance is never treated as zero.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Sequence, Tuple

from domain.clock import NaiveDatetimeError, age_hours, require_aware
from domain.events import Account
from domain.money import Money


@dataclass(frozen=True)
class ConnectedMoney:
    total: Money
    included: Tuple[str, ...]
    stale: Tuple[str, ...]
    excluded: Tuple[Tuple[str, str], ...]   # (account_id, reason)

    @property
    def complete(self) -> bool:
        """True only when every account contributed a fresh balance."""
        return not self.excluded and not self.stale


def total_connected_money(accounts: Sequence[Account], as_of: datetime, base_currency: str = "NGN",
                          stale_after_h: float = 24, exclude_after_h: float = 72) -> ConnectedMoney:
    require_aware(as_of, "as_of")
    seen, included, stale, excluded = set(), [], [], []
    total = Money.zero(base_currency)
    for a in accounts:
        key = (a.institution, a.account_ref)
        if key in seen:
            excluded.append((a.id, "duplicate")); continue
        seen.add(key)
        if not a.active:
            excluded.append((a.id, "inactive")); continue
        if a.balance is None:
            excluded.append((a.id, "balance_unknown")); continue
        if a.balance.currency != base_currency:
            excluded.append((a.id, "unsupported_currency")); continue
        if a.balance_as_of is None:
            excluded.append((a.id, "no_timestamp")); continue
        try:
            age = age_hours(a.balance_as_of, as_of)
        except NaiveDatetimeError:
            excluded.append((a.id, "naive_timestamp")); continue
        if age > exclude_after_h:
            excluded.append((a.id, "stale_excluded")); continue
        bal = a.balance - a.pending_debits if a.pending_debits is not None else a.balance
        total = total + bal
        included.append(a.id)
        if age > stale_after_h:
            stale.append(a.id)
    return ConnectedMoney(total, tuple(included), tuple(stale), tuple(excluded))
