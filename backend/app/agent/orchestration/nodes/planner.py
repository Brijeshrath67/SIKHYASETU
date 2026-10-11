"""Node 4: select the next concepts."""

from __future__ import annotations

from app.agent.orchestration.state import GraphState
from app.domain.services import planning_service


def run(state: GraphState) -> tuple[str, str, dict]:
    state.plan = planning_service.build_plan(state.profile_id)
    state.ranked = planning_service.ranked_concepts(state.profile_id)
    steps = [
        {"concept_id": step.concept_id, "reason": step.reason, "priority": step.priority}
        for step in state.plan.steps
    ]
    top = steps[0]["concept_id"] if steps else "none"
    summary = f"Planned {len(steps)} steps; priority concept '{top}'."
    return "ok", summary, {"steps": steps}
