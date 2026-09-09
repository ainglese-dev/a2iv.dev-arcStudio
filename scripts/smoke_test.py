"""Smoke test suite for Fact Vault & Context Extender backend.

Tests:
1. Deterministic chunking & timestamp parsing
2. Obsidian vault markdown compliance (YAML frontmatter, callouts, block anchors, wikilinks)
3. AI Router auto-failover mechanism (primary error -> fallback success)
4. Fact extraction & Guide synthesis with footnotes
5. FastAPI HTTP endpoints via AsyncClient
"""

import asyncio
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Type

# Ensure backend package is in python path
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "backend"))

from pydantic import BaseModel
import httpx
from app.main import app
from app.models.vault import (
    AtomicFact,
    ConfidenceLevel,
    ContextExpansionRequest,
    FactCategory,
    SourceChunk,
    SourceMetadata,
    SourceType,
    SynthesizedGuide,
)
from app.services.ai.base import BaseLLMProvider
from app.services.ai.router import AIRouter
from app.services.chunker import DocumentChunker
from app.services.extractor import FactExtractor
from app.services.synthesizer import ContextSynthesizer
from app.services.vault_storage import VaultStorageService


# ---------------------------------------------------------------------------
# Mock Providers for Offline / Resilient Testing
# ---------------------------------------------------------------------------
class FailingPrimaryProvider(BaseLLMProvider):
    """Simulates a primary provider experiencing API or rate limit errors."""

    @property
    def provider_name(self) -> str:
        return "gemini_mock_failing"

    async def is_available(self) -> bool:
        return True

    async def generate_text(self, prompt: str, **kwargs) -> str:
        raise ConnectionError("Gemini API rate limit or quota exceeded (simulated)")

    async def generate_structured(self, prompt: str, schema: Optional[Type[BaseModel]] = None, **kwargs) -> Dict[str, Any]:
        raise ConnectionError("Gemini API network timeout (simulated)")


class WorkingFallbackProvider(BaseLLMProvider):
    """Simulates a working local/fallback provider returning compliant outputs."""

    @property
    def provider_name(self) -> str:
        return "openai_mock_working"

    async def is_available(self) -> bool:
        return True

    async def generate_text(self, prompt: str, **kwargs) -> str:
        return """# Architectural Guide: vLLM Inference Optimization

## Executive Overview
PagedAttention addresses KV cache memory fragmentation in LLM serving systems[^1].

## Deep Dive / Technical Architecture
By partitioning contiguous virtual memory into non-contiguous physical blocks, memory waste is minimized[^2].

## Footnotes & Citations
[^1]: [[facts/fact_vllm_01]] ^fact_vllm_01 — PagedAttention minimizes memory waste.
[^2]: [[facts/fact_vllm_02]] ^fact_vllm_02 — KV cache memory efficiency exceeds 96%.
"""

    async def generate_structured(self, prompt: str, schema: Optional[Type[BaseModel]] = None, **kwargs) -> Dict[str, Any]:
        return {
            "facts": [
                {
                    "statement": "PagedAttention achieves 96% memory utilization in LLM serving.",
                    "category": "benchmark_metric",
                    "confidence": "verified",
                    "exact_quote": "PagedAttention achieves near-optimal memory utilization of over 96%.",
                    "timestamp_range": "00:15 - 00:45",
                    "tags": ["vllm", "pagedattention", "benchmarks"],
                },
                {
                    "statement": "KV cache fragmentation is reduced by allocating memory in fixed-size blocks.",
                    "category": "architecture_decision",
                    "confidence": "high",
                    "exact_quote": "KV cache is divided into fixed-size physical blocks.",
                    "timestamp_range": "01:10 - 01:35",
                    "tags": ["kv-cache", "memory-management"],
                },
            ]
        }


# ---------------------------------------------------------------------------
# Test Functions
# ---------------------------------------------------------------------------
def test_chunking():
    print("\n--- [1] Testing DocumentChunker & Timestamps ---")
    sample_transcript = """
[00:05] Welcome back to the systems engineering breakdown.
[00:15] Today we explore vLLM and PagedAttention internals.
[00:30] PagedAttention achieves near-optimal memory utilization of over 96%.
[01:10] KV cache is divided into fixed-size physical blocks instead of static allocations.
[02:45] Benchmarks show up to 4x higher throughput compared to Hugging Face TGI.
[03:20] In conclusion, dynamic page allocation solves the memory fragmentation dilemma.
"""
    chunker = DocumentChunker(default_chunk_size=200, default_overlap=40)
    chunks = chunker.chunk_text(source_id="test_source", text=sample_transcript)

    assert len(chunks) >= 2, f"Expected at least 2 chunks, got {len(chunks)}"
    first_chunk = chunks[0]
    print(f"✓ Chunk 0 ID: {first_chunk.chunk_id}")
    print(f"✓ Chunk 0 Timestamps: {first_chunk.timestamp_start} -> {first_chunk.timestamp_end}")
    assert first_chunk.timestamp_start == "00:05", f"Unexpected start timestamp: {first_chunk.timestamp_start}"
    assert first_chunk.char_count > 0, "Char count should be positive"
    assert first_chunk.word_count > 0, "Word count should be positive"
    print("✓ Chunker successfully segmented transcript and extracted timestamps.")


