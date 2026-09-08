"""Smoke test suite for Strict Project Sandboxes & Project Vision (North Star).

Tests:
1. Domain models & enum contracts (TechnicalDepth, VideoFormatPreset, ProjectVision).
2. ProjectStorageService creation, YAML frontmatter, and round-trip deserialization.
3. Strict multi-project sandbox isolation across sources, facts, scripts, and presentations.
4. North Star / Editorial Vision prompt context formatting for downstream AI injection.
5. FastAPI HTTP endpoints (/api/projects CRUD, X-Project-Id header & query isolation).
"""

import asyncio
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import sys
import uuid

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "backend"))

import httpx
from app.config import get_settings
from app.main import app
from app.models.project import (
    CreateProjectRequest,
    ProjectListResponse,
    ProjectSummary,
    ProjectVision,
    TechnicalDepth,
    UpdateProjectVisionRequest,
    VideoFormatPreset,
)
from app.models.script import ScriptSection, SectionType, VideoScript
from app.models.vault import (
    AtomicFact,
    ConfidenceLevel,
    FactCategory,
    SourceChunk,
    SourceMetadata,
    SourceType,
)
from app.services.project_storage import ProjectStorageService
from app.services.script_storage import ScriptStorageService
from app.services.vault_storage import VaultStorageService


async def test_domain_models():
    print("\n--- [1] Testing Project Domain Models & Enum Contracts ---")
    assert TechnicalDepth.PRACTITIONER_DEEP.value == "practitioner_deep"
    assert TechnicalDepth.APPLIED_ENGINEERING.value == "applied_engineering"
    assert TechnicalDepth.CONCEPTUAL_OVERVIEW.value == "conceptual_overview"
    print("  ✓ TechnicalDepth enums verified")

    assert VideoFormatPreset.MULTI_EPISODE_ARC.value == "multi_episode_arc"
    assert VideoFormatPreset.DEEP_DIVE_STANDALONE.value == "deep_dive_standalone"
    assert VideoFormatPreset.QUICK_EXPLAINER.value == "quick_explainer"
    print("  ✓ VideoFormatPreset enums verified")

    req = CreateProjectRequest(
        project_id="proj_model_test",
        title="BGP EVPN Fabric Design",
        core_thesis="Asymmetric IRB causes routing loops unless L3 VNIs are explicitly mapped across all leaf nodes.",
        key_questions_to_answer=["Why does asymmetric IRB break in multi-tenant environments?"],
    )
    assert req.title == "BGP EVPN Fabric Design"
    assert req.technical_depth == TechnicalDepth.PRACTITIONER_DEEP
    assert req.target_format == VideoFormatPreset.MULTI_EPISODE_ARC
    print("  ✓ CreateProjectRequest validation verified")


async def test_project_storage_service():
    print("\n--- [2] Testing ProjectStorageService & Obsidian Markdown Persistence ---")
    storage = ProjectStorageService()

    # Ensure default project exists
    default_id = storage.get_default_or_first_project_id()
    assert default_id is not None and default_id.startswith("proj_")
    print(f"  ✓ Verified default/sample project instantiated: '{default_id}'")

    # Create new project
    test_id = f"proj_test_storage_{uuid.uuid4().hex[:6]}"
    created = storage.create_project(
        CreateProjectRequest(
            project_id=test_id,
            title="eBPF Kernel Tracing for Distributed Systems",
            target_audience="Principal SREs & Kernel Developers",
            technical_depth=TechnicalDepth.PRACTITIONER_DEEP,
            core_thesis="kprobes overhead destroys microbenchmark fidelity; uprobes + ring buffers are required for production observability.",
            target_format=VideoFormatPreset.DEEP_DIVE_STANDALONE,
            tone_and_style="High-fidelity Linux kernel scar-tissue. Disassemble the bytecode.",
            key_questions_to_answer=[
                "How does BPF verifier reject memory safety violations?",
                "What is the ring buffer latency under 100k IOPS load?",
            ],
        )
    )
    assert created.project_id == test_id
    assert created.title == "eBPF Kernel Tracing for Distributed Systems"

    # Verify physical file on disk
    vision_file = storage.get_project_dir(test_id) / "vision.md"
    assert vision_file.exists() and vision_file.stat().st_size > 0
    raw_md = vision_file.read_text(encoding="utf-8")
    assert "---" in raw_md
    assert f"project_id: {test_id}" in raw_md
    assert "practitioner_deep" in raw_md
    assert "> [!abstract] North Star & Editorial Thesis" in raw_md
    assert "> [!important] Core Thesis" in raw_md
    assert "> [!question] Key Questions to Answer" in raw_md
    print(f"  ✓ Created vision note at {vision_file} ({vision_file.stat().st_size} bytes)")
    print("  ✓ Obsidian YAML frontmatter and callouts verified")

    # Roundtrip retrieval
    loaded = storage.get_project_vision(test_id)
    assert loaded is not None
    assert loaded.project_id == test_id
    assert loaded.target_audience == "Principal SREs & Kernel Developers"
    assert len(loaded.key_questions_to_answer) == 2
    print("  ✓ get_project_vision roundtrip deserialization verified")

    # Update vision
    updated = storage.update_project_vision(
        test_id,
        UpdateProjectVisionRequest(
            core_thesis="Updated thesis: tracepoints over kprobes for stable production kernel ABI.",
        ),
    )
    assert updated is not None
    assert "Updated thesis" in updated.core_thesis
    assert updated.updated_at >= loaded.updated_at
    print("  ✓ update_project_vision updated note successfully")

    # Clean up
    storage.delete_project(test_id)
    assert not vision_file.exists()
    print("  ✓ delete_project removed workspace successfully")


