# Agent workflow

The proposal allows "LangGraph **or an equivalent explicit graph**". SikhyaSetu
implements a small, explicit, dependency-free graph so every decision is
observable and the whole thing stays free to run.

## Nodes (in order)

| # | Node | Responsibility |
| --- | --- | --- |
| 1 | `event_processor` | validate + fold the synced event batch |
| 2 | `teach_back_grader` | re-grade teach-backs with the rubric |
| 3 | `misconception_updater` | update fingerprints / mastery |
| 4 | `planner` | rank the next concepts to repair |
| 5 | `budget_optimizer` | choose content under data/time budget |
| 6 | `pack_compiler` | assemble + **sign** the lesson pack |
| 7 | `teacher_brief_generator` | aggregate the class brief |

Flow:

```
event_processor → teach_back_grader → misconception_updater
   → planner → budget_optimizer → pack_compiler → teacher_brief_generator
```

## Guarantees

- **Observable.** Every node appends a trace `{name, status, summary, details}`
  and the run is stored in `agent_runs`. The PWA "Agent trace" tab renders it.
- **Honest on failure.** A node that throws is recorded with `status: "error"`
  and surfaced — never swallowed.
- **Fallback content.** If compilation fails, the graph serves a reviewed
  fallback pack rather than leaving the learner with nothing.
- **Skippable brief.** `include_teacher_brief=False` marks node 7 `skipped`
  (useful for a single-learner run).

## Determinism

Nodes call pure domain services:

- grading: rule-based rubric over a misconception lexicon + mechanism cues
- mastery: `+0.30` correct / `-0.10` wrong on probe; `+(score-0.5)*0.5` on
  teach-back; clamp `[0,1]`; mastered at `≥ 0.80`
- review: `+1d / +2d / +4d` by mastery band
- budget: 11 min/concept, 3 min teach-back, 3 min audio, 1 KB probe overhead

No randomness, no model call: the same input yields the same plan and pack.

## Entry points

```python
run_reconnect_workflow(profile_id, trigger="sync")  # → (GraphState, AgentTrace)
```

Called by `POST /api/v1/events/sync` once per affected learner, and by
`POST /api/v1/planning/{id}/run`.
