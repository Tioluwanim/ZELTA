"""GET /brain/v1/twin: total connected money, burn and runway for one user.

A route does four things: authenticate, validate, call a service, shape the response.
Errors on this router always have the shape {"code": ..., "message": ...}; exception text and stack traces
are never returned. The repository defaults to UnconfiguredRepository (503), so a deployment cannot serve
invented numbers; tests and later wiring override `get_twin_repository`.

Caller identity: the service is internal-only. `verify_internal_request` authenticates the calling backend
(x-api-key) and the backend asserts the user via the `x-user-id` header. This service does not verify end users.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Callable, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from pydantic import BaseModel, ConfigDict, Field

from domain.clock import NaiveDatetimeError, require_aware
from financial_twin import FinancialTwinService
from financial_twin.repository import TwinDataUnavailable, TwinRepository, UnconfiguredRepository
from ratelimit import rate_limit
from security import verify_internal_request

logger = logging.getLogger("zelta.api.twin")


class Freshness(str, Enum):
    FRESH = "fresh"            # every account contributed a fresh balance
    STALE = "stale"            # included, but some balances are older than 24 h
    INCOMPLETE = "incomplete"  # some accounts excluded (very stale, unknown, duplicate...)
    UNKNOWN = "unknown"        # no balance data at all


class TwinOut(BaseModel):
    model_config = ConfigDict(extra="forbid")
    as_of: datetime
    total_kobo: Optional[int] = Field(None, description="Connected money in kobo; null = unknown, never zero")
    burn_kobo_per_day: Optional[int] = Field(None, description="Estimated daily spend; null = insufficient history")
    runway_days: Optional[float] = Field(None, description="Days until money runs out; null = unknown")
    burn_confidence: str
    freshness: Freshness
    warnings: List[str] = Field(default_factory=list)


class ErrorOut(BaseModel):
    code: str
    message: str


_CODES = {401: "unauthorized", 429: "rate_limited", 403: "forbidden", 404: "not_found", 422: "invalid_request", 503: "twin_unavailable"}
_GENERIC = {401: "Authentication failed.", 429: "Too many requests. Try again shortly.", 403: "Not allowed.", 404: "Not found.",
            503: "The financial twin is temporarily unavailable."}


def _err(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"code": code, "message": message})


class ContractRoute(APIRoute):
    """Converts every failure on this router into {code, message}; never leaks exception text."""

    def get_route_handler(self) -> Callable:
        original = super().get_route_handler()

        async def handler(request: Request):
            try:
                return await original(request)
            except RequestValidationError as exc:
                fields = sorted({".".join(map(str, item["loc"][1:])) or str(item["loc"][0]) for item in exc.errors()})
                return _err(422, "invalid_request", "Invalid request: " + ", ".join(fields))
            except HTTPException as exc:
                status = exc.status_code
                if status >= 500 and status != 503:
                    logger.error("twin route HTTP %s: %s", status, exc.detail)
                    return _err(500, "internal_error", "Something went wrong.")
                return _err(status, _CODES.get(status, "error"), _GENERIC.get(status, "Request failed."))
            except TwinDataUnavailable:
                return _err(503, "twin_unavailable", _GENERIC[503])
            except Exception:
                logger.error("unhandled error in twin route", exc_info=True)
                return _err(500, "internal_error", "Something went wrong.")

        return handler


router = APIRouter(prefix="/brain/v1", tags=["Financial Twin"], route_class=ContractRoute)


_twin_limit = rate_limit(limit=60, window_s=60.0)     # per caller, per instance


def get_twin_repository() -> TwinRepository:
    return UnconfiguredRepository()


def get_clock() -> datetime:
    return datetime.now(timezone.utc)      # the one place the system clock is read; engines never read it


@router.get("/twin", response_model=TwinOut, dependencies=[Depends(verify_internal_request), Depends(_twin_limit)],
            responses={401: {"model": ErrorOut}, 422: {"model": ErrorOut}, 429: {"model": ErrorOut}, 500: {"model": ErrorOut},
                       503: {"model": ErrorOut}})
async def get_twin(
    x_user_id: str = Header(..., min_length=1, max_length=128),
    as_of: Optional[datetime] = Query(None, description="Reference time (ISO-8601 with timezone). Default: now."),
    repo: TwinRepository = Depends(get_twin_repository),
    now: datetime = Depends(get_clock),
) -> TwinOut:
    ref = as_of if as_of is not None else now
    try:
        require_aware(ref, "as_of")
    except NaiveDatetimeError:
        raise HTTPException(status_code=422, detail="as_of must include a timezone")
    return build_twin_out(x_user_id, ref, repo)


def build_twin_out(user_id: str, as_of: datetime, repo: TwinRepository) -> TwinOut:
    inp = repo.load(user_id, as_of)
    snap = FinancialTwinService(inp.provider).build(
        user_id, inp.connection_ref, as_of, inp.obligations, inp.streams, inp.essential_categories,
        inp.monthly_incomes, inp.timing_hits, inp.timing_expected, inp.first_observed)
    conn = snap.observed.connected
    if conn is None:
        freshness = Freshness.UNKNOWN
    elif conn.excluded:
        freshness = Freshness.INCOMPLETE
    elif conn.stale:
        freshness = Freshness.STALE
    else:
        freshness = Freshness.FRESH
    b = snap.inferred.burn.per_day_money()
    r = snap.inferred.runway.days
    return TwinOut(as_of=as_of, total_kobo=None if snap.total is None else snap.total.minor,
                   burn_kobo_per_day=None if b is None else b.minor,
                   runway_days=None if r is None else round(r, 2),
                   burn_confidence=snap.inferred.burn.confidence, freshness=freshness,
                   warnings=list(snap.warnings))
