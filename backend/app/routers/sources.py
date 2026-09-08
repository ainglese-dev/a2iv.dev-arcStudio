import logging
from datetime import datetime, timezone
import re
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_active_project_id
from app.models.vault import (
    IngestSourceRequest,
    SeedPractitionerRequest,
    SeedPractitionerResponse,
    SourceChunk,
    SourceMetadata,
)
from app.services.chunker import DocumentChunker
from app.services.practitioner_seeder import PractitionerSeederService
from app.services.vault_storage import VaultStorageService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sources", tags=["Sources"])
chunker = DocumentChunker()


def _generate_source_id(title: str) -> str:
    slug = re.sub(r"[^\w\-_]", "_", title.lower().strip())[:25]
    short_uid = uuid.uuid4().hex[:6]
    return f"src_{slug}_{short_uid}" if slug else f"src_{short_uid}"


@router.post("/ingest", response_model=dict)
async def ingest_source(
    req: IngestSourceRequest,
    project_id: str = Depends(get_active_project_id),
):
    """Ingest a new source transcript or document, chunk it, and store in the vault."""
    vault = VaultStorageService(project_id=project_id)
    source_id = _generate_source_id(req.title)

    chunks = chunker.chunk_text(
        source_id=source_id,
        text=req.content,
        chunk_size=req.chunk_size,
        chunk_overlap=req.chunk_overlap,
    )

    metadata = SourceMetadata(
        source_id=source_id,
        title=req.title,
        source_type=req.source_type,
        url=req.url,
        author=req.author,
        published_date=req.published_date,
        total_chunks=len(chunks),
        tags=req.tags,
        created_at=datetime.now(timezone.utc),
    )

    vault.save_source(metadata=metadata, chunks=chunks, raw_content=req.content)

    return {
        "source": metadata,
        "chunks_count": len(chunks),
        "chunks": chunks,
        "project_id": project_id,
    }


@router.post("/seed-practitioner", response_model=SeedPractitionerResponse)
async def seed_practitioner(
    req: SeedPractitionerRequest,
    project_id: str = Depends(get_active_project_id),
):
    """Seed a grounded, anti-marketing practitioner research brief and atomic facts into the vault."""
    try:
        seeder_service = PractitionerSeederService(project_id=project_id)
        return await seeder_service.seed_practitioner(req)
    except Exception as e:
        logger.error("Failed to seed practitioner research: %s", e)
        raise HTTPException(status_code=500, detail=f"Practitioner seeding failed: {e}")


@router.get("", response_model=List[SourceMetadata])
async def list_sources(project_id: str = Depends(get_active_project_id)):
    """List all sources stored in the project vault."""
    vault = VaultStorageService(project_id=project_id)
    return vault.list_sources()


@router.get("/{source_id}", response_model=dict)
async def get_source(
    source_id: str,
    project_id: str = Depends(get_active_project_id),
):
    """Retrieve full details, chunks, and content of a source."""
    vault = VaultStorageService(project_id=project_id)
    result = vault.get_source(source_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Source '{source_id}' not found in project '{project_id}'.")

    metadata, chunks, content = result
    return {
        "metadata": metadata,
        "chunks": chunks,
        "content": content,
    }


@router.delete("/{source_id}", response_model=dict)
async def delete_source(
    source_id: str,
    project_id: str = Depends(get_active_project_id),
):
    """Delete a source from the project vault."""
    vault = VaultStorageService(project_id=project_id)
    success = vault.delete_source(source_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Source '{source_id}' not found in project '{project_id}'.")
    return {"status": "deleted", "source_id": source_id, "project_id": project_id}
