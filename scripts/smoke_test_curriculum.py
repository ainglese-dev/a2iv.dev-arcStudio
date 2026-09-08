"""Smoke test suite for Module 2: Arc & Curriculum Architect.

Tests:
1. Curriculum Domain Models validation (ArcTier, VideoEpisode, VideoArc, Request schemas)
2. Obsidian vault markdown compliance (YAML frontmatter, tables, callouts, wikilinks)
3. CurriculumGenerator agent orchestration with AI Router auto-failover & AIMetadata
4. FastAPI HTTP endpoints via AsyncClient (/api/curriculum/*)
"""

import asyncio
from datetime import datetime, timezone
from pathlib import Path
import shutil
import sys
import tempfile
from typing import Any, Dict, List, Optional, Type

# Ensure backend package is in python path
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "backend"))

from pydantic import BaseModel
import frontmatter
import httpx

from app.main import app
from app.models.curriculum import (
    ArcTier,
    GenerateCurriculumRequest,
    UpdateVideoArcRequest,
    VideoArc,
    VideoArcSummary,
    VideoEpisode,
)
from app.models.vault import (
    AIMetadata,
    AtomicFact,
    ConfidenceLevel,
    FactCategory,
    SourceChunk,
    SourceMetadata,
    SourceType,
)
from app.services.ai.base import BaseLLMProvider
from app.services.ai.router import AIRouter
from app.services.curriculum_generator import CurriculumGenerator
from app.services.curriculum_storage import CurriculumStorageService
from app.services.vault_storage import VaultStorageService


# ---------------------------------------------------------------------------
# Mock AI Providers for Deterministic Pipeline Testing
# ---------------------------------------------------------------------------
class FailingPrimaryCurriculumProvider(BaseLLMProvider):
    """Simulates primary provider failure to verify router auto-failover."""

    @property
    def provider_name(self) -> str:
        return "gemini_mock_failing"

    async def is_available(self) -> bool:
        return True

    async def generate_text(self, prompt: str, **kwargs) -> str:
        raise ConnectionError("Simulated primary provider rate limit 429")

    async def generate_structured(
        self, prompt: str, schema: Optional[Type[BaseModel]] = None, **kwargs
    ) -> Dict[str, Any]:
        raise ConnectionError("Simulated primary provider rate limit 429")


class WorkingFallbackCurriculumProvider(BaseLLMProvider):
    """Simulates working fallback provider returning valid 3-tier curriculum schema."""

    @property
    def provider_name(self) -> str:
        return "openai_mock_working"

    async def is_available(self) -> bool:
        return True

    async def generate_text(self, prompt: str, **kwargs) -> str:
        return "Curriculum text generated."

    async def generate_structured(
        self, prompt: str, schema: Optional[Type[BaseModel]] = None, **kwargs
    ) -> Dict[str, Any]:
        return {
            "title": "Mastering High-Throughput LLM Inference with vLLM",
            "description": "A progressive 3-tier masterclass from memory architecture fundamentals to hands-on serving optimization.",
            "episodes": [
                {
                    "episode_number": 1,
                    "tier": "fundamentals",
                    "title": "Why KV Caching Blows Up GPU Memory",
                    "hook": "Your GPU cluster runs out of VRAM the second ten concurrent users send queries, nobody can explain where 60% of memory went, and you're staring at an outage alert. You cannot tell your VP that adding more $30,000 GPUs is the fix. Fix your KV cache now.",
                    "learning_objectives": [
                        "Explain the quadratic memory growth of attention mechanisms",
                        "Identify the bottleneck of contiguous tensor allocation",
                        "Define internal and external memory fragmentation in GPU VRAM",
                    ],
                    "key_facts_referenced": ["fact_vllm_01"],
                    "target_duration_minutes": 6,
                    "recommended_visuals": [
                        "Animation of static GPU memory allocation filling up with variable prompt lengths",
                        "Split-screen comparison of contiguous vs fragmented RAM",
                    ],
                    "lab_exercise": None,
                },
                {
                    "episode_number": 2,
                    "tier": "advanced",
                    "title": "PagedAttention Under the Hood: Virtual Memory for LLMs",
                    "hook": "Production latency just doubled during peak traffic, batch queues are stalling, and engineering leadership is questioning your architectural roadmap before next week's review. Sticking with naive memory management is career suicide. Rebuild your serving tier with PagedAttention today.",
                    "learning_objectives": [
                        "Diagram the physical block table mapping for dynamic KV caches",
                        "Analyze page sharing mechanisms during parallel decoding and beam search",
                        "Evaluate 96% memory utilization benchmarks against HuggingFace TGI",
                    ],
                    "key_facts_referenced": ["fact_vllm_01", "fact_vllm_02"],
                    "target_duration_minutes": 7,
                    "recommended_visuals": [
                        "Interactive 3D memory block lookup table diagram",
                        "Benchmark bar graph showing 2x-4x throughput gains",
                    ],
                    "lab_exercise": None,
                },
                {
                    "episode_number": 3,
                    "tier": "lab",
                    "title": "Hands-On Lab: Deploying & Benchmarking vLLM with Docker",
                    "hook": "Your team is waiting four hours for instances to build while executives complain about runaway AI infrastructure costs. Walking into sprint review with zero benchmark validation will derail your deployment. Stop burning compute budget on bloated containers. Deploy and stress-test right now.",
                    "learning_objectives": [
                        "Launch an OpenAI-compatible vLLM container with custom GPU memory utilization",
                        "Execute throughput benchmarking using vLLM benchmark_serving script",
                        "Inspect continuous batching metrics via Prometheus endpoints",
                    ],
                    "key_facts_referenced": ["fact_vllm_02"],
                    "target_duration_minutes": 5,
                    "recommended_visuals": [
                        "Terminal screen recording deploying docker container",
                        "Live terminal graphing token throughput",
                    ],
                    "lab_exercise": "docker run --gpus all -v ~/.cache/huggingface:/root/.cache/huggingface -p 8000:8000 --ipc=host vllm/vllm-openai:latest --model Qwen/Qwen2.5-7B-Instruct --gpu-memory-utilization 0.90",
                },
            ],
        }


