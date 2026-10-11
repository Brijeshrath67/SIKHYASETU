"""Teacher Action Brief: aggregates evidence into a five-minute classroom action."""

from __future__ import annotations

from collections import defaultdict
from typing import Optional

from app.content.library import load_library
from app.domain.models import (
    BriefIntervention,
    MisconceptionCluster,
    NextPackFocus,
    TeacherActionBrief,
)
from app.domain.services import clock, mastery_service, planning_service
from app.domain.services.learner_service import list_profiles
from app.infrastructure.db import get_connection, initialize_db


def _bucket(count: int) -> str:
    if count <= 1:
        return "1 learner"
    if count <= 3:
        return "2-3 learners"
    if count <= 9:
        return "4-9 learners"
    return "10+ learners"


def build_teacher_brief(class_name: str = "Class 9 Science") -> TeacherActionBrief:
    initialize_db()
    library = load_library()
    profiles = list_profiles()

    cluster_learners: dict[str, set[str]] = defaultdict(set)
    cluster_concept: dict[str, str] = {}
    for profile in profiles:
        for fingerprint in mastery_service.list_fingerprints(profile.id):
            if fingerprint.status in ("unresolved", "needs_review") and fingerprint.misconception_id:
                cluster_learners[fingerprint.misconception_id].add(profile.id)
                cluster_concept[fingerprint.misconception_id] = fingerprint.concept_id

    clusters: list[MisconceptionCluster] = []
    for misconception_id, learners in sorted(
        cluster_learners.items(), key=lambda item: len(item[1]), reverse=True
    )[:3]:
        item = library.misconception_or_none(misconception_id)
        clusters.append(
            MisconceptionCluster(
                misconception_id=misconception_id,
                label_en=item.label_en if item else misconception_id,
                label_or=item.label_or if item else misconception_id,
                concept_id=cluster_concept.get(misconception_id),
                affected_learners=len(learners),
                bucket=_bucket(len(learners)),
            )
        )

    with get_connection() as conn:
        event_count = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        teachback_count = conn.execute("SELECT COUNT(*) FROM teach_backs").fetchone()[0]

    suggested: Optional[BriefIntervention] = None
    if clusters:
        top = clusters[0]
        item = library.misconception_or_none(top.misconception_id)
        if item is not None:
            suggested = BriefIntervention(
                misconception_id=top.misconception_id,
                prompt_en=item.teacher_prompt_en,
                prompt_or=f"{item.intervention.title_or} ବ୍ୟବହାର କରି ଶ୍ରେଣୀରେ ବୁଝାଅ।",
            )

    focus: list[NextPackFocus] = []
    for profile in profiles:
        step = planning_service.next_focus(profile.id)
        if step is not None:
            focus.append(
                NextPackFocus(
                    profile_id=profile.id,
                    concept_id=step.concept_id,
                    concept_title_or=step.concept_title_or,
                    reason=step.reason,
                )
            )

    learners_needing_follow_up = [
        profile.name
        for profile in profiles
        if profile.consent_identification
        and any(
            fp.status in ("unresolved", "needs_review")
            for fp in mastery_service.list_fingerprints(profile.id)
        )
    ]

    return TeacherActionBrief(
        class_name=class_name,
        generated_at=clock.now_iso(),
        totals={
            "learners": len(profiles),
            "events": int(event_count),
            "teach_backs": int(teachback_count),
            "misconception_clusters": len(clusters),
        },
        top_misconceptions=clusters,
        suggested_intervention=suggested,
        learners_needing_follow_up=learners_needing_follow_up,
        next_pack_focus=focus,
    )


def seed_brief() -> str:
    """Utility for scripts: return the current brief as JSON text."""
    import json

    return json.dumps(build_teacher_brief().model_dump(mode="json"), ensure_ascii=False)


__all__ = ["build_teacher_brief", "seed_brief"]
