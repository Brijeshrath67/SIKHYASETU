"""High-level workflow entrypoints built on the explicit graph."""

from __future__ import annotations

import uuid
from typing import Optional

from app.agent.orchestration.graph import run_graph
from app.agent.orchestration.state import GraphState
from app.domain.models import AgentTrace
from app.domain.services import clock, learner_service
from app.infrastructure.db import get_connection, initialize_db, json_dumps, json_loads


def build_trace(state: GraphState) -> AgentTrace:
    decision: dict = {}
    if state.pack is not None:
        decision = {
            "pack_id": state.pack.pack_id,
            "pack_version": state.pack.pack_version,
            "concepts": [concept.concept_id for concept in state.pack.concepts],
            "estimated_kb": state.pack.budget.estimated_kb,
            "estimated_minutes": state.pack.budget.estimated_minutes,
            "audio_included": state.pack.budget.audio_included,
            "provenance": state.pack.provenance.source,
            "decisions": state.pack.budget.decisions,
        }
    return AgentTrace(
        run_id=state.run_id,
        profile_id=state.profile_id,
        trigger=state.trigger,
        started_at=state.nodes[0].details.get("started_at", "") if state.nodes else "",
        finished_at=clock.now_iso(),
        nodes=state.nodes,
        decision=decision,
    )


def store_trace(trace: AgentTrace) -> None:
    initialize_db()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO agent_runs (id, profile_id, trigger, created_at, payload)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                trace.run_id,
                trace.profile_id,
                trace.trigger,
                trace.finished_at or clock.now_iso(),
                json_dumps(trace.model_dump(mode="json")),
            ),
        )
        conn.commit()


def run_reconnect_workflow(
    profile_id: str,
    *,
    trigger: str = "reconnect",
    include_teacher_brief: bool = True,
) -> tuple[GraphState, AgentTrace]:
    profile = learner_service.get_profile(profile_id)
    state = GraphState(
        run_id=str(uuid.uuid4()),
        profile_id=profile_id,
        trigger=trigger,
        profile=profile,
    )
    started = clock.now_iso()
    run_graph(state, include_teacher_brief=include_teacher_brief)
    trace = build_trace(state)
    trace.started_at = started
    store_trace(trace)
    return state, trace


def latest_trace(profile_id: str) -> Optional[AgentTrace]:
    initialize_db()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT payload FROM agent_runs WHERE profile_id = ? ORDER BY created_at DESC LIMIT 1",
            (profile_id,),
        ).fetchone()
    if row is None:
        return None
    return AgentTrace.model_validate(json_loads(row["payload"]))
