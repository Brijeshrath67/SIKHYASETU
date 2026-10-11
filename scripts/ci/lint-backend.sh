#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT/backend"
echo "Compile-checking backend…"
"${PYTHON:-python3}" -m compileall -q app
if "${PYTHON:-python3}" -m ruff --version >/dev/null 2>&1; then
  echo "Running ruff…"
  "${PYTHON:-python3}" -m ruff check app
else
  echo "ruff not installed; compile check only."
fi
