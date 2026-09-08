"""FastAPI dependencies for project workspace context."""

from typing import Optional
from fastapi import Header, Query

from app.services.project_storage import ProjectStorageService


def get_active_project_id(
    x_project_id: Optional[str] = Header(None, alias="X-Project-Id"),
    project_id: Optional[str] = Query(None, alias="project_id"),
) -> str:
    """Resolve active project_id from query parameter, header, or default project."""
    if project_id and project_id.strip():
        return project_id.strip()
    if x_project_id and x_project_id.strip():
        return x_project_id.strip()

    storage = ProjectStorageService()
    first_id = storage.get_default_or_first_project_id()
    if first_id:
        return first_id
    return "default"
