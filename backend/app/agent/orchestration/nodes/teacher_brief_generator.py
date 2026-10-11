"""Node 7: build the class-level Teacher Action Brief."""

from __future__ import annotations

from app.agent.orchestration.state import GraphState
from app.domain.services import teacher_brief_service


def run(state: GraphState) -> tuple[str, str, dict]:
    brief = teacher_brief_service.build_teacher_brief()
    state.brief = brief
    top = brief.top_misconceptions[0] if brief.top_misconceptions else None
    summary = (
        f"Brief generated with {len(brief.top_misconceptions)} cluster(s)"
        + (f"; top: {top.label_en} ({top.bucket})" if top else ".")
    )
    return "ok", summary, {"clusters": len(brief.top_misconceptions)}
