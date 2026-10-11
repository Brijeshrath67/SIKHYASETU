# Roadmap

## Shipped (MVP)

- Offline lesson loop: concept → probe → diagnosis → intervention → teach-back.
- Misconception Fingerprint with explainable evidence and review dates.
- Explicit agent graph with stored, renderable traces.
- Signed lesson packs (SHA-256 over canonical JSON) verified in the browser.
- Idempotent event sync, learner re-grade, pack reconciliation.
- Teacher Action Brief (server) with an on-device fallback estimate.
- 12 concepts / 9 misconceptions in Odia + English (Class 9 Science).
- PWA: Dexie store, service worker, installable manifest.

## Next

- On-device speech-to-text so teach-back audio becomes text offline.
- More chapters and a content review workflow (`review_status` already modelled).
- Teacher-side authoring of interventions.
- Cohort analytics beyond a single class.

## Later

- Move persistence to PostgreSQL (schema already Postgres-shaped).
- Multiple subjects/grades per learner.
- Offline pack diffing to shrink updates.

## Explicitly out of scope

- Any paid model/API in the learner loop (the loop is deterministic on purpose).
- Real-identity accounts in the MVP.
