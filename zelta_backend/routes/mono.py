"""
ZELTA — Simulated Mono Connect
Mocks the Mono Connect API shape for the hackathon demo.
Real Mono integration requires bank approval; this simulates it perfectly.
Replace the service functions with real Mono SDK calls post-approval.
"""
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from core.dependencies import CurrentUser, DB
from schemas.common import APIResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/mono", tags=["Mono Connect (Simulated)"])


# ─── Simulated transaction categories ────────────────────────────────────────
_SEED_TRANSACTIONS = [
    {"description": "Bukka food purchase", "amount": 1500, "type": "debit", "category": "food", "narration": "POS — Mama Caro Kitchen"},
    {"description": "Opay transfer received", "amount": 20000, "type": "credit", "category": "parent_transfer", "narration": "Transfer from Dad"},
    {"description": "GTBank ATM withdrawal", "amount": 5000, "type": "debit", "category": "other", "narration": "ATM withdrawal"},
    {"description": "Airtime recharge", "amount": 1000, "type": "debit", "category": "data", "narration": "Airtime — MTN"},
    {"description": "Data bundle purchase", "amount": 2500, "type": "debit", "category": "data", "narration": "Glo 5GB bundle"},
    {"description": "Transport — Okada", "amount": 500, "type": "debit", "category": "transport", "narration": "Bolt ride"},
    {"description": "Bursary payment received", "amount": 15000, "type": "credit", "category": "bursary", "narration": "OAU Bursary"},
    {"description": "Late night suya", "amount": 2500, "type": "debit", "category": "food", "narration": "Suya spot — Adenike"},
    {"description": "Freelance payment", "amount": 30000, "type": "credit", "category": "side_hustle", "narration": "Inflow — freelance job"},
    {"description": "Hostel utilities", "amount": 3000, "type": "debit", "category": "utilities", "narration": "Electric token"},
    {"description": "Netflix split", "amount": 1200, "type": "debit", "category": "entertainment", "narration": "Netflix split payment"},
    {"description": "Printing — STS center", "amount": 800, "type": "debit", "category": "education", "narration": "Project print"},
    {"description": "Party contribution", "amount": 3000, "type": "debit", "category": "entertainment", "narration": "Transfer to Tolu"},
    {"description": "Part-time pay", "amount": 12000, "type": "credit", "category": "side_hustle", "narration": "Inflow — part-time"},
    {"description": "Recharge card", "amount": 600, "type": "debit", "category": "data", "narration": "Airtime — Airtel"},
]


def _generate_transactions(count: int = 30, days_back: int = 30) -> List[Dict]:
    """Generate realistic simulated transactions for demo."""
    transactions = []
    now = datetime.now(timezone.utc)

    import random
    random.seed(42)  # deterministic for demo

    for i in range(count):
        seed_tx = _SEED_TRANSACTIONS[i % len(_SEED_TRANSACTIONS)]
        days_ago = random.randint(0, days_back)
        tx_date = now - timedelta(days=days_ago, hours=random.randint(0, 23))

        transactions.append({
            "id": f"mono_tx_{uuid.uuid4().hex[:12]}",
            "amount": seed_tx["amount"] + random.randint(-200, 500),
            "date": tx_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "narration": seed_tx["narration"],
            "type": seed_tx["type"],
            "category": seed_tx["category"],
            "description": seed_tx["description"],
            "balance": 45000 - (i * 800) + random.randint(-500, 500),
            "currency": "NGN",
            "meta": {
                "sender": "Simulated Mono Connect",
                "bank": "GTBank",
                "channel": "pos" if seed_tx["type"] == "debit" else "transfer",
            },
        })

    # Sort most recent first
    transactions.sort(key=lambda x: x["date"], reverse=True)
    return transactions


# ─── Schemas ─────────────────────────────────────────────────────────────────

class MonoAccountResponse(BaseModel):
    account_id: str
    institution: Dict[str, Any]
    account_number: str
    name: str
    balance: float
    currency: str
    bvn: Optional[str] = None
    type: str
    connected_at: str


class MonoTransactionsResponse(BaseModel):
    success: bool
    account_id: str
    total: int
    page: int
    transactions: List[Dict[str, Any]]
    meta: Dict[str, Any]