# ---------------------------------------------------------------------------
# Test 1: Domain Models Validation
# ---------------------------------------------------------------------------
def test_curriculum_domain_models():
    print("\n--- [1] Testing Curriculum Domain Models Validation ---")

    # 1. Verify ArcTier Enum values
    assert ArcTier.FUNDAMENTALS.value == "fundamentals"
    assert ArcTier.ADVANCED.value == "advanced"
    assert ArcTier.LAB.value == "lab"
    print("  ✓ ArcTier Enum contains 'fundamentals', 'advanced', and 'lab'")

    # 2. Verify VideoEpisode model
    ep = VideoEpisode(
        episode_id="arc_test_ep1",
        episode_number=1,
        tier=ArcTier.FUNDAMENTALS,
        title="Intro to GPU Paging",
        hook="Why does GPU memory fragment?",
        learning_objectives=["Understand paging", "Avoid OOM errors"],
        key_facts_referenced=["fact_001", "fact_002"],
        target_duration_minutes=6,
        recommended_visuals=["Architecture diagram"],
        lab_exercise=None,
    )
    assert ep.episode_number == 1
    assert ep.target_duration_minutes == 6
    assert ep.tier == ArcTier.FUNDAMENTALS
    print("  ✓ VideoEpisode instantiated and validated with 6-minute target duration")

    # 3. Verify VideoArc model
    arc = VideoArc(
        arc_id="arc_test_001",
        title="GPU Memory Masterclass",
        topic="vLLM PagedAttention",
        description="Comprehensive arc on memory architecture.",
        episodes=[ep],
        total_episodes=1,
        estimated_total_minutes=6,
        sources_referenced=["src_vllm_paper"],
        created_at=datetime.now(timezone.utc),
    )
    assert arc.arc_id == "arc_test_001"
    assert arc.total_episodes == 1
    assert arc.estimated_total_minutes == 6
    print("  ✓ VideoArc instantiated and validated")

    # 4. Verify Request Models
    gen_req = GenerateCurriculumRequest(
        topic="vLLM Inference",
        target_episode_count=5,
        target_audience="Machine Learning Engineers",
    )
    assert gen_req.target_episode_count == 5
    print("  ✓ GenerateCurriculumRequest validated")


