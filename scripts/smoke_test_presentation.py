"""Smoke test suite for Module 5: Synced Presentation & Visual Engine.

Tests:
1. Domain model contracts and enum definitions (A/B archetypes, slide types, metrics).
2. Deterministic Cloudflare incident sample deck generation.
3. Quantitative A/B comparative benchmarking (word density, cognitive load, cue coverage).
4. Obsidian vault persistence (YAML frontmatter, block anchors, callouts, round-trip parsing).
5. FastAPI HTTP endpoints (/generate, /demo/sample, /decks, /decks/{deck_id}).
"""

import asyncio
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "backend"))

import httpx
from app.config import get_settings
from app.main import app
from app.models.presentation import (
    GeneratePresentationRequest,
    PresentationDeck,
    PresentationObjectiveMetrics,
    PresentationSlide,
    SlideElementVariant,
    SlideType,
    VisualThemeVariant,
)
from app.models.script import ScriptSection, SectionType, VideoScript
from app.services.presentation_generator import PresentationGeneratorService
from app.services.presentation_storage import PresentationStorageService
from app.services.script_storage import ScriptStorageService

settings = get_settings()


async def test_domain_models():
    print("\n--- [1] Testing Domain Models & Enum Contracts ---")
    assert VisualThemeVariant.TERMINAL_DARK == "terminal_dark"
    assert VisualThemeVariant.INFOGRAPHIC_CLEAN == "infographic_clean"
    print("  ✓ VisualThemeVariant enums verified (terminal_dark, infographic_clean)")

    expected_types = {
        "title_hook",
        "architecture_diagram",
        "code_breakdown",
        "comparison_split",
        "metric_callout",
        "key_takeaway",
    }
    actual_types = {st.value for st in SlideType}
    assert expected_types.issubset(actual_types)
    print(f"  ✓ SlideType enums verified ({len(actual_types)} types registered)")

    slide = PresentationSlide(
        slide_id="test_slide_01",
        slide_index=0,
        section_index=0,
        timestamp_start_s=0.0,
        timestamp_end_s=30.0,
        duration_s=30.0,
        slide_type=SlideType.TITLE_HOOK,
        cue_marker="[SLIDE: Test]",
        spoken_anchor_text="Anchor text",
        variant_a=SlideElementVariant(
            headline="Variant A",
            bullet_points=["Point 1", "Point 2"],
            word_count=10,
        ),
        variant_b=SlideElementVariant(
            headline="Variant B",
            bullet_points=["Short"],
            word_count=5,
        ),
    )
    assert slide.duration_s == 30.0
    assert slide.variant_a.word_count == 10
    assert slide.variant_b.word_count == 5
    print("  ✓ PresentationSlide structure and variant bindings verified")


async def test_cloudflare_deck_and_metrics(temp_vault_path: Path):
    print("\n--- [2] Testing Cloudflare Presentation Generation & A/B Benchmarks ---")
    storage = PresentationStorageService(vault_dir=temp_vault_path, project_id="proj_smoke_test")
    generator = PresentationGeneratorService(presentation_storage=storage, project_id="proj_smoke_test")
    deck = generator.build_cloudflare_sample_deck()

    assert deck.total_slides == 5
    assert len(deck.slides) == 5
    assert deck.total_duration_s == 375.0
    print(f"  ✓ Built deck '{deck.deck_id}' with {deck.total_slides} slides ({deck.total_duration_s}s)")

    # Verify slide sequencing and timing
    expected_durations = [30.0, 70.0, 165.0, 70.0, 40.0]
    expected_types = [
        SlideType.TITLE_HOOK,
        SlideType.COMPARISON_SPLIT,
        SlideType.ARCHITECTURE_DIAGRAM,
        SlideType.METRIC_CALLOUT,
        SlideType.CODE_BREAKDOWN,
    ]

    for idx, s in enumerate(deck.slides):
        assert s.slide_index == idx
        assert s.duration_s == expected_durations[idx]
        assert s.slide_type == expected_types[idx]
        assert s.cue_marker.startswith("[") and s.cue_marker.endswith("]")
        assert len(s.spoken_anchor_text) > 0
        assert s.variant_a.word_count > 0
        assert s.variant_b.word_count > 0
        # Variant A should be noticeably denser than Variant B
        assert s.variant_a.word_count > s.variant_b.word_count
        print(f"    Slide {idx + 1} ({s.slide_type.value:20s}): {s.duration_s:5.1f}s | Var A: {s.variant_a.word_count:2d} words | Var B: {s.variant_b.word_count:2d} words")

    # Verify objective A/B comparative metrics
    m = deck.metrics
    print("\n  ✓ Objective A/B Benchmark Metrics:")
    print(f"    - Cue Coverage:              {m.cue_coverage_percentage:.1f}%")
    print(f"    - Variant A Avg Words:       {m.variant_a_avg_words_per_slide:.1f} words/slide")
    print(f"    - Variant B Avg Words:       {m.variant_b_avg_words_per_slide:.1f} words/slide")
    print(f"    - Variant A Cognitive Load:  {m.variant_a_cognitive_load_score:.1f}/100")
    print(f"    - Variant B Cognitive Load:  {m.variant_b_cognitive_load_score:.1f}/100")
    print(f"    - Pacing Alignment:          {m.pacing_alignment_score:.1f}%")

    assert m.cue_coverage_percentage == 100.0
    assert m.variant_a_avg_words_per_slide > m.variant_b_avg_words_per_slide
    density_reduction = (1 - (m.variant_b_avg_words_per_slide / m.variant_a_avg_words_per_slide)) * 100
    print(f"  ✓ Variant B demonstrates a {density_reduction:.1f}% reduction in cognitive reading density")
    assert density_reduction >= 40.0
    assert m.variant_a_cognitive_load_score > m.variant_b_cognitive_load_score
    assert m.pacing_alignment_score >= 98.0


