"""Learner profile persistence and demo seeding."""

from __future__ import annotations

from typing import Optional

from app.domain.models import CreateLearnerRequest, Profile
from app.domain.services import clock
from app.infrastructure.db import get_connection, initialize_db

DEFAULT_PROFILES = [
    {
        "id": "sunita",
        "name": "Sunita",
        "grade": "Class 9",
        "subject": "Science",
        "language": "Odia",
        "data_budget_mb": 0.8,
        "session_minutes": 25,
        "consent_identification": 1,
    },
    {
        "id": "asha",
        "name": "Asha",
        "grade": "Class 9",
        "subject": "Science",
        "language": "Odia",
        "data_budget_mb": 1.2,
        "session_minutes": 30,
        "consent_identification": 0,
    },
]


def _row_to_profile(row) -> Profile:
    return Profile(
        id=row["id"],
        name=row["name"],
        grade=row["grade"],
        subject=row["subject"],
        language=row["language"],
        data_budget_mb=row["data_budget_mb"],
        session_minutes=row["session_minutes"],
        consent_identification=bool(row["consent_identification"]),
        last_synced_at=row["last_synced_at"],
    )


def ensure_seeded() -> None:
    initialize_db()
    with get_connection() as conn:
        count = conn.execute("SELECT COUNT(*) FROM profiles").fetchone()[0]
    if count == 0:
        seed_demo_profiles()


def seed_demo_profiles() -> None:
    initialize_db()
    with get_connection() as conn:
        for profile in DEFAULT_PROFILES:
            exists = conn.execute(
                "SELECT 1 FROM profiles WHERE id = ?", (profile["id"],)
            ).fetchone()
            if exists is not None:
                continue
            conn.execute(
                """
                INSERT INTO profiles (
                    id, name, grade, subject, language, data_budget_mb,
                    session_minutes, consent_identification, last_synced_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    profile["id"],
                    profile["name"],
                    profile["grade"],
                    profile["subject"],
                    profile["language"],
                    profile["data_budget_mb"],
                    profile["session_minutes"],
                    profile["consent_identification"],
                    None,
                ),
            )
        conn.commit()


def list_profiles() -> list[Profile]:
    ensure_seeded()
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM profiles ORDER BY name").fetchall()
    return [_row_to_profile(row) for row in rows]


def get_profile(profile_id: str) -> Profile:
    ensure_seeded()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM profiles WHERE id = ?", (profile_id,)
        ).fetchone()
    if row is None:
        raise KeyError(profile_id)
    return _row_to_profile(row)


def create_profile(payload: CreateLearnerRequest) -> Profile:
    ensure_seeded()
    profile_id = _slug(payload.name)
    with get_connection() as conn:
        exists = conn.execute(
            "SELECT 1 FROM profiles WHERE id = ?", (profile_id,)
        ).fetchone()
        if exists is not None:
            raise ValueError(f"profile '{profile_id}' already exists")
        conn.execute(
            """
            INSERT INTO profiles (
                id, name, grade, subject, language, data_budget_mb,
                session_minutes, consent_identification, last_synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                profile_id,
                payload.name,
                payload.grade,
                payload.subject,
                payload.language,
                payload.data_budget_mb,
                payload.session_minutes,
                int(payload.consent_identification),
                None,
            ),
        )
        conn.commit()
    return get_profile(profile_id)


def touch_sync(profile_id: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE profiles SET last_synced_at = ? WHERE id = ?",
            (clock.now_iso(), profile_id),
        )
        conn.commit()


def _slug(name: str) -> str:
    cleaned = "".join(ch if ch.isalnum() else "-" for ch in name.strip().lower())
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-") or "learner"