async def test_strict_multi_project_isolation():
    print("\n--- [3] Testing Strict Multi-Project Sandbox Isolation ---")
    storage = ProjectStorageService()

    proj_a = f"proj_alpha_{uuid.uuid4().hex[:6]}"
    proj_b = f"proj_beta_{uuid.uuid4().hex[:6]}"

    storage.create_project(
        CreateProjectRequest(
            project_id=proj_a,
            title="Project Alpha: Network Fabrics",
            core_thesis="BGP EVPN spine-leaf validation in Containerlab.",
        )
    )
    storage.create_project(
        CreateProjectRequest(
            project_id=proj_b,
            title="Project Beta: Database Internals",
            core_thesis="Write-Ahead Logging and LSM trees under high write amplification.",
        )
    )

    try:
        vault_a = VaultStorageService(project_id=proj_a)
        vault_b = VaultStorageService(project_id=proj_b)

        # Ingest source into Project A only
        source_meta = SourceMetadata(
            source_id="src_bgp_rfc",
            title="RFC 7938 BGP in Data Centers",
            source_type=SourceType.DOCUMENTATION,
            url="https://datatracker.ietf.org/doc/html/rfc7938",
            author="IETF",
            total_chunks=1,
            created_at=datetime.now(timezone.utc),
        )
        chunk = SourceChunk(
            chunk_id="src_bgp_rfc_01",
            chunk_index=0,
            text="Use eBGP between ASNs to prevent route reflector loops.",
            char_count=60,
            word_count=10,
        )
        vault_a.save_source(source_meta, [chunk], "Raw content of RFC 7938")

        # Save an atomic fact in Project A only
        fact_a = AtomicFact(
            fact_id="fact_bgp_ebgp_peering",
            source_id="src_bgp_rfc",
            statement="eBGP between tiers eliminates the need for BGP route reflectors in leaf-spine topologies.",
            category=FactCategory.ARCHITECTURE_DECISION,
            confidence=ConfidenceLevel.VERIFIED,
            created_at=datetime.now(timezone.utc),
        )
        vault_a.save_fact(fact_a)

        # Save a teleprompter script in Project A only
        script_storage_a = ScriptStorageService(project_id=proj_a)
        script_a = VideoScript(
            script_id="script_bgp_fundamentals_ep1",
            episode_id="ep_01",
            title="Why iBGP in Data Centers Fails at Scale",
            target_duration_minutes=6,
            total_word_count=780,
            estimated_speaking_minutes=5.5,
            hook_text="Route reflector bottleneck causes 40-second convergence delays.",
            full_script_markdown="# Why iBGP in Data Centers Fails at Scale\n\nRoute reflectors are the silent killer of data center failovers.\n",
            sections=[
                ScriptSection(
                    section_type=SectionType.HOOK,
                    title="Convergence Delay",
                    spoken_text="Route reflectors are the silent killer of data center failovers.",
                    target_duration_seconds=30,
                    estimated_wpm=140,
                )
            ],
            created_at=datetime.now(timezone.utc),
        )
        script_storage_a.save_script(script_a)

        # Verify Project A has assets
        assert len(vault_a.list_sources()) == 1
        assert len(vault_a.list_facts()) == 1
        assert len(script_storage_a.list_scripts()) == 1
        print("  ✓ Verified Project A contains 1 source, 1 fact, and 1 script")

        # STRICT ISOLATION ASSERTION: Project B MUST HAVE ZERO ASSETS
        script_storage_b = ScriptStorageService(project_id=proj_b)
        sources_b = vault_b.list_sources()
        facts_b = vault_b.list_facts()
        scripts_b = script_storage_b.list_scripts()

        assert len(sources_b) == 0, f"Expected 0 sources in Project B, found {len(sources_b)}"
        assert len(facts_b) == 0, f"Expected 0 facts in Project B, found {len(facts_b)}"
        assert len(scripts_b) == 0, f"Expected 0 scripts in Project B, found {len(scripts_b)}"
        assert vault_b.get_source("src_bgp_rfc") is None
        assert vault_b.get_fact("fact_bgp_ebgp_peering") is None
        assert script_storage_b.get_script("script_bgp_fundamentals_ep1") is None
        print("  ✓ STRICT ISOLATION VERIFIED: Project B contains 0 cross-contaminated assets")

        # Verify ProjectSummary asset tallying
        summaries = storage.list_projects()
        summary_a = next(s for s in summaries if s.project_id == proj_a)
        summary_b = next(s for s in summaries if s.project_id == proj_b)

        assert summary_a.sources_count == 1
        assert summary_a.facts_count == 1
        assert summary_a.scripts_count == 1

        assert summary_b.sources_count == 0
        assert summary_b.facts_count == 0
        assert summary_b.scripts_count == 0
        print(f"  ✓ ProjectSummary counters verified: Alpha({summary_a.sources_count}s/{summary_a.facts_count}f/{summary_a.scripts_count}sc) vs Beta({summary_b.sources_count}s/{summary_b.facts_count}f/{summary_b.scripts_count}sc)")

    finally:
        storage.delete_project(proj_a)
        storage.delete_project(proj_b)


