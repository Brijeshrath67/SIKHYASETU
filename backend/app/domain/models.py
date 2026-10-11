"""Domain and API models for SikhyaSetu.

These models are the shared contract between the FastAPI backend, the explicit
agent graph, and the offline PWA. Packs are deliberately free of floating point
numbers so that both Python and JavaScript can compute an identical canonical
JSON representation for integrity checks.
"""

from __future__ import annotations

from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field

# --------------------------------------------------------------------------- #
# Learners
# --------------------------------------------------------------------------- #


class Profile(BaseModel):
    id: str
    name: str
    grade: str = "Class 9"
    subject: str = "Science"
    language: str = "Odia"
    data_budget_mb: float = 0.8
    session_minutes: int = 25
    consent_identification: bool = False
    last_synced_at: Optional[str] = None


class CreateLearnerRequest(BaseModel):
    name: str
    grade: str = "Class 9"
    subject: str = "Science"
    language: str = "Odia"
    data_budget_mb: float = 0.8
    session_minutes: int = 25
    consent_identification: bool = False


# --------------------------------------------------------------------------- #
# Lesson pack
# --------------------------------------------------------------------------- #


class KeyTermOut(BaseModel):
    en: str
    term_or: str
    gloss_or: str


class ProbeOptionOut(BaseModel):
    label: str
    value_en: str
    value_or: str
    misconception_id: Optional[str] = None


class ProbeOut(BaseModel):
    probe_id: str
    concept_id: str
    prompt_en: str
    prompt_or: str
    correct_label: str
    difficulty: str
    misconception_id: Optional[str] = None
    options: List[ProbeOptionOut]


class InterventionOut(BaseModel):
    misconception_id: str
    type: str
    title_en: str
    title_or: str
    body_en: str
    body_or: str
    prerequisite_concept_id: Optional[str] = None


class AudioRef(BaseModel):
    available: bool
    kb: int


class PackConcept(BaseModel):
    concept_id: str
    title_en: str
    title_or: str
    objective_en: str
    objective_or: str
    explanation_en: str
    explanation_or: str
    local_example_or: str
    key_terms: List[KeyTermOut] = Field(default_factory=list)
    audio: AudioRef
    probe: ProbeOut
    intervention: Optional[InterventionOut] = None
    teach_back_prompt_en: str
    teach_back_prompt_or: str


class PackBudget(BaseModel):
    data_budget_kb: int
    session_minutes: int
    estimated_kb: int
    estimated_minutes: int
    fits: bool
    audio_included: bool
    decisions: List[str] = Field(default_factory=list)


class PackProvenance(BaseModel):
    source: Literal["cloud", "seed", "fallback"] = "cloud"
    fallback: bool = False
    notes: List[str] = Field(default_factory=list)


class PackIntegrity(BaseModel):
    algorithm: str = "sha256"
    checksum: str


class LessonPack(BaseModel):
    pack_id: str
    pack_version: str = "1.0.0"
    profile_id: str
    generated_at: str
    primary_language: str = "Odia"
    secondary_language: str = "English"
    reading_level: str = "Class 9"
    objectives: List[str] = Field(default_factory=list)
    concepts: List[PackConcept] = Field(default_factory=list)
    budget: PackBudget
    provenance: PackProvenance = Field(default_factory=PackProvenance)
    integrity: PackIntegrity
    trace: List[str] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Events and sync
# --------------------------------------------------------------------------- #


EventType = Literal[
    "session_started",
    "probe_answered",
    "intervention_viewed",
    "teachback_recorded",
    "pack_completed",
    "sync_succeeded",
    "sync_failed",
]


class EventRecord(BaseModel):
    id: str
    profile_id: str
    type: EventType
    pack_id: Optional[str] = None
    concept_id: Optional[str] = None
    details: dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[str] = None


class EventBatchRequest(BaseModel):
    events: List[EventRecord]


# --------------------------------------------------------------------------- #
# Misconception fingerprint and mastery
# --------------------------------------------------------------------------- #


FingerprintStatus = Literal["unresolved", "repairing", "review", "mastered", "needs_review"]


class RecommendedIntervention(BaseModel):
    type: str
    title_en: str
    title_or: str
    body_en: str
    body_or: str


class Fingerprint(BaseModel):
    profile_id: str
    concept_id: str
    concept_title_or: str
    mastery: float
    status: FingerprintStatus
    misconception_id: Optional[str] = None
    misconception_label_en: Optional[str] = None
    misconception_label_or: Optional[str] = None
    confidence: float = 0.0
    evidence: List[str] = Field(default_factory=list)
    recommended_intervention: Optional[RecommendedIntervention] = None
    next_review_at: Optional[str] = None
    updated_at: Optional[str] = None


class TeachBackRequest(BaseModel):
    concept_id: str
    transcript: str
    audio_ref: Optional[str] = None
    mistaken: bool = False


class RubricCriterion(BaseModel):
    id: str
    met: bool
    note: str


class TeachBackGrade(BaseModel):
    profile_id: str
    concept_id: str
    transcript: str
    score: float
    rubric: List[RubricCriterion] = Field(default_factory=list)
    misconception_id: Optional[str] = None
    confidence: float = 0.0
    needs_review: bool = False
    feedback_or: str = ""
    next_review_at: Optional[str] = None
    fingerprint: Optional[Fingerprint] = None


# --------------------------------------------------------------------------- #
# Teacher action brief
# --------------------------------------------------------------------------- #


class MisconceptionCluster(BaseModel):
    misconception_id: Optional[str] = None
    label_en: str
    label_or: str
    concept_id: Optional[str] = None
    affected_learners: int
    bucket: str


class BriefIntervention(BaseModel):
    misconception_id: Optional[str] = None
    prompt_en: str
    prompt_or: str


class NextPackFocus(BaseModel):
    profile_id: str
    concept_id: str
    concept_title_or: str
    reason: str


class TeacherActionBrief(BaseModel):
    class_name: str
    generated_at: str
    totals: dict[str, int]
    top_misconceptions: List[MisconceptionCluster]
    suggested_intervention: Optional[BriefIntervention] = None
    learners_needing_follow_up: List[str] = Field(default_factory=list)
    next_pack_focus: List[NextPackFocus] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Agent trace
# --------------------------------------------------------------------------- #


class TraceNode(BaseModel):
    name: str
    status: Literal["ok", "skipped", "fallback", "error"]
    summary: str
    details: dict[str, Any] = Field(default_factory=dict)


class AgentTrace(BaseModel):
    run_id: str
    profile_id: str
    trigger: str
    started_at: str
    finished_at: Optional[str] = None
    nodes: List[TraceNode] = Field(default_factory=list)
    decision: dict[str, Any] = Field(default_factory=dict)


class SyncResult(BaseModel):
    accepted: int
    duplicates: int
    rejected: int
    event_ids: List[str] = Field(default_factory=list)
    affected_profiles: List[str] = Field(default_factory=list)
    runs: List[AgentTrace] = Field(default_factory=list)
    next_pack_ids: dict[str, str] = Field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Planning
# --------------------------------------------------------------------------- #


class PlanStep(BaseModel):
    concept_id: str
    concept_title_or: str
    reason: str
    priority: int


class LearningPlan(BaseModel):
    profile_id: str
    generated_at: str
    unresolved: List[Fingerprint] = Field(default_factory=list)
    steps: List[PlanStep] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)
