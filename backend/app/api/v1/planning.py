from fastapi import APIRouter, HTTPException

from app.agent.orchestration.workflow import latest_trace, run_reconnect_workflow
from app.domain.models import AgentTrace, LearningPlan
from app.domain.services import planning_service
from app.domain.services.learner_service import get_profile

router = APIRouter(tags=["planning"])


def _profile_or_404(profile_id: str) -> None:
    try:
        get_profile(profile_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Learner profile not found") from exc


@router.get("/planning/{profile_id}", response_model=LearningPlan)
async def get_plan(profile_id: str) -> LearningPlan:
    _profile_or_404(profile_id)
    return planning_service.build_plan(profile_id)


@router.get("/planning/{profile_id}/trace", response_model=AgentTrace)
async def get_trace(profile_id: str) -> AgentTrace:
    _profile_or_404(profile_id)
    trace = latest_trace(profile_id)
    if trace is None:
        _, trace = run_reconnect_workflow(profile_id, trigger="first-trace")
    return trace


@router.post("/planning/{profile_id}/run", response_model=AgentTrace)
async def run_agent(profile_id: str) -> AgentTrace:
    _profile_or_404(profile_id)
    _, trace = run_reconnect_workflow(profile_id, trigger="manual-run")
    return trace
