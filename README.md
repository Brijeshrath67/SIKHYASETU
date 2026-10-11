# SikhyaSetu

Offline-first, AI-assisted tutoring for Odia-medium learners. SikhyaSetu finds
the **misconception behind a wrong answer**, repairs it on the device, and turns
the day's evidence into a **teacher action brief** — with no paid model or API
in the loop.

The whole learner loop runs with the radio off: the "intelligence" is authored
content plus deterministic, inspectable rules, shipped as **signed** lesson
packs the phone verifies before use.

## Core loop

```
probe → misconception detected → targeted intervention → teach-back (graded locally)
      → events queued → sync → server re-grades → next pack → teacher brief
```

## Repository

- `frontend/` — React + TypeScript PWA (Dexie/IndexedDB, offline tutor, UI)
- `backend/` — FastAPI service (domain services, explicit agent graph, SQLite)
- `shared/` — versioned contracts, schemas, privacy conventions
- `docs/` — architecture, product, security, proposal extract
- `scripts/` — environment / ci / release / ops helpers

## Quick start

```sh
# backend (no API keys, no external services)
python3 -m uvicorn app.main:app --reload --app-dir backend
# → http://localhost:8000  (docs at /docs)

# frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

The PWA boots with bundled signed packs, so it works offline immediately. Point
it at the backend with `VITE_API_BASE_URL` (default `http://localhost:8000`) to
sync.

## Tests

```sh
scripts/ci/test-backend.sh     # 19 tests
scripts/ci/test-frontend.sh    # 16 tests (incl. cross-language pack checksum)
scripts/ci/validate-contracts.sh
```

## Design highlights

- **Deterministic tutor.** `frontend/.../offline/tutor.ts` mirrors the backend's
  rubric grader and mastery transitions, so the offline result equals the
  server's later re-grade. No model call.
- **Signed packs.** SHA-256 over canonical JSON (no floats), computed
  identically in Python and the browser; the browser verifies before activating.
- **Explicit agent graph.** Seven traced nodes (`event_processor` →
  `teacher_brief_generator`) with a reviewed fallback pack on failure.
- **Idempotent sync.** Events are deduplicated on a client id, so retries are
  harmless.
- **Privacy by default.** Pseudonymous ids; raw audio stays on the phone.

## Status

MVP implemented end to end: offline lesson loop, fingerprinting, teach-back
grading, agent graph, signed packs, sync, teacher brief, PWA. See
`docs/product/roadmap.md` for what's next.

## Proposal

`SikhyaSetu_Polished_Proposal.pdf` (and `docs/proposal_extract.txt`) remain the
source of truth for scope.
