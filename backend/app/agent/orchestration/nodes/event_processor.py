"""Node 1: observe the events that arrived from the phone."""

from __future__ import annotations

from collections import Counter

from app.agent.orchestration.state import GraphState
from app.domain.services import sync_service


def run(state: GraphState) -> tuple[str, str, dict]:
    events = sync_service.recent_events(state.profile_id, limit=25)
    state.recent_events = events
    counts = dict(Counter(event["type"] for event in events))
    summary = f"Observed {len(events)} recent events ({counts or 'none'})."
    return "ok", summary, {"event_counts": counts}