# ---------------------------------------------------------------------------
# Test 2: Obsidian Vault Storage Roundtrip
# ---------------------------------------------------------------------------
def test_obsidian_curriculum_storage(temp_vault_dir: Path):
    print("\n--- [2] Testing Obsidian Vault Storage Roundtrip ---")
    storage = CurriculumStorageService(vault_dir=temp_vault_dir)

    # 1. Construct multi-tier VideoArc
    episodes = [
        VideoEpisode(
            episode_id="arc_vllm_ep1",
            episode_number=1,
            tier=ArcTier.FUNDAMENTALS,
            title="The KV Cache Dilemma",
            hook="Your cluster is dropping user requests, VRAM is completely locked at 99%, and your monitoring dashboard offers zero actionable clues. Telling customers your LLM is broken is not an option. Master your KV cache architecture right now.",
            learning_objectives=["Understand KV cache", "Identify memory limits"],
            key_facts_referenced=["fact_vllm_01"],
            target_duration_minutes=6,
            recommended_visuals=["Memory layout slide"],
            lab_exercise=None,
        ),
        VideoEpisode(
            episode_id="arc_vllm_ep2",
            episode_number=2,
            tier=ArcTier.ADVANCED,
            title="PagedAttention Architecture",
            hook="Inference latency is spiking 300% under concurrent traffic, while your GPU memory sits 60% fragmented and unusable. Explaining a six-figure cloud bill blowout to the CFO will kill your AI initiative. Switch to PagedAttention today.",
            learning_objectives=["Diagram page tables", "Analyze sharing"],
            key_facts_referenced=["fact_vllm_01", "fact_vllm_02"],
            target_duration_minutes=7,
            recommended_visuals=["Block table animation"],
            lab_exercise=None,
        ),
        VideoEpisode(
            episode_id="arc_vllm_ep3",
            episode_number=3,
            tier=ArcTier.LAB,
            title="Deploying vLLM in Docker",
            hook="Your developers are blocked waiting on slow, monolithic VM deployments while competitors ship faster AI features every week. Delivering half-baked benchmarks destroys engineering credibility. Deploy our optimized vLLM container right now.",
            learning_objectives=["Launch Docker container", "Measure throughput"],
            key_facts_referenced=["fact_vllm_02"],
            target_duration_minutes=5,
            recommended_visuals=["Terminal demo"],
            lab_exercise="docker run -it vllm/vllm-openai",
        ),
    ]

    arc = VideoArc(
        arc_id="arc_vllm_production",
        title="High-Throughput vLLM Serving",
        topic="vLLM Architecture",
        description="End-to-end curriculum on vLLM serving optimization.",
        episodes=episodes,
        total_episodes=len(episodes),
        estimated_total_minutes=sum(e.target_duration_minutes for e in episodes),
        sources_referenced=["src_vllm_paper"],
        created_at=datetime.now(timezone.utc),
        ai_metadata=AIMetadata(
            provider="openai_mock_working",
            model="qwen-3.8",
            fallback_occurred=True,
            fallback_reason="Primary simulated failure",
            duration_ms=125,
        ),
    )

    # 2. Save arc to vault
    saved_path = storage.save_arc(arc)
    assert saved_path.exists(), f"File {saved_path} does not exist"
    print(f"  ✓ Arc saved to Obsidian note at: {saved_path}")

    # 3. Verify Obsidian Markdown formatting
    content = saved_path.read_text(encoding="utf-8")
    post = frontmatter.loads(content)

    # Frontmatter verification
    assert post.metadata["arc_id"] == "arc_vllm_production"
    assert post.metadata["total_episodes"] == 3
    assert post.metadata["estimated_total_minutes"] == 18
    assert len(post.metadata["episodes"]) == 3
    assert post.metadata["ai_metadata"]["fallback_occurred"] is True
    assert post.metadata["ai_metadata"]["duration_ms"] == 125
    print("  ✓ Frontmatter contains structured arc metadata and episodes array")

    # Body Markdown verification: Callout, Table, Wikilinks
    assert "> [!abstract] Course Arc Overview" in post.content, "Missing [!abstract] callout"
    assert "| # | Tier | Title | Duration | Grounded Facts |" in post.content, "Missing episode progression table"
    assert "[[facts/fact_vllm_01]]" in post.content, "Missing wikilink [[facts/fact_vllm_01]]"
    assert "[[facts/fact_vllm_02]]" in post.content, "Missing wikilink [[facts/fact_vllm_02]]"
    assert "> [!example] Hands-On Lab Challenge" in post.content, "Missing [!example] callout for lab tier"
    print("  ✓ Markdown body verified: callouts, markdown table, and wikilinks [[facts/...]]")

    # 4. Read back via get_arc
    loaded_arc = storage.get_arc("arc_vllm_production")
    assert loaded_arc is not None
    assert loaded_arc.title == "High-Throughput vLLM Serving"
    assert len(loaded_arc.episodes) == 3
    assert loaded_arc.episodes[0].tier == ArcTier.FUNDAMENTALS
    assert loaded_arc.episodes[1].tier == ArcTier.ADVANCED
    assert loaded_arc.episodes[2].tier == ArcTier.LAB
    assert loaded_arc.episodes[2].lab_exercise == "docker run -it vllm/vllm-openai"
    print("  ✓ get_arc roundtrip returned exact 3-tier hierarchy and episode fields")

    # 5. List arcs
    summaries = storage.list_arcs()
    assert len(summaries) >= 1
    assert any(s.arc_id == "arc_vllm_production" for s in summaries)
    print(f"  ✓ list_arcs returned {len(summaries)} curriculum arc summary(ies)")

    # 6. Update arc
    update_req = UpdateVideoArcRequest(
        title="High-Throughput vLLM Serving (Updated)",
        description="Updated course curriculum description.",
    )
    updated = storage.update_arc("arc_vllm_production", update_req)
    assert updated is not None
    assert updated.title == "High-Throughput vLLM Serving (Updated)"
    print("  ✓ update_arc updated title successfully")

    # 7. Delete arc
    deleted = storage.delete_arc("arc_vllm_production")
    assert deleted is True
    assert not saved_path.exists()
    assert storage.get_arc("arc_vllm_production") is None
    print("  ✓ delete_arc successfully removed note from vault")


