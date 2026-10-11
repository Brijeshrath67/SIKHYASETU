# Offline-first flow

SikhyaSetu assumes a shared Android phone, intermittent connectivity, and a
tight data budget. The lesson loop therefore runs **entirely on the device**.

## The loop

```
1. Learn        concept card (Odia first, English gloss)      [offline]
2. Probe        one diagnostic question per concept           [offline]
3. Diagnose     wrong option → misconception id               [offline]
4. Intervene    short targeted repair card                    [offline]
5. Teach-back   learner explains it; rubric graded locally    [offline]
6. Queue        events written to the Dexie outbox            [offline]
7. Sync         batch of events pushed when online            [online]
8. Reconcile    server re-grades, re-plans, recompiles pack   [online]
```

Steps 1–6 never touch the network. The app is fully usable with the radio off;
step 7 is opportunistic and idempotent.

## What lives where

| Concern | Store | Notes |
| --- | --- | --- |
| Profiles, packs | IndexedDB via **Dexie** | seeded from the bundled signed packs |
| Outbox | IndexedDB `events` | `pending → sent`, deduped on id |
| Fingerprints | IndexedDB `mastery` | updated locally per answer |
| Curriculum | `library.json` (server) | 12 concepts, 9 misconceptions |

## Integrity

Packs are signed (`sha256` over canonical JSON). On download the PWA verifies
the checksum in `crypto.subtle` **before** replacing the cached pack; a failed
check keeps the previous pack. See `shared/contracts/compatibility/pack-integrity.md`.

## Deterministic tutor

The on-device tutor (`frontend/src/shared/lib/offline/tutor.ts`) mirrors the
server's rule-based grader and mastery transitions exactly, so the offline
result equals the server's later re-grade. There is no model call anywhere in
the loop — the intelligence is inspectable rules over authored content.

## Budget discipline

The seed packs fit the demo profiles: Sunita (0.8 MB, 25 min) receives
`electric-current`; Asha (1.2 MB, 30 min) receives `force-as-interaction` +
`acceleration`. The primary concept is always included even if the budget is
exceeded — the repair loop is never starved.
