"""
ZELTA — Campus Gig Board
WhatsApp message → structured ExtractedCampusGig via Gemini Flash.
The most original feature of ZELTA.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from core.dependencies import CurrentUser, DB
from config.settings import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/gig", tags=["Gig Board"])

# ─── Schemas ──────────────────────────────────────────────────────────────────

class GigExtractRequest(BaseModel):
    raw_text: str = Field(..., min_length=5, description="Raw WhatsApp message text")
    poster: Optional[str] = Field(default=None, description="Who posted (e.g. 'CS WhatsApp')")


class ExtractedCampusGig(BaseModel):
    id: str
    task: str
    location: str
    payout: float
    payout_raw: str
    time_estimate: Optional[str] = None
    skills_required: List[str] = []
    status: str = "OPEN"  # OPEN | CLAIMED | COMPLETED
    raw_text: str
    extracted_at: str
    poster: Optional[str] = None
    extracted_by_uid: Optional[str] = None


class GigExtractResponse(BaseModel):
    success: bool
    gig: Optional[ExtractedCampusGig] = None
    error: Optional[str] = None


class ClaimGigResponse(BaseModel):
    success: bool
    gig_id: str
    squad_payment_link: Optional[str] = None
    message: str


# ─── Gemini Flash extraction ───────────────────────────────────────────────────

async def _extract_gig_with_gemini(raw_text: str) -> Dict[str, Any]:
    """
    Use Gemini Flash to parse informal WhatsApp text into structured gig data.
    Falls back to heuristic parsing if Gemini is unavailable.
    """
    import google.generativeai as genai
    import json

    prompt = f"""You are a campus gig extractor. Parse this WhatsApp message into a structured gig.

Message: "{raw_text}"

Return ONLY valid JSON (no markdown, no backticks) with these exact fields:
{{
  "task": "clear description of the work needed",
  "location": "where the work happens (or 'Remote' if not mentioned)",
  "payout": <number in NGN, e.g. 15000>,
  "payout_raw": "original payout text from message",
  "time_estimate": "estimated duration e.g. '2-3 hours' or null",
  "skills_required": ["skill1", "skill2"] or []
}}

