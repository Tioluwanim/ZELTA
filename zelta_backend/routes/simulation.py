from fastapi import APIRouter, HTTPException, status
import logging

from core.dependencies import CurrentUser, DB
from services.simulation_service import run_side_hustle_simulation, run_savings_simulation
from services.intelligence_service import get_stress_only
from schemas.simulation import SideHustleSimRequest, SavingsSimRequest, SimulationResponse, SimulationType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])


@router.post("/side-hustle", response_model=SimulationResponse)
async def side_hustle_simulation(
    current_user: CurrentUser,
    db: DB,
    request: SideHustleSimRequest,
):
    """
    Run Bayesian Monte Carlo simulation for a side hustle investment.
    Returns Kelly-adjusted recommendation, Decision Score, and probability bands.
    """
    uid = current_user["uid"]

    try:
        try:
            stress = await get_stress_only(db, uid)
            stress_index = stress.stress_index
        except Exception as e:
            logger.warning("Stress lookup failed for side hustle sim uid=%s: %s", uid, e)
            stress_index = 50.0

        result = await run_side_hustle_simulation(
            db=db,
            uid=uid,
            request=request,
            current_stress_index=stress_index,
        )

        return SimulationResponse(
            success=True,
            simulation_type=SimulationType.SIDE_HUSTLE,
            data=result.model_dump(),
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error("Side hustle simulation error uid=%s: %s", uid, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )


@router.post("/savings", response_model=SimulationResponse)
async def savings_simulation(
    current_user: CurrentUser,
    db: DB,
    request: SavingsSimRequest,
):
    """
    Model savings trajectory against upcoming fee obligations.
    Returns week-by-week risk map with green/amber/red status.
    """
    uid = current_user["uid"]

    try:
        try:
            stress = await get_stress_only(db, uid)
            stress_index = stress.stress_index
        except Exception as e:
            logger.warning("Stress lookup failed for savings sim uid=%s: %s", uid, e)
            stress_index = 50.0

        result = await run_savings_simulation(
            db=db,
            uid=uid,
            request=request,
            current_stress_index=stress_index,
        )

        return SimulationResponse(
            success=True,
            simulation_type=SimulationType.SAVINGS,
            data=result.model_dump(),
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error("Savings simulation error uid=%s: %s", uid, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )
