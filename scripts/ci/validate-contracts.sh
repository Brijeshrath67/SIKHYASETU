#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "Validating JSON contracts and pack integrity…"

"${PYTHON:-python3}" - "$ROOT" <<'PY'
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
count = 0
for base in (root / "shared", root / "frontend" / "src" / "shared" / "content"):
    if not base.exists():
        continue
    for path in base.rglob("*.json"):
        json.loads(path.read_text(encoding="utf-8"))
        count += 1
print(f"Parsed {count} JSON file(s).")
PY

"${PYTHON:-python3}" "$ROOT/backend/scripts/validate_pack.py"
echo "Contracts OK."
