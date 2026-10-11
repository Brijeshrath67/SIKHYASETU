from fastapi import APIRouter, HTTPException

from app.domain.models import CreateLearnerRequest, Fingerprint, Profile
from app.domain.services import mastery_service
from app.domain.services.learner_service import create_profile, get_profile, list_profiles

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


@router.get("/learners/{profile_id}/fingerprints", response_model=list[Fingerprint])
async def get_fingerprints(profile_id: str) -> list[Fingerprint]:
    try:
        get_profile(profile_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Learner profile not found") from exc
    return mastery_service.list_fingerprints(profile_id)


@router.post("/learners", response_model=Profile, status_code=201)
async def create_learner(payload: CreateLearnerRequest) -> Profile:
    try:
        return create_profile(payload)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
