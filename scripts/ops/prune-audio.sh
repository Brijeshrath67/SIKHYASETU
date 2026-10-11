#!/usr/bin/env bash
set -euo pipefail
# Enforce the audio retention window for a server-side store, if configured.
# Default retention is 0 days: audio is not retained on the server at all.

AUDIO_STORE="${AUDIO_STORE:-}"
RETENTION_DAYS="${AUDIO_RETENTION_DAYS:-0}"

if [ -z "$AUDIO_STORE" ] || [ ! -d "$AUDIO_STORE" ]; then
  echo "AUDIO_STORE unset or missing; nothing to prune."
  exit 0
fi

if [ "$RETENTION_DAYS" -le 0 ]; then
  echo "Retention is 0 days — removing all server-side audio."
  find "$AUDIO_STORE" -type f -delete
  exit 0
fi

echo "Pruning audio older than ${RETENTION_DAYS} day(s)…"
find "$AUDIO_STORE" -type f -mtime "+${RETENTION_DAYS}" -print -delete
