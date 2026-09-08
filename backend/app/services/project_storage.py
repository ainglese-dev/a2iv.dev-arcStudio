"""Obsidian-compliant Project Storage Service.

Manages isolated project workspaces (`vault/projects/{project_id}/`),
persisting `vision.md` (North Star / Editorial Thesis) with YAML frontmatter
and Obsidian callouts, and tracking asset counts across project sandboxes.
"""

from datetime import datetime, timezone
import logging
from pathlib import Path
import re
import shutil
from typing import Any, Dict, List, Optional
import frontmatter

from app.config import get_settings
from app.models.project import (
    CreateProjectRequest,
    ProjectListResponse,
    ProjectSummary,
    ProjectVision,
    TechnicalDepth,
    UpdateProjectVisionRequest,
    VideoFormatPreset,
)

logger = logging.getLogger(__name__)

DEFAULT_PROJECT_ID = "proj_cloudflare_origin_incident"


def _sanitize_project_id(raw_id: str) -> str:
    """Normalize string to safe lowercase identifier."""
    clean = re.sub(r"[^\w\-]", "_", raw_id.strip().lower())
    clean = re.sub(r"_+", "_", clean).strip("_")
    return clean[:64] if clean else f"proj_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"


def format_vision_markdown(vision: ProjectVision) -> str:
    """Format project vision into clean Obsidian markdown with callouts."""
    questions_lines = [f"> - {q}" for q in vision.key_questions_to_answer] if vision.key_questions_to_answer else ["> - What are the core architectural failure modes?"]
    questions_block = "\n".join(questions_lines)

    return f"""# Project Vision: {vision.title}

> [!abstract] North Star & Editorial Thesis
> - **Project ID**: `{vision.project_id}`
> - **Target Audience**: {vision.target_audience}
> - **Technical Depth**: `{vision.technical_depth.value}`
> - **Target Format**: `{vision.target_format.value}`
> - **Tone & Style**: {vision.tone_and_style}

> [!important] Core Thesis
> {vision.core_thesis}

> [!question] Key Questions to Answer
{questions_block}
"""


