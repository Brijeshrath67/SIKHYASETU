#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT/backend"
echo "Building backend (compile check + bytecode)…"
"${PYTHON:-python3}" -m compileall -q app
echo "Done. Backend has no compiled artifact; it runs from source via uvicorn."
