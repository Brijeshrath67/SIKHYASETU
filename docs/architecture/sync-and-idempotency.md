# Sync & idempotency

Sync is the only place the phone and server meet, so it is designed to be
**safe to retry at any time**.

## Event ids

Every event carries a client-generated `id` (UUID). The server stores it as the
primary key of `events`; re-sending an existing id is counted as a duplicate and
has **no side effects**.

```jsonc
// POST /api/v1/events/sync  { "events": [ … ] }
// → 200
{
  "accepted": 2,        // new events applied
  "duplicates": 0,      // ids already seen
  "rejected": 0,        // invalid events
  "affected_profiles": ["sunita"],
  "runs": [ /* AgentTrace */ ],
  "next_pack_ids": { "sunita": "sunita-electric-current" }
}
```

## Client outbox

```
queue event → status 'pending'
  sync OK    → status 'sent'
  sync fails → stays 'pending' (attempts++), last_error recorded → retried later
```

- The outbox persists across reloads (IndexedDB).
- Sync fires automatically when back online **and** a queue exists, or manually
  via "Sync now".
- Only structured events sync. Raw audio stays on-device unless explicitly
  uploaded.

## Server side

1. Validate each event; unknown `type`/unknown `details` keys are tolerated.
2. Insert new ids; skip duplicates.
3. For each affected learner, run the agent graph once (`trigger="sync"`).
4. Return traces + the next pack id per learner.

## Pack reconciliation

After sync the PWA pulls `/lesson-packs/{id}/next` for affected learners and
replaces the cached pack **only if** the new pack verifies and is newer
(`generated_at`). Offline served means the cached pack remains authoritative
until a verified replacement arrives.

## Why this is safe

- Insert-then-dedup on a client id makes the whole batch replayable.
- No server mutation depends on "how many times" a batch was seen.
- The agent run is deterministic, so a replay produces the same pack.
