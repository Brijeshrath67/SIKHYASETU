"""Pack integrity helpers.

A pack is signed with a SHA-256 checksum over its canonical JSON form. The
canonical form is: UTF-8 JSON with keys sorted recursively and no insignificant
whitespace. The same algorithm is implemented in the PWA's TypeScript
(`shared/services/integrity/canonical.ts`) so the phone can verify a downloaded
pack before activating it and keep the previous pack when verification fails.

Packs must therefore avoid floating point numbers: integers, strings, booleans
and null only.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def checksum(payload: dict[str, Any]) -> str:
    """Checksum of a pack dictionary excluding its own ``integrity`` field."""
    body = {key: value for key, value in payload.items() if key != "integrity"}
    return hashlib.sha256(canonical_json(body).encode("utf-8")).hexdigest()


def verify(payload: dict[str, Any]) -> bool:
    integrity = payload.get("integrity") or {}
    expected = integrity.get("checksum")
    if not expected:
        return False
    return checksum(payload) == expected