# ---------------------------------------------------------------------------
# Test 3: CurriculumGenerator Agent Orchestration & Auto-Failover
# ---------------------------------------------------------------------------
async def test_curriculum_generator_orchestration(temp_vault_dir: Path):
    print("\n--- [3] Testing CurriculumGenerator Agent & AI Router Auto-Failover ---")

    vault_storage = VaultStorageService(vault_dir=temp_vault_dir)
    curriculum_storage = CurriculumStorageService(vault_dir=temp_vault_dir)

    # Ingest facts to ground curriculum
    fact1 = AtomicFact(
        fact_id="fact_vllm_01",
        statement="PagedAttention achieves 96% memory utilization in LLM serving by partitioning KV cache into virtual blocks.",
        category=FactCategory.BENCHMARK_METRIC,
        confidence=ConfidenceLevel.VERIFIED,
        exact_quote="PagedAttention achieves near-optimal memory utilization of over 96%.",
        source_id="src_vllm_paper",
        tags=["vllm", "memory", "pagedattention"],
        created_at=datetime.now(timezone.utc),
    )
    fact2 = AtomicFact(
        fact_id="fact_vllm_02",
        statement="Continuous batching in vLLM yields 2x-4x throughput improvements over static batching systems.",
        category=FactCategory.BENCHMARK_METRIC,
        confidence=ConfidenceLevel.VERIFIED,
        exact_quote="Continuous batching with PagedAttention increases serving throughput by 2-4x.",
        source_id="src_vllm_paper",
        tags=["vllm", "throughput", "benchmarks"],
        created_at=datetime.now(timezone.utc),
    )
    vault_storage.save_fact(fact1)
    vault_storage.save_fact(fact2)
    print("  ✓ Pre-populated vault with 2 grounded atomic facts")

    # Configure Router with failing primary and working fallback
    router = AIRouter(
        gemini_provider=FailingPrimaryCurriculumProvider(),
        openai_provider=WorkingFallbackCurriculumProvider(),
    )
    router.primary_name = "gemini"
    router.fallback_name = "openai_compatible"

    generator = CurriculumGenerator(
        ai_router=router,
        vault_storage=vault_storage,
        curriculum_storage=curriculum_storage,
    )

    req = GenerateCurriculumRequest(
        topic="vLLM Inference Optimization",
        target_episode_count=3,
        target_audience="Senior Platform Engineers",
        source_ids=["src_vllm_paper"],
    )

    arc = await generator.generate_curriculum(req)

    # Verify generated arc structure
    assert arc is not None
    assert arc.total_episodes == 3
    assert len(arc.episodes) == 3
    print(f"  ✓ Curriculum arc created with ID: {arc.arc_id}")
    print(f"  ✓ Arc title: '{arc.title}'")

    # Verify 3-tier distribution
    tiers = [ep.tier for ep in arc.episodes]
    assert ArcTier.FUNDAMENTALS in tiers, "Missing FUNDAMENTALS tier"
    assert ArcTier.ADVANCED in tiers, "Missing ADVANCED tier"
    assert ArcTier.LAB in tiers, "Missing LAB tier"
    print(f"  ✓ 3-tier distribution verified: {[t.value for t in tiers]}")

    # Verify duration constraints (5-7 mins)
    for ep in arc.episodes:
        assert 5 <= ep.target_duration_minutes <= 7, f"Invalid episode duration: {ep.target_duration_minutes}"
        assert ep.hook, "Missing 15-second hook"
    print("  ✓ Pacing verified: all episodes strictly 5-7 minutes with opening hooks")

    # Verify telemetry metadata and auto-failover
    assert arc.ai_metadata is not None
    assert arc.ai_metadata.fallback_occurred is True
    assert arc.ai_metadata.provider == "openai_compatible"
    assert "Simulated primary provider rate limit 429" in (arc.ai_metadata.fallback_reason or "")
    print(f"  ✓ AI Auto-failover verified: provider={arc.ai_metadata.provider}, fallback_occurred=True, time={arc.ai_metadata.duration_ms}ms")

    # Verify persisted note in vault
    persisted_arc = curriculum_storage.get_arc(arc.arc_id)
    assert persisted_arc is not None
    assert persisted_arc.total_episodes == 3
    print("  ✓ Generated arc automatically persisted to vault/curriculum/")


