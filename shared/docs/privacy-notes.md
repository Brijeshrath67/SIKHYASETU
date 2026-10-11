# Privacy notes

The design goal is **learn locally, share minimally**.

## What stays on the phone

- Raw teach-back audio. It is never uploaded automatically; text/grades sync
  only, and audio upload is an explicit learner action (default off).
- The learner's typed explanations, until sync is triggered.

## What syncs

- Structured events: which probe was answered, which option, whether correct,
  the misconception id, and the teach-back rubric score.
- These are keyed by a pseudonymous `profile_id`.

## What the teacher sees

- Aggregated misconception clusters ("4 learners: current is used up").
- Learners needing follow-up, by pseudonym.
- No learner free text, no audio, no real names unless
  `consent_identification` is true.

## Consent

`consent_identification` defaults to **false**. When false the learner remains
fully pseudonymous end to end. See `../schemas/privacy/`.
