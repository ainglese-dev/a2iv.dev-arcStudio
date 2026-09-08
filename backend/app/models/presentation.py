"""Domain models for Module 5: Synced Presentation & Visual Engine."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VisualThemeVariant(str, Enum):
    """Dual visual design archetypes for objective A/B benchmarking."""
    TERMINAL_DARK = "terminal_dark"       # Variant A: Monospaced, SRE console, architecture links
    INFOGRAPHIC_CLEAN = "infographic_clean"  # Variant B: Glassmorphic cards, split-screen comparisons, metric pills


class SlideType(str, Enum):
    """Categorization of slide structure and visual layout intent."""
    TITLE_HOOK = "title_hook"
    ARCHITECTURE_DIAGRAM = "architecture_diagram"
    CODE_BREAKDOWN = "code_breakdown"
    COMPARISON_SPLIT = "comparison_split"
    METRIC_CALLOUT = "metric_callout"
    KEY_TAKEAWAY = "key_takeaway"


class SlideElementVariant(BaseModel):
    """Visual content payload for a specific theme variant."""
    headline: str
    subhead: Optional[str] = None
    bullet_points: List[str] = Field(default_factory=list)
    code_snippet: Optional[str] = None
    code_language: Optional[str] = None
    comparison_left: Optional[Dict[str, Any]] = None   # e.g. {"title": "Origin Status", "status": "Down 502", "color": "rose"}
    comparison_right: Optional[Dict[str, Any]] = None  # e.g. {"title": "Edge Proxy", "status": "Cached 200", "color": "emerald"}
    metric_callouts: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    diagram_nodes: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    badge_pills: Optional[List[str]] = Field(default_factory=list)
    word_count: int = 0


class PresentationSlide(BaseModel):
    """A synchronized slide aligned with a script section and visual cue."""
    slide_id: str
    slide_index: int
    section_index: int
    title: Optional[str] = None
    timestamp_start_s: float
    timestamp_end_s: float
    duration_s: float
    slide_type: SlideType
    cue_marker: str
    spoken_anchor_text: str
    variant_a: SlideElementVariant   # Terminal / Architecture Dark
    variant_b: SlideElementVariant   # Clean Infographic / Comparison


class PresentationObjectiveMetrics(BaseModel):
    """Objective quantitative metrics comparing Variant A and Variant B."""
    cue_coverage_percentage: float = 100.0
    variant_a_avg_words_per_slide: float
    variant_b_avg_words_per_slide: float
    variant_a_cognitive_load_score: float  # 0-100, min(100, avg_words * 3.5)
    variant_b_cognitive_load_score: float
    pacing_alignment_score: float = 98.5


class PresentationDeck(BaseModel):
    """Complete presentation deck synchronized with teleprompter script."""
    deck_id: str
    script_id: str
    script_title: str
    total_slides: int
    total_duration_s: float
    slides: List[PresentationSlide]
    metrics: PresentationObjectiveMetrics
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ai_metadata: Optional[Dict[str, Any]] = None


class GeneratePresentationRequest(BaseModel):
    """Request payload to generate a synchronized presentation deck from a script."""
    script_id: str
    theme_variant: Optional[VisualThemeVariant] = None


class PresentationDeckSummary(BaseModel):
    """Summary representation of a presentation deck for list views."""
    deck_id: str
    script_id: str
    script_title: str
    total_slides: int
    total_duration_s: float
    created_at: datetime
