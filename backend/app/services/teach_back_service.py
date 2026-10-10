from __future__ import annotations

import json
from datetime import datetime, timezone

from app.domain.models import DiagnosisResult
from app.infrastructure.db import get_connection, initialize_db
from app.services.learner_service import get_profile


def grade_teach_back(profile_id: str, concept: str, transcript: str) -> DiagnosisResult:
    initialize_db()
    profile = get_profile(profile_id)
    lower = transcript.lower()
    if "brightness" in lower or "current" in lower or "used up" in lower:
        misconception = "current gets used up"
        intervention = "Use the two-bulb comparison prompt and ask learners to explain where the brightness changes."
        evidence = ["teach-back mentions current being consumed", "brightness described as a fixed quantity"]
        next_review = "Tomorrow, same circuit with a new bulb arrangement"
    elif "force" in lower or "push" in lower or "brake" in lower:
        misconception = "force is contained in the object"
        intervention = "Use a bicycle-braking counter-example and a short prerequisite on interacting forces."
        evidence = ["teach-back frames force as a stored property", "learner references motion without force interactions"]
        next_review = "Tomorrow, same concept with a different object"
    else:
        misconception = "needs prerequisite repair"
        intervention = "Revisit the foundational idea with a quick worked example and a short concept check."
        evidence = ["teach-back is incomplete or too vague for a confident diagnosis"]
        next_review = "Revisit in the next short practice pack"

    diagnosis = DiagnosisResult(
        concept=concept,
        misconception=misconception,
        confidence=0.82,
        evidence=evidence,
        intervention=intervention,
        next_review=next_review,
    )

    profile.misconception_map = {"concept": concept, "misconception": misconception}
    with get_connection() as conn:
        conn.execute(
            "UPDATE profiles SET misconception_map = ?, last_synced_at = ? WHERE id = ?",
            (json.dumps(profile.misconception_map, ensure_ascii=False), datetime.now(timezone.utc).isoformat(), profile_id),
        )
        conn.commit()
    return diagnosis

