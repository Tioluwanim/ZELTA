from fastapi import APIRouter, HTTPException, status
import logging

from core.dependencies import CurrentUser, DB
from services.portfolio_service import log_decision, update_outcome, get_portfolio_summary
from schemas.portfolio import LogDecisionRequest, UpdateOutcomeRequest, PortfolioResponse
from schemas.common import APIResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])


@router.get("", response_model=PortfolioResponse)
async def get_portfolio(current_user: CurrentUser, db: DB):
    """
    Get full portfolio: performance metrics, recent decisions, behavioral pattern summary.
    """
    uid = current_user["uid"]

    try:
        summary = await get_portfolio_summary(db, uid)
        return PortfolioResponse(success=True, data=summary)
    except Exception as e:
        logger.error("Portfolio GET error uid=%s: %s", uid, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )


@router.post("/decisions")
async def log_new_decision(
    current_user: CurrentUser,
    db: DB,
    request: LogDecisionRequest,
):
    """
    Log a ZELTA decision recommendation to the portfolio for outcome tracking.
    """
    uid = current_user["uid"]

    try:
        record = await log_decision(db, uid, request)
        return APIResponse(
            success=True,
            message="Decision logged. ZELTA will track the outcome.",
            data=record.model_dump(),
        )
    except Exception as e:
        logger.error("Log decision error uid=%s: %s", uid, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )


@router.patch("/decisions/outcome")
async def record_outcome(
    current_user: CurrentUser,
    db: DB,
    request: UpdateOutcomeRequest,
):
    """
    Update the actual outcome of a previously logged decision.
    Enables accuracy tracking and behavioral learning.
    """
    uid = current_user["uid"]

    try:
        record = await update_outcome(db, uid, request)
        return APIResponse(
            success=True,
            message="Decision outcome recorded.",
            data=record.model_dump(),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error("Update outcome error uid=%s: %s", uid, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )
