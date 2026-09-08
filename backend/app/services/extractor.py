"""Fact extraction service using AI Router and structured outputs."""

import logging
import time
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.vault import (
    AtomicFact,
    ConfidenceLevel,
    FactCategory,
    FactExtractionResult,
    SourceChunk,
)
from app.services.ai.router import AIRouter
from app.services.vault_storage import VaultStorageService

logger = logging.getLogger(__name__)


class ExtractedFactItem(BaseModel):
    statement: str = Field(description="Self-contained, atomic fact statement.")
    category: FactCategory = Field(
        default=FactCategory.GENERAL,
        description="Category: technical_spec, workflow_step, code_pattern, architecture_decision, pitfall_caveat, benchmark_metric, tool_command, general.",
    )
    confidence: ConfidenceLevel = Field(
        default=ConfidenceLevel.HIGH,
        description="Confidence level: verified, inferred, speculative, high, medium, low.",
    )
    exact_quote: Optional[str] = Field(
        default=None,
        description="Verbatim quote from the chunk supporting the statement.",
    )
    timestamp_range: Optional[str] = Field(
        default=None,
        description="Timestamp range from the chunk if available (e.g. 02:15 - 02:40).",
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Technical keywords or conceptual tags.",
    )


class FactExtractionSchema(BaseModel):
    facts: List[ExtractedFactItem] = Field(default_factory=list)


EXTRACTION_SYSTEM_PROMPT = """You are an expert Research Knowledge Intelligence engine.
Your mission is to extract precise, atomic facts from technical transcripts, articles, and documentation.

Rules:
1. ATOMICITY: Each fact statement must be a single, complete, standalone proposition without vague pronouns.
2. VERIFIABILITY: Include the exact verbatim quote from the text supporting the fact in `exact_quote`.
3. PROVENANCE: Preserve timestamps if present in the text (e.g., [02:15] to [02:45]).
4. CATEGORIZATION: Choose the most accurate category:
   - technical_spec: Hardware specs, memory limits, versions, parameters.
   - workflow_step: Procedural actions, installation sequences, recipes.
   - code_pattern: Coding conventions, snippets, API patterns.
   - architecture_decision: Trade-offs, design choices, system components.
   - pitfall_caveat: Gotchas, memory leaks, bugs, rate limits.
   - benchmark_metric: Performance numbers, latency, throughput, speedups.
   - tool_command: CLI commands, flags, configurations.
   - general: High-level concepts and descriptions.
5. ACCURACY: Do not hallucinate or extrapolate beyond what is stated in the chunk.
"""


class FactExtractor:
    """Extracts atomic facts from source chunks."""

    def __init__(
        self,
        ai_router: Optional[AIRouter] = None,
        vault_storage: Optional[VaultStorageService] = None,
    ):
        self.router = ai_router or AIRouter()
        self.vault = vault_storage or VaultStorageService()

    async def extract_from_chunk(
        self,
        source_id: str,
        chunk: SourceChunk,
        preferred_provider: Optional[str] = None,
    ) -> List[AtomicFact]:
        """Extract atomic facts from a single chunk."""
        prompt = f"""Source ID: {source_id}
Chunk ID: {chunk.chunk_id}
Chunk Index: {chunk.chunk_index}
Timestamp Start: {chunk.timestamp_start or 'N/A'}
Timestamp End: {chunk.timestamp_end or 'N/A'}

Content:
---
{chunk.text}
---

Extract all atomic facts found in the content above following the required schema."""

        try:
            structured_resp, ai_meta = await self.router.generate_structured(
                prompt=prompt,
                schema=FactExtractionSchema,
                system_prompt=EXTRACTION_SYSTEM_PROMPT,
                temperature=0.1,
                preferred_provider=preferred_provider,
            )
            self.last_ai_metadata = ai_meta
            raw_facts = structured_resp.get("facts", [])
        except Exception as e:
            logger.error("Fact extraction failed on chunk %s: %s", chunk.chunk_id, e)
            return []

        atomic_facts: List[AtomicFact] = []
        for item_data in raw_facts:
            try:
                fact_obj = ExtractedFactItem(**item_data)
                short_id = uuid.uuid4().hex[:8]
                fact_id = f"fact_{source_id[:12]}_{chunk.chunk_index}_{short_id}"

                ts_range = fact_obj.timestamp_range
                if not ts_range and (chunk.timestamp_start or chunk.timestamp_end):
                    ts_range = f"{chunk.timestamp_start or ''} - {chunk.timestamp_end or ''}".strip(" -")

                atomic_facts.append(
                    AtomicFact(
                        fact_id=fact_id,
                        statement=fact_obj.statement,
                        category=fact_obj.category,
                        confidence=fact_obj.confidence,
                        source_id=source_id,
                        source_chunk_id=chunk.chunk_id,
                        exact_quote=fact_obj.exact_quote,
                        timestamp_range=ts_range,
                        tags=fact_obj.tags,
                    )
                )
            except Exception as parse_err:
                logger.warning("Failed parsing fact item: %s", parse_err)

        return atomic_facts

    async def extract_from_source(
        self,
        source_id: str,
        chunk_ids: Optional[List[str]] = None,
        preferred_provider: Optional[str] = None,
    ) -> FactExtractionResult:
        """Extract facts from all or specified chunks of a source and persist to vault."""
        source_data = self.vault.get_source(source_id)
        if not source_data:
            raise ValueError(f"Source with id '{source_id}' not found in vault.")

        meta, chunks, _ = source_data

        target_chunks = chunks
        if chunk_ids:
            target_chunks = [c for c in chunks if c.chunk_id in chunk_ids]

        all_facts: List[AtomicFact] = []
        processed_chunks: List[str] = []

        start_time = time.time()
        for chunk in target_chunks:
            facts = await self.extract_from_chunk(
                source_id=source_id,
                chunk=chunk,
                preferred_provider=preferred_provider,
            )
            all_facts.extend(facts)
            processed_chunks.append(chunk.chunk_id)

        # Persist extracted facts in vault
        self.vault.save_facts(all_facts)

        # Attach AI execution metadata
        ai_meta = getattr(self, "last_ai_metadata", None)
        if ai_meta:
            ai_meta.duration_ms = int((time.time() - start_time) * 1000)
        else:
            ai_meta = AIMetadata(
                provider=self.router.primary_name,
                model="unknown",
                duration_ms=int((time.time() - start_time) * 1000),
            )

        return FactExtractionResult(
            source_id=source_id,
            facts=all_facts,
            chunk_ids_processed=processed_chunks,
            metadata={
                "total_facts_extracted": len(all_facts),
                "chunks_count": len(processed_chunks),
            },
            ai_metadata=ai_meta,
        )