class MonoIdentityResponse(BaseModel):
    success: bool
    identity: Dict[str, Any]


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/account", response_model=APIResponse)
async def get_account(current_user: CurrentUser, db: DB):
    """
    GET /api/mono/account
    Returns simulated Mono-shaped account data for the authenticated student.
    Replace with: mono.getAccount(accountId) post-approval.
    """
    uid = current_user["uid"]
    try:
        # Try to get real wallet data for balance
        wallet_ref = db.collection("wallets").document(uid)
        wallet_doc = wallet_ref.get()
        wallet_data = wallet_doc.to_dict() if wallet_doc.exists else {}

        income = wallet_data.get("total_income", 45000.0)
        expenses = wallet_data.get("total_expenses", 19000.0)
        locked = wallet_data.get("locked_amount", 0.0)
        balance = income - expenses - locked

        account = {
            "account_id": f"mono_acc_{uid[:8]}",
            "institution": {
                "name": "GTBank",
                "bank_code": "058",
                "type": "PERSONAL_BANKING",
            },
            "account_number": "0" + uid[:9].replace("-", "")[:9],
            "name": "OAU Student Account",
            "balance": max(0, balance),
            "currency": "NGN",
            "type": "CURRENT_ACCOUNT",
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "status": "ACTIVE",
            "_simulated": True,
            "_note": "Replace with real Mono Connect SDK after bank approval",
        }
        return APIResponse(success=True, data=account, message="Account data retrieved (simulated)")
    except Exception as e:
        logger.error("Mono account fetch error uid=%s: %s", uid, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transactions")
async def get_transactions(
    current_user: CurrentUser,
    db: DB,
    page: int = 1,
    count: int = 20,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
):
    """
    GET /api/mono/transactions?page=1&count=20
    Returns simulated Mono-shaped transaction history.
    Replace with: mono.getTransactions(accountId, { page, count }) post-approval.
    """
    uid = current_user["uid"]
    try:
        # First try to load real transactions from Firestore
        txs_ref = db.collection("wallets").document(uid).collection("transactions")
        docs = txs_ref.order_by("created_at", direction="DESCENDING").limit(count).stream()

        real_txs = []
        for doc in docs:
            d = doc.to_dict()
            real_txs.append({
                "id": doc.id,
                "amount": d.get("amount", 0),
                "date": d.get("created_at", datetime.now(timezone.utc)).strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(d.get("created_at"), "strftime") else str(d.get("created_at", "")),
                "narration": d.get("description") or d.get("category", ""),
                "type": d.get("type", "debit"),
                "category": d.get("category", "other"),
                "currency": "NGN",
                "meta": {"source": "zelta_wallet"},
            })

        # Pad with simulated if not enough real transactions
        all_txs = real_txs
        if len(all_txs) < count:
            simulated = _generate_transactions(count=count - len(all_txs), days_back=30)
            all_txs = all_txs + simulated

        offset = (page - 1) * count
        paginated = all_txs[offset:offset + count]

        return {
            "success": True,
            "account_id": f"mono_acc_{uid[:8]}",
            "total": len(all_txs),
            "page": page,
            "transactions": paginated,
            "meta": {
                "_simulated": len(real_txs) < count,
                "real_transactions": len(real_txs),
                "simulated_transactions": len(all_txs) - len(real_txs),
                "note": "Real Mono integration pending bank approval",
            },
        }
    except Exception as e:
        logger.error("Mono transactions error uid=%s: %s", uid, e)
        # Return pure simulation on error
        return {
            "success": True,
            "account_id": f"mono_acc_{uid[:8]}",
            "total": count,
            "page": page,
            "transactions": _generate_transactions(count=count),
            "meta": {"_simulated": True, "error_fallback": str(e)},
        }


@router.get("/identity")
async def get_identity(current_user: CurrentUser, db: DB):
    """
    GET /api/mono/identity
    Returns simulated student identity data.
    Replace with: mono.getIdentity(accountId) post-approval.
    """
    uid = current_user["uid"]
    try:
        profile_ref = db.collection("profiles").document(uid)
        profile_doc = profile_ref.get()
        profile = profile_doc.to_dict() if profile_doc.exists else {}

        return APIResponse(
            success=True,
            data={
                "identity": {
                    "full_name": profile.get("name", "OAU Student"),
                    "email": current_user.get("email", ""),
                    "phone": profile.get("phone", "+234XXXXXXXXX"),
                    "bvn_verified": False,
                    "_simulated": True,
                },
            },
            message="Identity retrieved (simulated — BVN verification requires real Mono approval)",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
async def sync_transactions(current_user: CurrentUser, db: DB):
    """
    POST /api/mono/sync
    Triggers a re-sync of transactions.
    In production this would call Mono's reauthorisation flow.
    """
    uid = current_user["uid"]
    return APIResponse(
        success=True,
        data={"synced": True, "transactions_count": 30, "_simulated": True},
        message="Transaction sync triggered (simulated). Real sync requires Mono reauth.",
    )