Rules:
- payout: extract the number. If "15k" → 15000. If "5,000" → 5000. If none mentioned → 0.
- task: be specific and action-oriented.
- location: pick the actual campus location mentioned, or "Remote / Online", or "To be confirmed".
- skills_required: infer from the task (e.g. coding → ["Python", "Debugging"]).
"""

    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        raw_json = response.text.strip()
        # Strip markdown if present
        if raw_json.startswith("```"):
            raw_json = raw_json.split("```")[1]
            if raw_json.startswith("json"):
                raw_json = raw_json[4:]
        return json.loads(raw_json.strip())
    except Exception as e:
        logger.warning("Gemini Flash gig extraction failed: %s — falling back to heuristic", e)
        return _heuristic_extract(raw_text)


def _heuristic_extract(raw_text: str) -> Dict[str, Any]:
    """Fallback: simple heuristic extraction when Gemini is unavailable."""
    import re

    # Extract payout
    payout = 0.0
    payout_raw = ""
    patterns = [
        r"(?:pay(?:ing|ment|out)?|budget|price|cost|fee)[^\d]*(\d[\d,]*)[k]?",
        r"(\d[\d,]*)\s*(?:naira|NGN|₦|k\b)",
        r"[₦#](\d[\d,]*)",
    ]
    for p in patterns:
        m = re.search(p, raw_text, re.IGNORECASE)
        if m:
            raw_val = m.group(1).replace(",", "")
            payout = float(raw_val)
            if "k" in raw_text[m.start():m.end()+2].lower():
                payout *= 1000
            payout_raw = m.group(0)
            break

    # Extract location
    location = "Campus / To be confirmed"
    loc_keywords = ["library", "hostel", "sub", "faculty", "hall", "lab", "class", "cafeteria", "remote", "online", "oau", "ife"]
    for kw in loc_keywords:
        if kw.lower() in raw_text.lower():
            location = kw.title()
            break

    # Task: use first sentence
    task = raw_text.split(".")[0].split(",")[0].strip()[:120]

    return {
        "task": task,
        "location": location,
        "payout": payout,
        "payout_raw": payout_raw or f"₦{payout:,.0f}",
        "time_estimate": None,
        "skills_required": [],
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/extract", response_model=GigExtractResponse)
async def extract_gig(request: GigExtractRequest, current_user: CurrentUser, db: DB):
    """
    POST /api/gig/extract
    Paste a raw WhatsApp message. Gemini Flash parses it into a structured gig card.
    The gig is saved to the board for all students.
    """
    uid = current_user["uid"]
    try:
        extracted = await _extract_gig_with_gemini(request.raw_text)

        gig_id = f"gig_{uuid.uuid4().hex[:12]}"
        gig = ExtractedCampusGig(
            id=gig_id,
            task=extracted.get("task", request.raw_text[:80]),
            location=extracted.get("location", "Campus"),
            payout=float(extracted.get("payout", 0)),
            payout_raw=extracted.get("payout_raw", ""),
            time_estimate=extracted.get("time_estimate"),
            skills_required=extracted.get("skills_required", []),
            status="OPEN",
            raw_text=request.raw_text,
            extracted_at=datetime.now(timezone.utc).isoformat(),
            poster=request.poster,
            extracted_by_uid=uid,
        )

        # Save to Firestore gig board
        db.collection("gig_board").document(gig_id).set(gig.model_dump())

        return GigExtractResponse(success=True, gig=gig)

    except Exception as e:
        logger.error("Gig extraction error uid=%s: %s", uid, e)
        return GigExtractResponse(success=False, error=str(e))


@router.get("/list")
async def list_gigs(
    current_user: CurrentUser,
    db: DB,
    status_filter: Optional[str] = None,
    limit: int = 30,
):
    """
    GET /api/gig/list?status_filter=OPEN&limit=30
    Returns the gig board, optionally filtered by status.
    """
    try:
        query = db.collection("gig_board").order_by(
            "extracted_at", direction="DESCENDING"
        ).limit(limit)

        docs = query.stream()
        gigs = []
        for doc in docs:
            d = doc.to_dict()
            if status_filter and d.get("status") != status_filter.upper():
                continue
            gigs.append(d)

        return {"success": True, "gigs": gigs, "total": len(gigs)}
    except Exception as e:
        logger.error("Gig list error: %s", e)
        return {"success": True, "gigs": [], "total": 0}


@router.post("/{gig_id}/claim")
async def claim_gig(gig_id: str, current_user: CurrentUser, db: DB):
    """
    POST /api/gig/{gig_id}/claim
    Student claims a gig. Creates a Squad payment link for the payer.
    """
    uid = current_user["uid"]
    try:
        gig_ref = db.collection("gig_board").document(gig_id)
        gig_doc = gig_ref.get()

        if not gig_doc.exists:
            raise HTTPException(status_code=404, detail="Gig not found.")

        gig_data = gig_doc.to_dict()
        if gig_data.get("status") != "OPEN":
            raise HTTPException(status_code=400, detail="This gig has already been claimed.")

        # Update status
        gig_ref.update({
            "status": "CLAIMED",
            "claimed_by_uid": uid,
            "claimed_at": datetime.now(timezone.utc).isoformat(),
        })

        # Generate simulated Squad payment link
        link_id = uuid.uuid4().hex[:10].upper()
        squad_link = f"https://pay.squadco.com/link/{link_id}"

        return ClaimGigResponse(
            success=True,
            gig_id=gig_id,
            squad_payment_link=squad_link,
            message=f"You claimed: {gig_data.get('task', 'gig')}. Share the payment link with the poster.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Gig claim error uid=%s gig=%s: %s", uid, gig_id, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{gig_id}")
async def get_gig(gig_id: str, current_user: CurrentUser, db: DB):
    """GET /api/gig/{gig_id}"""
    try:
        doc = db.collection("gig_board").document(gig_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Gig not found.")
        return {"success": True, "gig": doc.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))