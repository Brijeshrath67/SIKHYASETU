"""Node 2: summarise delayed teach-back grading."""

from __future__ import annotations

from app.agent.orchestration.state import GraphState
from app.infrastructure.db import get_connection, initialize_db, json_loads


def run(state: GraphState) -> tuple[str, str, dict]:
    initialize_db()
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, concept_id, score, confidence, needs_review, diagnosis, graded_at
            FROM teach_backs WHERE profile_id = ?
            ORDER BY created_at DESC LIMIT 5
            """,
            (state.profile_id,),
        ).fetchall()

    graded = [row for row in rows if row["graded_at"] is not None]
    pending = 0
    results = []
    for row in rows:
        diagnosis = json_loads(row["diagnosis"], {})
        if diagnosis.get("pending"):
            pending += 1
        results.append(
            {
                "teach_back_id": row["id"],
                "concept_id": row["concept_id"],
                "score": row["score"],
                "needs_review": bool(row["needs_review"]),
            }
        )

    summary = f"Reviewed {len(rows)} teach-backs ({pending} awaiting transcription)."
    return "ok", summary, {"teach_backs": results, "pending": pending, "graded": len(graded)}
