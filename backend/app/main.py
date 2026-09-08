"""FastAPI Application for Fact Vault & Context Extender."""

from pathlib import Path
import sys

# Ensure backend directory is in sys.path so 'import app...' works in all invocation modes
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import curriculum, dev, expand, facts, health, media, presentation, projects, scripts, sources

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger("yt-research-gen")
settings = get_settings()

app = FastAPI(
    title="Fact Vault & Context Extender API",
    description="Backend API for research ingestion, atomic fact extraction, Obsidian vault integration, and context expansion.",
    version="0.1.0",
)

# Configure CORS for local development and UI frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(health.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(facts.router, prefix="/api")
app.include_router(expand.router, prefix="/api")
app.include_router(curriculum.router, prefix="/api")
app.include_router(scripts.router, prefix="/api")
app.include_router(presentation.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(dev.router, prefix="/api/dev", tags=["dev"])


@app.get("/")
async def root():
    return {
        "message": "Fact Vault & Context Extender API is running",
        "docs": "/docs",
        "primary_provider": settings.ai_primary_provider,
        "vault_dir": str(settings.resolved_vault_dir),
    }