async def test_obsidian_vault_persistence(temp_vault_path: Path):
    print("\n--- [3] Testing Obsidian Vault Persistence & Deserialization ---")
    storage = PresentationStorageService(vault_dir=temp_vault_path, project_id="proj_smoke_test")
    generator = PresentationGeneratorService(presentation_storage=storage, project_id="proj_smoke_test")
    deck = generator.build_cloudflare_sample_deck()

    deck_path = storage.presentations_dir / f"{deck.deck_id}.md"
    assert deck_path.exists(), f"Expected deck file at {deck_path}"
    assert deck_path.stat().st_size > 0

    content = deck_path.read_text(encoding="utf-8")
    assert "---" in content
    assert "deck_id: deck_cf_first_steps_into_cloudflare_c233b4" in content
    assert "> [!abstract] Presentation Deck Overview" in content
    assert "> [!example] Variant A: Terminal / Architecture Dark" in content
    assert "> [!info] Variant B: Clean Infographic / Comparison" in content
    assert f"^{deck.slides[0].slide_id}" in content
    print(f"  ✓ Vault note verified at {deck_path} ({deck_path.stat().st_size} bytes)")
    print("  ✓ Verified Obsidian YAML frontmatter, callouts, and ^block-anchors")

    # Round-trip read back from storage
    loaded_deck = storage.get_deck(deck.deck_id)
    assert loaded_deck is not None
    assert loaded_deck.deck_id == deck.deck_id
    assert loaded_deck.total_slides == 5
    assert len(loaded_deck.slides) == 5
    assert loaded_deck.metrics.cue_coverage_percentage == 100.0
    print("  ✓ Full round-trip deserialization from Obsidian note verified")

    # List decks
    decks_list = storage.list_decks()
    assert any(d["deck_id"] == deck.deck_id for d in decks_list)
    print(f"  ✓ storage.list_decks() successfully listed {len(decks_list)} deck(s)")


