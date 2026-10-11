"""Explicit agent graph.

Instead of a hidden prompt, SikhyaSetu runs a small explicit graph of nodes with
observable inputs and outputs. Each node appends a trace entry describing what
it did. This is the "LangGraph or equivalent explicit graph" required by the
proposal, implemented without an external orchestration or model dependency so
it stays free and reliable.

Flow: event_processor -> teach_back_grader -> misconception_updater ->
planner -> budget_optimizer -> pack_compiler -> (teacher_brief_generator).
"""

from __future__ import annotations

from typing import Callable

from app.agent.orchestration.nodes import (
    budget_optimizer,
    event_processor,
    misconception_updater,
    pack_compiler,
    planner,
    teach_back_grader,
    teacher_brief_generator,
)
from app.agent.orchestration.state import GraphState

NodeFn = Callable[[GraphState], tuple[str, str, dict]]

NODE_SEQUENCE: list[tuple[str, NodeFn]] = [
    ("event_processor", event_processor.run),
    ("teach_back_grader", teach_back_grader.run),
    ("misconception_updater", misconception_updater.run),
    ("planner", planner.run),
    ("budget_optimizer", budget_optimizer.run),
    ("pack_compiler", pack_compiler.run),
    ("teacher_brief_generator", teacher_brief_generator.run),
]


def run_graph(state: GraphState, *, include_teacher_brief: bool = True) -> GraphState:
    for name, node in NODE_SEQUENCE:
        if name == "teacher_brief_generator" and not include_teacher_brief:
            state.add_node(name, "skipped", "Teacher brief not requested for this run.")
            continue
        try:
            status, summary, details = node(state)
            state.add_node(name, status, summary, details)
        except Exception as exc:  # noqa: BLE001 - surfaced in the trace for honesty
            state.errors.append(f"{name}: {exc}")
            state.add_node(name, "error", f"Node failed: {exc}", {"error": str(exc)})

    # Fallback: if compilation failed, serve a reviewed fallback pack rather
    # than leaving the learner without content.
    if state.pack is None and state.profile is not None:
        from app.domain.services import pack_service

        try:
            state.pack = pack_service.compile_pack(
                state.profile_id,
                state.profile,
                ranked=state.ranked,
                trace=[node.summary for node in state.nodes],
                provenance_source="fallback",
                fallback=True,
            )
            state.add_node(
                "fallback_pack",
                "fallback",
                "Live compilation failed; served a reviewed fallback pack.",
            )
        except Exception as exc:  # noqa: BLE001
            state.errors.append(f"fallback: {exc}")
            state.add_node("fallback_pack", "error", f"Fallback failed: {exc}")

    return state
