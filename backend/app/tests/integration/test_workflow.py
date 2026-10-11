"""Integration tests for the explicit agent graph."""

from __future__ import annotations

from app.agent.orchestration.workflow import run_reconnect_workflow
from app.domain.services.learner_service import seed_demo_profiles


def test_workflow_runs_full_graph(client) -> None:
    seed_demo_profiles()
    state, trace = run_reconnect_workflow("sunita", trigger="test")
    names = [node.name for node in trace.nodes]
    assert names == [
        "event_processor",
        "teach_back_grader",
        "misconception_updater",
        "planner",
        "budget_optimizer",
        "pack_compiler",
        "teacher_brief_generator",
    ]
    assert state.pack is not None
    assert state.pack.profile_id == "sunita"


def test_workflow_can_skip_teacher_brief(client) -> None:
    seed_demo_profiles()
    _, trace = run_reconnect_workflow("asha", trigger="test", include_teacher_brief=False)
    statuses = {node.name: node.status for node in trace.nodes}
    assert statuses["teacher_brief_generator"] == "skipped"
