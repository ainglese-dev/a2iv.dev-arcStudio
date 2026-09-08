"""Obsidian-compliant Curriculum & Arc Storage Service.

Persists video arcs to `vault/curriculum/{arc_id}.md` with YAML frontmatter,
wikilinks to fact notes ([[facts/fact_id]]), callouts, and episode breakdown tables.
"""

from datetime import datetime, timezone
import logging
from pathlib import Path
import re
from typing import Any, Dict, List, Optional
import frontmatter
from app.config import get_settings
from app.models.curriculum import (
    ArcTier,
    UpdateVideoArcRequest,
    VideoArc,
    VideoArcSummary,
    VideoEpisode,
)
from app.models.vault import AIMetadata

logger = logging.getLogger(__name__)


def _sanitize_filename(name: str) -> str:
    """Sanitize string for safe file naming."""
    clean = re.sub(r"[^\w\-_.]", "_", name.strip())
    return clean[:120] if clean else "unnamed_arc"


TIER_ICONS = {
    ArcTier.FUNDAMENTALS: "🟢 Fundamentals",
    ArcTier.ADVANCED: "🟡 Advanced",
    ArcTier.LAB: "🔴 Lab / Hands-On",
}


class CurriculumStorageService:
    """Manages file persistence for curriculum arcs in the Obsidian Vault (scoped by project)."""

    def __init__(self, vault_dir: Optional[Path] = None, project_id: Optional[str] = None):
        settings = get_settings()
        from app.services.project_storage import ProjectStorageService

        if project_id is None and vault_dir is None:
            self.project_id = ProjectStorageService().get_default_or_first_project_id()
        else:
            self.project_id = project_id

        if self.project_id:
            base_vault = vault_dir or settings.resolved_vault_dir
            self.base_dir = base_vault / "projects" / self.project_id
        else:
            self.base_dir = vault_dir or settings.resolved_vault_dir

        self.vault_dir = self.base_dir
        self.curriculum_dir = self.base_dir / "curriculum"
        self.curriculum_dir.mkdir(parents=True, exist_ok=True)

    def save_arc(self, arc: VideoArc) -> Path:
        """Save a VideoArc as an Obsidian-compliant note with frontmatter and tables."""
        file_path = self.curriculum_dir / f"{_sanitize_filename(arc.arc_id)}.md"

        # Calculate totals if not set
        total_eps = len(arc.episodes)
        total_mins = sum(ep.target_duration_minutes for ep in arc.episodes)
        arc.total_episodes = total_eps
        arc.estimated_total_minutes = total_mins

        episodes_data = [ep.model_dump(mode="json") for ep in arc.episodes]

        post_meta: Dict[str, Any] = {
            "arc_id": arc.arc_id,
            "title": arc.title,
            "topic": arc.topic,
            "description": arc.description,
            "total_episodes": arc.total_episodes,
            "estimated_total_minutes": arc.estimated_total_minutes,
            "sources_referenced": arc.sources_referenced,
            "created_at": arc.created_at.isoformat(),
            "episodes": episodes_data,
        }

        if arc.ai_metadata:
            post_meta["ai_metadata"] = arc.ai_metadata.model_dump(mode="json")

        # Build Obsidian Markdown Body
        body_lines = [
            f"# {arc.title}",
            "",
            "> [!abstract] Course Arc Overview",
            f"> **Topic**: {arc.topic}",
            f"> **Episodes**: {arc.total_episodes} videos (~{arc.estimated_total_minutes} mins total)",
            f"> {arc.description}",
            "",
            "## Episode Progression Table",
            "",
            "| # | Tier | Title | Duration | Grounded Facts |",
            "|---|------|-------|----------|----------------|",
        ]

        for ep in arc.episodes:
            tier_label = TIER_ICONS.get(ep.tier, ep.tier.value)
            facts_links = ", ".join(f"[[facts/{fid}]]" for fid in ep.key_facts_referenced) or "None"
            body_lines.append(
                f"| {ep.episode_number} | {tier_label} | {ep.title} | {ep.target_duration_minutes} min | {facts_links} |"
            )

        body_lines.extend(["", "---", "", "## Detailed Episode Breakdowns", ""])

        for ep in arc.episodes:
            tier_label = TIER_ICONS.get(ep.tier, ep.tier.value)
            body_lines.extend([
                f"### Episode {ep.episode_number}: {ep.title}",
                f"- **Episode ID**: `{ep.episode_id}`",
                f"- **Tier**: {tier_label}",
                f"- **Target Duration**: {ep.target_duration_minutes} minutes",
                f"- **Hook**: *\"{ep.hook}\"*",
                "",
                "#### Learning Objectives",
            ])
            for obj in ep.learning_objectives:
                body_lines.append(f"- {obj}")

            body_lines.extend(["", "#### Grounded Vault Facts"])
            if ep.key_facts_referenced:
                for fid in ep.key_facts_referenced:
                    body_lines.append(f"- [[facts/{fid}]]")
            else:
                body_lines.append("- *(No specific fact IDs linked)*")

            body_lines.extend(["", "#### Recommended Visuals / Slides"])
            if ep.recommended_visuals:
                for vis in ep.recommended_visuals:
                    body_lines.append(f"- {vis}")
            else:
                body_lines.append("- Conceptual diagrams and title cards")

            if ep.lab_exercise:
                body_lines.extend([
                    "",
                    "> [!example] Hands-On Lab Challenge",
                    f"> {ep.lab_exercise}",
                ])

            body_lines.extend(["", "---", ""])

        post = frontmatter.Post("\n".join(body_lines), **post_meta)
        file_path.write_text(frontmatter.dumps(post), encoding="utf-8")
        logger.info("Saved video curriculum arc to %s", file_path)
        return file_path

    def get_arc(self, arc_id: str) -> Optional[VideoArc]:
        """Retrieve a VideoArc note from vault."""
        file_path = self.curriculum_dir / f"{_sanitize_filename(arc_id)}.md"
        if not file_path.exists():
            return None

        post = frontmatter.loads(file_path.read_text(encoding="utf-8"))
        meta = post.metadata

        created_at = datetime.now(timezone.utc)
        if "created_at" in meta and meta["created_at"]:
            try:
                created_at = datetime.fromisoformat(str(meta["created_at"]))
            except Exception:
                pass

        episodes: List[VideoEpisode] = []
        for ep_data in meta.get("episodes", []):
            try:
                episodes.append(VideoEpisode(**ep_data))
            except Exception as e:
                logger.warning("Failed parsing episode data in arc %s: %s", arc_id, e)

        ai_meta = None
        if "ai_metadata" in meta and isinstance(meta["ai_metadata"], dict):
            try:
                ai_meta = AIMetadata(**meta["ai_metadata"])
            except Exception:
                pass

        return VideoArc(
            arc_id=meta.get("arc_id", arc_id),
            title=meta.get("title", "Untitled Arc"),
            topic=meta.get("topic", "General"),
            description=meta.get("description", ""),
            episodes=episodes,
            total_episodes=meta.get("total_episodes", len(episodes)),
            estimated_total_minutes=meta.get(
                "estimated_total_minutes", sum(e.target_duration_minutes for e in episodes)
            ),
            sources_referenced=meta.get("sources_referenced", []),
            created_at=created_at,
            ai_metadata=ai_meta,
        )

    def list_arcs(self) -> List[VideoArcSummary]:
        """List all video curriculum arcs in the vault."""
        summaries: List[VideoArcSummary] = []
        for p in self.curriculum_dir.glob("*.md"):
            if p.name.startswith("."):
                continue
            arc = self.get_arc(p.stem)
            if arc:
                summaries.append(
                    VideoArcSummary(
                        arc_id=arc.arc_id,
                        title=arc.title,
                        topic=arc.topic,
                        total_episodes=arc.total_episodes,
                        estimated_total_minutes=arc.estimated_total_minutes,
                        created_at=arc.created_at,
                    )
                )

        summaries.sort(key=lambda s: s.created_at, reverse=True)
        return summaries

    def update_arc(self, arc_id: str, req: UpdateVideoArcRequest) -> Optional[VideoArc]:
        """Update an existing VideoArc note."""
        arc = self.get_arc(arc_id)
        if not arc:
            return None

        if req.title is not None:
            arc.title = req.title
        if req.description is not None:
            arc.description = req.description
        if req.episodes is not None:
            arc.episodes = req.episodes
            arc.total_episodes = len(req.episodes)
            arc.estimated_total_minutes = sum(ep.target_duration_minutes for ep in req.episodes)

        self.save_arc(arc)
        return arc

    def delete_arc(self, arc_id: str) -> bool:
        """Delete an arc note from the vault."""
        file_path = self.curriculum_dir / f"{_sanitize_filename(arc_id)}.md"
        if file_path.exists():
            file_path.unlink()
            return True
        return False
