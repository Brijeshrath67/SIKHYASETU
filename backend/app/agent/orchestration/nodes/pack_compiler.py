"""Node 6: compile and sign the next offline pack."""

from __future__ import annotations

from app.agent.orchestration.state import GraphState
from app.domain.services import pack_service


def run(state: GraphState) -> tuple[str, str, dict]:
    if state.profile is None:
        raise ValueError("profile is required before compiling")
    trace = [node.summary for node in state.nodes]
    pack = pack_service.compile_pack(
        state.profile_id,
        state.profile,
        ranked=state.ranked,
        trace=trace,
        provenance_source="cloud",
    )
    state.pack = pack
    summary = (
        f"Compiled pack {pack.pack_id} v{pack.pack_version} "
        f"({pack.budget.estimated_kb} KB, {pack.budget.estimated_minutes} min)."
    )
    return "ok", summary, {"pack_id": pack.pack_id, "checksum": pack.integrity.checksum}
