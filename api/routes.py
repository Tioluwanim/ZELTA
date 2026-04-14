# api/routes.py
from fastapi import APIRouter
from brain.bayse.stress_signal import get_live_stress_signal

router = APIRouter()

@router.get("/brain")
async def get_brain_data():
    """
    The main intelligence endpoint for ZELTA.
    Returns the live stress signal derived from Bayse.
    """
    signal = await get_live_stress_signal()
    return {
        "status": "success",
        "origin": "Bayse Markets Relay",
        "data": signal
    }