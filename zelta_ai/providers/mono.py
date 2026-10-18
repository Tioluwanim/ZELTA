"""Mono adapter (STATUS: scaffold + mapping contract; LIVE CONNECTIVITY PENDING).

What is implemented: input validation and mapping of Mono-shaped transaction/account dicts into
canonical RawTransaction/Account, error normalisation, and an injectable HTTP transport.
What is NOT done: no live call has been made. Every method that would hit Mono raises NotConfigured
until a secret key AND a transport are supplied, and even then the field mapping below is marked
UNVERIFIED because no sandbox credentials were available to confirm it.

Unverified assumptions (check against a real sandbox before trusting):
  * transaction `amount` is an integer in kobo and `type` is "debit" | "credit";
  * `date` is an ISO-8601 string (date-only values are placed at Lagos midnight and flagged);
  * Mono exposes no pending/posted status on transaction rows, so rows map to "posted";
  * the request paths in MonoAdapter (`/v2/accounts/...`, `/sync`, `/unlink`) are PLACEHOLDERS: they were
    not confirmed against current Mono documentation or a sandbox. The auth header name `mono-sec-key`
    is likewise unconfirmed here. How a reauthorisation requirement is signalled is unknown, so
    ReauthRequired is never raised by this adapter yet.
Documented (earlier research): webhooks carry a shared secret in the `mono-webhook-secret` header;
real-time refresh is rate-limited per account; reauthorisation is a separate flow.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Mapping, Optional, Protocol, Tuple

from domain.clock import lagos_day_start
from domain.events import Account, RawTransaction
from domain.money import Money
from openbanking.secrets import SecretStr
from .base import (AuthRejected, FinancialProvider, InvalidResponse, NotConfigured, ProviderError,
                   RateLimited, Unavailable)

BASE_URL = "https://api.withmono.com"   # base host only; paths are supplied by the caller's transport


class Transport(Protocol):
    def request(self, method: str, path: str, *, params: Optional[Mapping[str, Any]] = None,
                headers: Optional[Mapping[str, str]] = None) -> Tuple[int, Any]: ...


def map_transaction(account_id: str, row: Mapping[str, Any], currency: str = "NGN") -> RawTransaction:
    if not isinstance(row, Mapping):
        raise InvalidResponse("transaction is not an object")
    for field in ("id", "amount", "type", "date"):
        if row.get(field) in (None, ""):
            raise InvalidResponse(f"transaction missing '{field}'")
    amount = row["amount"]
    if isinstance(amount, bool) or not isinstance(amount, int):
        raise InvalidResponse("transaction amount is not an integer (minor units)")
    kind = str(row["type"]).lower()
    if kind not in ("debit", "credit"):
        raise InvalidResponse(f"unknown transaction type {kind!r}")
    if amount < 0:
        raise InvalidResponse("negative amount; direction must come from 'type'")
    ts, precision = _parse_date(row["date"])
    signed = -amount if kind == "debit" else amount
    return RawTransaction(
        provider="mono", account_id=account_id, amount=Money(signed, currency), occurred_at=ts,
        status="posted", provider_ref=str(row["id"]), description=_s(row.get("narration")),
        merchant=None, category=_s(row.get("category")), category_confidence=None,
        time_precision=precision, payload=dict(row))


def map_account(row: Mapping[str, Any], as_of: datetime, currency: str = "NGN") -> Account:
    for field in ("id", "institution"):
        if not row.get(field):
            raise InvalidResponse(f"account missing '{field}'")
    inst = row["institution"]
    inst_name = inst.get("name") if isinstance(inst, Mapping) else str(inst)
    bal = row.get("balance")
    if bal is not None and (isinstance(bal, bool) or not isinstance(bal, int)):
        raise InvalidResponse("account balance is not an integer (minor units)")
    return Account(id=str(row["id"]), provider="mono", institution=str(inst_name),
                   account_ref=str(row.get("accountNumber") or row["id"])[-4:] + ":" + str(row["id"]),
                   balance=None if bal is None else Money(bal, currency),
                   balance_as_of=None if bal is None else as_of)   # as_of of the fetch, not provider-reported


def _s(v) -> Optional[str]:
    return str(v) if v not in (None, "") else None


def _parse_date(value: Any) -> Tuple[datetime, str]:
    text = str(value)
    try:
        if len(text) == 10:                       # date only
            y, m, d = (int(x) for x in text.split("-"))
            return lagos_day_start(datetime(y, m, d).date()), "date"
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise InvalidResponse("unparseable date") from exc
    if dt.tzinfo is None:
        raise InvalidResponse("timestamp without timezone")
    return dt, "instant"


def map_http_error(status: int) -> ProviderError:
    if status in (401, 403):
        return AuthRejected()
    if status == 429:
        return RateLimited()
    if status >= 500:
        return Unavailable()
    return InvalidResponse(f"unexpected status {status}")


class MonoAdapter(FinancialProvider):
    name = "mono"
    is_live = False       # flips to True only once verified against a sandbox/live account

    def __init__(self, secret_key: Optional[SecretStr] = None, transport: Optional[Transport] = None):
        self._key = secret_key
        self._transport = transport

    def _call(self, method: str, path: str, params=None):
        if self._key is None or self._transport is None:
            raise NotConfigured("Mono live integration is pending: no credentials/transport supplied")
        status, body = self._transport.request(method, path, params=params,
                                               headers={"mono-sec-key": self._key.reveal()})
        if status >= 400:
            raise map_http_error(status)
        return body

    def list_accounts(self, connection_ref, as_of) -> List[Account]:
        body = self._call("GET", f"/v2/accounts/{connection_ref}")
        rows = body.get("data") if isinstance(body, Mapping) else None
        if rows is None:
            raise InvalidResponse("missing data")
        return [map_account(r, as_of) for r in (rows if isinstance(rows, list) else [rows])]

    def fetch_transactions(self, connection_ref, account_id, start=None, end=None) -> List[RawTransaction]:
        params = {k: v.isoformat() for k, v in (("start", start), ("end", end)) if v}
        body = self._call("GET", f"/v2/accounts/{account_id}/transactions", params)
        rows = body.get("data") if isinstance(body, Mapping) else None
        if not isinstance(rows, list):
            raise InvalidResponse("missing transaction list")
        return [map_transaction(account_id, r) for r in rows]

    def refresh(self, connection_ref, account_id) -> None:
        self._call("POST", f"/v2/accounts/{account_id}/sync")

    def revoke(self, connection_ref) -> None:
        self._call("POST", f"/v2/accounts/{connection_ref}/unlink")