# ---------------------------------------------------------------------------
# Test 4: FastAPI Endpoints via ASGI AsyncClient
# ---------------------------------------------------------------------------
async def test_curriculum_fastapi_endpoints():
    print("\n--- [4] Testing FastAPI Curriculum Endpoints ---")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List curriculum arcs
        resp = await client.get("/api/curriculum")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        initial_arcs = resp.json()
        print(f"  ✓ GET /api/curriculum responded HTTP 200 with {len(initial_arcs)} existing arc(s)")

        # 2. Check 404 for non-existent arc
        resp = await client.get("/api/curriculum/arc_non_existent_12345")
        assert resp.status_code == 404
        print("  ✓ GET /api/curriculum/{non_existent} correctly returned HTTP 404")

        # 3. Create / save a temporary arc directly to storage for API testing
        from app.routers.curriculum import storage as api_storage

        test_episodes = [
            VideoEpisode(
                episode_id="arc_api_test_ep1",
                episode_number=1,
                tier=ArcTier.FUNDAMENTALS,
                title="API Test Fundamentals",
                hook="Hook for API test",
                learning_objectives=["Objective 1"],
                key_facts_referenced=[],
                target_duration_minutes=6,
            ),
            VideoEpisode(
                episode_id="arc_api_test_ep2",
                episode_number=2,
                tier=ArcTier.LAB,
                title="API Test Lab",
                hook="Hook for API lab",
                learning_objectives=["Lab Objective"],
                key_facts_referenced=[],
                target_duration_minutes=5,
                lab_exercise="echo 'hello world'",
            ),
        ]
        test_arc = VideoArc(
            arc_id="arc_api_test_sample",
            title="FastAPI Integration Test Arc",
            topic="FastAPI Routing",
            description="Testing curriculum endpoints.",
            episodes=test_episodes,
            total_episodes=2,
            estimated_total_minutes=11,
            sources_referenced=[],
            created_at=datetime.now(timezone.utc),
        )
        api_storage.save_arc(test_arc)

        try:
            # 4. GET /api/curriculum/{arc_id}
            get_resp = await client.get(f"/api/curriculum/{test_arc.arc_id}")
            assert get_resp.status_code == 200
            arc_data = get_resp.json()
            assert arc_data["arc_id"] == test_arc.arc_id
            assert arc_data["total_episodes"] == 2
            assert len(arc_data["episodes"]) == 2
            assert arc_data["episodes"][0]["tier"] == "fundamentals"
            assert arc_data["episodes"][1]["tier"] == "lab"
            print(f"  ✓ GET /api/curriculum/{test_arc.arc_id} returned complete arc payload")

            # 5. PUT /api/curriculum/{arc_id}
            update_payload = {
                "title": "FastAPI Integration Test Arc (Updated via PUT)",
                "description": "Updated description via API endpoint.",
            }
            put_resp = await client.put(
                f"/api/curriculum/{test_arc.arc_id}",
                json=update_payload,
            )
            assert put_resp.status_code == 200
            updated_data = put_resp.json()
            assert updated_data["title"] == "FastAPI Integration Test Arc (Updated via PUT)"
            print(f"  ✓ PUT /api/curriculum/{test_arc.arc_id} updated arc title successfully")

            # 6. Verify update persisted
            get_resp2 = await client.get(f"/api/curriculum/{test_arc.arc_id}")
            assert get_resp2.status_code == 200
            assert get_resp2.json()["title"] == "FastAPI Integration Test Arc (Updated via PUT)"
            print("  ✓ Verified PUT changes persisted on subsequent GET request")

            # 7. DELETE /api/curriculum/{arc_id}
            del_resp = await client.delete(f"/api/curriculum/{test_arc.arc_id}")
            assert del_resp.status_code == 200
            assert del_resp.json()["status"] == "deleted"
            print(f"  ✓ DELETE /api/curriculum/{test_arc.arc_id} responded HTTP 200 with status deleted")

            # 8. Verify 404 after deletion
            get_after_del = await client.get(f"/api/curriculum/{test_arc.arc_id}")
            assert get_after_del.status_code == 404
            print("  ✓ Verified GET /api/curriculum/{arc_id} returns 404 after deletion")

        finally:
            # Clean up if still exists
            api_storage.delete_arc(test_arc.arc_id)