async def test_fastapi_endpoints(temp_vault_path: Path):
    print("\n--- [4] Testing FastAPI Presentation Endpoints ---")
    headers = {"X-Project-Id": "proj_smoke_test"}

    # Seed an authentic script in storage for API testing
    script_storage = ScriptStorageService(vault_dir=temp_vault_path, project_id="proj_smoke_test")
    test_script_id = "script_arc_first_steps_into_cloudfla_c233b4_ep1_c69864"
    sample_script = VideoScript(
        script_id=test_script_id,
        episode_id="ep1_c69864",
        arc_id="arc_first_steps_into_cloudfla_c233b4",
        title="First Steps Into Cloudflare: DNS, CDN, and Not Hiding Origin Failures",
        target_duration_minutes=6,
        total_word_count=800,
        estimated_speaking_minutes=5.7,
        hook_text="Your origin is down, but Cloudflare keeps serving stale assets.",
        sections=[
            ScriptSection(
                section_type=SectionType.HOOK,
                title="Hook Section",
                spoken_text="Your origin is down, but Cloudflare keeps serving stale assets and your dashboards stay green.",
                target_duration_seconds=30,
                visual_cue="[SLIDE: Cloudflare Incident Hook - Origin Down vs Edge Green]",
            ),
            ScriptSection(
                section_type=SectionType.PROBLEM_BREAKDOWN,
                title="MTU Asymmetry & Black Hole Topology",
                spoken_text="It is the asymmetric MTU black hole between the virtual veth pairs and the physical fabric.",
                target_duration_seconds=70,
                visual_cue="[DIAGRAM: Network Path - Virtual veth to Physical Underlay MTU Mismatch]",
            ),
            ScriptSection(
                section_type=SectionType.DEEP_DIVE,
                title="Remediation Pattern: TCP MSS Clamping Rule",
                spoken_text="Without clamping MSS to 1460, control plane BGP sessions stay up, but payload packets vanish into thin air.",
                target_duration_seconds=165,
                visual_cue="[CODE: iptables MSS Clamping vs Underlay Jumbo MTU Fix]",
            ),
            ScriptSection(
                section_type=SectionType.PITFALLS,
                title="CI Pipeline Benchmark & Debugging Cost",
                spoken_text="Teams waste an average of 4.2 hours debugging what looks like an application crash.",
                target_duration_seconds=70,
                visual_cue="[METRIC: CI Pipeline Failure Rates & MTU Troubleshooting Benchmarks]",
            ),
            ScriptSection(
                section_type=SectionType.ACTION_CALL,
                title="PRODUCTION READY CHECKLIST: 3 GOLDEN RULES",
                spoken_text="Here is your 3-step checklist before pushing your next fabric test into CI.",
                target_duration_seconds=40,
                visual_cue="[TAKEAWAY: 3 Golden Rules for Containerlab CI/CD]",
            ),
        ],
        full_script_markdown="Test script markdown",
        key_facts_referenced=[],
        created_at=datetime.now(timezone.utc),
    )
    script_storage.save_script(sample_script)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. GET /api/presentation/demo/sample
        sample_resp = await client.get("/api/presentation/demo/sample", headers=headers)
        assert sample_resp.status_code == 200, f"Sample endpoint failed: {sample_resp.text}"
        sample_deck = sample_resp.json()
        assert sample_deck["deck_id"] in ("deck_cf_first_steps_into_cloudflare_c233b4", "deck_sample_origin_incident")
        assert sample_deck["total_slides"] == 5
        print(f"  ✓ GET /api/presentation/demo/sample returned sample deck '{sample_deck['deck_id']}'")

        # 2. POST /api/presentation/generate for non-existent script returns 404
        not_found_gen = await client.post(
            "/api/presentation/generate",
            json={"script_id": "nonexistent_script_xyz"},
            headers=headers,
        )
        assert not_found_gen.status_code == 404
        print("  ✓ POST /api/presentation/generate for nonexistent script returned HTTP 404 as expected")

        # 3. POST /api/presentation/generate for existing script
        gen_req = {"script_id": test_script_id}
        gen_resp = await client.post("/api/presentation/generate", json=gen_req, headers=headers)
        assert gen_resp.status_code == 200, f"Generate endpoint failed: {gen_resp.text}"
        gen_deck = gen_resp.json()
        assert gen_deck["total_slides"] == 5
        assert "metrics" in gen_deck
        print(f"  ✓ POST /api/presentation/generate generated deck for script '{gen_req['script_id']}'")

        # 4. GET /api/presentation/decks
        list_resp = await client.get("/api/presentation/decks", headers=headers)
        assert list_resp.status_code == 200
        decks_summary = list_resp.json()
        assert len(decks_summary) >= 1
        print(f"  ✓ GET /api/presentation/decks returned {len(decks_summary)} deck(s)")

        # 5. GET /api/presentation/decks/{deck_id}
        deck_id = gen_deck["deck_id"]
        get_resp = await client.get(f"/api/presentation/decks/{deck_id}", headers=headers)
        assert get_resp.status_code == 200
        retrieved_deck = get_resp.json()
        assert retrieved_deck["deck_id"] == deck_id
        assert len(retrieved_deck["slides"]) == 5
        print(f"  ✓ GET /api/presentation/decks/{deck_id} retrieved deck successfully")

        # 6. GET /api/presentation/decks/nonexistent -> 404
        not_found_resp = await client.get("/api/presentation/decks/nonexistent_deck_id", headers=headers)
        assert not_found_resp.status_code == 404
        print("  ✓ GET /api/presentation/decks/nonexistent returned HTTP 404 as expected")


async def main():
    print("=================================================================")
    print("   SYNCED PRESENTATION ENGINE (MODULE 5) - SMOKE TEST SUITE      ")
    print("=================================================================")
    temp_dir = tempfile.mkdtemp(prefix="smoke_presentation_vault_")
    temp_vault_path = Path(temp_dir)
    os.environ["VAULT_DIR"] = temp_dir
    settings.vault_dir = temp_dir

    try:
        await test_domain_models()
        await test_cloudflare_deck_and_metrics(temp_vault_path)
        await test_obsidian_vault_persistence(temp_vault_path)
        await test_fastapi_endpoints(temp_vault_path)
        print("\n=================================================================")
        print("   ALL MODULE 5 PRESENTATION TESTS PASSED (100% SUCCESS)         ")
        print("=================================================================")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(main())
