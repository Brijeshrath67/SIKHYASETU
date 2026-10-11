# Data model notes

## Core loop

```
probe answered ─▶ misconception detected ─▶ intervention ─▶ teach-back
      │                                                        │
      └──────────────▶ Misconception Fingerprint ◀─────────────┘
                              │
                              ▼
                     planner → budget → pack compiler
                              │
                              ▼
                     teacher action brief
```

## Tables (SQLite, PostgreSQL-shaped)

| Table | Purpose |
| --- | --- |
| `profiles` | pseudonymous learner + budget |
| `mastery_states` | the fingerprint per (profile, concept) |
| `events` | idempotent, client-generated activity log |
| `lesson_packs` | signed packs, newest wins per profile |
| `teach_backs` | graded explanations + rubric |
| `agent_runs` | stored agent traces for the observability tab |

No SQLite-only types are used, so a later move to PostgreSQL is a driver swap.

## Numeric discipline

Mastery is a float in `[0,1]` in the *database*, but the *pack* never carries
floats (see `contracts/compatibility/pack-integrity.md`). Keep the two domains
separate: floats are fine in state, never in signed content.
