#!/usr/bin/env bash
set -e

# ==============================================================================
# start.sh — yt-research-gen One-Click Runner
# ==============================================================================
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

# Pass through any arguments or default to development reload mode
exec bash "$REPO_ROOT/.setup.sh" --reload "$@"
