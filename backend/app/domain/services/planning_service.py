"""Planner: choose the next concepts from evidence and constraints.

Ordering of priorities:
1. unresolved misconception repair (lowest mastery / needs review first)
2. prerequisite for the top repair (if not yet mastered)
3. spaced revision that is due
4. a sensible default focus for a brand new learner
"""

from __future__ import annotations

from typing import Optional

from app.content.library import Concept, load_library
from app.domain.models import LearningPlan, PlanStep
from app.domain.services import clock, mastery_service
from app.domain.services.mastery_service import MASTERED_THRESHOLD

# Focus concept used for a learner with no recorded evidence yet. Chosen to
# match the demo script: Sunita repairs "current gets used up", Asha repairs
# "force is contained in the object".
DEFAULT_FOCUS: dict[str, str] = {
    "sunita": "electric-current",
    "asha": "force-as-interaction",
}


def _default_focus(profile_id: str) -> str:
    library = load_library()
    if profile_id in DEFAULT_FOCUS:
        return DEFAULT_FOCUS[profile_id]
    return library.misconceptions[0].concept_id


def _step(concept: Concept, reason: str, priority: int) -> PlanStep:
    return PlanStep(
        concept_id=concept.id,
        concept_title_or=concept.title_or,
        reason=reason,
        priority=priority,
    )


def ranked_concepts(profile_id: str) -> list[tuple[Concept, str, int]]:
    library = load_library()
    fingerprints = {fp.concept_id: fp for fp in mastery_service.list_fingerprints(profile_id)}
    ranked: list[PlanStep] = []
    seen: set[str] = set()

    def add(concept_id: str, reason: str, priority: int) -> None:
        if concept_id in seen:
            return
        concept = library.concept_or_none(concept_id)
        if concept is None:
            return
        seen.add(concept_id)
        ranked.append(_step(concept, reason, priority))

    unresolved = sorted(
        (
            fp
            for fp in fingerprints.values()
            if fp.status in ("unresolved", "needs_review") and fp.mastery < MASTERED_THRESHOLD
        ),
        key=lambda fp: fp.mastery,
    )
    for fp in unresolved:
        label = fp.misconception_label_en or "an unresolved idea"
        add(fp.concept_id, f"Repair the misconception: {label}", 1)
        concept = library.concept_or_none(fp.concept_id)
        if concept:
            for prerequisite in concept.prerequisites:
                prereq_fp = fingerprints.get(prerequisite)
                if prereq_fp is None or prereq_fp.mastery < MASTERED_THRESHOLD:
                    add(prerequisite, f"Prerequisite for {concept.title_en}", 2)

    due_reviews = sorted(
        (
            fp
            for fp in fingerprints.values()
            if fp.status == "review" and clock.is_due(fp.next_review_at)
        ),
        key=lambda fp: fp.next_review_at or "",
    )
    for fp in due_reviews:
        add(fp.concept_id, "Spaced revision is due", 3)

    if not ranked:
        focus = _default_focus(profile_id)
        reason = "First session: diagnose the priority misconception"
        add(focus, reason, 1)
        concept = library.concept_or_none(focus)
        if concept:
            for prerequisite in concept.prerequisites:
                add(prerequisite, f"Prerequisite for {concept.title_en}", 2)

    return [(library.concept(step.concept_id), step.reason, step.priority) for step in ranked]


def build_plan(profile_id: str, limit: int = 4) -> LearningPlan:
    ranked = ranked_concepts(profile_id)[:limit]
    return LearningPlan(
        profile_id=profile_id,
        generated_at=clock.now_iso(),
        unresolved=[
            fp
            for fp in mastery_service.list_fingerprints(profile_id)
            if fp.status in ("unresolved", "needs_review")
        ],
        steps=[_step(concept, reason, priority) for concept, reason, priority in ranked],
        notes=["Priority 1 repairs an unresolved misconception; later steps add prerequisites and revision."],
    )


def next_focus(profile_id: str) -> Optional[PlanStep]:
    ranked = ranked_concepts(profile_id)
    if not ranked:
        return None
    concept, reason, priority = ranked[0]
    return _step(concept, reason, priority)
