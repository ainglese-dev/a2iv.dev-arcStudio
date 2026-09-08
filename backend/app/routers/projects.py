"""FastAPI Router for Project Workspaces and Project Vision."""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.project import (
    CreateProjectRequest,
    ProjectListResponse,
    ProjectSummary,
    ProjectVision,
    UpdateProjectVisionRequest,
)
from app.services.project_storage import ProjectStorageService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["Project Workspaces & Vision"])
storage_service = ProjectStorageService()


@router.post("", response_model=ProjectVision, status_code=201)
async def create_project(request: CreateProjectRequest):
    """Create a new isolated project workspace with an editorial vision."""
    try:
        return storage_service.create_project(request)
    except Exception as e:
        logger.error("Failed to create project '%s': %s", request.title, e)
        raise HTTPException(status_code=500, detail=f"Failed creating project workspace: {str(e)}")


@router.post("/seed", response_model=ProjectVision)
async def seed_sample_project():
    """Explicitly seed the Cloudflare SRE sample project."""
    try:
        return storage_service.seed_sample_project()
    except Exception as e:
        logger.error("Failed to seed sample project: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed seeding sample project: {str(e)}")


@router.get("", response_model=ProjectListResponse)
async def list_projects():
    """List all project workspaces with live asset counts."""
    try:
        summaries = storage_service.list_projects()
        return ProjectListResponse(projects=summaries, total=len(summaries))
    except Exception as e:
        logger.error("Failed to list projects: %s", e)
        raise HTTPException(status_code=500, detail="Failed listing project workspaces")


@router.get("/{project_id}", response_model=ProjectVision)
async def get_project_vision(project_id: str):
    """Retrieve project vision and North Star metadata."""
    vision = storage_service.get_project_vision(project_id)
    if not vision:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return vision


@router.put("/{project_id}", response_model=ProjectVision)
@router.patch("/{project_id}", response_model=ProjectVision)
async def update_project_vision(project_id: str, request: UpdateProjectVisionRequest):
    """Update vision fields (North Star, thesis, audience, tone)."""
    updated = storage_service.update_project_vision(project_id, request)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return updated


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project workspace and all its sandboxed contents."""
    success = storage_service.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return {"deleted": True, "project_id": project_id}


@router.get("/{project_id}/prompt-context")
async def get_project_prompt_context(project_id: str):
    """Get formatted prompt injection block for downstream AI synthesis."""
    context = storage_service.get_project_prompt_context(project_id)
    if not context:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return {"project_id": project_id, "prompt_context": context}
