"""Populate a demo state for screenshots and the teacher brief.

Simulates Sunita's wrong probe + teach-back, syncs them through the agent graph,
then prints the resulting teacher brief.

    python backend/scripts/seed_demo_data.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.agent.orchestration.workflow import run_reconnect_workflow  # noqa: E402
from app.domain.models import EventBatchRequest  # noqa: E402
from app.domain.services.learner_service import seed_demo_profiles  # noqa: E402
from app.domain.services.sync_service import accept_events  # noqa: E402
from app.domain.services.teacher_brief_service import build_teacher_brief  # noqa: E402
from app.infrastructure.db import json_dumps, reset_db  # noqa: E402

EVENTS = [
    {
        "id": "demo-e1",
        "profile_id": "sunita",
        "type": "probe_answered",
        "pack_id": "sunita-electric-current",
        "concept_id": "electric-current",
        "details": {"selected_label": "A"},
        "created_at": "2026-01-01T10:00:00+00:00",
    },
    {
        "id": "demo-e2",
        "profile_id": "sunita",
        "type": "teachback_recorded",
        "pack_id": "sunita-electric-current",
        "concept_id": "electric-current",
        "details": {
            "transcript": "Current is used up in the first bulb because it gets consumed.",
        },
        "created_at": "2026-01-01T10:05:00+00:00",
    },
]


def main() -> None:
    reset_db()
    seed_demo_profiles()
    batch = EventBatchRequest.model_validate({"events": EVENTS})
    result = accept_events(batch.events)
    for profile_id in result.affected_profiles:
        run_reconnect_workflow(profile_id, trigger="seed-demo")

    brief = build_teacher_brief()
    print("Demo data seeded.")
    print(json_dumps(brief.model_dump(mode="json")))


if __name__ == "__main__":
    main()
