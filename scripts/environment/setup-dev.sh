#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Installing dev dependencies…"

# Backend (FastAPI app uses the standard library + fastapi/pydantic).
"${PYTHON:-python3}" -m pip install --quiet --disable-pip-version-check \
  fastapi "pydantic>=2" uvicorn pytest httpx

# Frontend.
cd "$ROOT/frontend"
npm install --silent

echo "Setup complete. Try: scripts/ci/test-backend.sh && scripts/ci/test-frontend.sh"
