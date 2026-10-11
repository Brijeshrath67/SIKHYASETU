"""State passed between explicit agent-graph nodes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from app.domain.models import (
    AgentTrace,
    Fingerprint,
    LearningPlan,
    LessonPack,
    Profile,
    TeacherActionBrief,
    TraceNode,
)
from app.domain.services.budget_service import BudgetPlan


@dataclass
class GraphState:
    run_id: str
    profile_id: str
    trigger: str
    profile: Optional[Profile] = None
    recent_events: list[dict] = field(default_factory=list)
    fingerprints: list[Fingerprint] = field(default_factory=list)
    plan: Optional[LearningPlan] = None
    ranked: list = field(default_factory=list)
    budget_plan: Optional[BudgetPlan] = None
    pack: Optional[LessonPack] = None
    brief: Optional[TeacherActionBrief] = None
    nodes: list[TraceNode] = field(default_factory=list)
    decision: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    def add_node(self, name: str, status: str, summary: str, details: dict | None = None) -> None:
        self.nodes.append(
            TraceNode(name=name, status=status, summary=summary, details=details or {})
        )
