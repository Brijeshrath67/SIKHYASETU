#!/usr/bin/env bash
set -euo pipefail
# Audio is retained on-device by default; this script is a guard for the case
# where an operator has pointed AUDIO_STORE at a server-side directory.

AUDIO_STORE="${AUDIO_STORE:-}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [ -z "$AUDIO_STORE" ] || [ ! -d "$AUDIO_STORE" ]; then
  echo "AUDIO_STORE unset or missing; nothing to back up (audio stays on device)."
  exit 0
fi

DEST="${AUDIO_STORE%/}.backup-${STAMP}.tar.gz"
tar -czf "$DEST" -C "$(dirname "$AUDIO_STORE")" "$(basename "$AUDIO_STORE")"
echo "Wrote $DEST"
