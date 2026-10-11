# Monorepo structure

```
backend/     FastAPI service: domain services, explicit agent graph, SQLite IO
frontend/    React + TS PWA: Dexie store, offline tutor, UI
shared/      versioned contracts, schemas, privacy conventions
docs/        architecture, product, security
scripts/     environment / ci / release / ops helpers
```

## Backend

```
backend/app/
  main.py                     FastAPI app + lifespan seeding
  config.py                   paths, env, batch size
  domain/
    models.py                 the shared Pydantic contracts
    services/                 integrity, clock, learner, mastery, grading,
                              budget, planning, pack compiler, sync, brief
  agent/orchestration/        graph.py, workflow.py, nodes/*
  api/v1/                     routers (learners, lesson-packs, events, …)
  infrastructure/db.py        SQLite schema + helpers
  content/
    library.py                loader + validation
    curriculum/class9_science/library.json
  tests/                      api + unit + integration
```

## Frontend

```
frontend/src/
  app/                        App shell, providers, layout
  features/
    learner/                  profile gate
    lessons/                  the offline lesson flow
    teacher/                  action brief (+ on-device estimate)
    sync/                     SyncProvider, SyncPanel, AgentTracePanel
  shared/
    types/                    mirror of the contracts
    services/
      dexie/                  schema + repositories (IndexedDB)
      integrity/canonical.ts  canonical JSON + sha256 (mirrors Python)
      api/                    fetch client
      sync/                   outbox synchronizer
    lib/offline/              deterministic tutor, audio capture
    content/seed-packs.json   signed packs bundled for offline demo
```

## Boundaries

- `domain/` and `agent/` never import FastAPI or the framework.
- The PWA never imports server code; it re-implements the small deterministic
  rules it needs and verifies packs cryptographically.
- `shared/contracts` is the single source of truth for cross-boundary shapes.
