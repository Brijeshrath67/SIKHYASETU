from __future__ import annotations

import json

from app.domain.models import TeacherBrief
from app.infrastructure.db import get_connection, initialize_db


def build_teacher_brief(class_name: str = "Class 9 Science") -> TeacherBrief:
    initialize_db()
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT details, COUNT(*) as count FROM events
            WHERE type IN ('probe_answered', 'teachback_recorded')
            GROUP BY details
            ORDER BY count DESC
            LIMIT 5
            """
        ).fetchall()

    counts: dict[str, int] = {}
    for row in rows:
        details = json.loads(row["details"])
        misconception = details.get("misconception") or "unclassified" 
        counts[misconception] = counts.get(misconception, 0) + int(row["count"])

    top_misconceptions = [
        {"label": misconception, "count": count}
        for misconception, count in sorted(counts.items(), key=lambda item: item[1], reverse=True)[:3]
    ]
    if not top_misconceptions:
        top_misconceptions = [{"label": "current gets used up", "count": 2}]

    suggested_prompt = (
        "Ask learners to compare two bulbs and explain where the brightness changes before talking about current being used up."
        if top_misconceptions[0]["label"] == "current gets used up"
        else "Use a counter-example with braking and motion to revisit the object-force idea before the next short practice." 
    )

    return TeacherBrief(
        class_name=class_name,
        top_misconceptions=top_misconceptions,
        suggested_prompt=suggested_prompt,
        learners_needing_follow_up=["Sunita"],
        next_pack_focus=top_misconceptions[0]["label"],
    )

