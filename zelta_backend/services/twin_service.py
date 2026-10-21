"""Bridge to the AI service's stateless Financial Twin compute endpoints.

The backend holds the user's data (Firestore) and the internal API key; the AI service computes and stores nothing.
The browser never sees the key. Data here is the user's own logged wallet (self-reported, not bank-verified), and the
AI service labels it that way. Failures become TwinUnavailable with a safe message (no URLs, keys or upstream text).
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

import httpx
from google.cloud import firestore

from config.settings import settings

logger = logging.getLogger(__name__)
TIMEOUT = 20.0
MAX_TXNS = 500
EXPENSE_ESSENTIALS = ["food", "transport", "data", "utilities", "education"]


class TwinUnavailable(Exception):
    """The twin cannot be computed right now. `status` is what the API should return."""

    def __init__(self, message: str, status: int = 503):
        super().__init__(message)
        self.message, self.status = message, status


def naira(value: Any) -> str:
    return f"{Decimal(str(round(float(value), 2))):.2f}"


def _aware(v: Any) -> Optional[datetime]:
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if isinstance(v, str):
        try:
            d = datetime.fromisoformat(v)
        except ValueError:
            return None
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    return None


def build_payload(wallet: Dict[str, Any], txs: List[Dict[str, Any]], profile: Dict[str, Any], now: datetime) -> Dict[str, Any]:
    """Pure: Firestore documents in, AI-service request out. Locked-savings movements are not spending, so they are skipped."""
    balance = float(wallet.get("total_income", 0.0)) - float(wallet.get("total_expenses", 0.0))
    rows, earliest = [], None
    for t in txs[:MAX_TXNS]:
        kind, at = t.get("type"), _aware(t.get("date"))
        if kind not in ("income", "expense") or at is None or not isinstance(t.get("amount"), (int, float)) or t["amount"] <= 0:
            continue
        signed = float(t["amount"]) * (1 if kind == "income" else -1)
        rows.append({"account_id": "wallet", "amount_naira": naira(signed), "at": at.isoformat(), "ref": str(t.get("id") or "")[:128] or None,
                     "description": (t.get("description") or None) and str(t["description"])[:200], "category": (t.get("category") or None)})
        earliest = at.date() if earliest is None or at.date() < earliest else earliest
    bills = []
    fin = (profile or {}).get("financial") or {}
    for o in fin.get("fee_obligations") or []:
        try:
            due = date.fromisoformat(str(o["due_date"])[:10])
            amt = float(o["amount"])
            if amt > 0:
                bills.append({"name": str(o["label"])[:80] or "Bill", "amount_naira": naira(amt), "due": due.isoformat()})
        except (KeyError, ValueError, TypeError):
            continue
    return {"as_of": now.isoformat(),
            "accounts": [{"id": "wallet", "institution": "ZELTA wallet (self-reported)", "balance_naira": naira(balance), "balance_as_of": now.isoformat()}],
            "transactions": rows, "bills": bills[:50], "essential_categories": EXPENSE_ESSENTIALS,
            "first_observed": earliest.isoformat() if earliest else None}


def _doc(d: Any) -> Dict[str, Any]:
    return d.to_dict() or {}


def load_inputs(db: firestore.Client, uid: str) -> tuple:
    wallet = db.collection("wallets").document(uid).get()
    txs = (db.collection("wallets").document(uid).collection("transactions")
           .order_by("created_at", direction=firestore.Query.DESCENDING).limit(MAX_TXNS).stream())
    prof = db.collection("users").document(uid).get()
    return (_doc(wallet) if wallet.exists else {}), [_doc(t) for t in txs], (_doc(prof) if prof.exists else {})


async def call(path: str, body: Dict[str, Any], uid: str) -> Dict[str, Any]:
    if not settings.internal_api_key:
        raise TwinUnavailable("The Financial Twin is not configured on this server.")
    url = f"{settings.ai_brain_url.rstrip('/')}/{path.lstrip('/')}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.post(url, json=body, headers={"x-api-key": settings.internal_api_key, "x-user-id": uid})
    except httpx.HTTPError as exc:
        logger.warning("twin call failed: %s", type(exc).__name__)
        raise TwinUnavailable("The Financial Twin is temporarily unavailable.") from None
    if r.status_code == 429:
        raise TwinUnavailable("Too many requests. Try again shortly.", 429)
    if r.status_code in (401, 403, 404) or r.status_code >= 500:
        logger.error("twin upstream status %s", r.status_code)
        raise TwinUnavailable("The Financial Twin is temporarily unavailable.")
    if r.status_code != 200:
        raise TwinUnavailable("That request could not be processed.", 422)
    try:
        return r.json()
    except ValueError:
        raise TwinUnavailable("The Financial Twin returned an unreadable answer.") from None


async def payload_for(db: firestore.Client, uid: str) -> Dict[str, Any]:
    wallet, txs, profile = load_inputs(db, uid)
    return build_payload(wallet, txs, profile, datetime.now(timezone.utc))


GIG_SOURCE = "ZELTA gig board (posted by another user, not verified by ZELTA)"


def gig_catalogue(gigs: List[Dict[str, Any]], uid: str, limit: int = 30) -> List[Dict[str, Any]]:
    """Open gigs as EARN opportunities. Pure. Only real board entries are mapped; nothing is invented.
    Skips gigs that are not open, have no positive payout, or were posted by the user themselves."""
    out: List[Dict[str, Any]] = []
    for g in gigs:
        try:
            pay = Decimal(str(g.get("payout")))
        except Exception:
            continue
        gid, task = str(g.get("id") or ""), str(g.get("task") or "").strip()
        if (g.get("status") != "OPEN" or not pay.is_finite() or pay <= 0 or pay >= Decimal(10) ** 8 or not gid or not task
                or g.get("extracted_by_uid") == uid):
            continue
        where = str(g.get("location") or "").strip()
        out.append({"id": gid[:64], "category": "EARN", "title": task[:120], "provenance": "sourced", "source": GIG_SOURCE,
                    "rationale": ("Paid gig" + (f" at {where}" if where else "") + (f", about {g['time_estimate']}" if g.get("time_estimate") else ""))[:300],
                    "expected_benefit_naira": naira(pay), "risk": "unknown"})
        if len(out) >= limit:
            break
    return out


def load_gigs(db: firestore.Client, limit: int = 30) -> List[Dict[str, Any]]:
    try:
        return [d.to_dict() or {} for d in db.collection("gig_board").order_by("extracted_at", direction="DESCENDING").limit(limit).stream()]
    except Exception:
        logger.warning("gig board unreadable")
        return []
