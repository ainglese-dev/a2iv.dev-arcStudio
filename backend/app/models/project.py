"""Domain models for Project Workspace and Project Vision (North Star)."""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class TechnicalDepth(str, Enum):
    """Calibrated technical depth for audience targeting."""
    PRACTITIONER_DEEP = "practitioner_deep"       # Trench engineering, RFCs, failure modes, code
    APPLIED_ENGINEERING = "applied_engineering"   # Architecture patterns, practical trade-offs
    CONCEPTUAL_OVERVIEW = "conceptual_overview"   # High-level architecture, executive primer


class VideoFormatPreset(str, Enum):
    """Target video production format structure."""
    MULTI_EPISODE_ARC = "multi_episode_arc"       # 3-5 episodic arc with progressive pedagogy
    DEEP_DIVE_STANDALONE = "deep_dive_standalone" # Single comprehensive technical deep dive (10-15m)
    QUICK_EXPLAINER = "quick_explainer"           # Focused 3-5 minute concept/post-mortem explainer


class ProjectVision(BaseModel):
    """North Star / Editorial Thesis governing all AI synthesis in the project workspace."""
    project_id: str
    title: str
    target_audience: str
    technical_depth: TechnicalDepth
    core_thesis: str
    target_format: VideoFormatPreset
    tone_and_style: str
    key_questions_to_answer: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectSummary(BaseModel):
    """Summary of a project with live asset counts across the sandbox."""
    project_id: str
    title: str
    target_audience: str
    technical_depth: TechnicalDepth
    target_format: VideoFormatPreset
    core_thesis: str = ""
    sources_count: int = 0
    facts_count: int = 0
    arcs_count: int = 0
    scripts_count: int = 0
    decks_count: int = 0
    created_at: datetime
    updated_at: datetime


class CreateProjectRequest(BaseModel):
    """Request payload to instantiate an isolated project workspace."""
    project_id: Optional[str] = None
    title: str
    target_audience: Optional[str] = "Practitioners and Inquisitive Learners"
    technical_depth: TechnicalDepth = TechnicalDepth.PRACTITIONER_DEEP
    core_thesis: Optional[str] = None
    target_format: VideoFormatPreset = VideoFormatPreset.MULTI_EPISODE_ARC
    tone_and_style: Optional[str] = None
    key_questions_to_answer: List[str] = Field(default_factory=list)


class UpdateProjectVisionRequest(BaseModel):
    """Request payload to update the project's North Star vision."""
    title: Optional[str] = None
    target_audience: Optional[str] = None
    technical_depth: Optional[TechnicalDepth] = None
    core_thesis: Optional[str] = None
    target_format: Optional[VideoFormatPreset] = None
    tone_and_style: Optional[str] = None
    key_questions_to_answer: Optional[List[str]] = None


class ProjectListResponse(BaseModel):
    """Collection response for project workspace listing."""
    projects: List[ProjectSummary]
    total: int
