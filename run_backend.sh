#!/usr/bin/env bash
set -e

# Resolve repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Detect Python venv if present
if [ -d ".venv" ]; then
    UVICORN_BIN=".venv/bin/uvicorn"
elif [ -d "backend/.venv" ]; then
    UVICORN_BIN="backend/.venv/bin/uvicorn"
else
    UVICORN_BIN="uvicorn"
fi

echo "==> Starting Fact Vault & Context Extender on http://127.0.0.1:8000"
exec "$UVICORN_BIN" app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
