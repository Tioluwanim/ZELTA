from fastapi import APIRouter, HTTPException
from firebase_admin import auth
import requests

from config.settings import settings

router = APIRouter(prefix="/dev", tags=["Dev Auth"])


@router.get("/custom-token/{uid}")
def create_custom_token(uid: str):
    try:
        token = auth.create_custom_token(uid)
        return {"custom_token": token.decode("utf-8")}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")


@router.get("/id-token/{custom_token}")
def exchange_custom_token(custom_token: str):
    if not settings.firebase_api_key:
        raise HTTPException(status_code=500, detail="FIREBASE_API_KEY is missing in .env")

    url = (
        "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken"
        f"?key={settings.firebase_api_key}"
    )

    try:
        response = requests.post(
            url,
            json={
                "token": custom_token,
                "returnSecureToken": True,
            },
            timeout=30,
        )
        data = response.json()

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=data)

        return data
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
