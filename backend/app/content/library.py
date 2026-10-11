"""Loads and validates the reviewed curriculum content library.

The library is the single source of truth for concepts, misconception
patterns, probes and interventions. It is deliberately plain structured data
(JSON) so that the same content can be compiled into offline packs and shared
with the deterministic phone tutor.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

CONTENT_DIR = Path(__file__).resolve().parent
DEFAULT_LIBRARY_PATH = CONTENT_DIR / "curriculum" / "class9_science" / "library.json"


class Meta(BaseModel):
    subject: str
    grade: str
    language_primary: str
    language_secondary: str
    version: str
    review_status: str
    review_note: str
    citation: str


class KeyTerm(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    en: str
    odia: str = Field(alias="or")
    gloss_or: str


class ProbeOption(BaseModel):
    label: str
    value_en: str
    value_or: str
    misconception_id: Optional[str] = None


class Probe(BaseModel):
    id: str
    prompt_en: str
    prompt_or: str
    correct_label: str
    difficulty: str
    options: List[ProbeOption]

    def option(self, label: str) -> Optional[ProbeOption]:
        for option in self.options:
            if option.label == label:
                return option
        return None


class Intervention(BaseModel):
    type: str
    title_en: str
    title_or: str
    body_en: str
    body_or: str
    audio_kb: int
    prerequisite_concept_id: Optional[str] = None


class Misconception(BaseModel):
    id: str
    concept_id: str
    label_en: str
    label_or: str
    description_en: str
    description_or: str
    intervention: Intervention
    teacher_prompt_en: str


class Concept(BaseModel):
    id: str
    chapter_id: str
    title_en: str
    title_or: str
    prerequisites: List[str] = Field(default_factory=list)
    misconception_id: Optional[str] = None
    objective_en: str
    objective_or: str
    explanation_en: str
    explanation_or: str
    local_example_or: str
    key_terms: List[KeyTerm] = Field(default_factory=list)
    text_kb: int
    audio_kb: int
    review_status: str
    probes: List[Probe] = Field(default_factory=list)
    teach_back_prompt_en: str
    teach_back_prompt_or: str


class Chapter(BaseModel):
    id: str
    title_en: str
    title_or: str
    concepts: List[str]


class ContentLibrary(BaseModel):
    meta: Meta
    chapters: List[Chapter]
    concepts: List[Concept]
    misconceptions: List[Misconception]

    # -- lookups ---------------------------------------------------------
    def concept(self, concept_id: str) -> Concept:
        for concept in self.concepts:
            if concept.id == concept_id:
                return concept
        raise KeyError(concept_id)

    def concept_or_none(self, concept_id: Optional[str]) -> Optional[Concept]:
        if not concept_id:
            return None
        try:
            return self.concept(concept_id)
        except KeyError:
            return None

    def misconception(self, misconception_id: str) -> Misconception:
        for item in self.misconceptions:
            if item.id == misconception_id:
                return item
        raise KeyError(misconception_id)

    def misconception_or_none(self, misconception_id: Optional[str]) -> Optional[Misconception]:
        if not misconception_id:
            return None
        try:
            return self.misconception(misconception_id)
        except KeyError:
            return None

    def primary_probe(self, concept_id: str) -> Probe:
        concept = self.concept(concept_id)
        if not concept.probes:
            raise KeyError(f"concept {concept_id} has no probes")
        return concept.probes[0]


@lru_cache(maxsize=1)
def load_library(path: str | None = None) -> ContentLibrary:
    library_path = Path(path) if path else DEFAULT_LIBRARY_PATH
    raw = json.loads(library_path.read_text(encoding="utf-8"))
    library = ContentLibrary.model_validate(raw)
    validate_library(library)
    return library


def validate_library(library: ContentLibrary) -> None:
    concept_ids = {concept.id for concept in library.concepts}
    misconception_ids = {item.id for item in library.misconceptions}
    problems: list[str] = []

    for concept in library.concepts:
        for prerequisite in concept.prerequisites:
            if prerequisite not in concept_ids:
                problems.append(f"{concept.id}: unknown prerequisite {prerequisite}")
        if concept.misconception_id and concept.misconception_id not in misconception_ids:
            problems.append(f"{concept.id}: unknown misconception {concept.misconception_id}")
        if not concept.probes:
            problems.append(f"{concept.id}: has no probes")
        for probe in concept.probes:
            labels = {option.label for option in probe.options}
            if probe.correct_label not in labels:
                problems.append(f"{probe.id}: correct_label not present in options")
            for option in probe.options:
                if option.misconception_id and option.misconception_id not in misconception_ids:
                    problems.append(f"{probe.id}: unknown misconception {option.misconception_id}")

    for item in library.misconceptions:
        if item.concept_id not in concept_ids:
            problems.append(f"{item.id}: unknown concept {item.concept_id}")
        prerequisite = item.intervention.prerequisite_concept_id
        if prerequisite and prerequisite not in concept_ids:
            problems.append(f"{item.id}: unknown prerequisite {prerequisite}")

    if problems:
        raise ValueError("Invalid content library:\n- " + "\n- ".join(problems))


def library_summary() -> dict:
    library = load_library()
    return {
        "subject": library.meta.subject,
        "grade": library.meta.grade,
        "version": library.meta.version,
        "review_status": library.meta.review_status,
        "chapters": len(library.chapters),
        "concepts": len(library.concepts),
        "misconceptions": len(library.misconceptions),
        "probes": sum(len(concept.probes) for concept in library.concepts),
    }
