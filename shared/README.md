# Shared

Cross-cutting artifacts used by both the backend and the PWA.

```
shared/
  contracts/    versioned model + API contracts (source of truth)
  schemas/      identifier, timestamp and privacy conventions
  docs/         short notes that apply to both sides
```

Start with [`contracts/README.md`](contracts/README.md). The one rule that bites
hardest if broken: **lesson packs must contain no floating point numbers**, so
Python and JavaScript compute the same canonical JSON and therefore the same
integrity checksum.
