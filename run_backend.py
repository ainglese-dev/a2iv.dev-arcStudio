#!/usr/bin/env python3
"""Convenience launcher for the Fact Vault & Context Extender backend.

Usage:
    python run_backend.py
    PORT=8080 python run_backend.py
"""

import os
from pathlib import Path
import sys
import uvicorn

repo_root = Path(__file__).resolve().parent
backend_dir = repo_root / "backend"

# Ensure backend is on sys.path
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    reload = os.environ.get("RELOAD", "true").lower() in ("1", "true", "yes")

    print(f"==> Launching Fact Vault Backend on http://{host}:{port} (reload={reload})")
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        app_dir=str(backend_dir),
    )