class ProjectStorageService:
    """Manages project workspaces and vision notes in Obsidian vault."""

    def __init__(self, vault_dir: Optional[Path] = None):
        settings = get_settings()
        self.vault_dir = vault_dir or settings.resolved_vault_dir
        self.projects_dir = self.vault_dir / "projects"
        self.projects_dir.mkdir(parents=True, exist_ok=True)

    def get_project_dir(self, project_id: str) -> Path:
        """Get absolute path to a project workspace directory."""
        clean_id = _sanitize_project_id(project_id)
        p_dir = self.projects_dir / clean_id
        return p_dir

    def ensure_project_dirs(self, project_id: str) -> Path:
        """Create standard workspace subdirectories for an isolated project."""
        p_dir = self.get_project_dir(project_id)
        p_dir.mkdir(parents=True, exist_ok=True)
        for sub in ("sources", "facts", "guides", "curriculum", "scripts", "presentations", "media"):
            (p_dir / sub).mkdir(parents=True, exist_ok=True)
        return p_dir

    def create_project(self, request: CreateProjectRequest) -> ProjectVision:
        """Create a new project workspace with vision.md."""
        now = datetime.now(timezone.utc)
        clean_title = request.title.strip()
        clean_id = _sanitize_project_id(request.project_id or f"proj_{clean_title}")
        if not clean_id.startswith("proj_"):
            clean_id = f"proj_{clean_id}"

        p_dir = self.ensure_project_dirs(clean_id)
        vision_path = p_dir / "vision.md"

        core_thesis = (
            request.core_thesis.strip()
            if request.core_thesis and request.core_thesis.strip()
            else f"A grounded investigation into the key principles, failure modes, and practical trade-offs of {clean_title}."
        )
        target_audience = (
            request.target_audience.strip()
            if request.target_audience and request.target_audience.strip()
            else "Practitioners and Inquisitive Learners"
        )
        tone_and_style = (
            request.tone_and_style.strip()
            if request.tone_and_style and request.tone_and_style.strip()
            else "Direct, insightful practitioner tone with clear real-world examples."
        )

        vision = ProjectVision(
            project_id=clean_id,
            title=clean_title,
            target_audience=target_audience,
            technical_depth=request.technical_depth,
            core_thesis=core_thesis,
            target_format=request.target_format,
            tone_and_style=tone_and_style,
            key_questions_to_answer=request.key_questions_to_answer,
            created_at=now,
            updated_at=now,
        )

        post_meta: Dict[str, Any] = {
            "project_id": vision.project_id,
            "title": vision.title,
            "target_audience": vision.target_audience,
            "technical_depth": vision.technical_depth.value,
            "core_thesis": vision.core_thesis,
            "target_format": vision.target_format.value,
            "tone_and_style": vision.tone_and_style,
            "key_questions_to_answer": vision.key_questions_to_answer,
            "created_at": vision.created_at.isoformat(),
            "updated_at": vision.updated_at.isoformat(),
        }

        body = format_vision_markdown(vision)
        post = frontmatter.Post(body, **post_meta)
        vision_path.write_text(frontmatter.dumps(post), encoding="utf-8")
        logger.info("Created project workspace %s at %s", clean_id, vision_path)
        return vision

    def get_project_vision(self, project_id: str) -> Optional[ProjectVision]:
        """Retrieve ProjectVision from vision.md."""
        p_dir = self.get_project_dir(project_id)
        vision_path = p_dir / "vision.md"
        if not vision_path.exists():
            return None

        post = frontmatter.loads(vision_path.read_text(encoding="utf-8"))
        meta = post.metadata

        now = datetime.now(timezone.utc)
        created_at = now
        updated_at = now
        if "created_at" in meta and meta["created_at"]:
            try:
                created_at = datetime.fromisoformat(str(meta["created_at"]))
            except Exception:
                pass
        if "updated_at" in meta and meta["updated_at"]:
            try:
                updated_at = datetime.fromisoformat(str(meta["updated_at"]))
            except Exception:
                pass

        try:
            tech_depth = TechnicalDepth(meta.get("technical_depth", TechnicalDepth.PRACTITIONER_DEEP.value))
        except ValueError:
            tech_depth = TechnicalDepth.PRACTITIONER_DEEP

        try:
            fmt_preset = VideoFormatPreset(meta.get("target_format", VideoFormatPreset.MULTI_EPISODE_ARC.value))
        except ValueError:
            fmt_preset = VideoFormatPreset.MULTI_EPISODE_ARC

        return ProjectVision(
            project_id=meta.get("project_id", project_id),
            title=meta.get("title", "Untitled Project"),
            target_audience=meta.get("target_audience", "Senior Engineers & Practitioners"),
            technical_depth=tech_depth,
            core_thesis=meta.get("core_thesis", ""),
            target_format=fmt_preset,
            tone_and_style=meta.get("tone_and_style", "Direct, no-fluff practitioner engineering tone."),
            key_questions_to_answer=meta.get("key_questions_to_answer", []),
            created_at=created_at,
            updated_at=updated_at,
        )

    def update_project_vision(self, project_id: str, request: UpdateProjectVisionRequest) -> Optional[ProjectVision]:
        """Update existing vision.md note with modified fields."""
        current = self.get_project_vision(project_id)
        if not current:
            return None

        now = datetime.now(timezone.utc)
        updated = ProjectVision(
            project_id=current.project_id,
            title=request.title.strip() if request.title is not None else current.title,
            target_audience=request.target_audience.strip() if request.target_audience is not None else current.target_audience,
            technical_depth=request.technical_depth if request.technical_depth is not None else current.technical_depth,
            core_thesis=request.core_thesis.strip() if request.core_thesis is not None else current.core_thesis,
            target_format=request.target_format if request.target_format is not None else current.target_format,
            tone_and_style=request.tone_and_style.strip() if request.tone_and_style is not None else current.tone_and_style,
            key_questions_to_answer=request.key_questions_to_answer if request.key_questions_to_answer is not None else current.key_questions_to_answer,
            created_at=current.created_at,
            updated_at=now,
        )

        p_dir = self.ensure_project_dirs(project_id)
        vision_path = p_dir / "vision.md"

        post_meta: Dict[str, Any] = {
            "project_id": updated.project_id,
            "title": updated.title,
            "target_audience": updated.target_audience,
            "technical_depth": updated.technical_depth.value,
            "core_thesis": updated.core_thesis,
            "target_format": updated.target_format.value,
            "tone_and_style": updated.tone_and_style,
            "key_questions_to_answer": updated.key_questions_to_answer,
            "created_at": updated.created_at.isoformat(),
            "updated_at": updated.updated_at.isoformat(),
        }

        body = format_vision_markdown(updated)
        post = frontmatter.Post(body, **post_meta)
        vision_path.write_text(frontmatter.dumps(post), encoding="utf-8")
        logger.info("Updated vision for project %s", project_id)
        return updated

    def _count_notes(self, path: Path) -> int:
        """Count non-hidden markdown files in a directory."""
        if not path.exists() or not path.is_dir():
            return 0
        return sum(1 for p in path.glob("*.md") if not p.name.startswith("."))

    def list_projects(self) -> List[ProjectSummary]:
        """List all projects with asset counts. Returns empty list if no projects exist."""
        summaries: List[ProjectSummary] = []
        if not self.projects_dir.exists():
            return summaries

        for p_dir in self.projects_dir.iterdir():
            if not p_dir.is_dir() or p_dir.name.startswith("."):
                continue
            vision = self.get_project_vision(p_dir.name)
            if not vision:
                continue

            summaries.append(
                ProjectSummary(
                    project_id=vision.project_id,
                    title=vision.title,
                    target_audience=vision.target_audience,
                    technical_depth=vision.technical_depth,
                    target_format=vision.target_format,
                    core_thesis=vision.core_thesis,
                    sources_count=self._count_notes(p_dir / "sources"),
                    facts_count=self._count_notes(p_dir / "facts"),
                    arcs_count=self._count_notes(p_dir / "curriculum"),
                    scripts_count=self._count_notes(p_dir / "scripts"),
                    decks_count=self._count_notes(p_dir / "presentations"),
                    created_at=vision.created_at,
                    updated_at=vision.updated_at,
                )
            )

        summaries.sort(key=lambda s: s.updated_at, reverse=True)
        return summaries

    def delete_project(self, project_id: str) -> bool:
        """Delete an entire project workspace directory."""
        p_dir = self.get_project_dir(project_id)
        if p_dir.exists() and p_dir.is_dir():
            shutil.rmtree(p_dir, ignore_errors=True)
            logger.info("Deleted project workspace %s", project_id)
            return True
        return False

    def get_default_or_first_project_id(self) -> Optional[str]:
        """Get first active project ID if any project exists, or None."""
        if self.projects_dir.exists():
            default_dir = self.projects_dir / DEFAULT_PROJECT_ID
            if default_dir.is_dir() and (default_dir / "vision.md").exists():
                return DEFAULT_PROJECT_ID

            candidates = []
            for p_dir in self.projects_dir.iterdir():
                if p_dir.is_dir() and not p_dir.name.startswith(".") and (p_dir / "vision.md").exists():
                    candidates.append(p_dir.name)
            if candidates:
                proj_candidates = [c for c in candidates if c.startswith("proj_")]
                if proj_candidates:
                    return sorted(proj_candidates)[0]
                return sorted(candidates)[0]
        # If no project exists yet in a fresh clone, auto-seed the starter sample project
        seeded = self.seed_sample_project()
        return seeded.project_id

    def seed_sample_project(self) -> ProjectVision:
        """Explicitly seed the Cloudflare sample project (e.g. for testing or 1-click restore)."""
        logger.info("Explicitly seeding sample project %s", DEFAULT_PROJECT_ID)
        sample_req = CreateProjectRequest(
            project_id=DEFAULT_PROJECT_ID,
            title="First Steps Into Cloudflare: DNS, CDN, and Not Hiding Origin Failures",
            target_audience="Senior Backend Engineers, SREs & Infrastructure Architects",
            technical_depth=TechnicalDepth.PRACTITIONER_DEEP,
            core_thesis=(
                "Cloudflare edge proxying masks backend 502/504 outages with stale 200 OK responses. "
                "Teams must decouple DNS, static CDN, and out-of-band synthetic origin health checks "
                "before proxying dynamic APIs behind the orange cloud."
            ),
            target_format=VideoFormatPreset.MULTI_EPISODE_ARC,
            tone_and_style=(
                "Trench practitioner scar-tissue tone. Direct, no-fluff SRE post-mortem style. "
                "Focus on failure modes, MTU traps, cache keys, and observable rollback paths."
            ),
            key_questions_to_answer=[
                "Why does a green Cloudflare dashboard deceive on-call engineers during an origin outage?",
                "What happens to dynamic APIs when proxy mode is enabled without separate origin monitoring?",
                "How do you implement an out-of-band synthetic prober directly to the origin IP?",
                "What is the safe 3-phase adoption path from DNS-only to static CDN to dynamic proxy?",
            ],
        )
        vision = self.create_project(sample_req)

        # Seed existing presentation deck if present in root vault
        root_deck = self.vault_dir / "presentations" / "deck_cf_first_steps_into_cloudflare_c233b4.md"
        target_deck = self.projects_dir / DEFAULT_PROJECT_ID / "presentations" / "deck_cf_first_steps_into_cloudflare_c233b4.md"
        if root_deck.exists() and not target_deck.exists():
            target_deck.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(root_deck, target_deck)

        return vision

    def get_project_prompt_context(self, project_id: Optional[str] = None) -> str:
        """Generate high-impact North Star prompt injection for AI generation."""
        vision = None
        if project_id:
            vision = self.get_project_vision(project_id)

        if not vision:
            first_id = self.get_default_or_first_project_id()
            if first_id:
                vision = self.get_project_vision(first_id)

        if not vision:
            return ""

        questions_block = "\n".join(f"- {q}" for q in vision.key_questions_to_answer)
        return (
            f"=== PROJECT NORTH STAR & EDITORIAL VISION ===\n"
            f"Project: {vision.title} ({vision.project_id})\n"
            f"Target Audience: {vision.target_audience}\n"
            f"Technical Depth: {vision.technical_depth.value} (Prioritize concrete engineering details, zero fluff)\n"
            f"Target Format: {vision.target_format.value}\n"
            f"Tone & Style: {vision.tone_and_style}\n"
            f"Core Thesis: {vision.core_thesis}\n"
            f"Key Questions this content MUST resolve:\n{questions_block}\n"
            f"=============================================\n"
        )