def test_obsidian_vault_storage(temp_vault_dir: Path):
    print("\n--- [2] Testing Obsidian Vault Markdown Storage & Compliance ---")
    storage = VaultStorageService(vault_dir=temp_vault_dir)

    # 1. Test Source storage
    source_meta = SourceMetadata(
        source_id="src_vllm_deepdive",
        title="vLLM Architecture Deep Dive",
        source_type=SourceType.YOUTUBE_TRANSCRIPT,
        url="https://youtube.com/watch?v=sample123",
        author="Systems Engineering Lab",
        published_date="2026-03-01",
        total_chunks=1,
        tags=["ai", "inference", "vllm"],
        created_at=datetime.now(timezone.utc),
    )
    chunk = SourceChunk(
        chunk_id="src_vllm_deepdive_chunk_0",
        chunk_index=0,
        text="PagedAttention manages KV cache like operating system virtual memory.",
        timestamp_start="00:10",
        timestamp_end="01:00",
        char_count=71,
        word_count=10,
    )
    storage.save_source(metadata=source_meta, chunks=[chunk], raw_content=chunk.text)

    # Verify source file exists on disk and has proper markdown structure
    source_file = temp_vault_dir / "sources" / "src_vllm_deepdive.md"
    assert source_file.exists(), "Source markdown file was not created"
    source_md = source_file.read_text(encoding="utf-8")
    assert "---" in source_md, "Missing YAML frontmatter markers in source file"
    assert "source_id: src_vllm_deepdive" in source_md
    assert "^src_vllm_deepdive_chunk_0" in source_md, "Missing chunk block anchor in source file"
    print("✓ Source note formatted with YAML frontmatter and ^chunk-id block anchor.")

    # Read back source
    retrieved_source = storage.get_source("src_vllm_deepdive")
    assert retrieved_source is not None, "Failed retrieving source"
    meta_back, chunks_back, _ = retrieved_source
    assert meta_back.title == "vLLM Architecture Deep Dive"
    assert len(chunks_back) == 1
    assert chunks_back[0].chunk_id == "src_vllm_deepdive_chunk_0"
    print("✓ Source round-trip retrieval verified.")

    # 2. Test Atomic Fact storage
    fact = AtomicFact(
        fact_id="fact_vllm_01",
        statement="PagedAttention achieves near-optimal memory utilization of over 96%.",
        category=FactCategory.BENCHMARK_METRIC,
        confidence=ConfidenceLevel.VERIFIED,
        source_id="src_vllm_deepdive",
        source_chunk_id="src_vllm_deepdive_chunk_0",
        exact_quote="PagedAttention achieves near-optimal memory utilization of over 96%.",
        timestamp_range="00:30 - 00:50",
        tags=["vllm", "pagedattention", "benchmark"],
        created_at=datetime.now(timezone.utc),
    )
    storage.save_fact(fact)

    fact_file = temp_vault_dir / "facts" / "fact_vllm_01.md"
    assert fact_file.exists(), "Fact markdown file was not created"
    fact_md = fact_file.read_text(encoding="utf-8")
    assert "> [!quote] Source Evidence" in fact_md, "Missing Obsidian quote callout"
    assert "^fact_vllm_01" in fact_md, "Missing Obsidian block anchor"
    assert "[[src_vllm_deepdive]]" in fact_md, "Missing Obsidian source wikilink"
    print("✓ Atomic fact note contains pure Obsidian callout (> [!quote]), block anchor (^fact-id), and wikilinks.")

    # Read back fact
    retrieved_fact = storage.get_fact("fact_vllm_01")
    assert retrieved_fact is not None, "Failed retrieving fact"
    assert retrieved_fact.statement == fact.statement
    assert retrieved_fact.category == FactCategory.BENCHMARK_METRIC
    assert retrieved_fact.confidence == ConfidenceLevel.VERIFIED
    assert retrieved_fact.exact_quote == fact.exact_quote
    print("✓ Atomic fact round-trip retrieval verified.")


