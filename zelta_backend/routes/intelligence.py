import logging

from fastapi import APIRouter, HTTPException, status

from core.dependencies import CurrentUser, DB
from schemas.common import APIResponse
from schemas.intelligence import IntelligenceResponse
from services.intelligence_service import (
    get_bayse_markets,
    get_intelligence,
    get_stress_only,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Intelligence"])


@router.get("/brain", response_model=IntelligenceResponse)
async def brain(current_user: CurrentUser, db: DB):
    try:
        result = await get_intelligence(db, current_user["uid"])
        return IntelligenceResponse(success=True, data=result)
    except Exception as e:
        logger.error("Brain endpoint error uid=%s: %s", current_user["uid"], e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )


@router.get("/intelligence")
async def intelligence_full(current_user: CurrentUser, db: DB):
    try:
        result = await get_intelligence(db, current_user["uid"])
        return APIResponse(
            success=True,
            message="Intelligence report generated.",
            data={
                "stress_index": result.stress.combined_index,
                "stress_level": result.stress.level,
                "stress_label": result.stress.label,
                "bayse_primary": result.stress.bayse_primary,
                "nlp_secondary": result.stress.nlp_secondary,
                "market_probability": result.stress.market_probability,
                "bayse_score": result.bayse.score,
                "bayse_status": result.bayse.status,
                "bayse_market": result.bayse.market_title,
                "crowd_yes": result.bayse.crowd_yes_price,
                "crowd_no": result.bayse.crowd_no_price,
                "mid_price": result.bayse.mid_price,
                "spread": result.bayse.spread,
                "active_bias": result.bias.active_bias,
                "bias_confidence": result.bias.confidence,
                "bias_explanation": result.bias.explanation,
                "decision_verdict": result.decision.verdict,
                "edge": result.decision.edge,
                "win_probability": result.decision.win_probability,
                "decision_plain": result.decision.plain_english,
                "rational_pct": result.confidence.rational_pct,
                "behavioral_pct": result.confidence.behavioral_pct,
                "confidence_gap": result.confidence.gap,
                "confidence_score": result.confidence.confidence_score,
                "confidence_tier": result.confidence.confidence_tier,
                "score_label": result.confidence.score_label,
                "is_actionable": result.confidence.is_actionable,
                "intervention_urgency": result.confidence.intervention_urgency,
                "confidence_plain": result.confidence.plain_english,
                "verdict": result.allocation.verdict,
                "invest_ngn": result.allocation.invest_ngn,
                "save_ngn": result.allocation.save_ngn,
                "hold_ngn": result.allocation.hold_ngn,
                "allocation_pct": result.allocation.allocation_pct,
                "allocation_plain": result.allocation.plain_english,
                "decision_score": result.score.decision_score,
                "score_rating": result.score.rating,
                "summary": result.explanation.summary,
                "bq_alert": result.explanation.bq_alert,
                "action": result.explanation.action,
                "nlp_sentiment": result.nlp.aggregate_sentiment,
                "headlines": [h.model_dump() for h in result.nlp.scored_headlines[:5]],
            },
        )
    except Exception as e:
        logger.error("Intelligence endpoint error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )


@router.get("/stress")
async def stress_index(current_user: CurrentUser, db: DB):
    try:
        result = await get_stress_only(db, current_user["uid"])
        return APIResponse(
            success=True,
            message="Stress index retrieved.",
            data=result.model_dump(),
        )
    except Exception as e:
        logger.error("Stress endpoint error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )


@router.get("/bayse/markets")
async def bayse_markets(current_user: CurrentUser, db: DB):
    try:
        result = await get_bayse_markets()
        return APIResponse(
            success=True,
            message="Bayse markets fetched.",
            data=result.model_dump(),
        )
    except Exception as e:
        logger.error("Bayse markets error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )


@router.get("/bayse/stress")
async def bayse_stress(current_user: CurrentUser, db: DB):
    try:
        from optimizer import fetch_bayse_signal

        signal = await fetch_bayse_signal()
        return APIResponse(
            success=True,
            message="Bayse stress signal fetched.",
            data={
                "crowd_stress": signal.get("raw_crowd_stress", signal.get("score", 50.0)),
                "bayse_score": signal.get("score", 50.0),
                "bayse_status": signal.get("status", "MODERATE"),
                "market_title": signal.get("market_title", ""),
                "mid_price": signal.get("mid_price", 0.5),
                "spread": signal.get("spread", 0.0),
                "available": signal.get("available", False),
            },
        )
    except Exception as e:
        logger.error("Bayse stress error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )


@router.get("/bayse/sentiment")
async def bayse_sentiment(current_user: CurrentUser, db: DB):
    try:
        from optimizer import fetch_bayse_signal

        signal = await fetch_bayse_signal()

        panic_score = round(
            float(signal.get("crowd_yes_price", 0.5)) * 40
            + float(signal.get("imbalance", 0.0)) * 100 * 30
            + float(signal.get("score", 50.0)) * 0.3,
            2,
        )

        return APIResponse(
            success=True,
            message="Bayse sentiment retrieved.",
            data={
                "panic_score": min(100.0, panic_score),
                "interpretation": (
                    "EXTREME PANIC" if panic_score >= 75 else
                    "HIGH FEAR" if panic_score >= 55 else
                    "MODERATE" if panic_score >= 35 else
                    "CALM"
                ),
                "crowd_yes_price": signal.get("crowd_yes_price", 0.5),
                "imbalance": signal.get("imbalance", 0.0),
                "volume24h": signal.get("volume24h", 0.0),
            },
        )
    except Exception as e:
        logger.error("Bayse sentiment error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )
