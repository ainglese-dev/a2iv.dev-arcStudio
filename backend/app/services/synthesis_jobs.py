"""Background synthesis job manager.

Allows guide synthesis to continue uninterrupted in the backend even if the user
refreshes the browser, switches tabs, or temporarily disconnects.
"""

import asyncio
import logging
import time
import uuid
from typing import Dict, List, Optional
from pydantic import BaseModel

from app.models.vault import ContextExpansionRequest, SynthesizedGuide
from app.services.synthesizer import ContextSynthesizer
from app.services.vault_storage import VaultStorageService

logger = logging.getLogger(__name__)


class SynthesisJobStatus(BaseModel):
    """Status record for a background synthesis job."""
    job_id: str
    project_id: str
    topic: str
    detail_level: str
    target_audience: Optional[str] = None
    started_at: float
    status: str  # "running" | "completed" | "failed"
    elapsed_seconds: int = 0
    guide: Optional[SynthesizedGuide] = None
    error: Optional[str] = None


class SynthesisJobManager:
    """In-memory singleton job manager tracking active and recent background synthesis jobs."""
    _instance: Optional["SynthesisJobManager"] = None

    def __init__(self):
        self._jobs: Dict[str, SynthesisJobStatus] = {}
        self._tasks: Dict[str, asyncio.Task] = {}

    @classmethod
    def get_instance(cls) -> "SynthesisJobManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def create_job(
        self,
        request: ContextExpansionRequest,
        project_id: str,
        preferred_provider: Optional[str] = None,
    ) -> SynthesisJobStatus:
        """Register a new job and dispatch execution to an uncoupled background asyncio task."""
        job_id = f"job_synth_{uuid.uuid4().hex[:8]}"
        job = SynthesisJobStatus(
            job_id=job_id,
            project_id=project_id,
            topic=request.topic,
            detail_level=request.detail_level or "comprehensive",
            target_audience=request.target_audience,
            started_at=time.time(),
            status="running",
            elapsed_seconds=0,
        )
        self._jobs[job_id] = job

        # Create persistent background task (independent of HTTP request lifetime)
        task = asyncio.create_task(
            self._execute_synthesis(job_id, request, project_id, preferred_provider)
        )
        self._tasks[job_id] = task
        logger.info("Launched persistent synthesis job %s for project %s (topic: %s)", job_id, project_id, request.topic)
        return job

    async def _execute_synthesis(
        self,
        job_id: str,
        request: ContextExpansionRequest,
        project_id: str,
        preferred_provider: Optional[str] = None,
    ):
        """Execute guide synthesis and write result directly to vault storage."""
        try:
            vault = VaultStorageService(project_id=project_id)
            synthesizer = ContextSynthesizer(vault_storage=vault, project_id=project_id)
            guide = await synthesizer.expand_context(
                request=request,
                preferred_provider=preferred_provider,
            )
            if job_id in self._jobs:
                self._jobs[job_id].status = "completed"
                self._jobs[job_id].guide = guide
                self._jobs[job_id].elapsed_seconds = int(time.time() - self._jobs[job_id].started_at)
                logger.info(
                    "Background synthesis job %s completed in %ds: %s",
                    job_id,
                    self._jobs[job_id].elapsed_seconds,
                    guide.guide_id,
                )
        except Exception as e:
            logger.error("Background synthesis job %s failed: %s", job_id, e)
            if job_id in self._jobs:
                self._jobs[job_id].status = "failed"
                self._jobs[job_id].error = str(e)
                self._jobs[job_id].elapsed_seconds = int(time.time() - self._jobs[job_id].started_at)
        finally:
            self._tasks.pop(job_id, None)

    def get_job(self, job_id: str) -> Optional[SynthesisJobStatus]:
        """Get status of a specific job by ID, updating live elapsed seconds if running."""
        job = self._jobs.get(job_id)
        if job and job.status == "running":
            job.elapsed_seconds = int(time.time() - job.started_at)
        return job

    def get_active_job(self, project_id: Optional[str] = None) -> Optional[SynthesisJobStatus]:
        """Find the currently running job for a project, or the most recent job completed in the last 2 minutes."""
        now = time.time()
        # Sort jobs by started_at descending
        sorted_jobs = sorted(self._jobs.values(), key=lambda j: j.started_at, reverse=True)
        for job in sorted_jobs:
            if project_id and job.project_id != project_id:
                continue
            if job.status == "running":
                job.elapsed_seconds = int(now - job.started_at)
                return job
            # If recently finished within 180 seconds, surface it for recovery
            if now - job.started_at < 180:
                return job
        return None
