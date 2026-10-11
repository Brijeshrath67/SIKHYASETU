#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT/backend"
echo "Running backend tests…"
"${PYTHON:-python3}" -m pytest app/tests -q "$@"
