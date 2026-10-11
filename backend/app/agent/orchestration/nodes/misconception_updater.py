"""Node 3: refresh the Misconception Fingerprint state."""

from __future__ import annotations

from app.agent.orchestration.state import GraphState
from app.domain.services import mastery_service


def run(state: GraphState) -> tuple[str, str, dict]:
    fingerprints = mastery_service.list_fingerprints(state.profile_id)
    state.fingerprints = fingerprints
    unresolved = [fp for fp in fingerprints if fp.status in ("unresolved", "needs_review")]
    summary = (
        f"Updated {len(fingerprints)} fingerprints; {len(unresolved)} unresolved misconceptions."
    )
    return (
        "ok",
        summary,
        {
            "unresolved": [
                {
                    "concept_id": fp.concept_id,
                    "misconception_id": fp.misconception_id,
                    "mastery": fp.mastery,
                    "status": fp.status,
                }
                for fp in unresolved
            ]
        },
    )
