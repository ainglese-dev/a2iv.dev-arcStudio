"""FastAPI dependencies for project workspace context."""

from typing import Optional
from fastapi import Header, HTTPException, Query

from app.services.project_storage import ProjectStorageService, _sanitize_project_id


def get_active_project_id(
    x_project_id: Optional[str] = Header(None, alias="X-Project-Id"),
    project_id: Optional[str] = Query(None, alias="project_id"),
) -> str:
    """Resolve active project_id from query parameter, header, or default project."""
    for raw in (project_id, x_project_id):
        if raw and raw.strip():
            val = raw.strip()
            if ".." in val or "/" in val or "\\" in val:
                raise HTTPException(
                    status_code=400, detail="Path traversal characters not allowed in project ID"
                )
            return _sanitize_project_id(val)

    storage = ProjectStorageService()
    first_id = storage.get_default_or_first_project_id()
    if first_id:
        return _sanitize_project_id(first_id)
    return "default"
