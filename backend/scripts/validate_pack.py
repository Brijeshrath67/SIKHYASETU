"""Validate signed lesson-pack JSON files against their integrity checksum.

    python backend/scripts/validate_pack.py path/to/pack.json [more.json ...]
    python backend/scripts/validate_pack.py            # validates the frontend seed bundle
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.domain.services import integrity  # noqa: E402

DEFAULT_BUNDLE = ROOT / "frontend" / "src" / "shared" / "content" / "seed-packs.json"


def _validate(pack: dict) -> tuple[bool, str]:
    pack_id = pack.get("pack_id", "<unknown>")
    return integrity.verify(pack), pack_id


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate lesson pack integrity.")
    parser.add_argument("paths", nargs="*", type=Path, help="pack JSON files (defaults to seed bundle)")
    args = parser.parse_args()

    payloads: list[dict] = []
    if args.paths:
        payloads = [json.loads(path.read_text(encoding="utf-8")) for path in args.paths]
    else:
        bundle = json.loads(DEFAULT_BUNDLE.read_text(encoding="utf-8"))
        payloads = list(bundle["packs"].values())

    failures = 0
    for pack in payloads:
        ok, pack_id = _validate(pack)
        print(f"{'OK  ' if ok else 'FAIL'} {pack_id}")
        failures += 0 if ok else 1

    if failures:
        print(f"{failures} pack(s) failed integrity verification.")
        return 1
    print(f"{len(payloads)} pack(s) verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
