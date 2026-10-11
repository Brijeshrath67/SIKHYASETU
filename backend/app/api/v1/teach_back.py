from fastapi import APIRouter, HTTPException

from app.domain.models import TeachBackGrade, TeachBackRequest
from app.domain.services import grading_service
from app.domain.services.learner_service import get_profile

router = APIRouter(tags=["teach-back"])


@router.post("/teach-back/{profile_id}", response_model=TeachBackGrade)
async def grade(profile_id: str, payload: TeachBackRequest) -> TeachBackGrade:
    try:
        get_profile(profile_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Learner profile not found") from exc
    if not payload.transcript.strip():
        raise HTTPException(status_code=422, detail="Transcript is empty; audio must be transcribed first.")
    return grading_service.grade_teach_back(profile_id, payload.concept_id, payload.transcript)
