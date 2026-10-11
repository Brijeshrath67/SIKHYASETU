# Audio retention policy

Teach-back audio is the most sensitive artifact the app can produce, so the
default is: **it never leaves the phone.**

## Default behaviour (MVP)

- The learner may record a teach-back clip.
- Only the **transcript** and the **rubric score** are queued for sync.
- The audio blob is not uploaded automatically.

## If server-side audio is enabled

An operator may point `AUDIO_STORE` at a directory to opt in. Then:

| Setting | Default | Meaning |
| --- | --- | --- |
| `AUDIO_STORE` | unset | audio stays on device |
| `AUDIO_RETENTION_DAYS` | `0` | server retains nothing |

- `scripts/ops/prune-audio.sh` removes files older than the window; with the
  default `0` it removes all server-side audio.
- `scripts/ops/backup-audio.sh` is a guard that no-ops unless `AUDIO_STORE` is
  set.

## Rationale

Audio can carry voice biometrics and background conversation. Keeping it local
by default removes an entire class of risk while still delivering the pedagogy:
the transcript is what the rubric grades.
