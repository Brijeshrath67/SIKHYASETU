"""Maps a learner's answer to a likely misconception and builds interventions."""

from __future__ import annotations

from typing import Optional

from app.content.library import load_library
from app.domain.models import RecommendedIntervention


class ProbeDiagnosis:
    def __init__(
        self,
        concept_id: str,
        correct: bool,
        misconception_id: Optional[str],
        evidence: list[str],
        confidence: float,
    ) -> None:
        self.concept_id = concept_id
        self.correct = correct
        self.misconception_id = misconception_id
        self.evidence = evidence
        self.confidence = confidence


def diagnose_probe(concept_id: str, selected_label: str) -> ProbeDiagnosis:
    """Map a selected probe option to a misconception.

    A distractor that is explicitly linked to a misconception produces a
    confident diagnosis. A correct answer clears the misconception. An
    unlinked distractor falls back to the concept's headline misconception.
    """
    library = load_library()
    concept = library.concept(concept_id)
    probe = library.primary_probe(concept_id)

    if selected_label == probe.correct_label:
        return ProbeDiagnosis(
            concept_id=concept_id,
            correct=True,
            misconception_id=None,
            evidence=[f"Selected correct option {selected_label} for {concept.title_en}."],
            confidence=0.85,
        )

    option = probe.option(selected_label)
    evidence: list[str] = []
    misconception_id: Optional[str] = concept.misconception_id
    confidence = 0.55

    if option is not None and option.misconception_id:
        misconception_id = option.misconception_id
        confidence = 0.82
        evidence.append(
            f"Selected distractor {selected_label}: \"{option.value_en}\""
        )
    elif option is not None:
        evidence.append(f"Selected distractor {selected_label} with no direct misconception link.")

    if misconception_id:
        item = library.misconception_or_none(misconception_id)
        if item is not None:
            evidence.append(f"Distractor pattern matches: {item.label_en}")
    else:
        evidence.append("Answer pattern too weak for a confident misconception label.")

    return ProbeDiagnosis(
        concept_id=concept_id,
        correct=False,
        misconception_id=misconception_id,
        evidence=evidence,
        confidence=confidence,
    )


def intervention_for(misconception_id: Optional[str]) -> Optional[RecommendedIntervention]:
    library = load_library()
    item = library.misconception_or_none(misconception_id)
    if item is None:
        return None
    return RecommendedIntervention(
        type=item.intervention.type,
        title_en=item.intervention.title_en,
        title_or=item.intervention.title_or,
        body_en=item.intervention.body_en,
        body_or=item.intervention.body_or,
    )


def misconception_labels(misconception_id: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    library = load_library()
    item = library.misconception_or_none(misconception_id)
    if item is None:
        return None, None
    return item.label_en, item.label_or
