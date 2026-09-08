"""Developer & Vault Management Router.

Provides endpoints to inspect storage statistics, selectively reset or purge vault data,
and seed realistic engineering test data without manual file manipulation.
"""

from datetime import datetime, timezone
import logging
from pathlib import Path
import shutil
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.dependencies import get_active_project_id
from app.models.vault import (
    AtomicFact,
    ConfidenceLevel,
    FactCategory,
    SourceChunk,
    SourceMetadata,
    SourceType,
)
from app.services.project_storage import ProjectStorageService
from app.services.vault_storage import VaultStorageService

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class VaultCategoryStats(BaseModel):
    count: int = Field(default=0, description="Total non-hidden files in category.")
    size_bytes: int = Field(default=0, description="Total size in bytes.")


class VaultStatsResponse(BaseModel):
    sources: VaultCategoryStats
    facts: VaultCategoryStats
    guides: VaultCategoryStats
    curriculum: VaultCategoryStats
    scripts: VaultCategoryStats
    media: VaultCategoryStats
    presentations: VaultCategoryStats = Field(default_factory=VaultCategoryStats)
    projects: VaultCategoryStats = Field(default_factory=VaultCategoryStats)
    total_files: int
    total_size_bytes: int


class VaultResetRequest(BaseModel):
    target: Literal["all", "projects", "scripts", "curriculum", "media", "facts", "sources", "presentations"] = Field(
        default="all",
        description="Target vault category to purge ('all', 'projects', 'scripts', 'curriculum', 'media', 'facts', 'sources', 'presentations').",
    )


class VaultResetResponse(BaseModel):
    status: str = Field(default="success")
    target: str
    deleted_count: int
    message: str


class VaultSeedResponse(BaseModel):
    status: str = Field(default="success")
    sources_created: int
    facts_created: int
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _dir_stats(path: Path) -> VaultCategoryStats:
    """Calculate file count and byte size for a single directory."""
    if not path.exists():
        return VaultCategoryStats(count=0, size_bytes=0)
    count = 0
    size = 0
    for p in path.glob("*"):
        if p.is_file() and not p.name.startswith(".") and p.name != ".gitkeep":
            count += 1
            try:
                size += p.stat().st_size
            except OSError:
                pass
    return VaultCategoryStats(count=count, size_bytes=size)


def _media_stats(media_dir: Path) -> VaultCategoryStats:
    """Aggregate files across media directory."""
    if not media_dir.exists():
        return VaultCategoryStats(count=0, size_bytes=0)
    seen_files = set()
    total_count = 0
    total_size = 0

    for p in media_dir.rglob("*"):
        if p.is_file() and not p.name.startswith(".") and p.name != ".gitkeep":
            resolved = p.resolve()
            if resolved not in seen_files:
                seen_files.add(resolved)
                total_count += 1
                try:
                    total_size += p.stat().st_size
                except OSError:
                    pass
    return VaultCategoryStats(count=total_count, size_bytes=total_size)


def _purge_dir(path: Path) -> int:
    """Delete all non-hidden, non-gitkeep files in a directory."""
    if not path.exists():
        return 0
    deleted = 0
    for p in path.glob("*"):
        if p.is_file() and not p.name.startswith(".") and p.name != ".gitkeep":
            try:
                p.unlink()
                deleted += 1
            except Exception as e:
                logger.warning("Failed deleting %s: %s", p, e)
    return deleted


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/vault/stats", response_model=VaultStatsResponse)
async def get_vault_stats(project_id: str = Depends(get_active_project_id)) -> VaultStatsResponse:
    """Inspect current storage stats for the active project workspace."""
    p_storage = ProjectStorageService()
    p_dir = p_storage.get_project_dir(project_id)
    settings = get_settings()
    root_vault = settings.resolved_vault_dir

    sources_stat = _dir_stats(p_dir / "sources")
    facts_stat = _dir_stats(p_dir / "facts")
    guides_stat = _dir_stats(p_dir / "guides")
    curriculum_stat = _dir_stats(p_dir / "curriculum")
    scripts_stat = _dir_stats(p_dir / "scripts")
    media_stat = _media_stats(p_dir / "media")
    presentations_stat = _dir_stats(p_dir / "presentations")

    # Aggregate project sandboxes count and size
    proj_count = 0
    proj_size = 0
    projects_dir = root_vault / "projects"
    if projects_dir.exists():
        for p in projects_dir.iterdir():
            if p.is_dir() and not p.name.startswith("."):
                proj_count += 1
                for f in p.rglob("*"):
                    if f.is_file() and not f.name.startswith("."):
                        try:
                            proj_size += f.stat().st_size
                        except OSError:
                            pass
    projects_stat = VaultCategoryStats(count=proj_count, size_bytes=proj_size)

    total_files = (
        sources_stat.count
        + facts_stat.count
        + guides_stat.count
        + curriculum_stat.count
        + scripts_stat.count
        + media_stat.count
        + presentations_stat.count
    )
    total_size = (
        sources_stat.size_bytes
        + facts_stat.size_bytes
        + guides_stat.size_bytes
        + curriculum_stat.size_bytes
        + scripts_stat.size_bytes
        + media_stat.size_bytes
        + presentations_stat.size_bytes
    )

    return VaultStatsResponse(
        sources=sources_stat,
        facts=facts_stat,
        guides=guides_stat,
        curriculum=curriculum_stat,
        scripts=scripts_stat,
        media=media_stat,
        presentations=presentations_stat,
        projects=projects_stat,
        total_files=total_files,
        total_size_bytes=total_size,
    )


