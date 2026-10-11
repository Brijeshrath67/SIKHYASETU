# Shared contracts

Single source of truth for the shapes that cross the phone ⇄ server boundary.
The Pydantic models in `backend/app/domain/models.py` and the TypeScript types in
`frontend/src/shared/types/` are both derived from these contracts.

## Layout

```
contracts/
  models/        JSON Schema (2020-12) for each domain object
  api/           OpenAPI 3.1 fragments for each endpoint group
  compatibility/ pack integrity + version matrix
```

## Models

| File | Object |
| --- | --- |
| `models/learner-profile.json` | `Profile` |
| `models/learner-event.json` | `EventRecord` |
| `models/probe-question.json` | `Probe` |
| `models/intervention-card.json` | `Intervention` |
| `models/lesson-pack.json` | `LessonPack` (+ concepts, budget, provenance, integrity) |
| `models/mastery-state.json` | mastery row for a concept |
| `models/misconception-fingerprint.json` | `Fingerprint` |
| `models/teach-back-grading.json` | `TeachBackGrade` |
| `models/teacher-action-brief.json` | `TeacherActionBrief` |
| `models/learning-plan.json` | `LearningPlan` |
| `models/agent-trace.json` | `AgentTrace` |

## Invariants

- **Packs contain no floating point numbers.** Both runtimes must produce an
  identical canonical JSON string for the checksum to match.
- **Events are idempotent** on `id`.
- **Pseudonymous ids only**; see `schemas/privacy`.
- **Every pack is signed.** See `compatibility/pack-integrity.md`.

## Validating

`scripts/ci/validate-contracts.sh` checks every `*.json` under `models/`,
`schemas/` and `frontend/src/shared/content/` parses and, for packs, that its
integrity checksum verifies.
