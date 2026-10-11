# User flow

## Learner (offline-capable)

```
Open app (no login) → pick profile (pseudonym)
   → lesson pack loads from the phone
   → concept card (Odia first)
   → probe question → answer
        correct  → teach it back
        wrong    → misconception named → repair card → teach it back
   → teach-back graded instantly (rubric)
   → progress + next review date
   → events queued locally
   → [later, online] Sync → server re-grades & refreshes the pack
```

Everything above the last row works with the radio off.

## Teacher (after learners sync)

```
Open brief → see misconception clusters ("4 learners: current is used up")
   → read the suggested next intervention
   → see learners needing follow-up (by pseudonym)
   → act in class; next cycle's packs target the survivors
```

## Field coordinator

```
for each phone: run bootstrap / export seed packs → install PWA
   → verify offline lesson works (airplane mode)
   → confirm sync drains the outbox on a shared hotspot
```

## Key UX commitments

- **No dead ends offline.** A missing pack shows a clear "connect once" state;
  everything else runs from the cache.
- **Named misconceptions, not scores.** The learner is told *what* they believed
  and why the right model is different.
- **Visible outbox.** The learner can see what will sync before it leaves.