async def test_prompt_context_injection():
    print("\n--- [4] Testing North Star Vision Prompt Context Injection ---")
    storage = ProjectStorageService()
    test_id = f"proj_prompt_{uuid.uuid4().hex[:6]}"
    storage.create_project(
        CreateProjectRequest(
            project_id=test_id,
            title="Postgres Connection Pooling with pgcat",
            target_audience="Backend Staff Engineers",
            technical_depth=TechnicalDepth.PRACTITIONER_DEEP,
            core_thesis="Thread-per-connection PostgreSQL backend exhausts memory; L7 connection sharding with pgcat resolves connection limits without PgBouncer transactional limits.",
            key_questions_to_answer=[
                "Why does PostgreSQL process-per-connection architecture fail past 500 clients?",
                "How does pgcat support query routing across primary and read replicas?",
            ],
        )
    )

    try:
        ctx = storage.get_project_prompt_context(test_id)
        assert "=== PROJECT NORTH STAR & EDITORIAL VISION ===" in ctx
        assert "Postgres Connection Pooling with pgcat" in ctx
        assert "Backend Staff Engineers" in ctx
        assert "practitioner_deep" in ctx
        assert "Thread-per-connection PostgreSQL backend exhausts memory" in ctx
        assert "Why does PostgreSQL process-per-connection architecture fail past 500 clients?" in ctx
        assert "=============================================" in ctx
        print("  ✓ Formatted North Star prompt context verified:")
        for line in ctx.strip().splitlines()[:7]:
            print(f"    {line}")
        print("    ...")
    finally:
        storage.delete_project(test_id)


