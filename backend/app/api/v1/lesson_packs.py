from fastapi import APIRouter, HTTPException

from app.agent.orchestration.workflow import run_reconnect_workflow
from app.domain.models import AgentTrace, LessonPack
from app.domain.services.learner_service import get_profile
from app.domain.services.pack_service import get_next_pack

router = APIRouter(tags=["lesson-packs"])


def _profile_or_404(profile_id: str):
    try:
        return get_profile(profile_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Learner profile not found") from exc


@router.get("/lesson-packs/{profile_id}/next", response_model=LessonPack)
async def get_next_lesson_pack(profile_id: str) -> LessonPack:
    profile = _profile_or_404(profile_id)
    return get_next_pack(profile_id, profile)


@router.post("/lesson-packs/{profile_id}/compile", response_model=AgentTrace)
async def compile_next_lesson_pack(profile_id: str) -> AgentTrace:
    _profile_or_404(profile_id)
    _, trace = run_reconnect_workflow(profile_id, trigger="manual-compile")
    return trace