async def test_ai_router_and_failover():
    print("\n--- [3] Testing AI Router Auto-Failover ---")
    router = AIRouter(
        gemini_provider=FailingPrimaryProvider(),
        openai_provider=WorkingFallbackProvider(),
    )
    # Primary is configured as gemini (which fails), fallback is openai_compatible (which succeeds)
    router.primary_name = "gemini"
    router.fallback_name = "openai_compatible"

    # Test text failover with AIMetadata
    text_result, ai_meta = await router.generate_text("Explain vLLM.")
    assert ai_meta.provider == "openai_compatible", f"Expected fallback provider, got {ai_meta.provider}"
    assert ai_meta.fallback_occurred is True, "Expected fallback_occurred to be True"
    assert ai_meta.duration_ms >= 0
    assert "vLLM" in text_result
    print(f"✓ AI Router auto-failed over to '{ai_meta.provider}' ({ai_meta.model}) with duration {ai_meta.duration_ms}ms.")

    # Test structured failover with AIMetadata
    struct_result, s_ai_meta = await router.generate_structured("Extract facts.")
    assert s_ai_meta.provider == "openai_compatible"
    assert s_ai_meta.fallback_occurred is True
    assert "facts" in struct_result
    assert len(struct_result["facts"]) == 2
    print(f"✓ AI Router structured failover returned valid AIMetadata: {s_ai_meta.model_dump()}")

    # Test Sticky Circuit Breaker
    from app.services.ai.circuit_breaker import get_circuit_breaker
    cb = get_circuit_breaker()
    cb.trip("mock_test_model", reason="Quota exceeded 20 RPD hit", is_daily_quota=True)
    assert cb.is_tripped("mock_test_model") is True
    trip_info = cb.get_trip_info("mock_test_model")
    assert trip_info["is_daily_quota"] is True
    cb.reset("mock_test_model")
    assert cb.is_tripped("mock_test_model") is False
    print("✓ Sticky Circuit Breaker tripping, telemetry, and reset verified.")


async def test_fact_extraction_and_synthesis(temp_vault_dir: Path):
    print("\n--- [4] Testing Fact Extractor & Context Synthesizer ---")
    storage = VaultStorageService(vault_dir=temp_vault_dir)
    router = AIRouter(
        gemini_provider=FailingPrimaryProvider(),
        openai_provider=WorkingFallbackProvider(),
    )
    router.primary_name = "gemini"
    router.fallback_name = "openai_compatible"

    # Ingest a source into the storage
    chunk = SourceChunk(
        chunk_id="src_vllm_c0",
        chunk_index=0,
        text="PagedAttention achieves near-optimal memory utilization of over 96%. KV cache is divided into fixed-size physical blocks.",
        timestamp_start="00:15",
        timestamp_end="01:35",
        char_count=122,
        word_count=17,
    )
    meta = SourceMetadata(
        source_id="src_vllm_c0_source",
        title="vLLM Paper",
        source_type=SourceType.DOCUMENTATION,
        created_at=datetime.now(timezone.utc),
    )
    storage.save_source(meta, [chunk], chunk.text)

    # 1. Fact Extraction
    extractor = FactExtractor(ai_router=router, vault_storage=storage)
    extraction_result = await extractor.extract_from_source("src_vllm_c0_source")
    assert len(extraction_result.facts) == 2, f"Expected 2 extracted facts, got {len(extraction_result.facts)}"
    assert extraction_result.ai_metadata is not None, "Missing ai_metadata on FactExtractionResult"
    print(f"✓ Extraction result includes ai_metadata: {extraction_result.ai_metadata.model_dump()}")
    fact0 = extraction_result.facts[0]
    print(f"✓ Extracted fact statement: '{fact0.statement}'")
    print(f"✓ Extracted fact category: {fact0.category.value}, tags: {fact0.tags}")

    # Verify extracted facts are stored in the vault
    vault_facts = storage.list_facts()
    assert len(vault_facts) >= 2, "Extracted facts were not saved in vault"
    print(f"✓ Stored {len(vault_facts)} facts in vault.")

    # 2. Context Synthesis
    synthesizer = ContextSynthesizer(ai_router=router, vault_storage=storage)
    req = ContextExpansionRequest(
        topic="vLLM Inference Optimization",
        detail_level="comprehensive",
    )
    guide = await synthesizer.expand_context(req)
    assert guide.topic == "vLLM Inference Optimization"
    assert guide.ai_metadata is not None, "Missing ai_metadata on SynthesizedGuide"
    print(f"✓ Guide includes ai_metadata: {guide.ai_metadata.model_dump()}")
    assert "[^1]" in guide.markdown_content, "Missing footnote citation [^1] in synthesized guide"
    assert "## Footnotes & Citations" in guide.markdown_content, "Missing Footnotes section in guide"
    print(f"✓ Generated Synthesized Guide ID: {guide.guide_id}")
    print("✓ Markdown guide contains verified footnotes [^n] referencing fact notes.")

    # Verify guide is saved in vault
    guide_file = temp_vault_dir / "guides" / f"{guide.guide_id}.md"
    assert guide_file.exists(), "Guide markdown file was not saved to vault"
    print("✓ Guide note successfully persisted to vault/guides/.")


