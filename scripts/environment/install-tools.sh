#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "Required tools:"
for tool in "${PYTHON:-python3}" node npm; do
  if command -v "$tool" >/dev/null 2>&1; then
    printf '  ok   %s (%s)\n' "$tool" "$("$tool" --version 2>&1 | head -n1)"
  else
    printf '  MISS %s\n' "$tool"
  fi
done
