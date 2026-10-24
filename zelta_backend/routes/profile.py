from fastapi import APIRouter, HTTPException, status
import logging

from core.dependencies import CurrentUser, DB
from services.profile_service import (
    get_profile,
    create_or_update_profile,
    initialize_profile_on_first_login,
)
from schemas.profile import UpdateProfileRequest, ProfileResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get("", response_model=ProfileResponse)
async def get_user_profile(current_user: CurrentUser, db: DB):
    """
    Get full user profile: financial settings, preferences, notification config.
    Auto-initializes profile on first call if it doesn't exist.
    """
    uid = current_user["uid"]

    try:
        profile = await initialize_profile_on_first_login(db, uid, current_user)
        return ProfileResponse(success=True, data=profile)
    except Exception as e:
        logger.error("Profile GET error uid=%s: %s", uid, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )


@router.patch("", response_model=ProfileResponse)
async def update_user_profile(
    current_user: CurrentUser,
    db: DB,
    request: UpdateProfileRequest,
):
    """
    Update user profile. Supports partial nested updates.
    Send only the fields you want to change — existing data is preserved.
    """
    uid = current_user["uid"]

    try:
        profile = await create_or_update_profile(db, uid, current_user, request)
        return ProfileResponse(success=True, data=profile)
    except Exception as e:
        logger.error("Profile UPDATE error uid=%s: %s", uid, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        )
