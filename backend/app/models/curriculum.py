"""Pydantic models and Enums for Module 2: Arc & Curriculum Architect."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.vault import AIMetadata


def _current_utc() -> datetime:
    return datetime.now(timezone.utc)


class ArcTier(str, Enum):
    FUNDAMENTALS = "fundamentals"
    ADVANCED = "advanced"
    LAB = "lab"


class VideoEpisode(BaseModel):
    episode_id: str
    episode_number: int
    tier: ArcTier = ArcTier.FUNDAMENTALS
    title: str
    hook: str = Field(description="Attention-grabbing 15-second opening hook.")
    learning_objectives: List[str] = Field(
        default_factory=list, description="3-4 concrete takeaways."
    )
    key_facts_referenced: List[str] = Field(
        default_factory=list, description="Fact IDs grounded in the vault."
    )
    target_duration_minutes: int = Field(
        default=6, ge=4, le=10, description="Target duration calibrated for 5-7 min video."
    )
    recommended_visuals: List[str] = Field(
        default_factory=list, description="Slide/diagram recommendations."
    )
    lab_exercise: Optional[str] = Field(
        default=None, description="Hands-on terminal/code challenge for lab tier."
    )


class VideoArc(BaseModel):
    arc_id: str
    title: str
    topic: str
    description: str
    episodes: List[VideoEpisode] = Field(default_factory=list)
    total_episodes: int = 0
    estimated_total_minutes: int = 0
    sources_referenced: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_current_utc)
    ai_metadata: Optional[AIMetadata] = None


class VideoArcSummary(BaseModel):
    arc_id: str
    title: str
    topic: str
    total_episodes: int
    estimated_total_minutes: int
    created_at: datetime


class GenerateCurriculumRequest(BaseModel):
    topic: Optional[str] = None
    source_ids: Optional[List[str]] = None
    target_episode_count: int = Field(
        default=6, ge=3, le=12, description="Target episodes across the 3 tiers."
    )
    target_audience: Optional[str] = Field(
        default=None,
        description="Target audience calibration.",
    )


class UpdateVideoArcRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    episodes: Optional[List[VideoEpisode]] = None
