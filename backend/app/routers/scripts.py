"""FastAPI Router for Module 3: Script Studio & Teleprompter."""

import asyncio
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
import httpx

from app.dependencies import get_active_project_id
from app.models.script import (
    GenerateScriptRequest,
    VideoScript,
    VideoScriptSummary,
)
from app.services.script_generator import ScriptGenerator
from app.services.script_storage import ScriptStorageService

logger = logging.getLogger(__name__)

storage = ScriptStorageService()
router = APIRouter(prefix="/scripts", tags=["Script Studio & Teleprompter"])


@router.post("/generate", response_model=VideoScript)
async def generate_script(
    req: GenerateScriptRequest,
    preferred_provider: Optional[str] = Query(
        None, description="Force gemini or openai_compatible"
    ),
    project_id: str = Depends(get_active_project_id),
):
    """Generate a teleprompter-ready 750-1000 word video script for an episode."""
    try:
        storage = ScriptStorageService(project_id=project_id)
        generator = ScriptGenerator(script_storage=storage, project_id=project_id)
        script = await generator.generate_script(
            request=req,
            preferred_provider=preferred_provider,
        )
        return script
    except (asyncio.TimeoutError, TimeoutError, httpx.TimeoutException) as te:
        logger.error("Script generation timed out: %s", te)
        raise HTTPException(
            status_code=504,
            detail={
                "error": "Gateway Timeout",
                "message": f"Script generation timed out awaiting AI response: {te}",
                "troubleshooting": [
                    "Check AI provider health at /api/health/providers.",
                    "Verify AI_REQUEST_TIMEOUT_SECONDS in backend/.env.",
                ],
            },
        )
    except ValueError as ve:
        logger.warning("Script generation validation error: %s", ve)
        raise HTTPException(
            status_code=422,
            detail={"error": "Unprocessable Entity", "message": str(ve)},
        )
    except Exception as e:
        logger.error("Script generation failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Bad Gateway / AI Provider Error",
                "message": f"Script generation failed: {e}",
            },
        )


@router.get("", response_model=List[VideoScriptSummary])
async def list_scripts(project_id: str = Depends(get_active_project_id)):
    """List all teleprompter video scripts stored in the project vault."""
    storage = ScriptStorageService(project_id=project_id)
    return storage.list_scripts()


@router.get("/{script_id}", response_model=VideoScript)
async def get_script(
    script_id: str,
    project_id: str = Depends(get_active_project_id),
):
    """Retrieve complete teleprompter script and sections."""
    storage = ScriptStorageService(project_id=project_id)
    script = storage.get_script(script_id)
    if not script:
        raise HTTPException(
            status_code=404, detail=f"Script '{script_id}' not found in project '{project_id}'."
        )
    return script


@router.delete("/{script_id}", response_model=dict)
async def delete_script(
    script_id: str,
    project_id: str = Depends(get_active_project_id),
):
    """Delete a teleprompter script from the project vault."""
    storage = ScriptStorageService(project_id=project_id)
    success = storage.delete_script(script_id)
    if not success:
        raise HTTPException(
            status_code=404, detail=f"Script '{script_id}' not found in project '{project_id}'."
        )
    return {"status": "deleted", "script_id": script_id, "project_id": project_id}
