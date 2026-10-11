#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Validate one or more signed pack files, or the bundled seed packs by default.
if [ "$#" -gt 0 ]; then
  exec "${PYTHON:-python3}" "$ROOT/backend/scripts/validate_pack.py" "$@"
fi
exec "${PYTHON:-python3}" "$ROOT/backend/scripts/validate_pack.py"
