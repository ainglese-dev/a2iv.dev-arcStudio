"""Smoke test suite for Module 3: Script Studio & Teleprompter Backend.

Tests:
1. Script Domain Models validation (SectionType, ScriptSection, VideoScript, Word Count Boundaries)
2. Obsidian vault teleprompter storage roundtrip (YAML frontmatter, visual cues, timestamps)
3. ScriptGenerator agent orchestration with AI Router auto-failover & AIMetadata
4. FastAPI HTTP endpoints via AsyncClient (/api/scripts/*)
5. Optional Live AI generation test (--live)
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
from app.models.curriculum import ArcTier, VideoArc, VideoEpisode
from app.models.script import (
    GenerateScriptRequest,
    ScriptSection,
    SectionType,
    VideoScript,
    VideoScriptSummary,
)
from app.models.vault import AIMetadata, AtomicFact, ConfidenceLevel, FactCategory
from app.services.ai.base import BaseLLMProvider
from app.services.ai.router import AIRouter
from app.services.curriculum_storage import CurriculumStorageService
from app.services.script_generator import ScriptGenerator
from app.services.script_storage import ScriptStorageService, format_script_markdown
from app.services.vault_storage import VaultStorageService


# ---------------------------------------------------------------------------
# Realistic 850-Word Mock Spoken Script for Offline Testing
# ---------------------------------------------------------------------------
MOCK_SECTION_1_SPOKEN = (
    "Your GPU cluster runs out of VRAM the second ten concurrent users send queries, "
    "nobody on your team can explain where sixty percent of the memory went, and you're "
    "staring at an outage alert with zero documentation. You cannot tell your VP of Infrastructure "
    "that adding more thirty-thousand dollar GPUs is the only fix. Stop guessing. Understand your "
    "KV cache architecture right now, and let's fix it."
)  # ~72 words

MOCK_SECTION_2_SPOKEN = (
    "Here is the brutal reality of serving large language models with naive PyTorch or traditional runtimes. "
    "When a user submits a prompt, the transformer calculates attention keys and values for every single token. "
    "Because token generation is auto-regressive and variable in length, conventional allocators cannot predict "
    "how many tokens will follow. To prevent out-of-memory crashes, systems pre-allocate massive, contiguous blocks "
    "of GPU memory for the maximum possible context length. If a model supports a four-thousand token window, "
    "the runtime reserves memory for four thousand tokens, even if the user only asks a twenty-word question. "
    "The result is catastrophic. Over sixty to eighty percent of your high-bandwidth memory is completely wasted "
    "due to internal fragmentation, external fragmentation, and virtual memory over-allocation. Your GPUs sit mostly "
    "idle, yet your orchestrator rejects incoming requests because VRAM is artificially locked. Traditional batching "
    "only worsens the problem by holding the entire batch hostage until the slowest sequence finishes generating. "
    "Think about what happens when you scale to fifty or one hundred concurrent streams. Each stream demands its "
    "own contiguous reservation. Even if your average sequence length is only two hundred tokens, your system must "
    "reserve space for the tail latency four-thousand token outliers. This leaves thousands of GPU megabytes completely "
    "stranded, completely inaccessible, and completely wasted while your response queues back up."
)

MOCK_SECTION_3_SPOKEN = (
    "To solve this memory crisis, we have to look at how operating systems solved physical memory fragmentation "
    "fifty years ago: virtual memory paging. This is the exact breakthrough behind vLLM's PagedAttention architecture. "
    "Instead of forcing the key-value cache to live in contiguous physical VRAM, PagedAttention partitions the cache "
    "into fixed-size virtual blocks, typically sixteen or thirty-two tokens per block. A central block table dynamically "
    "maps these logical sequence blocks into non-contiguous physical pages across GPU memory. When a sequence generates "
    "a new token, it writes into the current page. If the page fills up, the engine allocates a single new block from "
    "a shared physical pool. The benchmark results are astonishing. Based on verified vault research metrics, "
    "PagedAttention achieves over ninety-six percent memory utilization, slashing wasted VRAM down from sixty percent "
    "to under four percent. Furthermore, this dynamic block table enables zero-copy memory sharing across parallel "
    "decoding sequences. In parallel sampling or beam search, multiple outputs point to the exact same prompt pages, "
    "reducing memory overhead by another fifty-five percent. Combined with continuous iteration-level batching, "
    "vLLM achieves two to four times higher serving throughput compared to legacy HuggingFace pipelines. You are "
    "effectively doubling your hardware capacity without spending an extra dime on cloud compute. "
    "Let's trace what actually happens on the silicon during execution. When the CUDA attention kernel launches, "
    "it queries the block table through high-bandwidth registers rather than reading monolithic tensors from global memory. "
    "The kernel fetches only the required memory pages, performs the scaled dot-product computation, and streams "
    "output logits back into the page pool. When a prompt branches during parallel sampling, vLLM implements copy-on-write "
    "semantics. Both child branches read from the identical parent physical blocks until one branch generates a distinct "
    "token, at which point only that specific new block is duplicated. This eliminates redundant prompt evaluations "
    "and cuts multi-sample memory footprints by over half."
)

MOCK_SECTION_4_SPOKEN = (
    "Now let's talk about the production pitfalls and trade-offs that catch engineering teams off guard. "
    "First, block size configuration is a double-edged sword. If you configure block size too small, say eight tokens, "
    "the GPU kernel spends excessive overhead traversing block tables and loses memory coalescing benefits. "
    "If you configure it too large, say sixty-four tokens, internal fragmentation begins creeping back for short requests. "
    "The sweet spot for modern architectures like Llama-3 and Qwen is sixteen or thirty-two tokens. "
    "Second, do not blindly set your GPU memory utilization parameter to one hundred percent. The PyTorch CUDA "
    "runtime still requires workspace memory for activation tensors, intermediate matrix multiplications, and temporary "
    "buffers. Setting utilization above point ninety-two frequently leads to sudden CUDA out-of-memory panics during "
    "burst traffic. Keep your baseline utilization pegged between point eighty-five and point ninety zero."
)  # ~147 words

MOCK_SECTION_5_SPOKEN = (
    "Here is your immediate action plan to put this into production today. Stop reading whitepapers and benchmark "
    "your actual serving stack. Pull down the official vLLM container, mount your HuggingFace cache directory, "
    "and run an OpenAI-compatible endpoint with GPU memory utilization set to point ninety zero. "
    "Execute a throughput stress test using the benchmark serving script against concurrent requests. "
    "Watch your token throughput double and your memory fragmentation vanish. In the next episode, we will dive "
    "into kernel-level tensor parallelism and speculative decoding. Lab it up, run the benchmark, and see the difference."
)  # ~98 words


# ---------------------------------------------------------------------------
# Mock Providers for Offline / Fast Testing
# ---------------------------------------------------------------------------
class FailingPrimaryScriptProvider(BaseLLMProvider):
    """Simulates primary provider failure."""

    @property
    def provider_name(self) -> str:
        return "gemini_mock_failing"

    async def is_available(self) -> bool:
        return True

    async def generate_text(self, prompt: str, **kwargs) -> str:
        raise ConnectionError("Simulated primary 429 quota error")

    async def generate_structured(
        self, prompt: str, schema: Optional[Type[BaseModel]] = None, **kwargs
    ) -> Dict[str, Any]:
        raise ConnectionError("Simulated primary 429 quota error")


class WorkingFallbackScriptProvider(BaseLLMProvider):
    """Simulates working fallback provider returning an 800+ word structured script."""

    @property
    def provider_name(self) -> str:
        return "openai_mock_working"

    async def is_available(self) -> bool:
        return True

    async def generate_text(self, prompt: str, **kwargs) -> str:
        return "Script text"

    async def generate_structured(
        self, prompt: str, schema: Optional[Type[BaseModel]] = None, **kwargs
    ) -> Dict[str, Any]:
        return {
            "title": "Why KV Caching Blows Up GPU Memory (And How PagedAttention Fixes It)",
            "hook_text": (
                "Your GPU cluster runs out of VRAM the second ten concurrent users send queries, "
                "nobody on your team can explain where 60% of memory went, and you're staring at an outage alert. "
                "You cannot tell your VP that adding more $30,000 GPUs is the fix. Fix your KV cache now."
            ),
            "sections": [
                {
                    "section_type": "hook",
                    "title": "The GPU Out-of-Memory Crisis",
                    "spoken_text": MOCK_SECTION_1_SPOKEN,
                    "target_duration_seconds": 30,
                    "visual_cue": "[SLIDE: Red Outage Alert — GPU VRAM Locked at 99% with 10 Users]",
                },
                {
                    "section_type": "problem_breakdown",
                    "title": "Why Contiguous Allocation Fails in Production",
                    "spoken_text": MOCK_SECTION_2_SPOKEN,
                    "target_duration_seconds": 70,
                    "visual_cue": "[DIAGRAM: Static Memory Pre-Allocation vs Actual Fragmented Usage]",
                },
                {
                    "section_type": "deep_dive",
                    "title": "PagedAttention Mechanics: OS Virtual Memory for VRAM",
                    "spoken_text": MOCK_SECTION_3_SPOKEN,
                    "target_duration_seconds": 160,
                    "visual_cue": "[DIAGRAM: Physical Block Table Mapping Logical KV Cache to Pages]",
                },
                {
                    "section_type": "pitfalls",
                    "title": "Block Size Trade-offs & Memory Tuning Traps",
                    "spoken_text": MOCK_SECTION_4_SPOKEN,
                    "target_duration_seconds": 65,
                    "visual_cue": "[SLIDE: Sweet Spot Tuning — 16 vs 32 Token Blocks and GPU Memory Caps]",
                },
                {
                    "section_type": "action_call",
                    "title": "Deploying the Benchmark Container",
                    "spoken_text": MOCK_SECTION_5_SPOKEN,
                    "target_duration_seconds": 40,
                    "visual_cue": "[CODE: docker run --gpus all vllm/vllm-openai:latest --gpu-memory-utilization 0.90]",
                },
            ],
        }


# ---------------------------------------------------------------------------
# Test 1: Domain Models Validation
# ---------------------------------------------------------------------------
def test_script_domain_models():
    print("\n--- [1] Testing Script Domain Models Validation ---")

    # 1. Verify SectionType Enum
    assert SectionType.HOOK.value == "hook"
    assert SectionType.PROBLEM_BREAKDOWN.value == "problem_breakdown"
    assert SectionType.DEEP_DIVE.value == "deep_dive"
    assert SectionType.PITFALLS.value == "pitfalls"
    assert SectionType.ACTION_CALL.value == "action_call"
    print("  ✓ SectionType enum contains all 5 required teleprompter sections")

    # 2. Verify ScriptSection model
    sec = ScriptSection(
        section_type=SectionType.HOOK,
        title="Opening Hook",
        spoken_text=MOCK_SECTION_1_SPOKEN,
        target_duration_seconds=30,
        estimated_wpm=144,
        visual_cue="[SLIDE: Warning Graphic]",
    )
    assert sec.section_type == SectionType.HOOK
    assert sec.target_duration_seconds == 30
    assert sec.visual_cue == "[SLIDE: Warning Graphic]"
    print("  ✓ ScriptSection model validated with visual cues and duration")

    # 3. Verify VideoScript word count boundaries (750 - 1,000 words)
    sample_sections = [
        ScriptSection(
            section_type=SectionType.HOOK,
            title="Hook",
            spoken_text=MOCK_SECTION_1_SPOKEN,
            target_duration_seconds=30,
        ),
        ScriptSection(
            section_type=SectionType.PROBLEM_BREAKDOWN,
            title="Problem",
            spoken_text=MOCK_SECTION_2_SPOKEN,
            target_duration_seconds=70,
        ),
        ScriptSection(
            section_type=SectionType.DEEP_DIVE,
            title="Deep Dive",
            spoken_text=MOCK_SECTION_3_SPOKEN,
            target_duration_seconds=160,
        ),
        ScriptSection(
            section_type=SectionType.PITFALLS,
            title="Pitfalls",
            spoken_text=MOCK_SECTION_4_SPOKEN,
            target_duration_seconds=65,
        ),
        ScriptSection(
            section_type=SectionType.ACTION_CALL,
            title="Action",
            spoken_text=MOCK_SECTION_5_SPOKEN,
            target_duration_seconds=40,
        ),
    ]

    total_words = sum(len(s.spoken_text.split()) for s in sample_sections)
    print(f"  ✓ Total spoken words in sample script: {total_words}")
    assert 750 <= total_words <= 1000, f"Word count {total_words} outside 750-1000 range"

    script = VideoScript(
        script_id="script_test_ep1_001",
        episode_id="ep1_kv_cache",
        arc_id="arc_vllm_101",
        title="Why KV Caching Blows Up GPU Memory",
        target_duration_minutes=6,
        total_word_count=total_words,
        estimated_speaking_minutes=round(total_words / 140.0, 2),
        hook_text="Your GPU cluster runs out of VRAM...",
        sections=sample_sections,
        full_script_markdown="teleprompter markdown",
        key_facts_referenced=["fact_vllm_01", "fact_vllm_02"],
        created_at=datetime.now(timezone.utc),
    )
    assert script.script_id == "script_test_ep1_001"
    assert script.target_duration_minutes == 6
    assert 5.0 <= script.estimated_speaking_minutes <= 7.0
    print(f"  ✓ VideoScript validated ({script.estimated_speaking_minutes} speaking mins @ 140 WPM)")

    # 4. Request Model
    req = GenerateScriptRequest(
        episode_id="ep1_kv_cache",
        arc_id="arc_vllm_101",
        wpm_target=145,
    )
    assert req.wpm_target == 145
    print("  ✓ GenerateScriptRequest validated")


# ---------------------------------------------------------------------------
# Test 2: Obsidian Vault Teleprompter Storage Roundtrip
# ---------------------------------------------------------------------------
def test_obsidian_script_storage(temp_vault_dir: Path):
    print("\n--- [2] Testing Obsidian Vault Teleprompter Storage Roundtrip ---")
    storage = ScriptStorageService(vault_dir=temp_vault_dir)

    sections = [
        ScriptSection(
            section_type=SectionType.HOOK,
            title="Hook: Agitate the Pain",
            spoken_text=MOCK_SECTION_1_SPOKEN,
            target_duration_seconds=30,
            visual_cue="[SLIDE: VRAM Outage Alert]",
        ),
        ScriptSection(
            section_type=SectionType.PROBLEM_BREAKDOWN,
            title="The Root Cause of Fragmentation",
            spoken_text=MOCK_SECTION_2_SPOKEN,
            target_duration_seconds=70,
            visual_cue="[DIAGRAM: Contiguous vs Segmented]",
        ),
        ScriptSection(
            section_type=SectionType.DEEP_DIVE,
            title="PagedAttention Deep Dive",
            spoken_text=MOCK_SECTION_3_SPOKEN,
            target_duration_seconds=160,
            visual_cue="[DIAGRAM: Page Table Lookup]",
        ),
        ScriptSection(
            section_type=SectionType.PITFALLS,
            title="Tuning Traps and Memory Limits",
            spoken_text=MOCK_SECTION_4_SPOKEN,
            target_duration_seconds=65,
            visual_cue="[SLIDE: Block Size Decision Matrix]",
        ),
        ScriptSection(
            section_type=SectionType.ACTION_CALL,
            title="Deploying the Lab Recipe",
            spoken_text=MOCK_SECTION_5_SPOKEN,
            target_duration_seconds=40,
            visual_cue="[CODE: docker run vllm/vllm-openai]",
        ),
    ]

    total_words = sum(len(s.spoken_text.split()) for s in sections)

    script = VideoScript(
        script_id="script_vllm_production_ep1",
        episode_id="arc_vllm_ep1",
        arc_id="arc_vllm_production",
        title="Why KV Caching Blows Up GPU Memory",
        target_duration_minutes=6,
        total_word_count=total_words,
        estimated_speaking_minutes=round(total_words / 140.0, 2),
        hook_text=MOCK_SECTION_1_SPOKEN,
        sections=sections,
        full_script_markdown="",  # Let storage service generate format_script_markdown
        key_facts_referenced=["fact_vllm_01", "fact_vllm_02"],
        ai_metadata=AIMetadata(
            provider="openai_mock_working",
            model="qwen-3.8",
            fallback_occurred=True,
            fallback_reason="Primary simulated failure",
            duration_ms=210,
        ),
        created_at=datetime.now(timezone.utc),
    )

    # 1. Save script
    saved_path = storage.save_script(script)
    assert saved_path.exists(), f"File {saved_path} not found"
    print(f"  ✓ Script saved to Obsidian note at: {saved_path}")

    # 2. Inspect generated Obsidian markdown content
    content = saved_path.read_text(encoding="utf-8")
    post = frontmatter.loads(content)

    # Frontmatter validation
    assert post.metadata["script_id"] == "script_vllm_production_ep1"
    assert post.metadata["episode_id"] == "arc_vllm_ep1"
    assert post.metadata["total_word_count"] == total_words
    assert len(post.metadata["sections"]) == 5
    assert post.metadata["ai_metadata"]["fallback_occurred"] is True
    print("  ✓ Frontmatter verified: script_id, word_count, 5 sections, AI metadata")

    # Body Markdown validation
    assert "> [!abstract] Teleprompter Overview" in post.content
    assert "> [!danger] 15-Second Opening Hook" in post.content
    assert "[[facts/fact_vllm_01]]" in post.content
    assert "## [00:00] Section 1: Hook: Agitate the Pain" in post.content
    assert "> [!tip] Visual Anchor" in post.content
    assert "[SLIDE: VRAM Outage Alert]" in post.content
    print("  ✓ Teleprompter Markdown verified: callouts, timestamps, visual anchors, wikilinks")

    # 3. Read back via get_script
    loaded = storage.get_script("script_vllm_production_ep1")
    assert loaded is not None
    assert loaded.script_id == "script_vllm_production_ep1"
    assert len(loaded.sections) == 5
    assert loaded.sections[0].section_type == SectionType.HOOK
    assert loaded.sections[2].section_type == SectionType.DEEP_DIVE
    assert loaded.sections[4].section_type == SectionType.ACTION_CALL
    print("  ✓ get_script roundtrip verified all 5 sections and metadata fields")

    # 4. List scripts
    summaries = storage.list_scripts()
    assert len(summaries) >= 1
    assert any(s.script_id == "script_vllm_production_ep1" for s in summaries)
    print(f"  ✓ list_scripts returned {len(summaries)} script summary(ies)")

    # 5. Delete script
    deleted = storage.delete_script("script_vllm_production_ep1")
    assert deleted is True
    assert not saved_path.exists()
    assert storage.get_script("script_vllm_production_ep1") is None
    print("  ✓ delete_script verified removal from vault")


# ---------------------------------------------------------------------------
# Test 3: ScriptGenerator Agent & AI Auto-Failover
# ---------------------------------------------------------------------------
async def test_script_generator_orchestration(temp_vault_dir: Path):
    print("\n--- [3] Testing ScriptGenerator Agent & AI Router Auto-Failover ---")

    vault_storage = VaultStorageService(vault_dir=temp_vault_dir)
    curriculum_storage = CurriculumStorageService(vault_dir=temp_vault_dir)
    script_storage = ScriptStorageService(vault_dir=temp_vault_dir)

    # Ingest a grounded fact
    fact = AtomicFact(
        fact_id="fact_vllm_01",
        statement="PagedAttention achieves 96% memory utilization by partitioning KV cache into non-contiguous blocks.",
        category=FactCategory.BENCHMARK_METRIC,
        confidence=ConfidenceLevel.VERIFIED,
        exact_quote="PagedAttention achieves near-optimal memory utilization of over 96%.",
        source_id="src_vllm_paper",
        tags=["vllm", "memory"],
        created_at=datetime.now(timezone.utc),
    )
    vault_storage.save_fact(fact)

    # Ingest a curriculum arc with an episode
    ep = VideoEpisode(
        episode_id="arc_vllm_test_ep1",
        episode_number=1,
        tier=ArcTier.FUNDAMENTALS,
        title="Why KV Caching Blows Up GPU Memory",
        hook="Your GPU cluster runs out of VRAM the second ten users query. Fix your KV cache now.",
        learning_objectives=["Understand KV cache growth", "Identify memory limits"],
        key_facts_referenced=["fact_vllm_01"],
        target_duration_minutes=6,
        recommended_visuals=["Animation of memory allocation filling up"],
        lab_exercise=None,
    )
    arc = VideoArc(
        arc_id="arc_vllm_test_arc",
        title="High-Throughput vLLM",
        topic="vLLM Inference",
        description="Comprehensive vLLM course.",
        episodes=[ep],
        total_episodes=1,
        estimated_total_minutes=6,
        sources_referenced=["src_vllm_paper"],
        created_at=datetime.now(timezone.utc),
    )
    curriculum_storage.save_arc(arc)
    print("  ✓ Populated vault with grounded fact and curriculum episode")

    # Set up AI router with simulated failure on primary
    router = AIRouter(
        gemini_provider=FailingPrimaryScriptProvider(),
        openai_provider=WorkingFallbackScriptProvider(),
    )
    router.primary_name = "gemini"
    router.fallback_name = "openai_compatible"

    generator = ScriptGenerator(
        ai_router=router,
        vault_storage=vault_storage,
        curriculum_storage=curriculum_storage,
        script_storage=script_storage,
    )

    req = GenerateScriptRequest(
        episode_id="arc_vllm_test_ep1",
        arc_id="arc_vllm_test_arc",
        wpm_target=145,
    )

    script = await generator.generate_script(req)

    assert script is not None
    print(f"  ✓ Generated script ID: {script.script_id}")
    print(f"  ✓ Script title: '{script.title}'")
    print(f"  ✓ Total words: {script.total_word_count}")
    print(f"  ✓ Estimated speaking time: {script.estimated_speaking_minutes} minutes")

    # Verify word count strictly between 750 and 1,000 words
    assert 750 <= script.total_word_count <= 1000, f"Total words {script.total_word_count} outside 750-1000"
    print("  ✓ Strict 750-1,000 word count pacing budget verified")

    # Verify 5 sections present in order
    assert len(script.sections) == 5
    types = [s.section_type for s in script.sections]
    assert types == [
        SectionType.HOOK,
        SectionType.PROBLEM_BREAKDOWN,
        SectionType.DEEP_DIVE,
        SectionType.PITFALLS,
        SectionType.ACTION_CALL,
    ]
    print("  ✓ All 5 teleprompter sections verified in correct pedagogical order")

    # Verify visual cues embedded
    visual_cues = [s.visual_cue for s in script.sections if s.visual_cue]
    assert len(visual_cues) >= 3
    print(f"  ✓ Embedded {len(visual_cues)} semantic visual anchor markers ([SLIDE:], [DIAGRAM:], [CODE:])")

    # Verify AI failover telemetry
    assert script.ai_metadata is not None
    assert script.ai_metadata.fallback_occurred is True
    assert script.ai_metadata.provider == "openai_compatible"
    print("  ✓ AI Router auto-failover to fallback provider verified with telemetry")

    # Verify persistence to vault
    persisted = script_storage.get_script(script.script_id)
    assert persisted is not None
    assert persisted.total_word_count == script.total_word_count
    print("  ✓ Generated script automatically persisted to vault/scripts/")


# ---------------------------------------------------------------------------
# Test 4: FastAPI Endpoints via ASGI AsyncClient
# ---------------------------------------------------------------------------
async def test_scripts_fastapi_endpoints():
    print("\n--- [4] Testing FastAPI Script Endpoints ---")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List scripts
        resp = await client.get("/api/scripts")
        assert resp.status_code == 200
        scripts_list = resp.json()
        print(f"  ✓ GET /api/scripts responded HTTP 200 with {len(scripts_list)} script(s)")

        # 2. 404 for non-existent script
        resp = await client.get("/api/scripts/script_non_existent_999")
        assert resp.status_code == 404
        print("  ✓ GET /api/scripts/{non_existent} correctly returned HTTP 404")

        # 3. Create a temporary script in storage for API testing
        from app.routers.scripts import storage as api_storage

        test_sections = [
            ScriptSection(
                section_type=SectionType.HOOK,
                title="Hook Section",
                spoken_text=MOCK_SECTION_1_SPOKEN,
                target_duration_seconds=30,
                visual_cue="[SLIDE: API Test Alert]",
            ),
            ScriptSection(
                section_type=SectionType.DEEP_DIVE,
                title="Deep Dive Section",
                spoken_text=MOCK_SECTION_3_SPOKEN,
                target_duration_seconds=160,
                visual_cue="[DIAGRAM: API Test Architecture]",
            ),
        ]
        sample_words = sum(len(s.spoken_text.split()) for s in test_sections)

        test_script = VideoScript(
            script_id="script_api_test_sample",
            episode_id="ep_api_test",
            title="FastAPI Script Studio Integration Test",
            target_duration_minutes=6,
            total_word_count=sample_words,
            estimated_speaking_minutes=round(sample_words / 140.0, 2),
            hook_text="API test hook",
            sections=test_sections,
            full_script_markdown="",
            key_facts_referenced=[],
            created_at=datetime.now(timezone.utc),
        )
        api_storage.save_script(test_script)

        try:
            # 4. GET /api/scripts/{script_id}
            get_resp = await client.get(f"/api/scripts/{test_script.script_id}")
            assert get_resp.status_code == 200
            data = get_resp.json()
            assert data["script_id"] == test_script.script_id
            assert len(data["sections"]) == 2
            assert data["sections"][0]["section_type"] == "hook"
            assert data["sections"][1]["section_type"] == "deep_dive"
            print(f"  ✓ GET /api/scripts/{test_script.script_id} retrieved complete script payload")

            # 5. DELETE /api/scripts/{script_id}
            del_resp = await client.delete(f"/api/scripts/{test_script.script_id}")
            assert del_resp.status_code == 200
            assert del_resp.json()["status"] == "deleted"
            print(f"  ✓ DELETE /api/scripts/{test_script.script_id} responded HTTP 200 deleted")

            # 6. Verify 404 after delete
            get_del = await client.get(f"/api/scripts/{test_script.script_id}")
            assert get_del.status_code == 404
            print("  ✓ Verified GET /api/scripts/{script_id} returns 404 after deletion")

        finally:
            api_storage.delete_script(test_script.script_id)


# ---------------------------------------------------------------------------
# Test 5: Optional Live AI Script Generation
# ---------------------------------------------------------------------------
async def test_live_script_generation():
    print("\n--- [5] Optional Live Script Generation via Live AIRouter ---")
    storage = ScriptStorageService()
    generator = ScriptGenerator(script_storage=storage)

    req = GenerateScriptRequest(
        episode_id="vllm_memory_pagedattention",
        wpm_target=145,
        speaking_style="direct, punchy, conversational, no-fluff",
    )
    script = await generator.generate_script(req)
    print(f"  ✓ Live Script generated: ID={script.script_id}")
    print(f"  ✓ Title: '{script.title}'")
    print(f"  ✓ Total Words: {script.total_word_count} (Estimated speaking: {script.estimated_speaking_minutes} mins)")
    print(f"  ✓ Hook Text ({len(script.hook_text.split())} words): \"{script.hook_text}\"")

    for i, sec in enumerate(script.sections, 1):
        w = len(sec.spoken_text.split())
        print(f"    - Sec {i} [{sec.section_type.value}]: {sec.title} ({w} words | {sec.target_duration_seconds}s)")
        if sec.visual_cue:
            print(f"      Cue: {sec.visual_cue}")

    if script.ai_metadata:
        print(f"  ✓ AI Telemetry: Provider={script.ai_metadata.provider}, Model={script.ai_metadata.model}, Time={script.ai_metadata.duration_ms}ms")

    # Clean up test note
    storage.delete_script(script.script_id)
    print(f"  ✓ Cleaned up test script '{script.script_id}' from vault")


# ---------------------------------------------------------------------------
# Main Runner
# ---------------------------------------------------------------------------
async def main():
    live_mode = "--live" in sys.argv
    print("=================================================================")
    print("   SCRIPT STUDIO & TELEPROMPTER (MODULE 3) - SMOKE TEST SUITE    ")
    print(f"   Mode: {'LIVE AI' if live_mode else 'MOCK / FAST VERIFICATION'}")
    print("=================================================================")

    temp_dir = tempfile.mkdtemp(prefix="script_vault_test_")
    temp_vault_path = Path(temp_dir)

    try:
        test_script_domain_models()
        test_obsidian_script_storage(temp_vault_path)
        await test_script_generator_orchestration(temp_vault_path)
        await test_scripts_fastapi_endpoints()

        if live_mode:
            await test_live_script_generation()

        total_phases = "5/5" if live_mode else "4/4"
        print("\n=================================================================")
        print(f"   ALL SCRIPT SMOKE TESTS PASSED ({total_phases} TEST PHASES SUCCESS)    ")
        print("=================================================================")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(main())