@router.post("/vault/reset", response_model=VaultResetResponse)
async def reset_vault(
    request: VaultResetRequest,
    project_id: str = Depends(get_active_project_id),
) -> VaultResetResponse:
    """Purge content selectively by category within the active project workspace and vault."""
    p_storage = ProjectStorageService()
    p_dir = p_storage.get_project_dir(project_id)
    settings = get_settings()
    root_vault = settings.resolved_vault_dir
    target = request.target
    deleted = 0

    if target in ("scripts", "all"):
        deleted += _purge_dir(p_dir / "scripts")
        deleted += _purge_dir(root_vault / "scripts")

    if target in ("curriculum", "all"):
        deleted += _purge_dir(p_dir / "curriculum")
        deleted += _purge_dir(root_vault / "curriculum")

    if target in ("media", "all"):
        deleted += _purge_dir(p_dir / "media")
        deleted += _purge_dir(root_vault / "media")

    if target in ("facts", "all"):
        deleted += _purge_dir(p_dir / "facts")
        deleted += _purge_dir(p_dir / "guides")
        deleted += _purge_dir(root_vault / "facts")
        deleted += _purge_dir(root_vault / "guides")

    if target in ("sources", "all"):
        deleted += _purge_dir(p_dir / "sources")
        deleted += _purge_dir(root_vault / "sources")

    if target in ("presentations", "all"):
        deleted += _purge_dir(p_dir / "presentations")
        deleted += _purge_dir(root_vault / "presentations")
        try:
            from app.routers.presentation import clear_decks_cache
            clear_decks_cache()
        except Exception as e:
            logger.warning("Could not clear presentation decks cache: %s", e)

    if target in ("projects", "all"):
        projects_dir = root_vault / "projects"
        if projects_dir.exists():
            for proj_subdir in projects_dir.iterdir():
                if proj_subdir.is_dir() and not proj_subdir.name.startswith("."):
                    try:
                        shutil.rmtree(proj_subdir, ignore_errors=True)
                        deleted += 1
                    except Exception as e:
                        logger.warning("Could not delete project dir %s: %s", proj_subdir, e)

    logger.info("Project workspace reset performed on %s: target=%s, deleted_files=%d", project_id, target, deleted)

    return VaultResetResponse(
        status="success",
        target=target,
        deleted_count=deleted,
        message=f"Purged {deleted} item(s) for target '{target}' in vault storage.",
    )


