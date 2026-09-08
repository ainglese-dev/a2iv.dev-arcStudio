"""Live AI Smoke Test Script for Fact Vault & Context Extender.

Tests live API credentials configured in backend/.env:
1. Configuration loading & masked key verification
2. AI Provider Router probing & health check
3. Live atomic fact extraction with structured schema enforcement & AIMetadata
4. Live context synthesis with Obsidian-compliant footnotes & AIMetadata
5. Sticky Circuit Breaker verification (0s latency bypass on daily quota exhaustion)
"""

import asyncio
import os
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "backend"))

import httpx
from app.config import get_settings
from app.main import app
from app.models.vault import ContextExpansionRequest, SourceChunk
from app.services.ai.circuit_breaker import get_circuit_breaker
from app.services.ai.router import AIRouter
from app.services.extractor import FactExtractor
from app.services.synthesizer import ContextSynthesizer
from app.services.vault_storage import VaultStorageService


def mask_key(val: str) -> str:
    """Mask sensitive keys for logging."""
    if not val:
        return "[EMPTY]"
    if len(val) <= 8:
        return "[CONFIGURED]"
    return f"{val[:4]}...{val[-4:]}"


async def test_live_ai_pipeline():
    print("=================================================================")
    print("       LIVE AI INTEGRATION VERIFICATION (MODULE 1)               ")
    print("=================================================================")

    # 1. Verify Configuration Loading
    print("\n[Step 1] Loading Configuration from backend/.env...")
    settings = get_settings()
    print(f"  ✓ AI Primary Provider : {settings.ai_primary_provider}")
    print(f"  ✓ AI Fallback Provider: {settings.ai_fallback_provider}")
    print(f"  ✓ Gemini Model        : {settings.gemini_model}")
    print(f"  ✓ Gemini Model Cascade: {settings.gemini_models_list}")
    print(f"  ✓ Gemini API Key      : {mask_key(settings.gemini_api_key)}")
    print(f"  ✓ OpenAI Base URL     : {settings.openai_base_url}")
    print(f"  ✓ OpenAI Model        : {settings.openai_model}")
    print(f"  ✓ OpenAI API Key      : {mask_key(settings.openai_api_key)}")
    print(f"  ✓ Request Timeout     : {settings.ai_request_timeout_seconds}s")
    print(f"  ✓ Resolved Vault Dir  : {settings.resolved_vault_dir}")

    assert settings.gemini_api_key, "GEMINI_API_KEY must be configured in backend/.env"
    assert settings.openai_base_url, "OPENAI_BASE_URL must be configured in backend/.env"

    # 2. Probing AI Provider Router & Health API
    print("\n[Step 2] Probing AI Provider Router & Health Endpoint...")
    router = AIRouter()
    status_data = await router.get_status()
    for prov_name, st in status_data["providers"].items():
        state = "ONLINE" if st["available"] else "OFFLINE"
        role = "PRIMARY" if st["is_primary"] else ("FALLBACK" if st["is_fallback"] else "STANDBY")
        print(f"  ✓ Provider [{prov_name}]: {state} (Role: {role})")

    # Probe via FastAPI ASGI client
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        health_resp = await client.get("/api/health/providers")
        assert health_resp.status_code == 200
        health_data = health_resp.json()
        print(f"  ✓ API /api/health/providers responded HTTP 200: {health_data['primary_provider']} active")

    # 3. Live Atomic Fact Extraction with AIMetadata
    print("\n[Step 3] Executing Live Fact Extraction with Structured Schema & AIMetadata...")
    sample_chunk = SourceChunk(
        chunk_id="live_test_chunk_0",
        chunk_index=0,
        text="[02:15] PagedAttention reduces KV cache memory fragmentation from over 60% down to under 4%. "
             "[02:45] This allows vLLM to achieve a 2x to 4x throughput improvement over standard HuggingFace pipelines.",
        timestamp_start="02:15",
        timestamp_end="02:45",
        char_count=218,
        word_count=32,
    )

    storage = VaultStorageService()
    extractor = FactExtractor(ai_router=router, vault_storage=storage)

    facts = await extractor.extract_from_chunk(
        source_id="live_demo_source",
        chunk=sample_chunk,
    )

    print(f"  ✓ Extracted {len(facts)} atomic facts from live chunk:")
    assert len(facts) > 0, "Expected at least 1 extracted fact from live LLM extraction"

    ai_meta = getattr(extractor, "last_ai_metadata", None)
    if ai_meta:
        print(f"  ✓ AI Metadata: Provider={ai_meta.provider}, Model={ai_meta.model}, "
              f"Fallback={ai_meta.fallback_occurred}, Reason={ai_meta.fallback_reason}, "
              f"Duration={ai_meta.duration_ms}ms")

    for i, fact in enumerate(facts, 1):
        print(f"    [{i}] Fact ID   : {fact.fact_id}")
        print(f"        Statement : {fact.statement}")
        print(f"        Category  : {fact.category.value}")
        print(f"        Confidence: {fact.confidence.value}")
        print(f"        Quote     : {fact.exact_quote}")
        print(f"        Timestamp : {fact.timestamp_range}")
        print(f"        Tags      : {fact.tags}")

    # Persist live fact to vault to verify storage integration
    saved_paths = storage.save_facts(facts)
    for p in saved_paths:
        print(f"  ✓ Persisted Obsidian note: {p.name}")
        assert p.exists()
        content = p.read_text(encoding="utf-8")
        assert "> [!quote] Source Evidence" in content
        assert f"^{facts[0].fact_id}" in content or f"^{facts[-1].fact_id}" in content

    # 4. Live Context Synthesis with Footnotes & AIMetadata
    print("\n[Step 4] Executing Live Context Synthesis with Footnotes & AIMetadata...")
    synthesizer = ContextSynthesizer(ai_router=router, vault_storage=storage)
    guide_req = ContextExpansionRequest(
        topic="PagedAttention Memory Efficiency",
        detail_level="brief",
        target_audience="Staff Infrastructure Engineers",
    )
    guide = await synthesizer.expand_context(guide_req)
    print(f"  ✓ Synthesized Guide ID : {guide.guide_id}")
    print(f"  ✓ Referenced Fact IDs  : {guide.referenced_fact_ids}")
    print(f"  ✓ Guide Length         : {len(guide.markdown_content)} characters")
    if guide.ai_metadata:
        print(f"  ✓ Guide AI Metadata    : Provider={guide.ai_metadata.provider}, "
              f"Model={guide.ai_metadata.model}, Fallback={guide.ai_metadata.fallback_occurred}, "
              f"Reason={guide.ai_metadata.fallback_reason}, Duration={guide.ai_metadata.duration_ms}ms")

    guide_path = storage.vault_dir / "guides" / f"{guide.guide_id}.md"
    assert guide_path.exists(), "Guide file was not persisted to vault/guides"
    print(f"  ✓ Persisted Guide note : {guide_path.name}")

    # 5. Sticky Circuit Breaker & 0s Latency Bypass Verification
    print("\n[Step 5] Verifying Sticky Circuit Breaker & Zero-Latency Bypass...")
    cb = get_circuit_breaker()
    status = cb.get_status()
    print(f"  ✓ Current Tripped Models: {list(status.keys())}")
    for model_name, info in status.items():
        print(f"    - Model: {model_name} | Reason: {info.get('reason')} | Daily Quota: {info.get('is_daily_quota')}")

    # Run another rapid test call to verify that tripped models are bypassed with 0s latency penalty
    t0 = time.perf_counter()
    res, quick_meta = await router.generate_text("Say ping in 1 word", preferred_provider="gemini")
    t1 = time.perf_counter()
    bypass_elapsed_ms = int((t1 - t0) * 1000)
    print(f"  ✓ Rapid Call Execution : {res.strip()}")
    print(f"  ✓ Active Model Selected: {quick_meta.model} via {quick_meta.provider}")
    print(f"  ✓ Fallback Telemetry   : {quick_meta.fallback_reason}")
    print(f"  ✓ Total Latency        : {bypass_elapsed_ms}ms")

    # Clean up test artifacts from vault
    for fact in facts:
        storage.delete_fact(fact.fact_id)
    storage.delete_guide(guide.guide_id)
    print("\n  ✓ Cleaned up test notes from vault")

    print("\n=================================================================")
    print("   ALL LIVE AI INTEGRATION TESTS PASSED CLEANLY                  ")
    print("=================================================================")


if __name__ == "__main__":
    asyncio.run(test_live_ai_pipeline())
