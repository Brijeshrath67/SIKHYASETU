"""Deterministic teach-back grading against a rubric.

The phone records a teach-back offline; when connectivity returns the cloud
grades it. This grader is intentionally deterministic and inspectable rather
than a large language model, which keeps the prototype free, auditable and
reliable when a provider is unavailable. It is a rule-based rubric over the
transcript; a real deployment would add an on-device or cloud STT + model pass
behind the same interface.
"""

from __future__ import annotations

from typing import Optional

from app.content.library import load_library
from app.domain.models import RubricCriterion, TeachBackGrade
from app.domain.services import clock, mastery_service

# Tell-tale phrases (Odia + English) that indicate a specific misconception.
MISCONCEPTION_LEXICON: dict[str, list[str]] = {
    "force-is-stored": [
        "stored force", "internal force", "contains force", "ran out of force",
        "ଭିତରେ ବଳ", "ବଳ ସରି", "ବଳ ରହିଛି",
    ],
    "motion-needs-continuous-force": [
        "needs a push", "needs push", "keep pushing", "stops when i stop",
        "ଠେଲିବା ଆବଶ୍ୟକ", "ଠେଲୁ ରହିବ", "ବନ୍ଦ କଲେ ଅଟିଯାଏ",
    ],
    "friction-always-bad": [
        "friction is bad", "friction is harmful", "remove all friction",
        "ଘର୍ଷଣ ଖରାପ", "ଘର୍ଷଣ ହାନିକାରକ",
    ],
    "action-reaction-cancel": [
        "cancel", "cancel out", "they cancel", "ବାତିଲ", "ପରସ୍ପରକୁ ବାତିଲ",
    ],
    "current-gets-used-up": [
        "used up", "consumed", "gets consumed", "runs out of current",
        "ବ୍ୟବହାର ହୋଇଯାଏ", "ସରିଯାଏ", "ଖର୍ଚ୍ଚ ହୋଇଯାଏ",
    ],
    "current-not-shared-parallel": [
        "same current in each branch", "does not divide", "not divided",
        "ଭାଗ ହୁଏ ନାହିଁ", "ସମାନ ପ୍ରବାହ ପ୍ରତ୍ୟେକ ଶାଖାରେ",
    ],
    "resistance-blocks-all": [
        "blocks all", "stops all current", "no current flows", "stops the current",
        "ସମ୍ପୂର୍ଣ୍ଣ ବନ୍ଦ", "ପ୍ରବାହ ବନ୍ଦ", "କୌଣସି ପ୍ରବାହ ନାହିଁ",
    ],
    "resistance-grows-with-current": [
        "resistance increases with current", "more current more resistance",
        "resistance grows", "ରୋଧ ବଢ଼େ", "ଅଧିକ ପ୍ରବାହ ଅଧିକ ରୋଧ",
    ],
    "heat-is-consumed-current": [
        "current is burned", "current turns into heat", "current consumed as heat",
        "ପ୍ରବାହ ଜଳି", "ପ୍ରବାହ ବ୍ୟବହାର ହୋଇ ତାପ",
    ],
}

MECHANISM_CUES = [
    "କାରଣ", "ତେଣୁ", "ହେତୁ", "ଫଳରେ", "ଯୋଗୁଁ",
    "because", "therefore", "since", "due to", "causes", "results in", "so that",
]

EXAMPLE_NOUNS = [
    "ସାଇକେଲ", "ବଲ୍ବ", "ତାର", "ପାଣି", "ନଦୀ", "ପାଦ", "ବଜାର", "ଭୂମି", "ଘର", "ପେଡାଲ", "ବସ୍",
    "bicycle", "bulb", "wire", "water", "river", "foot", "market", "ground", "home", "pedal", "bus",
]


def detect_misconception(transcript: str) -> Optional[str]:
    lowered = transcript.lower()
    best: Optional[str] = None
    best_hits = 0
    for misconception_id, phrases in MISCONCEPTION_LEXICON.items():
        hits = sum(1 for phrase in phrases if phrase.lower() in lowered)
        if hits > best_hits:
            best = misconception_id
            best_hits = hits
    return best


def _criterion(identifier: str, met: bool, note: str) -> RubricCriterion:
    return RubricCriterion(id=identifier, met=met, note=note)


def grade_teach_back(profile_id: str, concept_id: str, transcript: str) -> TeachBackGrade:
    library = load_library()
    concept = library.concept(concept_id)
    text = transcript.strip()
    lowered = text.lower()
    word_count = len(text.split())

    key_terms = [term.en.lower() for term in concept.key_terms] + [
        term.odia for term in concept.key_terms
    ]
    mentions_concept = any(term.lower() in lowered for term in key_terms) or (
        concept.title_en.split()[0].lower() in lowered
    )
    explains_mechanism = any(cue.lower() in lowered for cue in MECHANISM_CUES)
    uses_example = any(noun.lower() in lowered for noun in EXAMPLE_NOUNS)

    detected = detect_misconception(text)
    head_misconception = concept.misconception_id
    avoids_misconception = detected is None

    rubric = [
        _criterion(
            "mentions_concept",
            mentions_concept,
            "Names the concept or a key term." if mentions_concept else "Concept not named.",
        ),
        _criterion(
            "explains_mechanism",
            explains_mechanism,
            "Gives a cause-and-effect explanation." if explains_mechanism else "No causal link given.",
        ),
        _criterion(
            "uses_local_example",
            uses_example,
            "Uses a familiar local example." if uses_example else "No local example used.",
        ),
        _criterion(
            "avoids_misconception",
            avoids_misconception,
            "No misconception language detected." if avoids_misconception
            else "A misconception phrase was detected.",
        ),
    ]
    score = round(sum(1 for item in rubric if item.met) / len(rubric), 3)

    needs_review = word_count < 4 or (not mentions_concept and not explains_mechanism)
    misconception_id = detected or (head_misconception if score < 0.5 else None)

    if needs_review:
        confidence = 0.3
        feedback = "ଉତ୍ତର ଛୋଟ ଅଛି। ଦୟାକରି ଅଧିକ ବୁଝାଇ କୁହ। (Answer too short to grade confidently.)"
    elif score >= 0.75:
        confidence = 0.85
        feedback = "ଭଲ ବ୍ୟାଖ୍ୟା! ଧାରଣା ସ୍ପଷ୍ଟ ହେଉଛି। (Good explanation — the idea is clear.)"
    elif score >= 0.5:
        confidence = 0.7
        feedback = "ଆଉ ଟିକେ ଗଭୀର କର। କାରଣ ଓ ଉଦାହରଣ ଯୋଡ଼। (Add more cause and example.)"
    else:
        confidence = 0.6
        feedback = "ଆଉ ଥରେ ଚେଷ୍ଟା କର; ଗୋଟିଏ ଉଦାହରଣ ସହ ବୁଝାଅ। (Try again with one example.)"

    fingerprint = mastery_service.record_teachback(
        profile_id,
        concept_id,
        score=score,
        misconception_id=misconception_id,
        confidence=confidence,
        evidence=[f"Teach-back rubric score {score:.2f}.", feedback],
        needs_review=needs_review,
    )

    return TeachBackGrade(
        profile_id=profile_id,
        concept_id=concept_id,
        transcript=text,
        score=score,
        rubric=rubric,
        misconception_id=misconception_id,
        confidence=confidence,
        needs_review=needs_review,
        feedback_or=feedback,
        next_review_at=clock.schedule_review(fingerprint.mastery),
        fingerprint=fingerprint,
    )
