from __future__ import annotations

import json
from datetime import datetime, timezone

from app.domain.models import LessonPack, ProbeOption
from app.infrastructure.db import get_connection, initialize_db
from app.services.learner_service import get_profile

CONCEPT_LIBRARY = {
    "Force and Motion": {
        "concept": "Force and Motion",
        "misconception": "force is contained in the object",
        "objective": "Explain why a moving bicycle slows when brakes act on it.",
        "explanation": "A force is an interaction between objects, not a thing stored inside the bicycle. When the brakes act, friction opposes motion and slows the rider.",
        "probe_question": "A bicycle moves forward. Which statement best explains why it slows when the brakes are applied?",
        "options": [
            {"label": "A", "value": "The bicycle is using up its stored force.", "misconception": "force is contained in the object"},
            {"label": "B", "value": "Friction from the brakes acts against the motion.", "misconception": None},
            {"label": "C", "value": "The rider stops pushing the bicycle.", "misconception": "motion is maintained only by pushing"},
        ],
        "correct_answer": "B",
        "intervention": "Counter-example: a bicycle slows even when the rider keeps pedalling. Friction and braking force are external interactions, not an internal fuel.",
        "teach_back_prompt": "Explain in Odia why the bicycle slows down when the brakes are applied.",
        "budget_kb": 260,
        "completion_minutes": 12,
        "trace": ["event received", "diagnosis mapped", "budget checked", "pack compiled"],
    },
    "Current and Resistance": {
        "concept": "Current and Resistance",
        "misconception": "current gets used up",
        "objective": "Differentiate current flow from energy consumption in a simple circuit.",
        "explanation": "Current is the flow of charge around a loop. In a series circuit, the same current passes through each component; brightness changes because the total resistance changes.",
        "probe_question": "Two bulbs are connected in series. What happens to the current when one bulb is removed?",
        "options": [
            {"label": "A", "value": "The current gets used up in the first bulb.", "misconception": "current gets used up"},
            {"label": "B", "value": "The current is the same through the loop, but the circuit changes.", "misconception": None},
            {"label": "C", "value": "The battery stops making current after the first bulb.", "misconception": "battery runs out of current"},
        ],
        "correct_answer": "B",
        "intervention": "Use the two-bulb comparison prompt: ask learners to explain where the brightness changes and whether current is created or used up.",
        "teach_back_prompt": "Describe in your own words why the brightness changes when another bulb is added to the circuit.",
        "budget_kb": 290,
        "completion_minutes": 15,
        "trace": ["event received", "diagnosis mapped", "budget checked", "pack compiled"],
    },
    "Water Cycle and Rainfall": {
        "concept": "Water Cycle and Rainfall",
        "misconception": "rainfall is made by clouds squeezing water out of the sky",
        "objective": "Recognise how evaporation, condensation, and precipitation relate in the water cycle.",
        "explanation": "Water evaporates from surfaces, rises, condenses in cooler air, and falls as rain. Clouds are not containers that hold water in a fixed amount.",
        "probe_question": "Which statement best describes why clouds produce rain?",
        "options": [
            {"label": "A", "value": "Clouds collect rain and pour it out when full.", "misconception": "clouds store rain like a tank"},
            {"label": "B", "value": "Water vapour condenses and droplets grow until they fall as rain.", "misconception": None},
            {"label": "C", "value": "The air makes rain without any water moving through the cycle.", "misconception": "rain appears without evaporation"},
        ],
        "correct_answer": "B",
        "intervention": "Use a simple evaporation-condensation sequence with a paddy field and cooler air to show that rainfall depends on the cycle.",
        "teach_back_prompt": "Explain how a water droplet can move from the field to a cloud and back to the ground.",
        "budget_kb": 230,
        "completion_minutes": 11,
        "trace": ["event received", "diagnosis mapped", "budget checked", "pack compiled"],
    },
}


def seed_demo_lesson_packs() -> None:
    for profile in ("sunita", "asha"):
        try:
            build_pack(profile)
        except KeyError:
            continue


def _concept_for_profile(profile_id: str) -> dict:
    profile = get_profile(profile_id)
    concept_name = profile.misconception_map.get("concept") if profile.misconception_map else None
    if concept_name in CONCEPT_LIBRARY:
        return CONCEPT_LIBRARY[concept_name]
    target = profile.id if profile.id == "asha" else "Current and Resistance"
    return CONCEPT_LIBRARY.get(target, next(iter(CONCEPT_LIBRARY.values())))


def build_pack(profile_id: str) -> LessonPack:
    initialize_db()
    profile = get_profile(profile_id)
    concept = _concept_for_profile(profile_id)
    pack = LessonPack(
        pack_id=f"{profile_id}-{concept['concept'].lower().replace(' ', '-')}",
        profile_id=profile_id,
        concept=concept["concept"],
        title=f"{concept['concept']} repair pack",
        objective=concept["objective"],
        explanation=concept["explanation"],
        probe_question=concept["probe_question"],
        options=[ProbeOption(**option) for option in concept["options"]],
        correct_answer=concept["correct_answer"],
        misconception=concept["misconception"],
        intervention=concept["intervention"],
        teach_back_prompt=concept["teach_back_prompt"],
        budget_kb=concept["budget_kb"],
        completion_minutes=concept["completion_minutes"],
        signature=f"sig-{profile_id}-{concept['concept']}",
        trace=concept["trace"],
    )
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT pack_id FROM lesson_packs WHERE pack_id = ?",
            (pack.pack_id,),
        ).fetchone()
        if existing is None:
            conn.execute(
                """
                INSERT INTO lesson_packs (
                    pack_id, profile_id, concept, title, objective, explanation,
                    probe_question, options, correct_answer, misconception,
                    intervention, teach_back_prompt, budget_kb, completion_minutes, signature, trace
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    pack.pack_id,
                    pack.profile_id,
                    pack.concept,
                    pack.title,
                    pack.objective,
                    pack.explanation,
                    pack.probe_question,
                    json.dumps([option.model_dump(mode="json") for option in pack.options], ensure_ascii=False),
                    pack.correct_answer,
                    pack.misconception,
                    pack.intervention,
                    pack.teach_back_prompt,
                    pack.budget_kb,
                    pack.completion_minutes,
                    pack.signature,
                    json.dumps(pack.trace, ensure_ascii=False),
                ),
            )
            conn.commit()
    return pack


def compile_planning_trace(profile_id: str) -> dict:
    profile = get_profile(profile_id)
    pack = build_pack(profile_id)
    return {
        "profile_id": profile.id,
        "event_received": "session_started",
        "diagnosis": profile.misconception_map,
        "plan": {
            "concept": pack.concept,
            "time_budget_minutes": profile.session_minutes,
            "data_budget_mb": profile.data_budget_mb,
            "budget_kb": pack.budget_kb,
        },
        "compile": {
            "objective": pack.objective,
            "pack_id": pack.pack_id,
            "recommended_intervention": pack.intervention,
        },
    }

