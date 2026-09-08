"""Facts extraction and query router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_active_project_id
from app.models.vault import (
    AtomicFact,
    ExtractFactsRequest,
    FactCategory,
    FactExtractionResult,
)
from app.services.extractor import FactExtractor
from app.services.vault_storage import VaultStorageService

router = APIRouter(prefix="/facts", tags=["Facts"])


@router.post("/extract", response_model=FactExtractionResult)
async def extract_facts(
    req: ExtractFactsRequest,
    preferred_provider: Optional[str] = Query(None, description="Force gemini or openai_compatible"),
    project_id: str = Depends(get_active_project_id),
):
    """Extract atomic facts from an ingested source document or transcript."""
    try:
        vault = VaultStorageService(project_id=project_id)
        extractor = FactExtractor(vault_storage=vault)
        result = await extractor.extract_from_source(
            source_id=req.source_id,
            chunk_ids=req.chunk_ids,
            preferred_provider=preferred_provider,
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fact extraction failed: {e}")


@router.get("", response_model=List[AtomicFact])
async def list_facts(
    source_id: Optional[str] = Query(None, description="Filter by source ID"),
    category: Optional[FactCategory] = Query(None, description="Filter by fact category"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    project_id: str = Depends(get_active_project_id),
):
    """Query and filter atomic facts in the project vault."""
    vault = VaultStorageService(project_id=project_id)
    return vault.list_facts(source_id=source_id, category=category, tag=tag)


@router.get("/{fact_id}", response_model=AtomicFact)
async def get_fact(
    fact_id: str,
    project_id: str = Depends(get_active_project_id),
):
    """Retrieve details for a single atomic fact note."""
    vault = VaultStorageService(project_id=project_id)
    fact = vault.get_fact(fact_id)
    if not fact:
        raise HTTPException(status_code=404, detail=f"Fact '{fact_id}' not found in project '{project_id}'.")
    return fact


@router.delete("/{fact_id}", response_model=dict)
async def delete_fact(
    fact_id: str,
    project_id: str = Depends(get_active_project_id),
):
    """Delete an atomic fact note from the project vault."""
    vault = VaultStorageService(project_id=project_id)
    success = vault.delete_fact(fact_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Fact '{fact_id}' not found in project '{project_id}'.")
    return {"status": "deleted", "fact_id": fact_id, "project_id": project_id}
