"""Domain models for Module 3: Script Studio & Teleprompter."""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.vault import AIMetadata


class SectionType(str, Enum):
    """Pedagogical sections of a video script."""

    HOOK = "hook"
    PROBLEM_BREAKDOWN = "problem_breakdown"
    DEEP_DIVE = "deep_dive"
    PITFALLS = "pitfalls"
    ACTION_CALL = "action_call"


class ScriptSection(BaseModel):
    """An individual teleprompter block within a video script."""

    section_type: SectionType = Field(
        description="Section category: hook, problem_breakdown, deep_dive, pitfalls, action_call."
    )
    title: str = Field(description="Descriptive heading for teleprompter navigation.")
    spoken_text: str = Field(description="Verbatim spoken transcript for teleprompter.")
    target_duration_seconds: int = Field(
        description="Target duration in seconds for this block."
    )
    estimated_wpm: int = Field(
        default=145, description="Speaking pace calibrated in words per minute."
    )
    visual_cue: Optional[str] = Field(
        default=None,
        description="Visual presentation cue (e.g. [SLIDE: ...], [DIAGRAM: ...], [CODE: ...]).",
    )


class VideoScript(BaseModel):
    """Complete teleprompter-ready video script."""

    script_id: str = Field(description="Unique script identifier (e.g. script_arc_xyz_ep1).")
    episode_id: str = Field(description="Linked episode ID from the curriculum arc.")
    arc_id: Optional[str] = Field(
        default=None, description="Linked curriculum arc ID if part of an arc."
    )
    title: str = Field(description="Full episode title.")
    target_duration_minutes: int = Field(
        default=6, description="Paced duration strictly between 5 and 7 minutes."
    )
    total_word_count: int = Field(
        description="Total spoken word count strictly calibrated between 750 and 1000 words."
    )
    estimated_speaking_minutes: float = Field(
        description="Calculated speaking time based on word count / 140 WPM."
    )
    hook_text: str = Field(
        description="Visceral 15-second opening hook adhering to Agitate the Pain formula."
    )
    sections: List[ScriptSection] = Field(
        default_factory=list,
        description="Ordered sequence of script sections for teleprompter playback.",
    )
    full_script_markdown: str = Field(
        description="Complete teleprompter Markdown document with timestamps and visual markers."
    )
    key_facts_referenced: List[str] = Field(
        default_factory=list,
        description="Fact IDs from Fact Vault cited and grounded in this script.",
    )
    ai_metadata: Optional[AIMetadata] = Field(
        default=None, description="Telemetry metadata on AI generation and fallback execution."
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when script was generated.",
    )


class VideoScriptSummary(BaseModel):
    """Compact summary of a video script for listing."""

    script_id: str
    episode_id: str
    arc_id: Optional[str] = None
    title: str
    total_word_count: int
    estimated_speaking_minutes: float
    created_at: datetime


class GenerateScriptRequest(BaseModel):
    """Request payload for generating a teleprompter video script."""

    episode_id: str = Field(description="Episode ID to script (from curriculum arc or standalone).")
    arc_id: Optional[str] = Field(
        default=None, description="Curriculum arc ID if looking up within a specific arc."
    )
    wpm_target: int = Field(
        default=145, description="Target speaking speed in words per minute (typically 140-150)."
    )
    speaking_style: str = Field(
        default="direct, punchy, conversational, no-fluff",
        description="Tone and rhythm instructions for spoken delivery.",
    )
