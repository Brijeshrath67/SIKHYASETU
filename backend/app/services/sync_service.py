from __future__ import annotations

import json
from datetime import datetime, timezone

from app.infrastructure.db import get_connection, initialize_db
from app.services.learner_service import get_profile


def accept_events(events: list[dict]) -> int:
    initialize_db()
    accepted = 0
    for event in events:
        event_id = event.get("id")
        profile_id = event.get("profile_id")
        if not event_id or not profile_id:
            continue
        with get_connection() as conn:
            existing = conn.execute(
                "SELECT 1 FROM events WHERE id = ?",
                (event_id,),
            ).fetchone()
            if existing is not None:
                continue
            conn.execute(
                """
                INSERT INTO events (id, profile_id, type, details, created_at, processed)
                VALUES (?, ?, ?, ?, ?, 1)
                """,
                (
                    event_id,
                    profile_id,
                    event.get("type"),
                    json.dumps(event.get("details", {}), ensure_ascii=False),
                    event.get("created_at") or datetime.now(timezone.utc).isoformat(),
                ),
            )
            conn.commit()
        details = event.get("details", {})
        if details.get("misconception"):
            profile = get_profile(profile_id)
            profile.misconception_map = {
                "concept": details.get("concept") or profile.misconception_map.get("concept") or "Current and Resistance",
                "misconception": details["misconception"],
            }
            with get_connection() as conn:
                conn.execute(
                    "UPDATE profiles SET misconception_map = ? WHERE id = ?",
                    (json.dumps(profile.misconception_map, ensure_ascii=False), profile_id),
                )
                conn.commit()
        accepted += 1
    return accepted

