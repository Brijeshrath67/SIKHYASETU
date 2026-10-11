# Backend

FastAPI service that grades teach-backs, tracks misconception fingerprints,
compiles signed lesson packs, and builds the teacher action brief. Persistence
is SQLite via the standard library (PostgreSQL-shaped schema).

## Run

```sh
# from the repo root
python3 -m uvicorn app.main:app --reload --app-dir backend
# → http://localhost:8000/health, docs at /docs
```

The app seeds demo learners and their first packs on startup. No API keys, no
external services.

## Layout

```
app/
  main.py                     FastAPI app + lifespan seeding
  domain/models.py            shared Pydantic contracts
  domain/services/            integrity, mastery, grading, budget, planning,
                              pack compiler, sync, teacher brief
  agent/orchestration/        explicit graph (graph.py, workflow.py, nodes/)
  api/v1/                     routers
  infrastructure/db.py        SQLite schema + helpers
  content/                    curriculum library + loader
  tests/                      test_api.py, unit/, integration/
```

## Key behaviours

- **Packs are signed** (`sha256` over canonical JSON, no floats). The PWA
  verifies them before use.
- **Sync is idempotent** on the client event id.
- **The agent graph is explicit and traced**; a failed node is recorded, and a
  fallback pack is served rather than leaving the learner empty.

## Tests

```sh
python3 -m pytest app/tests -q
```

## Scripts

```sh
python3 backend/scripts/bootstrap_db.py --reset
python3 backend/scripts/seed_demo_data.py
python3 backend/scripts/export_pack.py         # writes the PWA seed bundle
python3 backend/scripts/validate_pack.py       # verifies pack integrity
```
