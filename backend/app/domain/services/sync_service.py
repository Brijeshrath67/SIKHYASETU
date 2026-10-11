"""Idempotent event ingestion and evidence application.

Every event carries a client-generated unique id. Re-uploading the same batch
(which happens whenever a sync is interrupted and retried) cannot create a
duplicate and cannot re-apply side effects, because the id is the primary key
and side effects are only run for newly inserted rows.
"""

from __future__ import annotations

from typing import Any

from app.domain.models import EventRecord, SyncResult
from app.domain.services import clock, grading_service, learner_service, mastery_service, misconception_service
from app.infrastructure.db import get_connection, initialize_db, json_dumps, json_loads


def _apply_side_effects(event: EventRecord) -> None:
    details: dict[str, Any] = event.details or {}
    concept_id = event.concept_id or details.get("concept_id")
    if not concept_id:
        return

    if event.type == "probe_answered":
        selected_label = details.get("selected_label")
        if selected_label:
            diagnosis = misconception_service.diagnose_probe(concept_id, str(selected_label))
            mastery_service.record_probe(
                event.profile_id,
                concept_id,
                correct=diagnosis.correct,
                misconception_id=diagnosis.misconception_id,
                evidence=diagnosis.evidence,
                confidence=diagnosis.confidence,
            )
        elif details.get("misconception_id") or details.get("correct") is not None:
            correct = bool(details.get("correct"))
            mastery_service.record_probe(
                event.profile_id,
                concept_id,
                correct=correct,
                misconception_id=None if correct else details.get("misconception_id"),
                evidence=["Probe result applied from queued event."],
                confidence=0.7,
            )

    elif event.type == "intervention_viewed":
        mastery_service.apply_intervention_viewed(event.profile_id, concept_id)

    elif event.type == "teachback_recorded":
        transcript = str(details.get("transcript") or "").strip()
        if transcript:
            grade = grading_service.grade_teach_back(event.profile_id, concept_id, transcript)
            _store_teachback(event, concept_id, transcript, grade, details.get("audio_ref"))
        else:
            _store_pending_teachback(event, concept_id, details.get("audio_ref"))


def _store_teachback(event, concept_id, transcript, grade, audio_ref) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO teach_backs (
                id, profile_id, concept_id, transcript, audio_ref, diagnosis,
                score, confidence, needs_review, created_at, graded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event.id,
                event.profile_id,
                concept_id,
                transcript,
                audio_ref,
                json_dumps(grade.model_dump(mode="json")),
                grade.score,
                grade.confidence,
                int(grade.needs_review),
                event.created_at or clock.now_iso(),
                clock.now_iso(),
            ),
        )
        conn.commit()


def _store_pending_teachback(event, concept_id, audio_ref) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO teach_backs (
                id, profile_id, concept_id, transcript, audio_ref, diagnosis,
                score, confidence, needs_review, created_at, graded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event.id,
                event.profile_id,
                concept_id,
                "",
                audio_ref,
                json_dumps({"pending": True, "note": "Audio queued for later transcription."}),
                0.0,
                0.0,
                1,
                event.created_at or clock.now_iso(),
                None,
            ),
        )
        conn.commit()


def accept_events(events: list[EventRecord]) -> SyncResult:
    initialize_db()
    accepted = duplicates = rejected = 0
    ids: list[str] = []
    affected: list[str] = []

    for event in events:
        if not event.id or not event.profile_id or not event.type:
            rejected += 1
            continue
        try:
            learner_service.get_profile(event.profile_id)
        except KeyError:
            rejected += 1
            continue

        with get_connection() as conn:
            existing = conn.execute("SELECT 1 FROM events WHERE id = ?", (event.id,)).fetchone()
            if existing is not None:
                duplicates += 1
                continue
            conn.execute(
                """
                INSERT INTO events (id, profile_id, type, pack_id, concept_id, details, created_at, processed)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                """,
                (
                    event.id,
                    event.profile_id,
                    event.type,
                    event.pack_id,
                    event.concept_id,
                    json_dumps(event.details or {}),
                    event.created_at or clock.now_iso(),
                ),
            )
            conn.commit()

        _apply_side_effects(event)
        accepted += 1
        ids.append(event.id)
        if event.profile_id not in affected:
            affected.append(event.profile_id)

    for profile_id in affected:
        learner_service.touch_sync(profile_id)

    return SyncResult(
        accepted=accepted,
        duplicates=duplicates,
        rejected=rejected,
        event_ids=ids,
        affected_profiles=affected,
    )


def recent_events(profile_id: str | None = None, limit: int = 50) -> list[dict]:
    initialize_db()
    with get_connection() as conn:
        if profile_id:
            rows = conn.execute(
                "SELECT * FROM events WHERE profile_id = ? ORDER BY created_at DESC LIMIT ?",
                (profile_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM events ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
    return [
        {
            "id": row["id"],
            "profile_id": row["profile_id"],
            "type": row["type"],
            "pack_id": row["pack_id"],
            "concept_id": row["concept_id"],
            "details": json_loads(row["details"], {}),
            "created_at": row["created_at"],
        }
        for row in rows
    ]