async def test_fastapi_endpoints(temp_vault_dir: Path):
    print("\n--- [5] Testing FastAPI Endpoints ---")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"
        print("✓ GET /api/health passed")

        # 2. Provider status
        resp = await client.get("/api/health/providers")
        assert resp.status_code == 200
        assert "providers" in resp.json()
        print("✓ GET /api/health/providers passed")

        # 3. Ingest source
        ingest_payload = {
            "title": "Smoke Test Audio Transcript",
            "content": "[00:10] First point of discussion. [00:40] Second technical observation on KV cache.",
            "source_type": "audio_transcript",
            "url": "https://example.com/audio",
            "tags": ["smoke_test", "audio"],
        }
        resp = await client.post("/api/sources/ingest", json=ingest_payload)
        assert resp.status_code == 200
        data = resp.json()
        source_id = data["source"]["source_id"]
        assert data["chunks_count"] >= 1
        print(f"✓ POST /api/sources/ingest created source '{source_id}' with {data['chunks_count']} chunk(s)")

        # 4. List sources
        resp = await client.get("/api/sources")
        assert resp.status_code == 200
        sources_list = resp.json()
        assert any(s["source_id"] == source_id for s in sources_list)
        print("✓ GET /api/sources listed ingested source")

        # 5. Get source
        resp = await client.get(f"/api/sources/{source_id}")
        assert resp.status_code == 200
        assert resp.json()["metadata"]["source_id"] == source_id
        print("✓ GET /api/sources/{id} retrieved source details")

        # 6. List facts
        resp = await client.get("/api/facts")
        assert resp.status_code == 200
        print(f"✓ GET /api/facts returned {len(resp.json())} facts")

        # 7. List guides
        resp = await client.get("/api/expand/guides")
        assert resp.status_code == 200
        print(f"✓ GET /api/expand/guides returned {len(resp.json())} guides")

        # 8. Delete source
        del_resp = await client.delete(f"/api/sources/{source_id}")
        assert del_resp.status_code == 200
        print(f"✓ DELETE /api/sources/{source_id} successfully removed source")

        # 9. Test Background Synthesis Job Endpoints (resilient across page reloads)
        synth_payload = {
            "topic": "Background Job Smoke Verification",
            "detail_level": "concise",
        }
        start_job_resp = await client.post("/api/expand/jobs/start", json=synth_payload)
        assert start_job_resp.status_code == 200
        job_data = start_job_resp.json()
        assert "job_id" in job_data
        assert job_data["status"] == "running"
        assert job_data["topic"] == "Background Job Smoke Verification"
        job_id = job_data["job_id"]
        print(f"✓ POST /api/expand/jobs/start spawned persistent job '{job_id}'")

        # Query active job
        active_job_resp = await client.get("/api/expand/jobs/active")
        assert active_job_resp.status_code == 200
        active_job = active_job_resp.json()
        assert active_job is not None
        assert active_job["job_id"] == job_id
        print(f"✓ GET /api/expand/jobs/active successfully recovered active job '{job_id}'")

        # Query specific job by ID
        get_job_resp = await client.get(f"/api/expand/jobs/{job_id}")
        assert get_job_resp.status_code == 200
        assert get_job_resp.json()["job_id"] == job_id
        print(f"✓ GET /api/expand/jobs/{job_id} confirmed job status tracking")


async def main():
    print("=================================================================")
    print("   FACT VAULT & CONTEXT EXTENDER - SMOKE VERIFICATION SUITE       ")
    print("=================================================================")

    # Create temporary vault dir for isolated testing
    temp_dir = tempfile.mkdtemp(prefix="fact_vault_test_")
    temp_vault_path = Path(temp_dir)

    try:
        test_chunking()
        test_obsidian_vault_storage(temp_vault_path)
        await test_ai_router_and_failover()
        await test_fact_extraction_and_synthesis(temp_vault_path)
        await test_fastapi_endpoints(temp_vault_path)
        print("\n=================================================================")
        print("   ALL SMOKE TESTS PASSED CLEANLY (5/5 STEPS VERIFIED)            ")
        print("=================================================================")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(main())
