# Compatibility & version matrix

The phone and server evolve independently; this matrix is the contract that
keeps an old offline phone talking to a newer server.

## Version fields

| Field | Lives in | Meaning |
| --- | --- | --- |
| `pack_version` | `LessonPack` | Semver of the pack shape. |
| `integrity.algorithm` | `LessonPack` | Hash algorithm; currently `sha256` only. |
| API path | HTTP | `/api/v1/...`; additive changes stay in v1. |
| `seed_version` | seed bundle | Bumped when bundled offline content changes. |

## Rules

1. **Additive only within a major version.** New optional fields may appear; a
   phone must ignore fields it does not know.
2. **Unknown `integrity.algorithm` → reject the pack** and keep the cached one.
3. **`pack_version` major mismatch → reject** and show "update the app".
4. **Events are forward-compatible.** The server ignores unknown `type` values
   and unknown `details` keys but still records the event id for idempotency.
5. **Deterministic pack ids.** `{profile_id}-{primary_concept_id}` never
   changes meaning across versions.

## Support window

| Component | Supported |
| --- | --- |
| PWA | current + previous minor |
| Backend | current major (v1) |
| Content library | latest published `library.json` |
| Integrity | `sha256` |

## Changelog

| Date | pack_version | Change |
| --- | --- | --- |
| 2026-01 | 1.0.0 | Initial signed pack, 12 concepts / 9 misconceptions. |
