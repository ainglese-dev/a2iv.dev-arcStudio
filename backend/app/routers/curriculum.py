"""FastAPI Router for Module 2: Arc & Curriculum Architect."""

import asyncio
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
import httpx

from app.dependencies import get_active_project_id
from app.models.curriculum import (
    GenerateCurriculumRequest,
    UpdateVideoArcRequest,
    VideoArc,
    VideoArcSummary,
)
from app.services.curriculum_generator import CurriculumGenerator
from app.services.curriculum_storage import CurriculumStorageService

logger = logging.getLogger(__name__)

storage = CurriculumStorageService()
router = APIRouter(prefix="/curriculum", tags=["Curriculum & Video Arc"])


@router.post("/generate", response_model=VideoArc)
async def generate_curriculum(
    req: GenerateCurriculumRequest,
    preferred_provider: Optional[str] = Query(None, description="Force gemini or openai_compatible"),
    project_id: str = Depends(get_active_project_id),
):
    """Generate a 3-tier video curriculum arc grounded in Fact Vault facts."""
    try:
        storage = CurriculumStorageService(project_id=project_id)
        generator = CurriculumGenerator(curriculum_storage=storage, project_id=project_id)
        arc = await generator.generate_curriculum(
            request=req,
            preferred_provider=preferred_provider,
        )
        return arc
    except (asyncio.TimeoutError, TimeoutError, httpx.TimeoutException) as te:
        logger.error("Curriculum generation timed out: %s", te)
        raise HTTPException(
            status_code=504,
            detail={
                "error": "Gateway Timeout",
                "message": f"Curriculum generation timed out while awaiting AI response: {te}",
                "troubleshooting": [
                    "Try reducing target_episode_count or specifying source_ids.",
                    "Verify AI_REQUEST_TIMEOUT_SECONDS in backend/.env.",
                    "Check AI provider health at /api/health/providers.",
                ],
            },
        )
    except ValueError as ve:
        logger.warning("Curriculum generation validation error: %s", ve)
        raise HTTPException(
            status_code=422,
            detail={"error": "Unprocessable Entity", "message": str(ve)},
        )
    except Exception as e:
        logger.error("Curriculum generation failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Bad Gateway / AI Provider Error",
                "message": f"Curriculum generation failed: {e}",
                "troubleshooting": [
                    "Verify AI provider connectivity at /api/health/providers.",
                    "Check server logs for circuit breaker or fallback status.",
                ],
            },
        )


@router.get("", response_model=List[VideoArcSummary])
async def list_curriculum_arcs(project_id: str = Depends(get_active_project_id)):
    """List all video curriculum arcs stored in the project vault."""
    storage = CurriculumStorageService(project_id=project_id)
    return storage.list_arcs()


@router.get("/{arc_id}", response_model=VideoArc)
async def get_curriculum_arc(
    arc_id: str,
    project_id: str = Depends(get_active_project_id),
):
    """Retrieve full details, episodes, and grounded facts for a curriculum arc."""
    storage = CurriculumStorageService(project_id=project_id)
    arc = storage.get_arc(arc_id)
    if not arc:
        raise HTTPException(status_code=404, detail=f"Curriculum arc '{arc_id}' not found in project '{project_id}'.")
    return arc


@router.put("/{arc_id}", response_model=VideoArc)
async def update_curriculum_arc(
    arc_id: str,
    req: UpdateVideoArcRequest,
    project_id: str = Depends(get_active_project_id),
):
    """Update title, description, or reorder/modify episodes of an existing arc."""
    storage = CurriculumStorageService(project_id=project_id)
    updated = storage.update_arc(arc_id, req)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Curriculum arc '{arc_id}' not found in project '{project_id}'.")
    return updated


@router.delete("/{arc_id}", response_model=dict)
async def delete_curriculum_arc(
    arc_id: str,
    project_id: str = Depends(get_active_project_id),
):
    """Delete a curriculum arc note from the project vault."""
    storage = CurriculumStorageService(project_id=project_id)
    success = storage.delete_arc(arc_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Curriculum arc '{arc_id}' not found in project '{project_id}'.")
    return {"status": "deleted", "arc_id": arc_id, "project_id": project_id}
