"""Time helpers and spaced-revision scheduling."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone


def now() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now().isoformat()


def parse(iso: str | None) -> datetime | None:
    if not iso:
        return None
    try:
        value = datetime.fromisoformat(iso)
    except ValueError:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def days_for_mastery(mastery: float) -> int:
    if mastery < 0.4:
        return 1
    if mastery < 0.7:
        return 2
    return 4


def schedule_review(mastery: float, start: datetime | None = None) -> str:
    base = start or now()
    return (base + timedelta(days=days_for_mastery(mastery))).isoformat()


def is_due(next_review_at: str | None, at: datetime | None = None) -> bool:
    moment = parse(next_review_at)
    if moment is None:
        return True
    return moment <= (at or now())
