"""Context Expansion & Guide Synthesis router with resilient error handling."""

import asyncio
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
import httpx

from app.dependencies import get_active_project_id
from app.models.vault import ContextExpansionRequest, SynthesizedGuide
from app.services.synthesis_jobs import SynthesisJobManager, SynthesisJobStatus
from app.services.synthesizer import ContextSynthesizer
from app.services.vault_storage import VaultStorageService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/expand", tags=["Context Expansion"])


@router.post("/jobs/start", response_model=SynthesisJobStatus)
async def start_synthesis_job(
    req: ContextExpansionRequest,
    preferred_provider: Optional[str] = Query(None, description="Force gemini or openai_compatible"),
    project_id: str = Depends(get_active_project_id),
):
    """Start an asynchronous background guide synthesis job that persists across client disconnects."""
    manager = SynthesisJobManager.get_instance()
    job = manager.create_job(
        request=req,
        project_id=project_id,
        preferred_provider=preferred_provider,
    )
    return job


@router.get("/jobs/active", response_model=Optional[SynthesisJobStatus])
async def get_active_synthesis_job(
    project_id: str = Depends(get_active_project_id),
):
    """Retrieve the currently running background job or recently completed job for the project."""
    manager = SynthesisJobManager.get_instance()
    return manager.get_active_job(project_id=project_id)


@router.get("/jobs/{job_id}", response_model=SynthesisJobStatus)
async def get_synthesis_job(
    job_id: str,
):
    """Query current status and result of a specific background synthesis job."""
    manager = SynthesisJobManager.get_instance()
    job = manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Synthesis job '{job_id}' not found.")
    return job


@router.post("/synthesize", response_model=SynthesizedGuide)
async def synthesize_guide(
    req: ContextExpansionRequest,
    preferred_provider: Optional[str] = Query(None, description="Force gemini or openai_compatible"),
    project_id: str = Depends(get_active_project_id),
):
    """Synthesize a research guide from facts in the vault with Obsidian footnotes."""
    try:
        vault = VaultStorageService(project_id=project_id)
        synthesizer = ContextSynthesizer(vault_storage=vault, project_id=project_id)
        guide = await synthesizer.expand_context(
            request=req,
            preferred_provider=preferred_provider,
        )
        return guide
    except (asyncio.TimeoutError, TimeoutError, httpx.TimeoutException) as te:
        logger.error("Guide synthesis timed out: %s", te)
        raise HTTPException(
            status_code=504,
            detail={
                "error": "Gateway Timeout",
                "message": f"Guide synthesis timed out while awaiting AI provider response: {te}",
                "troubleshooting": [
                    "The synthesis context may be too large. Try specifying specific 'categories' or 'tags' to filter facts.",
                    "Increase AI_REQUEST_TIMEOUT_SECONDS in backend/.env (default 300s) if running large reasoning models.",
                    "If using local OpenAI-compatible endpoints, verify remote GPU server load and responsiveness.",
                ],
            },
        )
    except ValueError as ve:
        logger.warning("Guide synthesis validation error: %s", ve)
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Unprocessable Entity",
                "message": str(ve),
            },
        )
    except Exception as e:
        err_str = str(e).lower()
        if "timed out" in err_str or "timeout" in err_str:
            logger.error("Guide synthesis timeout detected: %s", e)
            raise HTTPException(
                status_code=504,
                detail={
                    "error": "Gateway Timeout",
                    "message": f"AI provider request timed out: {e}",
                    "troubleshooting": [
                        "Narrow topic scope or filter facts by category/tags.",
                        "Verify backend/.env timeout settings (AI_REQUEST_TIMEOUT_SECONDS).",
                        "Check remote GPU server responsiveness.",
                    ],
                },
            )
        logger.error("Guide synthesis execution failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Bad Gateway / AI Provider Error",
                "message": f"Guide synthesis failed: {e}",
                "troubleshooting": [
                    "Check provider health via GET /api/health/providers.",
                    "Verify GEMINI_API_KEY and OPENAI_BASE_URL credentials in backend/.env.",
                    "Check server logs for provider retry and fallback activity.",
                ],
            },
        )


@router.get("/guides", response_model=List[Dict[str, Any]])
async def list_guides(project_id: str = Depends(get_active_project_id)):
    """List all synthesized guides in the project vault."""
    vault = VaultStorageService(project_id=project_id)
    return vault.list_guides()


@router.get("/guides/{guide_id}", response_model=SynthesizedGuide)
async def get_guide(
    guide_id: str,
    project_id: str = Depends(get_active_project_id),
):
    """Retrieve full markdown content and citations for a synthesized guide."""
    vault = VaultStorageService(project_id=project_id)
    guide = vault.get_guide(guide_id)
    if not guide:
        raise HTTPException(status_code=404, detail=f"Guide '{guide_id}' not found in project '{project_id}'.")
    return guide


@router.delete("/guides/{guide_id}", response_model=dict)
async def delete_guide(
    guide_id: str,
    project_id: str = Depends(get_active_project_id),
):
    """Delete a synthesized guide note from the project vault."""
    vault = VaultStorageService(project_id=project_id)
    success = vault.delete_guide(guide_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Guide '{guide_id}' not found in project '{project_id}'.")
    return {"status": "deleted", "guide_id": guide_id, "project_id": project_id}
