"""End-to-end API tests: the offline → sync → agent → teacher-brief loop."""

from __future__ import annotations

from app.domain.services import integrity


def _event(event_id: str, event_type: str, concept_id: str, **details):
    return {
        "id": event_id,
        "profile_id": "sunita",
        "type": event_type,
        "pack_id": "sunita-electric-current",
        "concept_id": concept_id,
        "details": details,
        "created_at": "2026-01-01T10:00:00+00:00",
    }


def test_health_reports_content_summary(client) -> None:
    payload = client.get("/health").json()
    assert payload["status"] == "ok"
    assert payload["content"]["concepts"] == 12
    assert payload["content"]["misconceptions"] == 9


def test_learners_are_seeded(client) -> None:
    learners = client.get("/api/v1/learners").json()
    ids = {learner["id"] for learner in learners}
    assert {"sunita", "asha"} <= ids


def test_next_pack_is_signed_without_floats(client) -> None:
    pack = client.get("/api/v1/lesson-packs/sunita/next").json()
    assert pack["pack_id"] == "sunita-electric-current"
    assert pack["concepts"], "pack must include at least one concept"
    assert pack["integrity"]["checksum"] == integrity.checksum(pack)
    # Packs use integer minor units so canonical JSON stays byte-stable.
    assert isinstance(pack["budget"]["estimated_kb"], int)


def test_sync_is_idempotent_and_updates_fingerprint(client) -> None:
    events = [
        _event("e1", "probe_answered", "electric-current", selected_label="A"),
        _event(
            "e2",
            "teachback_recorded",
            "electric-current",
            transcript="Current is used up in the first bulb because it gets consumed.",
        ),
    ]
    first = client.post("/api/v1/events/sync", json={"events": events}).json()
    assert first["accepted"] == 2
    assert first["duplicates"] == 0
    assert "sunita" in first["affected_profiles"]
    assert first["next_pack_ids"]["sunita"] == "sunita-electric-current"

    second = client.post("/api/v1/events/sync", json={"events": events}).json()
    assert second["accepted"] == 0
    assert second["duplicates"] == 2

    fingerprints = client.get("/api/v1/learners/sunita/fingerprints").json()
    assert fingerprints, "a fingerprint must be written after sync"
    fingerprint = fingerprints[0]
    assert fingerprint["misconception_id"] == "current-gets-used-up"
    assert 0.0 < fingerprint["mastery"] < 1.0
    assert fingerprint["next_review_at"]


def test_teach_back_grading_is_deterministic(client) -> None:
    payload = {
        "concept_id": "heating-effect",
        "transcript": "The wire gets hot because energy is converted to heat; current is conserved.",
    }
    first = client.post("/api/v1/teach-back/sunita", json=payload).json()
    second = client.post("/api/v1/teach-back/sunita", json=payload).json()
    assert first["score"] == second["score"]
    assert first["needs_review"] is False
    assert {criterion["id"] for criterion in first["rubric"]} == {
        "mentions_concept",
        "explains_mechanism",
        "uses_local_example",
        "avoids_misconception",
    }


def test_short_teach_back_is_flagged_for_review(client) -> None:
    grade = client.post(
        "/api/v1/teach-back/sunita",
        json={"concept_id": "electric-current", "transcript": "hmm"},
    ).json()
    assert grade["needs_review"] is True
    assert grade["confidence"] < 0.5


def test_teacher_brief_clusters_misconceptions(client) -> None:
    client.post(
        "/api/v1/events/sync",
        json={
            "events": [
                _event("e1", "probe_answered", "electric-current", selected_label="A"),
            ]
        },
    )
    brief = client.get("/api/v1/teacher-brief").json()
    assert brief["top_misconceptions"]
    top = brief["top_misconceptions"][0]
    assert top["misconception_id"] == "current-gets-used-up"
    assert top["affected_learners"] >= 1
    assert "Sunita" in brief["learners_needing_follow_up"]


def test_agent_trace_lists_all_nodes(client) -> None:
    trace = client.get("/api/v1/planning/sunita/trace").json()
    names = [node["name"] for node in trace["nodes"]]
    assert names == [
        "event_processor",
        "teach_back_grader",
        "misconception_updater",
        "planner",
        "budget_optimizer",
        "pack_compiler",
        "teacher_brief_generator",
    ]
    assert all(node["status"] in {"ok", "skipped", "fallback"} for node in trace["nodes"])


def test_probe_endpoint_matches_pack(client) -> None:
    probe = client.get("/api/v1/probes/electric-current").json()
    pack = client.get("/api/v1/lesson-packs/sunita/next").json()
    assert probe["probe_id"] == pack["concepts"][0]["probe"]["probe_id"]


def test_integrity_verify_rejects_tampering(client) -> None:
    pack = client.get("/api/v1/lesson-packs/sunita/next").json()
    original = integrity.checksum(pack)
    pack["objectives"] = ["tampered"]
    assert integrity.verify(pack) is False
    assert integrity.checksum(pack) != original
