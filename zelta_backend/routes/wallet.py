from fastapi import APIRouter, HTTPException, status
import logging

from core.dependencies import CurrentUser, DB
from services.wallet_service import add_income, add_expense, lock_savings, get_wallet_summary
from services.intelligence_service import get_stress_only
from schemas.wallet import AddIncomeRequest, AddExpenseRequest, LockSavingsRequest, WalletResponse
from schemas.common import APIResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/wallet", tags=["Wallet"])


@router.get("", response_model=WalletResponse)
async def get_wallet(current_user: CurrentUser, db: DB):
    """
    Get unified wallet: balance, free cash, locked goals, spending heat map, BQ alerts.
    """
    uid = current_user["uid"]

    try:
        try:
            stress = await get_stress_only(db, uid)
            stress_index = stress.stress_index
        except Exception as e:
            logger.warning("Stress lookup failed for wallet uid=%s: %s", uid, e)
            stress_index = 50.0

        summary = await get_wallet_summary(db, uid, stress_index)
        return WalletResponse(success=True, data=summary)
    except Exception as e:
        logger.error("Wallet GET error uid=%s: %s", uid, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/income")
async def income(current_user: CurrentUser, db: DB, request: AddIncomeRequest):
    """
    Add an income transaction. Auto-categorizes and updates balance.
    Sources: parent_transfer, side_hustle, bursary, other.
    """
    uid = current_user["uid"]

    try:
        tx = await add_income(db, uid, request)
        return APIResponse(
            success=True,
            message="Income added successfully.",
            data=tx,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error("Add income error uid=%s: %s", uid, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/expense")
async def expense(current_user: CurrentUser, db: DB, request: AddExpenseRequest):
    """
    Add an expense transaction. Checks sufficient free cash before allowing.
    """
    uid = current_user["uid"]

    try:
        tx = await add_expense(db, uid, request)
        return APIResponse(
            success=True,
            message="Expense recorded.",
            data=tx,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error("Add expense error uid=%s: %s", uid, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/lock")
async def lock(current_user: CurrentUser, db: DB, request: LockSavingsRequest):
    """
    Lock a savings goal. Removes amount from free cash.
    Kelly model will never allocate locked funds.
    """
    uid = current_user["uid"]

    try:
        goal = await lock_savings(db, uid, request)
        return APIResponse(
            success=True,
            message=f"₦{request.amount:,.0f} locked for '{request.label}'.",
            data=goal,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error("Lock savings error uid=%s: %s", uid, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ─── Intercept Check ──────────────────────────────────────────────────────────
# Called BEFORE posting an expense. Returns BQ verdict + whether to show modal.

from pydantic import BaseModel as _BaseModel

class InterceptCheckRequest(_BaseModel):
    amount: float
    category: str = "other"

@router.post("/intercept-check")
async def intercept_check(current_user: CurrentUser, db: DB, request: InterceptCheckRequest):
    """
    POST /api/wallet/intercept-check
    Pre-flight BQ check before an expense is committed.
    Returns should_intercept=True when ZELTA wants to show the intercept screen.
    """
    uid = current_user["uid"]
    try:
        # Get wallet state
        summary = await get_wallet_summary(db, uid, stress_index=50.0)
        free_cash = summary.free_cash
        weekly_burn = summary.weekly_burn_rate or 1

        # Compute runway in days
        runway_days = int((free_cash / weekly_burn) * 7) if weekly_burn > 0 else 99

        # Compute streak (days since last expense above threshold)
        # Simple proxy: count consecutive days with no large expenses
        streak_days = 0
        try:
            from datetime import timedelta
            from google.cloud import firestore as _fs
            cutoff = datetime.now(timezone.utc) - timedelta(days=14)
            txs = (
                db.collection("wallets").document(uid).collection("transactions")
                .where("type", "==", "expense")
                .where("created_at", ">=", cutoff)
                .order_by("created_at", direction="DESCENDING")
                .limit(30)
                .stream()
            )
            last_expense_date = None
            for doc in txs:
                d = doc.to_dict()
                created = d.get("created_at")
                if created:
                    if hasattr(created, "date"):
                        last_expense_date = created.date()
                    break
            if last_expense_date:
                streak_days = max(0, (datetime.now(timezone.utc).date() - last_expense_date).days)
        except Exception:
            streak_days = 0

        # BQ intercept logic
        buffer = 5000  # always keep ₦5k untouched
        should_intercept = False
        verdict = "SPEND_SAFELY"
        message = ""

        post_spend_free = free_cash - request.amount

        if post_spend_free < buffer:
            should_intercept = True
            verdict = "HOLD"
            message = f"Chief, this spend leaves you with only ₦{post_spend_free:,.0f} — below your ₦{buffer:,.0f} safety buffer. ZELTA says: HOLD."
        elif runway_days <= 7 and request.amount > weekly_burn * 0.5:
            should_intercept = True
            verdict = "HOLD"
            message = f"You only have {runway_days} days of runway left. Spending ₦{request.amount:,.0f} now is high risk. ZELTA says: HOLD."
        elif request.category in ("entertainment", "other") and request.amount > 3000:
            should_intercept = True
            verdict = "SAVE"
            message = f"This ₦{request.amount:,.0f} {request.category} spend could drop your runway to {max(0, runway_days - 2)} days. Are you sure? ZELTA says: think before you spend."
        elif request.amount > free_cash * 0.3:
            should_intercept = True
            verdict = "SAVE"
            message = f"This is {(request.amount/free_cash*100):.0f}% of your free cash. ZELTA recommends: save it."

        return {
            "should_intercept": should_intercept,
            "verdict": verdict,
            "message": message,
            "runway_days": runway_days,
            "streak_days": streak_days,
            "free_cash": free_cash,
            "post_spend_free_cash": post_spend_free,
        }
    except Exception as e:
        logger.error("Intercept check error uid=%s: %s", uid, e)
        # Never crash — return safe default
        return {
            "should_intercept": False,
            "verdict": "SPEND_SAFELY",
            "message": "",
            "runway_days": 14,
            "streak_days": 0,
            "free_cash": 0,
            "post_spend_free_cash": 0,
        }