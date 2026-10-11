"""Misconception Fingerprint: structured, explainable per-concept learner state."""

from __future__ import annotations

from typing import Optional

from app.content.library import load_library
from app.domain.models import Fingerprint, FingerprintStatus, RecommendedIntervention
from app.domain.services import clock, misconception_service
from app.infrastructure.db import get_connection, initialize_db, json_dumps, json_loads

BASE_MASTERY = 0.30
MASTERED_THRESHOLD = 0.80


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, round(value, 3)))


def mastery_after_probe(current: float, correct: bool) -> float:
    if correct:
        return _clamp(current + 0.30)
    return _clamp(max(0.05, current - 0.10))


def mastery_after_teachback(current: float, score: float) -> float:
    return _clamp(current + (score - 0.5) * 0.5)


def status_for(
    mastery: float,
    misconception_id: Optional[str],
    needs_review: bool,
) -> FingerprintStatus:
    if needs_review:
        return "needs_review"
    if mastery >= MASTERED_THRESHOLD:
        return "mastered"
    if misconception_id and mastery < 0.5:
        return "unresolved"
    if mastery >= 0.6:
        return "review"
    return "repairing"


def _row_to_fingerprint(row) -> Fingerprint:
    concept_title_or = row["concept_id"]
    library = load_library()
    concept = library.concept_or_none(row["concept_id"])
    if concept is not None:
        concept_title_or = concept.title_or
    label_en, label_or = misconception_service.misconception_labels(row["misconception_id"])
    return Fingerprint(
        profile_id=row["profile_id"],
        concept_id=row["concept_id"],
        concept_title_or=concept_title_or,
        mastery=row["mastery"],
        status=row["status"],
        misconception_id=row["misconception_id"],
        misconception_label_en=label_en,
        misconception_label_or=label_or,
        confidence=row["confidence"],
        evidence=json_loads(row["evidence"], []),
        recommended_intervention=misconception_service.intervention_for(row["misconception_id"]),
        next_review_at=row["next_review_at"],
        updated_at=row["updated_at"],
    )


def get_fingerprint(profile_id: str, concept_id: str) -> Optional[Fingerprint]:
    initialize_db()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM mastery_states WHERE profile_id = ? AND concept_id = ?",
            (profile_id, concept_id),
        ).fetchone()
    return _row_to_fingerprint(row) if row else None


def list_fingerprints(profile_id: str) -> list[Fingerprint]:
    initialize_db()
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM mastery_states WHERE profile_id = ? ORDER BY updated_at DESC",
            (profile_id,),
        ).fetchall()
    return [_row_to_fingerprint(row) for row in rows]


def _current_mastery(profile_id: str, concept_id: str) -> float:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT mastery FROM mastery_states WHERE profile_id = ? AND concept_id = ?",
            (profile_id, concept_id),
        ).fetchone()
    return row["mastery"] if row else BASE_MASTERY


def _write(
    profile_id: str,
    concept_id: str,
    *,
    mastery: float,
    misconception_id: Optional[str],
    confidence: float,
    evidence: list[str],
    needs_review: bool = False,
) -> Fingerprint:
    status = status_for(mastery, misconception_id, needs_review)
    next_review = clock.schedule_review(mastery)
    updated_at = clock.now_iso()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO mastery_states (
                profile_id, concept_id, mastery, status, misconception_id,
                confidence, evidence, next_review_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(profile_id, concept_id) DO UPDATE SET
                mastery = excluded.mastery,
                status = excluded.status,
                misconception_id = excluded.misconception_id,
                confidence = excluded.confidence,
                evidence = excluded.evidence,
                next_review_at = excluded.next_review_at,
                updated_at = excluded.updated_at
            """,
            (
                profile_id,
                concept_id,
                mastery,
                status,
                misconception_id,
                round(confidence, 3),
                json_dumps(evidence),
                next_review,
                updated_at,
            ),
        )
        conn.commit()
    fingerprint = get_fingerprint(profile_id, concept_id)
    assert fingerprint is not None
    return fingerprint


def record_probe(
    profile_id: str,
    concept_id: str,
    *,
    correct: bool,
    misconception_id: Optional[str],
    evidence: list[str],
    confidence: float,
) -> Fingerprint:
    current = _current_mastery(profile_id, concept_id)
    mastery = mastery_after_probe(current, correct)
    effective_misconception = None if correct else misconception_id
    merged_evidence = evidence
    existing = get_fingerprint(profile_id, concept_id)
    if existing and existing.evidence:
        merged_evidence = existing.evidence[-3:] + evidence
    return _write(
        profile_id,
        concept_id,
        mastery=mastery,
        misconception_id=effective_misconception,
        confidence=confidence,
        evidence=merged_evidence,
    )


def record_teachback(
    profile_id: str,
    concept_id: str,
    *,
    score: float,
    misconception_id: Optional[str],
    confidence: float,
    evidence: list[str],
    needs_review: bool,
) -> Fingerprint:
    current = _current_mastery(profile_id, concept_id)
    mastery = mastery_after_teachback(current, score)
    # A low-confidence grade keeps the previous label rather than inventing one.
    existing = get_fingerprint(profile_id, concept_id)
    if needs_review and existing:
        misconception_id = existing.misconception_id
    return _write(
        profile_id,
        concept_id,
        mastery=mastery,
        misconception_id=misconception_id,
        confidence=confidence,
        evidence=(existing.evidence[-2:] if existing else []) + evidence,
        needs_review=needs_review,
    )


def apply_intervention_viewed(profile_id: str, concept_id: str) -> Fingerprint:
    current = _current_mastery(profile_id, concept_id)
    return _write(
        profile_id,
        concept_id,
        mastery=_clamp(current + 0.05),
        misconception_id=(get_fingerprint(profile_id, concept_id) or Fingerprint(
            profile_id=profile_id,
            concept_id=concept_id,
            concept_title_or=concept_id,
            mastery=current,
            status="repairing",
        )).misconception_id,
        confidence=0.5,
        evidence=["Reviewed a targeted intervention."],
    )
