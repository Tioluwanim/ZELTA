"""Financial Twin for the signed-in user. The browser calls these; the backend builds the data and asks the AI service."""
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from core.dependencies import CurrentUser, DB
from services import twin_service as svc

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/twin", tags=["Financial Twin"])


class _Body(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GuardianRequest(_Body):
    amount: float = Field(..., gt=0, lt=1e9)
    kind: str = "spend"
    category: Optional[str] = Field(None, max_length=40)


class ScenarioRequest(_Body):
    kind: str = Field(..., max_length=40)
    amount: Optional[float] = Field(None, gt=0, lt=1e9)
    category: Optional[str] = Field(None, max_length=40)
    pct: Optional[int] = Field(None, ge=1, le=100)
    name: Optional[str] = Field(None, max_length=80)


class WhatIfRequest(_Body):
    scenarios: List[ScenarioRequest] = Field(..., min_length=1, max_length=5)
    horizon: int = Field(30, ge=7, le=120)


class AgentRequest(_Body):
    message: str = Field(..., min_length=1, max_length=500)


def _wants_opportunities(text: str) -> bool:
    t = text.lower()
    return any(w in t for w in ("earn", "hustle", "gig", "opportunit", "extra income", "make money"))


async def _run(db, user, path, extra=None):
    uid = user["uid"]
    try:
        body = await svc.payload_for(db, uid)
        if extra:
            body.update(extra)
        return await svc.call(path, body, uid)
    except svc.TwinUnavailable as e:
        raise HTTPException(status_code=e.status, detail=e.message)
    except Exception:
        logger.exception("twin route failed uid=%s", uid)
        raise HTTPException(status_code=500, detail="Something went wrong building your twin.")


@router.get("")
async def twin(current_user: CurrentUser, db: DB):
    """Summary, position, buffer, forecast, habits and recommendations. Unknown values stay null."""
    return {"success": True, "data": await _run(db, current_user, "/brain/v1/twin/compute")}


@router.post("/guardian")
async def guardian(request: GuardianRequest, current_user: CurrentUser, db: DB):
    amount = svc.naira(request.amount)
    return {"success": True, "data": await _run(db, current_user, "/brain/v1/guardian",
                                                {"action": {"kind": request.kind, "amount_naira": amount, "category": request.category}})}


@router.post("/whatif")
async def whatif(request: WhatIfRequest, current_user: CurrentUser, db: DB):
    scenarios = [{"kind": s.kind, "amount_naira": None if s.amount is None else svc.naira(s.amount), "category": s.category,
                  "pct": s.pct, "name": s.name} for s in request.scenarios]
    return {"success": True, "data": await _run(db, current_user, "/brain/v1/whatif", {"scenarios": scenarios, "horizon": request.horizon})}


@router.post("/agent")
async def agent(request: AgentRequest, current_user: CurrentUser, db: DB):
    catalogue = svc.gig_catalogue(svc.load_gigs(db), current_user["uid"]) if _wants_opportunities(request.message) else []
    return {"success": True, "data": await _run(db, current_user, "/brain/v1/agent", {"message": request.message, "catalogue": catalogue})}


@router.get("/opportunities")
async def opportunities(current_user: CurrentUser, db: DB):
    """Earn / Save / Grow options ranked against your Twin. Today the only source is the open gig board."""
    uid = current_user["uid"]
    catalogue = svc.gig_catalogue(svc.load_gigs(db), uid)
    return {"success": True, "data": await _run(db, current_user, "/brain/v1/opportunities", {"catalogue": catalogue})}
