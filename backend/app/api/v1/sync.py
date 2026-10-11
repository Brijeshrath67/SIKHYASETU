from fastapi import APIRouter, HTTPException

from app.domain.services.learner_service import get_profile

router = APIRouter(tags=["sync"])


@router.get("/sync/status")
async def sync_status(profile_id: str | None = None) -> dict:
    if profile_id:
        try:
            profile = get_profile(profile_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Learner profile not found") from exc
        return {
            "status": "ok",
            "profile_id": profile_id,
            "last_synced_at": profile.last_synced_at,
        }
    return {"status": "ok", "last_synced_at": None}
