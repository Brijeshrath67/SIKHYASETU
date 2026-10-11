"""Unit tests for deterministic domain services."""

from __future__ import annotations

from app.domain.services import clock, integrity, mastery_service


def test_canonical_json_is_key_order_independent() -> None:
    left = {"b": 1, "a": {"y": 2, "x": [3, 4]}}
    right = {"a": {"x": [3, 4], "y": 2}, "b": 1}
    assert integrity.canonical_json(left) == integrity.canonical_json(right)


def test_checksum_ignores_integrity_field() -> None:
    pack = {"pack_id": "p", "objectives": ["a"], "integrity": {"algorithm": "sha256", "checksum": "x"}}
    without = {"pack_id": "p", "objectives": ["a"]}
    assert integrity.checksum(pack) == integrity.checksum(without)


def test_verify_round_trips() -> None:
    pack = {"pack_id": "p", "budget": {"estimated_kb": 10}}
    pack["integrity"] = {"algorithm": "sha256", "checksum": integrity.checksum(pack)}
    assert integrity.verify(pack) is True


def test_mastery_after_probe_moves_in_expected_direction() -> None:
    assert mastery_service.mastery_after_probe(0.5, correct=True) == 0.8
    assert mastery_service.mastery_after_probe(0.5, correct=False) == 0.4
    # Never drops below the 0.05 floor even from a low base.
    assert mastery_service.mastery_after_probe(0.05, correct=False) == 0.05


def test_mastery_after_teachback_centers_on_half() -> None:
    assert mastery_service.mastery_after_teachback(0.4, 0.5) == 0.4
    assert mastery_service.mastery_after_teachback(0.4, 1.0) == 0.65
    assert mastery_service.mastery_after_teachback(0.4, 0.0) == 0.15


def test_status_priority() -> None:
    assert mastery_service.status_for(0.9, None, False) == "mastered"
    assert mastery_service.status_for(0.3, "current-gets-used-up", False) == "unresolved"
    assert mastery_service.status_for(0.65, None, False) == "review"
    assert mastery_service.status_for(0.9, None, True) == "needs_review"


def test_schedule_review_widens_with_mastery() -> None:
    assert clock.days_for_mastery(0.2) == 1
    assert clock.days_for_mastery(0.5) == 2
    assert clock.days_for_mastery(0.9) == 4
