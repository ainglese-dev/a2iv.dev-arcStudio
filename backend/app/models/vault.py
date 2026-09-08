"""Pydantic models and Enums for the Fact Vault & Context Extender."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


def _current_utc() -> datetime:
    return datetime.now(timezone.utc)


class SourceType(str, Enum):
    YOUTUBE_TRANSCRIPT = "youtube_transcript"
    ARTICLE = "article"
    PDF = "pdf"
    DOCUMENTATION = "documentation"
    AUDIO_TRANSCRIPT = "audio_transcript"
    MANUAL_NOTE = "manual_note"
    PRACTITIONER_SEED = "practitioner_seed"
    OTHER = "other"


class FactCategory(str, Enum):
    TECHNICAL_SPEC = "technical_spec"
    WORKFLOW_STEP = "workflow_step"
    CODE_PATTERN = "code_pattern"
    ARCHITECTURE_DECISION = "architecture_decision"
    PITFALL_CAVEAT = "pitfall_caveat"
    BENCHMARK_METRIC = "benchmark_metric"
    TOOL_COMMAND = "tool_command"
    GENERAL = "general"


class ConfidenceLevel(str, Enum):
    VERIFIED = "verified"
    INFERRED = "inferred"
    SPECULATIVE = "speculative"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class SourceChunk(BaseModel):
    chunk_id: str
    chunk_index: int
    text: str
    timestamp_start: Optional[str] = None
    timestamp_end: Optional[str] = None
    char_count: int = 0
    word_count: int = 0


class AtomicFact(BaseModel):
    fact_id: str
    statement: str
    category: FactCategory = FactCategory.GENERAL
    confidence: ConfidenceLevel = ConfidenceLevel.HIGH
    source_id: str
    source_chunk_id: Optional[str] = None
    exact_quote: Optional[str] = None
    timestamp_range: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_current_utc)


class AIMetadata(BaseModel):
    provider: str
    model: str
    fallback_occurred: bool = False
    fallback_reason: Optional[str] = None
    duration_ms: int = 0

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, str):
            return self.provider == other or self.model == other
        return super().__eq__(other)

    def __str__(self) -> str:
        return self.provider


class FactExtractionResult(BaseModel):
    source_id: str
    facts: List[AtomicFact] = Field(default_factory=list)
    chunk_ids_processed: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    ai_metadata: Optional[AIMetadata] = None


class SourceMetadata(BaseModel):
    source_id: str
    title: str
    source_type: SourceType = SourceType.ARTICLE
    url: Optional[str] = None
    author: Optional[str] = None
    published_date: Optional[str] = None
    total_chunks: int = 0
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_current_utc)


class IngestSourceRequest(BaseModel):
    title: str
    content: str
    source_type: SourceType = SourceType.ARTICLE
    url: Optional[str] = None
    author: Optional[str] = None
    published_date: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    chunk_size: int = 1500
    chunk_overlap: int = 200


class ExtractFactsRequest(BaseModel):
    source_id: str
    chunk_ids: Optional[List[str]] = None


class ContextExpansionRequest(BaseModel):
    topic: str
    source_ids: Optional[List[str]] = None
    categories: Optional[List[FactCategory]] = None
    tags: Optional[List[str]] = None
    detail_level: str = "comprehensive"
    target_audience: Optional[str] = None


class SynthesizedGuide(BaseModel):
    guide_id: str
    topic: str
    markdown_content: str
    referenced_fact_ids: List[str] = Field(default_factory=list)
    referenced_source_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_current_utc)
    ai_metadata: Optional[AIMetadata] = None


class PractitionerLens(str, Enum):
    AUTO = "auto"
    DEEP_DIVE = "deep_dive"
    LESSONS_PITFALLS = "lessons_pitfalls"
    CASE_STUDY = "case_study"
    # Domain-specific & backwards-compatible aliases
    TECH_DEVOPS_INCIDENT = "tech_devops_incident"
    ADULT_LEARNING_PLATEAU = "adult_learning_plateau"
    FINANCE_RISK_PSYCHOLOGY = "finance_risk_psychology"
    GENERAL_PRACTITIONER = "general_practitioner"


class SeedPractitionerRequest(BaseModel):
    topic: str
    lens: PractitionerLens = PractitionerLens.AUTO
    target_audience: Optional[str] = None


class SeedPractitionerResponse(BaseModel):
    source: SourceMetadata
    brief_markdown: str
    pain_points: List[str]
    pitfalls: List[str]
    facts: List[AtomicFact]
    ai_metadata: Optional[Dict[str, Any]] = None
