"""Pack Compiler: turn a plan + budget decision into a signed offline pack."""

from __future__ import annotations

from typing import Optional

from app.content.library import Concept, load_library
from app.domain.models import (
    AudioRef,
    InterventionOut,
    KeyTermOut,
    LessonPack,
    PackBudget,
    PackConcept,
    PackIntegrity,
    PackProvenance,
    ProbeOptionOut,
    ProbeOut,
)
from app.domain.services import budget_service, clock, integrity, misconception_service, planning_service
from app.infrastructure.db import get_connection, initialize_db, json_dumps, json_loads

PACK_VERSION = "1.0.0"


def probe_out(concept: Concept) -> ProbeOut:
    probe = load_library().primary_probe(concept.id)
    return ProbeOut(
        probe_id=probe.id,
        concept_id=concept.id,
        prompt_en=probe.prompt_en,
        prompt_or=probe.prompt_or,
        correct_label=probe.correct_label,
        difficulty=probe.difficulty,
        misconception_id=concept.misconception_id,
        options=[
            ProbeOptionOut(
                label=option.label,
                value_en=option.value_en,
                value_or=option.value_or,
                misconception_id=option.misconception_id,
            )
            for option in probe.options
        ],
    )


def _intervention_out(concept: Concept) -> Optional[InterventionOut]:
    item = misconception_service.intervention_for(concept.misconception_id)
    if item is None or concept.misconception_id is None:
        return None
    return InterventionOut(
        misconception_id=concept.misconception_id,
        type=item.type,
        title_en=item.title_en,
        title_or=item.title_or,
        body_en=item.body_en,
        body_or=item.body_or,
        prerequisite_concept_id=load_library()
        .misconception(concept.misconception_id)
        .intervention.prerequisite_concept_id,
    )


def _pack_concept(concept: Concept, *, audio: bool) -> PackConcept:
    return PackConcept(
        concept_id=concept.id,
        title_en=concept.title_en,
        title_or=concept.title_or,
        objective_en=concept.objective_en,
        objective_or=concept.objective_or,
        explanation_en=concept.explanation_en,
        explanation_or=concept.explanation_or,
        local_example_or=concept.local_example_or,
        key_terms=[KeyTermOut(en=term.en, term_or=term.odia, gloss_or=term.gloss_or) for term in concept.key_terms],
        audio=AudioRef(available=audio, kb=concept.audio_kb),
        probe=probe_out(concept),
        intervention=_intervention_out(concept),
        teach_back_prompt_en=concept.teach_back_prompt_en,
        teach_back_prompt_or=concept.teach_back_prompt_or,
    )


def compile_pack(
    profile_id: str,
    profile,
    *,
    ranked: Optional[list[tuple[Concept, str, int]]] = None,
    trace: Optional[list[str]] = None,
    provenance_source: str = "cloud",
    fallback: bool = False,
) -> LessonPack:
    library = load_library()
    ranked = ranked or planning_service.ranked_concepts(profile_id)
    plan = budget_service.optimize(profile, ranked)

    if not plan.concept_ids:
        # Safety net: always ship at least one concept so the offline loop works.
        fallback_id = ranked[0][0].id if ranked else library.concepts[0].id
        plan.concept_ids = [fallback_id]
        plan.decisions.append(f"Forced {fallback_id} to guarantee a usable pack.")

    pack_budget = budget_service.to_pack_budget(plan, profile)
    primary_id = plan.concept_ids[0]
    concepts = [
        _pack_concept(library.concept(concept_id), audio=(plan.audio_included and index == 0))
        for index, concept_id in enumerate(plan.concept_ids)
    ]

    objectives = [library.concept(concept_id).objective_en for concept_id in plan.concept_ids]
    provenance_notes = [plan.headline, *plan.decisions]
    if fallback:
        provenance_notes.insert(0, "Seeded fallback pack (no live compilation available).")

    pack = LessonPack(
        pack_id=f"{profile_id}-{primary_id}",
        pack_version=PACK_VERSION,
        profile_id=profile_id,
        generated_at=clock.now_iso(),
        objectives=objectives,
        concepts=concepts,
        budget=pack_budget,
        provenance=PackProvenance(source=provenance_source, fallback=fallback, notes=provenance_notes),
        integrity=PackIntegrity(checksum="pending"),
        trace=trace or [],
    )

    data = pack.model_dump(mode="json")
    data["integrity"] = {"algorithm": "sha256", "checksum": integrity.checksum(data)}
    pack = LessonPack.model_validate(data)
    _store_pack(pack)
    return pack


def _store_pack(pack: LessonPack) -> None:
    initialize_db()
    payload = pack.model_dump(mode="json")
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO lesson_packs (
                pack_id, profile_id, pack_version, generated_at, concept_ids, payload, checksum
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(pack_id) DO UPDATE SET
                pack_version = excluded.pack_version,
                generated_at = excluded.generated_at,
                concept_ids = excluded.concept_ids,
                payload = excluded.payload,
                checksum = excluded.checksum
            """,
            (
                pack.pack_id,
                pack.profile_id,
                pack.pack_version,
                pack.generated_at,
                json_dumps([concept.concept_id for concept in pack.concepts]),
                json_dumps(payload),
                pack.integrity.checksum,
            ),
        )
        conn.commit()


def get_next_pack(profile_id: str, profile) -> LessonPack:
    """Return the compiled next pack, compiling it when none exists yet."""
    stored = get_stored_pack(profile_id)
    if stored is not None:
        return stored
    return compile_pack(profile_id, profile)


def get_stored_pack(profile_id: str) -> Optional[LessonPack]:
    initialize_db()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT payload FROM lesson_packs WHERE profile_id = ? ORDER BY generated_at DESC LIMIT 1",
            (profile_id,),
        ).fetchone()
    if row is None:
        return None
    return LessonPack.model_validate(json_loads(row["payload"]))


def get_pack_by_id(pack_id: str) -> Optional[LessonPack]:
    initialize_db()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT payload FROM lesson_packs WHERE pack_id = ?", (pack_id,)
        ).fetchone()
    if row is None:
        return None
    return LessonPack.model_validate(json_loads(row["payload"]))


def store_seed_pack(pack: LessonPack) -> None:
    _store_pack(pack)


def seed_initial_packs() -> None:
    """Compile a first pack for every profile that has none yet."""
    from app.domain.services.learner_service import list_profiles

    for profile in list_profiles():
        if get_stored_pack(profile.id) is None:
            compile_pack(
                profile.id,
                profile,
                trace=["server start: initial pack compiled"],
                provenance_source="cloud",
            )
