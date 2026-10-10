from fastapi import APIRouter, HTTPException

from app.services.pack_service import build_pack

router = APIRouter(tags=["lesson-packs"])


@router.get("/lesson-packs/{profile_id}/next")
async def get_next_lesson_pack(profile_id: str):
    try:
        return build_pack(profile_id).model_dump(mode="json")
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Learner profile not found") from exc

