#!/usr/bin/env bash
# Matrix Quote Web - demo launcher.
# Boots the app on :8000 with synthetic demo data and opens the browser.
# Ctrl+C to stop.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "[demo] resetting .demo DATA_DIR..."
rm -rf .demo

export ENABLE_DEMO=1
export DATA_DIR="$REPO_ROOT/.demo"
export PYTHONPATH="$REPO_ROOT"

(
  until curl -sf http://localhost:8000/api/health >/dev/null 2>&1; do sleep 0.3; done
  if command -v cmd >/dev/null 2>&1; then
    cmd //c start "" http://localhost:8000
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:8000
  elif command -v open >/dev/null 2>&1; then
    open http://localhost:8000
  fi
) &

echo "[demo] starting uvicorn on :8000 - Ctrl+C to stop."
exec python -m uvicorn backend.app.main:app --port 8000
