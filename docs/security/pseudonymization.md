# Pseudonymization

## Principle

A learner is a **pseudonym**, not a person, until consent says otherwise.

## Ids

- `profiles.id` matches `^[a-z0-9][a-z0-9-]{1,63}$` (e.g. `sunita`, `asha`).
- Chosen/assigned locally; **not derived from** a name, roll number, phone
  number, or any real identifier.
- The same string keys events, fingerprints, packs and traces, so nothing else
  is needed to link records.

## Display vs identity

- `profiles.name` is a display label held on the device.
- The teacher brief shows pseudonyms and aggregate clusters by default.
- Any identifying use requires `consent_identification = true`.

## Re-identification risk

Because ids are arbitrary labels and no identifying attributes are collected,
linking a pseudonym back to a real learner requires information the system does
not store. Erasure is a scoped delete of the pseudonym's rows.

## Implementation

- Schemas: `shared/schemas/privacy/pseudonymized-ids.json`.
- Consent flag defaults to `false` in `Profile`.
