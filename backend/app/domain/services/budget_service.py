"""Learning-per-MB Compiler: choose the highest-value content under a budget.

Given a learner's available data (MB) and session window (minutes), the
optimiser selects which concepts and which audio assets are worth sending. It
records a human-readable decision list so the demo can show the trade-off
rather than a hidden heuristic.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from app.content.library import Concept
from app.domain.models import PackBudget, Profile

MINUTES_PER_CONCEPT = 11
TEACHBACK_MINUTES = 3
PROBE_OVERHEAD_KB = 1
AUDIO_MINUTES = 3


@dataclass
class BudgetPlan:
    concept_ids: list[str] = field(default_factory=list)
    audio_included: bool = False
    data_used_kb: int = 0
    minutes_used: int = 0
    fits: bool = True
    decisions: list[str] = field(default_factory=list)
    deferred: list[dict] = field(default_factory=list)
    headline: str = ""


def optimize(
    profile: Profile,
    ranked: list[tuple[Concept, str, int]],
) -> BudgetPlan:
    data_budget_kb = int(round(profile.data_budget_mb * 1024))
    time_budget = profile.session_minutes
    plan = BudgetPlan()
    plan.headline = (
        f"We had {profile.data_budget_mb:.1f} MB (~{data_budget_kb} KB) "
        f"and {time_budget} minutes."
    )

    data_used = 0
    minutes_used = TEACHBACK_MINUTES
    plan.decisions.append(f"Reserved {TEACHBACK_MINUTES} minutes for the teach-back step.")

    primary: Optional[Concept] = None
    for concept, reason, _priority in ranked:
        essential_kb = concept.text_kb + PROBE_OVERHEAD_KB
        if not plan.concept_ids and (
            data_used + essential_kb > data_budget_kb
            or minutes_used + MINUTES_PER_CONCEPT > time_budget
        ):
            # The single most valuable concept is always included to protect the
            # repair loop; mark the pack as over-budget rather than dropping it.
            plan.concept_ids.append(concept.id)
            data_used += essential_kb
            minutes_used += MINUTES_PER_CONCEPT
            plan.fits = False
            plan.decisions.append(
                f"Forced text-first repair for {concept.title_en} ({reason}) even though it exceeds the budget."
            )
            primary = concept
            break

        if data_used + essential_kb <= data_budget_kb and minutes_used + MINUTES_PER_CONCEPT <= time_budget:
            plan.concept_ids.append(concept.id)
            data_used += essential_kb
            minutes_used += MINUTES_PER_CONCEPT
            plan.decisions.append(
                f"Included {concept.title_en} ({reason}) text-first: {essential_kb} KB, {MINUTES_PER_CONCEPT} min."
            )
            if primary is None:
                primary = concept
        else:
            needed_kb = data_used + essential_kb
            plan.deferred.append({"concept_id": concept.id, "reason": reason, "kb": essential_kb})
            plan.decisions.append(
                f"Deferred {concept.title_en}: needs {needed_kb} KB which exceeds the {data_budget_kb} KB budget."
            )
            break

    if primary is not None:
        audio_kb = primary.audio_kb
        if (
            data_used + audio_kb <= data_budget_kb
            and minutes_used + AUDIO_MINUTES <= time_budget
        ):
            plan.audio_included = True
            data_used += audio_kb
            minutes_used += AUDIO_MINUTES
            plan.decisions.append(
                f"Included reviewed Odia audio for {primary.title_en}: {audio_kb} KB, {AUDIO_MINUTES} min."
            )
        else:
            plan.deferred.append({"concept_id": primary.id, "reason": "optional-audio", "kb": audio_kb})
            plan.decisions.append(
                f"Deferred optional Odia audio for {primary.title_en} ({audio_kb} KB) to protect the data budget."
            )

    plan.data_used_kb = data_used
    plan.minutes_used = minutes_used
    return plan


def to_pack_budget(plan: BudgetPlan, profile: Profile) -> PackBudget:
    return PackBudget(
        data_budget_kb=int(round(profile.data_budget_mb * 1024)),
        session_minutes=profile.session_minutes,
        estimated_kb=plan.data_used_kb,
        estimated_minutes=plan.minutes_used,
        fits=plan.fits,
        audio_included=plan.audio_included,
        decisions=plan.decisions,
    )
