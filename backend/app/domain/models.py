from __future__ import annotations

from typing import Any, List, Literal

from pydantic import BaseModel, Field


class Profile(BaseModel):
    id: str
    name: str
    grade: str
    subject: str = "Science"
    language: str = "Odia"
    data_budget_mb: float = 0.8
    session_minutes: int = 25
    misconception_map: dict[str, str] = Field(default_factory=dict)
    last_synced_at: str | None = None


class ProbeOption(BaseModel):
    label: str
    value: str
    misconception: str | None = None


class LessonPack(BaseModel):
    pack_id: str
    profile_id: str
    concept: str
    title: str
    objective: str
    explanation: str
    probe_question: str
    options: list[ProbeOption]
    correct_answer: str
    misconception: str
    intervention: str
    teach_back_prompt: str
    budget_kb: int
    completion_minutes: int
    signature: str
    trace: list[str] = Field(default_factory=list)


class EventRecord(BaseModel):
    id: str
    profile_id: str
    type: Literal[
        "session_started",
        "probe_answered",
        "intervention_viewed",
        "teachback_recorded",
        "pack_completed",
        "sync_succeeded",
        "sync_failed",
    ]
    details: dict[str, Any] = Field(default_factory=dict)
    created_at: str | None = None


class EventBatchRequest(BaseModel):
    events: list[EventRecord]


class CreateLearnerRequest(BaseModel):
    name: str
    grade: str = "Class 9"
    subject: str = "Science"
    language: str = "Odia"
    data_budget_mb: float = 0.8
    session_minutes: int = 25


class TeacherBrief(BaseModel):
    class_name: str = "Class 9 Science"
    top_misconceptions: list[dict[str, Any]]
    suggested_prompt: str
    learners_needing_follow_up: list[str]
    next_pack_focus: str


class DiagnosisResult(BaseModel):
    concept: str
    misconception: str
    confidence: float
    evidence: list[str]
    intervention: str
    next_review: str
