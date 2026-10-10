from fastapi import APIRouter

from app.domain.models import EventBatchRequest
from app.services.sync_service import accept_events

router = APIRouter(tags=["events"])


@router.post("/events/sync")
async def sync_events(payload: EventBatchRequest):
    accepted = accept_events(payload.events)
    return {"accepted": accepted, "status": "ok"}

