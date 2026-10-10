from fastapi import APIRouter, HTTPException

from app.domain.models import CreateLearnerRequest, Profile
from app.services.learner_service import create_profile, get_profile, list_profiles

router = APIRouter(tags=["learners"])


@router.get("/learners", response_model=list[Profile])
async def get_learners() -> list[Profile]:
    return list_profiles()


@router.get("/learners/{profile_id}", response_model=Profile)
async def get_learner(profile_id: str) -> Profile:
    try:
        return get_profile(profile_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Learner profile not found") from exc


@router.post("/learners", response_model=Profile)
async def create_learner(payload: CreateLearnerRequest) -> Profile:
    return create_profile(payload)

