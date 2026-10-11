#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

"$ROOT/scripts/environment/install-tools.sh"
"$ROOT/scripts/environment/setup-dev.sh"
echo
echo "Running the full test suite…"
"$ROOT/scripts/ci/test-backend.sh"
"$ROOT/scripts/ci/test-frontend.sh"
echo "All tests passed."
