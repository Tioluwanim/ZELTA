"""
ZELTA — Simulated Squad Co Integration
Mocks Squad's payment API for hackathon demo.
Real Squad integration requires business KYC approval.
Replace the mock responses with real Squad SDK calls post-approval.
Squad docs: https://squadco.com/docs
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from core.dependencies import CurrentUser, DB
from schemas.common import APIResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/squad", tags=["Squad Co (Simulated)"])


# ─── Request schemas ──────────────────────────────────────────────────────────

class InitiateTransferRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount in NGN")
    recipient_account: str = Field(..., min_length=10, max_length=10, description="10-digit account number")
    recipient_bank_code: str = Field(..., min_length=3, description="Bank code e.g. 058 for GTBank")
    recipient_name: str = Field(..., min_length=2)
    narration: Optional[str] = Field(default="ZELTA Transfer")
    reference: Optional[str] = None


class CreatePaymentLinkRequest(BaseModel):
    amount: float = Field(..., gt=0)
    description: str = Field(..., min_length=3)
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    expires_in_hours: int = Field(default=24, ge=1, le=168)
    metadata: Optional[Dict[str, Any]] = None


class LockEscrowRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount to lock into escrow")
    reason: str = Field(..., min_length=3)
    unlock_condition: str = Field(default="manual", description="manual | time_based | condition_met")
    unlock_after_hours: Optional[int] = Field(default=None)


class ReleaseEscrowRequest(BaseModel):
    escrow_id: str
    release_to: str = Field(default="wallet", description="wallet | recipient")


# ─── Simulated bank codes for display ────────────────────────────────────────
BANK_NAMES: Dict[str, str] = {
    "058": "GTBank", "044": "Access Bank", "011": "First Bank",
    "057": "Zenith Bank", "070": "Fidelity Bank", "033": "UBA",
    "030": "Heritage Bank", "035": "Wema Bank", "076": "Polaris Bank",
    "999": "OPay", "305": "Paystack (Virtual)", "626": "Kuda Bank",
}


def _bank_name(code: str) -> str:
    return BANK_NAMES.get(code, f"Bank [{code}]")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/transfer/initiate")
async def initiate_transfer(
    request: InitiateTransferRequest,
    current_user: CurrentUser,
    db: DB,
):
    """
    POST /api/squad/transfer/initiate
    Initiates a bank transfer via Squad Co (simulated).
    In production: POST https://api.squadco.com/payout/initiate
    Requires Squad business KYC + webhook URL.
    """
    uid = current_user["uid"]
    reference = request.reference or f"ZELTA_{uuid.uuid4().hex[:12].upper()}"

    try:
        # In demo: check wallet has enough free cash
        wallet_ref = db.collection("wallets").document(uid)
        wallet_doc = wallet_ref.get()
        wallet_data = wallet_doc.to_dict() if wallet_doc.exists else {}

        income = wallet_data.get("total_income", 0.0)
        expenses = wallet_data.get("total_expenses", 0.0)
        locked = wallet_data.get("locked_amount", 0.0)
        free_cash = max(0, income - expenses - locked)

        if request.amount > free_cash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient free cash. Available: ₦{free_cash:,.0f}",
            )

        transfer_record = {
            "reference": reference,
            "amount": request.amount,
            "recipient": {
                "account_number": request.recipient_account,
                "bank_code": request.recipient_bank_code,
                "bank_name": _bank_name(request.recipient_bank_code),
                "name": request.recipient_name,
            },
            "narration": request.narration or "ZELTA Transfer",
            "status": "PENDING",  # Real Squad: PENDING → SUCCESS/FAILED via webhook
            "initiated_at": datetime.now(timezone.utc).isoformat(),
            "estimated_settlement": "Instant for same-bank, 30 min inter-bank",
            "_simulated": True,
        }

        # Record in Firestore for history
        db.collection("squad_transfers").document(reference).set({
            **transfer_record,
            "uid": uid,
        })

        return APIResponse(
            success=True,
            data={
                "transfer": transfer_record,
                "squad_reference": reference,
                "message": f"Transfer of ₦{request.amount:,.0f} to {request.recipient_name} initiated.",
                "_note": "Real Squad transfer requires business KYC approval. Simulated for demo.",
            },
            message="Transfer initiated (simulated)",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Squad transfer error uid=%s: %s", uid, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payment-link/create")
async def create_payment_link(
    request: CreatePaymentLinkRequest,
    current_user: CurrentUser,
    db: DB,
):
    """
    POST /api/squad/payment-link/create
    Creates a Squad payment link for gig payouts (simulated).
    In production: POST https://api.squadco.com/payment_link/otp/create
    """
    uid = current_user["uid"]
    link_id = uuid.uuid4().hex[:10].upper()
    link_ref = f"https://pay.squadco.com/link/{link_id}"  # Simulated URL shape

    try:
        expires_at = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        from datetime import timedelta
        expires_at = expires_at + timedelta(hours=request.expires_in_hours)

        link_data = {
            "link_id": link_id,
            "payment_link": link_ref,
            "qr_code_url": f"https://api.squadco.com/qr/{link_id}.png",
            "amount": request.amount,
            "description": request.description,
            "customer_name": request.customer_name,
            "customer_email": request.customer_email,
            "expires_at": expires_at.isoformat(),
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": request.metadata or {},
            "_simulated": True,
        }

        # Store in Firestore
        db.collection("squad_payment_links").document(link_id).set({
            **link_data,
            "uid": uid,
        })

        return APIResponse(
            success=True,
            data=link_data,
            message=f"Payment link created for ₦{request.amount:,.0f}",
        )
    except Exception as e:
        logger.error("Squad payment link error uid=%s: %s", uid, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/escrow/lock")
async def lock_escrow(
    request: LockEscrowRequest,
    current_user: CurrentUser,
    db: DB,
):
    """
    POST /api/squad/escrow/lock
    Locks funds into a virtual Squad escrow vault (simulated).
    In production this uses Squad's Virtual Account feature.
    The ZELTA Autonomous Guardrail calls this endpoint when the
    Bayesian engine detects stress + impulsive spending pattern.
    """
    uid = current_user["uid"]
    escrow_id = f"ESC_{uuid.uuid4().hex[:10].upper()}"

    try:
        wallet_ref = db.collection("wallets").document(uid)
        wallet_doc = wallet_ref.get()
        wallet_data = wallet_doc.to_dict() if wallet_doc.exists else {}

        income = wallet_data.get("total_income", 0.0)
        expenses = wallet_data.get("total_expenses", 0.0)
        locked = wallet_data.get("locked_amount", 0.0)
        free_cash = max(0, income - expenses - locked)

        if request.amount > free_cash:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot lock ₦{request.amount:,.0f} — only ₦{free_cash:,.0f} available.",
            )

        # Lock funds in wallet
        wallet_ref.update({"locked_amount": locked + request.amount})

        escrow_record = {
            "escrow_id": escrow_id,
            "amount": request.amount,
            "reason": request.reason,
            "unlock_condition": request.unlock_condition,
            "unlock_after_hours": request.unlock_after_hours,
            "status": "LOCKED",
            "locked_at": datetime.now(timezone.utc).isoformat(),
            "uid": uid,
            "_simulated": True,
        }
        db.collection("squad_escrow").document(escrow_id).set(escrow_record)

        return APIResponse(
            success=True,
            data=escrow_record,
            message=f"₦{request.amount:,.0f} locked into ZELTA escrow vault. Reason: {request.reason}",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/escrow/release")
async def release_escrow(
    request: ReleaseEscrowRequest,
    current_user: CurrentUser,
    db: DB,
):
    """
    POST /api/squad/escrow/release
    Releases locked escrow funds back to wallet.
    """
    uid = current_user["uid"]
    try:
        escrow_ref = db.collection("squad_escrow").document(request.escrow_id)
        escrow_doc = escrow_ref.get()
        if not escrow_doc.exists:
            raise HTTPException(status_code=404, detail="Escrow record not found.")

        escrow = escrow_doc.to_dict()
        if escrow.get("uid") != uid:
            raise HTTPException(status_code=403, detail="Not your escrow.")
        if escrow.get("status") != "LOCKED":
            raise HTTPException(status_code=400, detail="Escrow is not in LOCKED state.")

        amount = escrow.get("amount", 0)

        # Release: reduce locked amount
        wallet_ref = db.collection("wallets").document(uid)
        wallet_doc = wallet_ref.get()
        wallet_data = wallet_doc.to_dict() if wallet_doc.exists else {}
        current_locked = wallet_data.get("locked_amount", 0.0)
        wallet_ref.update({"locked_amount": max(0, current_locked - amount)})

        escrow_ref.update({"status": "RELEASED", "released_at": datetime.now(timezone.utc).isoformat()})

        return APIResponse(
            success=True,
            data={"escrow_id": request.escrow_id, "amount_released": amount, "status": "RELEASED"},
            message=f"₦{amount:,.0f} released from escrow.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transfer/status/{reference}")
async def get_transfer_status(reference: str, current_user: CurrentUser, db: DB):
    """GET /api/squad/transfer/status/{reference}"""
    try:
        doc = db.collection("squad_transfers").document(reference).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Transfer not found.")
        return APIResponse(success=True, data=doc.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))