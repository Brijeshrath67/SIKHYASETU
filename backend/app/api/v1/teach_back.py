from fastapi import APIRouter, HTTPException

from app.services.teach_back_service import grade_teach_back

router = APIRouter(tags=["teach-back"])


@router.post("/teach-back/{profile_id}")
async def grade(profile_id: str, transcript: str, concept: str):
    try:
        return grade_teach_back(profile_id, concept, transcript).model_dump(mode="json")
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Learner profile not found") from exc

