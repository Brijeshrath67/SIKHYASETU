from __future__ import annotations

import json
from datetime import datetime, timezone

from app.domain.models import CreateLearnerRequest, Profile
from app.infrastructure.db import get_connection, initialize_db, json_dumps, json_loads

DEFAULT_PROFILES = [
    {
        "id": "sunita",
        "name": "Sunita",
        "grade": "Class 9",
        "subject": "Science",
        "language": "Odia",
        "data_budget_mb": 0.8,
        "session_minutes": 25,
        "misconception_map": {"concept": "Current and Resistance", "misconception": "current gets used up"},
    },
    {
        "id": "asha",
        "name": "Asha",
        "grade": "Class 9",
        "subject": "Science",
        "language": "Odia",
        "data_budget_mb": 1.2,
        "session_minutes": 30,
        "misconception_map": {"concept": "Force and Motion", "misconception": "force is contained in the object"},
    },
]


def seed_demo_profiles() -> None:
    initialize_db()
    with get_connection() as conn:
        for profile in DEFAULT_PROFILES:
            row = conn.execute(
                "SELECT 1 FROM profiles WHERE id = ?",
                (profile["id"],),
            ).fetchone()
            if row is not None:
                continue
            conn.execute(
                """
                INSERT INTO profiles (id, name, grade, subject, language, data_budget_mb, session_minutes, misconception_map, last_synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    profile["id"],
                    profile["name"],
                    profile["grade"],
                    profile["subject"],
                    profile["language"],
                    profile["data_budget_mb"],
                    profile["session_minutes"],
                    json_dumps(profile["misconception_map"]),
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
        conn.commit()


def list_profiles() -> list[Profile]:
    initialize_db()
    with get_connection() as conn:
        row_count = conn.execute("SELECT COUNT(*) FROM profiles").fetchone()[0]
        if row_count == 0:
            seed_demo_profiles()
            rows = conn.execute("SELECT * FROM profiles ORDER BY name").fetchall()
        else:
            rows = conn.execute("SELECT * FROM profiles ORDER BY name").fetchall()
    return [
        Profile(
            id=row["id"],
            name=row["name"],
            grade=row["grade"],
            subject=row["subject"],
            language=row["language"],
            data_budget_mb=row["data_budget_mb"],
            session_minutes=row["session_minutes"],
            misconception_map=json_loads(row["misconception_map"]),
            last_synced_at=row["last_synced_at"],
        )
        for row in rows
    ]


def get_profile(profile_id: str) -> Profile:
    initialize_db()
    with get_connection() as conn:
        row_count = conn.execute("SELECT COUNT(*) FROM profiles").fetchone()[0]
        if row_count == 0:
            seed_demo_profiles()
        row = conn.execute("SELECT * FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    if row is None:
        raise KeyError(profile_id)
    return Profile(
        id=row["id"],
        name=row["name"],
        grade=row["grade"],
        subject=row["subject"],
        language=row["language"],
        data_budget_mb=row["data_budget_mb"],
        session_minutes=row["session_minutes"],
        misconception_map=json_loads(row["misconception_map"]),
        last_synced_at=row["last_synced_at"],
    )


def create_profile(payload: CreateLearnerRequest) -> Profile:
    initialize_db()
    profile_id = payload.name.lower().replace(" ", "-")
    profile = Profile(
        id=profile_id,
        name=payload.name,
        grade=payload.grade,
        subject=payload.subject,
        language=payload.language,
        data_budget_mb=payload.data_budget_mb,
        session_minutes=payload.session_minutes,
        misconception_map={},
    )
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO profiles (id, name, grade, subject, language, data_budget_mb, session_minutes, misconception_map, last_synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                profile.id,
                profile.name,
                profile.grade,
                profile.subject,
                profile.language,
                profile.data_budget_mb,
                profile.session_minutes,
                json_dumps(profile.misconception_map),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
    return profile

