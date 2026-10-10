from fastapi import APIRouter, HTTPException

from app.services.pack_service import compile_planning_trace

router = APIRouter(tags=["planning"])


@router.get("/planning/{profile_id}")
async def planning_trace(profile_id: str):
    try:
        return compile_planning_trace(profile_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Learner profile not found") from exc

