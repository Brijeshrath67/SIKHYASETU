"""Node 5: the Learning-per-MB budget trade-off."""

from __future__ import annotations

from app.agent.orchestration.state import GraphState
from app.domain.services import budget_service


def run(state: GraphState) -> tuple[str, str, dict]:
    if state.profile is None:
        raise ValueError("profile is required before budgeting")
    plan = budget_service.optimize(state.profile, state.ranked)
    state.budget_plan = plan
    summary = (
        f"{plan.headline} Selected {len(plan.concept_ids)} concept(s), "
        f"audio {'included' if plan.audio_included else 'deferred'}."
    )
    return "ok", summary, {"decisions": plan.decisions, "deferred": plan.deferred}