@router.post("/vault/seed", response_model=VaultSeedResponse)
async def seed_vault(project_id: str = Depends(get_active_project_id)) -> VaultSeedResponse:
    """Seed high-quality practitioner engineering source & atomic facts into project vault."""
    p_storage = ProjectStorageService()
    if not p_storage.list_projects():
        p_storage.seed_sample_project()

    storage = VaultStorageService(project_id=project_id)
    now = datetime.now(timezone.utc)

    # 1. Practitioner Source: Containerlab vs EVE-NG
    source_id = "source_containerlab_spine_leaf"
    title = "Containerlab vs EVE-NG: Spine-Leaf Memory Overhead and BGP Lab Automation"
    url = "https://containerlab.dev/manual/topo-def/"
    author = "Infrastructure Engineering & NetOps SRE"

    chunks = [
        SourceChunk(
            chunk_id=f"{source_id}_chunk_0",
            chunk_index=0,
            text=(
                "Spinning up a 6-to-8 node spine-leaf network topology in legacy virtual testbeds like EVE-NG or GNS3 "
                "requires launching heavy virtual machines (qemu/kvm) for each router or switch instance. "
                "Each virtual router demands 4GB to 8GB of reserved RAM and substantial CPU emulation overhead. "
                "During lab startup, VM boot storms regularly saturate host CPU queues, causing BFD and BGP keepalives "
                "to timeout before automated provisioning completes, frequently freezing engineer workstations."
            ),
            char_count=485,
            word_count=70,
        ),
        SourceChunk(
            chunk_id=f"{source_id}_chunk_1",
            chunk_index=1,
            text=(
                "Containerlab completely eliminates hypervisor overhead by orchestrating containerized network operating systems "
                "(such as Nokia SR Linux, Arista cEOS, and FRRouting) as lightweight Docker containers sharing the host Linux kernel. "
                "An 8-node containerized spine-leaf lab boots in under 45 seconds and consumes less than 3.5GB of total system RAM "
                "on a standard engineer laptop, enabling complete data center fabrics to run directly in CI/CD runners."
            ),
            char_count=466,
            word_count=66,
        ),
        SourceChunk(
            chunk_id=f"{source_id}_chunk_2",
            chunk_index=2,
            text=(
                "By plumbing veth pairs directly between container netns, inter-switch latency drops to microsecond levels without MTU fragmentation. "
                "Integrating Containerlab into automated pull request checks allows engineers to run syntax validation, BGP peering verification, "
                "and route-convergence stress tests before committing maintenance changes. "
                "Pre-commit topology validation in CI prevented 94% of syntax and routing policy misconfigurations before change tickets reached CAB review."
            ),
            char_count=498,
            word_count=64,
        ),
    ]

    source_meta = SourceMetadata(
        source_id=source_id,
        title=title,
        source_type=SourceType.ARTICLE,
        url=url,
        author=author,
        published_date="2025-01-15",
        total_chunks=len(chunks),
        tags=["containerlab", "eve-ng", "bgp", "spine-leaf", "ci-cd", "automation"],
        created_at=now,
    )

    raw_markdown = f"""# {title}

{chunks[0].text}

{chunks[1].text}

{chunks[2].text}
"""
    storage.save_source(source_meta, chunks, raw_markdown)

    # 2. Verified Atomic Facts
    facts = [
        AtomicFact(
            fact_id="fact_clab_mem_01",
            category=FactCategory.BENCHMARK_METRIC,
            statement="Containerlab runs an 8-node spine-leaf topology in lightweight containers consuming under 3.5GB of RAM, compared to 32GB+ required for equivalent VM-based routers in EVE-NG or GNS3.",
            confidence=ConfidenceLevel.VERIFIED,
            source_id=source_id,
            source_chunk_id=f"{source_id}_chunk_1",
            exact_quote="An 8-node containerized spine-leaf lab boots in under 45 seconds and consumes less than 3.5GB of total system RAM on a standard engineer laptop.",
            tags=["memory", "containerlab", "benchmark", "spine-leaf"],
            created_at=now,
        ),
        AtomicFact(
            fact_id="fact_clab_boot_02",
            category=FactCategory.PITFALL_CAVEAT,
            statement="Virtual network appliances in EVE-NG suffer from I/O boot storms and CPU thrashing during multi-node startup, causing simulated switch interfaces to drop during automated configuration provisioning.",
            confidence=ConfidenceLevel.VERIFIED,
            source_id=source_id,
            source_chunk_id=f"{source_id}_chunk_0",
            exact_quote="VM boot storms regularly saturate host CPU queues, causing BFD and BGP keepalives to timeout before automated provisioning completes.",
            tags=["boot-storm", "eve-ng", "qemu", "cpu-thrash"],
            created_at=now,
        ),
        AtomicFact(
            fact_id="fact_clab_ci_03",
            category=FactCategory.BENCHMARK_METRIC,
            statement="Automated pre-change validation pipelines running Containerlab in GitHub Actions reduced production configuration rollback rates from 14% to under 0.8% across enterprise data center fabrics.",
            confidence=ConfidenceLevel.VERIFIED,
            source_id=source_id,
            source_chunk_id=f"{source_id}_chunk_2",
            exact_quote="Pre-commit topology validation in CI prevented 94% of syntax and routing policy misconfigurations before change tickets reached CAB review.",
            tags=["ci-cd", "bgp", "validation", "cab"],
            created_at=now,
        ),
        AtomicFact(
            fact_id="fact_clab_veth_04",
            category=FactCategory.ARCHITECTURE_DECISION,
            statement="Containerlab leverages Linux kernel virtual ethernet (veth) pairs directly between network namespaces, eliminating hypervisor bridge overhead and MTU truncation bugs common to nested QEMU taps.",
            confidence=ConfidenceLevel.VERIFIED,
            source_id=source_id,
            source_chunk_id=f"{source_id}_chunk_2",
            exact_quote="By plumbing veth pairs directly between container netns, inter-switch latency drops to microsecond levels without MTU fragmentation.",
            tags=["veth", "kernel", "netns", "mtu"],
            created_at=now,
        ),
    ]

    storage.save_facts(facts)

    logger.info("Vault seeded: 1 source (%s), %d facts", source_id, len(facts))

    return VaultSeedResponse(
        status="success",
        sources_created=1,
        facts_created=len(facts),
        message=f"Successfully seeded 1 practitioner source and {len(facts)} atomic facts into vault.",
    )
