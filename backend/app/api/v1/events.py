from fastapi import APIRouter

from app.agent.orchestration.workflow import run_reconnect_workflow
from app.domain.models import EventBatchRequest, SyncResult
from app.domain.services.sync_service import accept_events

router = APIRouter(tags=["events"])


@router.post("/events/sync", response_model=SyncResult)
async def sync_events(payload: EventBatchRequest) -> SyncResult:
    """Ingest a batch idempotently, then run the agent graph per learner."""
    result = accept_events(payload.events)

    next_pack_ids: dict[str, str] = {}
    for profile_id in result.affected_profiles:
        state, trace = run_reconnect_workflow(profile_id, trigger="sync")
        result.runs.append(trace)
        if state.pack is not None:
            next_pack_ids[profile_id] = state.pack.pack_id
    result.next_pack_ids = next_pack_ids
    return result
