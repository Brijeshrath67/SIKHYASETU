# Privacy schema

The stored shape is chosen so that "who is this learner?" is answerable **only**
when consent says so.

## Stored fields

| Field | Example | Sensitivity |
| --- | --- | --- |
| `profiles.id` | `sunita` | pseudonym, non-identifying |
| `profiles.name` | `Sunita` | display label; local only |
| `profiles.consent_identification` | `false` | gate for any identifying use |
| `events.type` / `details` | `probe_answered` / `{selected_label:"A"}` | learning signal |
| `mastery_states.*` | concept, mastery, misconception id | learning signal |
| `teach_backs.transcript` | short explanation | learner free text — never in the brief |

## What is deliberately absent

- No phone number, SIM, IMEI, GPS, email, or device fingerprint.
- No real-name linkage unless `consent_identification = true`.
- No raw audio on the server by default.

## Access

| Role | Sees |
| --- | --- |
| Learner | their own lesson, fingerprint, queue |
| Teacher | aggregated clusters + pseudonyms + next focus |
| Server ops | data at rest, no audio by default |

## Retention

Events and transcripts are retained only as long as they serve repair/briefing;
audio follows `audio-retention-policy.md` (default: on-device only).
