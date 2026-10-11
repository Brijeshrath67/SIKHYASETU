# Minimal data handling

Principles applied at every boundary.

1. **Collect the least.** A probe event records the chosen option and the
   derived misconception id — not keystrokes, not a location, not a device id.
2. **Purpose-bound.** Events exist to repair a misconception and brief a
   teacher; nothing is repurposed.
3. **Local-first.** The lesson loop is fully functional with the network off.
4. **Explicit sharing.** Sync is a deliberate act (manual button or reconnect),
   and the learner can see the queue before it leaves the phone.
5. **Audio is opt-in to upload.** Raw recordings stay on-device by default;
   only the transcript and rubric score sync.
6. **Deletable.** Because state lives in a local SQLite/Dexie store keyed by a
   pseudonym, erasure is a scoped delete, not a hunt across services.