async def test_live_curriculum_generation():
    print("\n--- [5] Optional Live Curriculum Generation via Live AIRouter ---")
    storage = CurriculumStorageService()
    generator = CurriculumGenerator(curriculum_storage=storage)
    req = GenerateCurriculumRequest(
        topic="vLLM Inference Optimization",
        target_episode_count=3,
        target_audience="Staff Infrastructure Engineers",
    )
    arc = await generator.generate_curriculum(req)
    print(f"  ✓ Live Arc generated: ID={arc.arc_id}, Title='{arc.title}'")
    print(f"  ✓ Total Episodes: {len(arc.episodes)}, Total Minutes: {arc.estimated_total_minutes}")
    for ep in arc.episodes:
        print(f"    - Ep {ep.episode_number} [{ep.tier.value}]: {ep.title} ({ep.target_duration_minutes}m)")
        print(f"      Hook: \"{ep.hook}\"")
        if ep.lab_exercise:
            print(f"      Lab: {ep.lab_exercise}")
    if arc.ai_metadata:
        print(f"  ✓ AI Telemetry: Provider={arc.ai_metadata.provider}, Model={arc.ai_metadata.model}, "
              f"Fallback={arc.ai_metadata.fallback_occurred}, Time={arc.ai_metadata.duration_ms}ms")
    # Clean up generated note from vault
    storage.delete_arc(arc.arc_id)
    print(f"  ✓ Cleaned up test arc '{arc.arc_id}' from vault")


# ---------------------------------------------------------------------------
# Main Runner
# ---------------------------------------------------------------------------
async def main():
    live_mode = "--live" in sys.argv
    print("=================================================================")
    print("   ARC & CURRICULUM ARCHITECT (MODULE 2) - SMOKE TEST SUITE      ")
    print(f"   Mode: {'LIVE AI' if live_mode else 'MOCK / FAST VERIFICATION'}")
    print("=================================================================")

    # Temporary directory for isolated vault tests
    temp_dir = tempfile.mkdtemp(prefix="curriculum_vault_test_")
    temp_vault_path = Path(temp_dir)

    try:
        test_curriculum_domain_models()
        test_obsidian_curriculum_storage(temp_vault_path)
        await test_curriculum_generator_orchestration(temp_vault_path)
        await test_curriculum_fastapi_endpoints()

        if live_mode:
            await test_live_curriculum_generation()

        total_phases = "5/5" if live_mode else "4/4"
        print("\n=================================================================")
        print(f"   ALL CURRICULUM SMOKE TESTS PASSED ({total_phases} TEST PHASES SUCCESS)  ")
        print("=================================================================")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(main())
