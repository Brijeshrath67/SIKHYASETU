"""Graph edges (declarative, for inspection by reviewers).

The MVP graph is a linear pipeline; edges are declared here so the topology is
visible and can be extended with conditional branches later.
"""

from __future__ import annotations

# (from_node, to_node, condition)
EDGES: list[tuple[str, str, str]] = [
    ("event_processor", "teach_back_grader", "always"),
    ("teach_back_grader", "misconception_updater", "always"),
    ("misconception_updater", "planner", "always"),
    ("planner", "budget_optimizer", "always"),
    ("budget_optimizer", "pack_compiler", "always"),
    ("pack_compiler", "teacher_brief_generator", "if include_teacher_brief"),
]

ENTRY_NODE = "event_processor"
TERMINAL_NODES = ["pack_compiler", "teacher_brief_generator"]
