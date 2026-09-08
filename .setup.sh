#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# .setup.sh — yt-research-gen Environment Bootstrap & Service Runner
# ==============================================================================

show_help() {
  cat << 'EOF'
Usage: .setup.sh [OPTIONS]

Bootstrap dependencies and concurrently launch backend and frontend services.

Options:
  --reload       Enable auto-reload on local file changes:
                 - Backend: uvicorn with --reload --reload-dir backend
                 - Frontend: Vite dev server with native HMR
  --setup-only   Verify and provision environment, venv, and dependencies, then exit
  -h, --help     Show this help message and exit
EOF
}

# ------------------------------------------------------------------------------
# 1. Argument Parsing
# ------------------------------------------------------------------------------
RELOAD=false
SETUP_ONLY=false

while [ $# -gt 0 ]; do
  case "$1" in
    --reload)
      RELOAD=true
      shift
      ;;
    --setup-only)
      SETUP_ONLY=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Error: Unknown argument: $1" >&2
      echo "Run '$0 --help' for usage." >&2
      exit 1
      ;;
  esac
done

# ------------------------------------------------------------------------------
# 2. Path Resolution & Environment Bootstrap
# ------------------------------------------------------------------------------
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "==> Repository root: $REPO_ROOT"

# Ensure prerequisites
if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is required but not found in PATH." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but not found in PATH." >&2
  exit 1
fi

# Verify or create Python virtual environment (.venv)
if [ ! -d ".venv" ]; then
  echo "==> Creating Python virtual environment in .venv..."
  python3 -m venv .venv
else
  echo "==> Python virtual environment (.venv) verified."
fi

VENV_BIN="$REPO_ROOT/.venv/bin"

# Verify or install backend dependencies
if [ ! -f "$VENV_BIN/uvicorn" ] || ! "$VENV_BIN/python" -c "import fastapi" >/dev/null 2>&1; then
  echo "==> Installing backend dependencies into .venv..."
  "$VENV_BIN/python" -m pip install -r "$REPO_ROOT/backend/requirements.txt"
else
  echo "==> Backend dependencies verified (uvicorn & fastapi present)."
fi

# Copy backend/.env.example to backend/.env if absent
if [ ! -f "$REPO_ROOT/backend/.env" ]; then
  if [ -f "$REPO_ROOT/backend/.env.example" ]; then
    echo "==> Initializing backend/.env from backend/.env.example..."
    cp "$REPO_ROOT/backend/.env.example" "$REPO_ROOT/backend/.env"
  fi
else
  echo "==> backend/.env verified."
fi

# Install frontend/node_modules if absent
if [ ! -d "$REPO_ROOT/frontend/node_modules" ]; then
  echo "==> Installing frontend dependencies via npm install..."
  (cd "$REPO_ROOT/frontend" && npm install)
else
  echo "==> Frontend dependencies (node_modules) verified."
fi

# Ensure vault/ directory exists
if [ ! -d "$REPO_ROOT/vault" ]; then
  echo "==> Creating vault/ directory..."
  mkdir -p "$REPO_ROOT/vault"
else
  echo "==> vault/ directory verified."
fi

# If setup-only was requested, exit cleanly now
if [ "$SETUP_ONLY" = true ]; then
  echo "==> Setup completed successfully (--setup-only)."
  exit 0
fi

# ------------------------------------------------------------------------------
# 3. Process Lifecycle Management & Traps
# ------------------------------------------------------------------------------
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  trap - SIGINT SIGTERM EXIT
  set +e

  local any_running=false
  for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      any_running=true
      break
    fi
  done

  if [ "$any_running" = false ]; then
    exit 0
  fi

  echo ""
  echo "==> Shutting down services..."

  # Send SIGTERM to processes and direct children
  for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      pkill -P "$pid" -TERM 2>/dev/null || true
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done

  # Allow up to 3 seconds for graceful shutdown
  for _ in 1 2 3 4 5 6; do
    local still_running=false
    for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
      if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        still_running=true
        break
      fi
    done
    if [ "$still_running" = false ]; then
      break
    fi
    sleep 0.5
  done

  # Fallback to SIGKILL for any stubborn process
  for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "==> Process $pid still alive; sending SIGKILL..."
      pkill -P "$pid" -KILL 2>/dev/null || true
      kill -KILL "$pid" 2>/dev/null || true
    fi
  done

  wait "$BACKEND_PID" 2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  echo "==> All services stopped cleanly."
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ------------------------------------------------------------------------------
# 4. Concurrently Launch Backend & Frontend
# ------------------------------------------------------------------------------
if [ "$RELOAD" = true ]; then
  MODE_LABEL="Development (auto-reload enabled)"
  echo "==> Launching backend with auto-reload..."
  "$VENV_BIN/python" -m uvicorn app.main:app \
    --app-dir backend \
    --reload \
    --reload-dir backend \
    --host 127.0.0.1 \
    --port 8000 &
  BACKEND_PID=$!
else
  MODE_LABEL="Standard (reload disabled)"
  echo "==> Launching backend..."
  "$VENV_BIN/python" -m uvicorn app.main:app \
    --app-dir backend \
    --host 127.0.0.1 \
    --port 8000 &
  BACKEND_PID=$!
fi

echo "==> Launching frontend dev server..."
(cd "$REPO_ROOT/frontend" && exec npm run dev -- --host 127.0.0.1 --port 5173) &
FRONTEND_PID=$!

# ------------------------------------------------------------------------------
# 5. Service Status Banner
# ------------------------------------------------------------------------------
echo ""
echo "=================================================================="
echo "  yt-research-gen Services Active"
echo "=================================================================="
echo "  Mode:     $MODE_LABEL"
echo "  Backend:  http://127.0.0.1:8000 (PID: $BACKEND_PID)"
echo "  Frontend: http://127.0.0.1:5173 (PID: $FRONTEND_PID)"
echo "=================================================================="
echo "  Press Ctrl+C to stop all services."
echo "=================================================================="
echo ""

# ------------------------------------------------------------------------------
# 6. Process Monitoring Loop (macOS / BSD bash 3.2+ compatible)
# ------------------------------------------------------------------------------
while true; do
  if [ -n "$BACKEND_PID" ] && ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "==> Backend service (PID: $BACKEND_PID) exited."
    break
  fi
  if [ -n "$FRONTEND_PID" ] && ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "==> Frontend service (PID: $FRONTEND_PID) exited."
    break
  fi
  sleep 1 &
  wait $! 2>/dev/null || true
done