async def test_fastapi_endpoints():
    print("\n--- [5] Testing FastAPI Project Endpoints & Workspace Scoping ---")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. GET /api/projects
        res = await client.get("/api/projects")
        assert res.status_code == 200
        data = res.json()
        assert "projects" in data
        assert data["total"] >= 1
        print(f"  ✓ GET /api/projects returned {data['total']} project(s)")

        # 2. POST /api/projects
        new_proj_id = f"proj_api_{uuid.uuid4().hex[:6]}"
        create_res = await client.post(
            "/api/projects",
            json={
                "project_id": new_proj_id,
                "title": "Kafka Partition Rebalancing Traps",
                "target_audience": "Distributed Systems Engineers",
                "core_thesis": "Eager rebalance protocol stops the world; cooperative sticky assignor is mandatory for high-throughput consumers.",
                "key_questions_to_answer": ["What triggers partition rebalance storms?"],
            },
        )
        assert create_res.status_code == 201
        created = create_res.json()
        assert created["project_id"] == new_proj_id
        print(f"  ✓ POST /api/projects created '{new_proj_id}'")

        # 3. GET /api/projects/{project_id}
        get_res = await client.get(f"/api/projects/{new_proj_id}")
        assert get_res.status_code == 200
        assert get_res.json()["title"] == "Kafka Partition Rebalancing Traps"
        print(f"  ✓ GET /api/projects/{new_proj_id} retrieved successfully")

        # 4. PUT /api/projects/{project_id}
        put_res = await client.put(
            f"/api/projects/{new_proj_id}",
            json={"title": "Kafka Partition Rebalancing Under Kubernetes Pod Evictions"},
        )
        assert put_res.status_code == 200
        assert "Kubernetes Pod Evictions" in put_res.json()["title"]
        print(f"  ✓ PUT /api/projects/{new_proj_id} updated vision title")

        # 5. GET /api/projects/{project_id}/prompt-context
        ctx_res = await client.get(f"/api/projects/{new_proj_id}/prompt-context")
        assert ctx_res.status_code == 200
        assert "=== PROJECT NORTH STAR & EDITORIAL VISION ===" in ctx_res.json()["prompt_context"]
        print(f"  ✓ GET /api/projects/{new_proj_id}/prompt-context retrieved successfully")

        # 6. Ingest source into this project via Header X-Project-Id
        ingest_res = await client.post(
            "/api/sources/ingest",
            headers={"X-Project-Id": new_proj_id},
            json={
                "title": "Kafka Cooperative Rebalance Spec",
                "content": "KIP-429 introduced incremental cooperative rebalancing to eliminate consumer group stop-the-world pauses.",
                "source_type": "article",
            },
        )
        assert ingest_res.status_code == 200
        assert ingest_res.json()["project_id"] == new_proj_id
        print(f"  ✓ POST /api/sources/ingest with X-Project-Id scoped source to '{new_proj_id}'")

        # 7. List sources with query param
        sources_res = await client.get(f"/api/sources?project_id={new_proj_id}")
        assert sources_res.status_code == 200
        sources = sources_res.json()
        assert len(sources) == 1
        assert sources[0]["title"] == "Kafka Cooperative Rebalance Spec"

        # Verify isolation: another project must NOT see this source
        other_sources = await client.get("/api/sources?project_id=proj_empty_sandbox_test")
        assert other_sources.status_code == 200
        assert len(other_sources.json()) == 0
        print("  ✓ Verified API isolation: query parameter ?project_id=... restricts source listing")

        # 8. DELETE /api/projects/{project_id}
        del_res = await client.delete(f"/api/projects/{new_proj_id}")
        assert del_res.status_code == 200
        assert del_res.json()["deleted"] is True

        # Verify 404 after deletion
        not_found = await client.get(f"/api/projects/{new_proj_id}")
        assert not_found.status_code == 404
        print(f"  ✓ DELETE /api/projects/{new_proj_id} cleaned up workspace")


async def main():
    print("=================================================================")
    print("   STRICT PROJECT SANDBOX & VISION - SMOKE TEST SUITE            ")
    print("=================================================================")
    await test_domain_models()
    await test_project_storage_service()
    await test_strict_multi_project_isolation()
    await test_prompt_context_injection()
    await test_fastapi_endpoints()
    print("\n=================================================================")
    print("   ALL PROJECT SANDBOX TESTS PASSED (100% SUCCESS)               ")
    print("=================================================================")


if __name__ == "__main__":
    asyncio.run(main())
