# Pack integrity & versioning

Lesson packs are content bundles shipped to an offline phone. They are **signed**
so the phone can trust a pack before it replaces the cached one.

## Canonical JSON

A pack's checksum is computed over its canonical JSON form:

- object keys sorted **recursively**
- no insignificant whitespace (`separators=(",",":")`)
- Unicode preserved literally (`ensure_ascii=False`)
- **no floating point numbers** — integers, strings, booleans and `null` only

Reference implementation (Python, `app/domain/services/integrity.py`):

```python
json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
```

Mirror implementation (TypeScript, `frontend/.../integrity/canonical.ts`)
produces the identical string, so a pack signed on the server verifies on the
phone. This parity is covered by `frontend/src/test/unit/canonical.test.ts`,
which verifies the server-generated seed packs in the browser's `crypto.subtle`.

## Checksum

```
checksum = SHA-256(canonical_json(pack_without_integrity_field))
```

The `integrity` field is excluded from its own computation:

```json
"integrity": { "algorithm": "sha256", "checksum": "<64 hex chars>" }
```

If verification fails, the phone keeps the previously cached pack rather than
activating an unverified one.

## Versioning

- `pack_version` — semver of the pack **shape** (field layout/semantics).
- `pack_id` — deterministic `{profile_id}-{primary_concept_id}`.

A phone accepts a new pack when both:

1. its `integrity.checksum` verifies, and
2. its `generated_at` is newer than the cached pack's.

See `version-matrix.md` for the compatibility table.
