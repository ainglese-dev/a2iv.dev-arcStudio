"""Fact Vault & Context Extender backend package."""

from pathlib import Path
import sys

# Ensure backend directory is in sys.path so 'import app...' works in all invocation modes
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
