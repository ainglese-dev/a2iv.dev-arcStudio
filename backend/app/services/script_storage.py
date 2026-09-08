"""Obsidian-compliant Script Storage Service.

Persists video scripts to `vault/scripts/{script_id}.md` with YAML frontmatter,
teleprompter spoken text, visual cue markers, and fact grounding.
"""

from datetime import datetime, timezone
import logging
from pathlib import Path
import re
from typing import Any, Dict, List, Optional
import frontmatter

from app.config import get_settings
from app.models.script import ScriptSection, SectionType, VideoScript, VideoScriptSummary
from app.models.vault import AIMetadata

logger = logging.getLogger(__name__)


def _sanitize_filename(name: str) -> str:
    """Sanitize string for safe file naming."""
    clean = re.sub(r"[^\w\-_.]", "_", name.strip())
    return clean[:120] if clean else "unnamed_script"


def format_script_markdown(script: VideoScript) -> str:
    """Generate clean Obsidian-compatible Markdown for teleprompter viewing."""
    lines = [
        f"# {script.title}",
        "",
        "> [!abstract] Teleprompter Overview",
        f"> - **Episode ID**: `{script.episode_id}`"
        + (f" | **Arc ID**: `{script.arc_id}`" if script.arc_id else ""),
        f"> - **Pacing**: ~{script.target_duration_minutes} mins ({script.total_word_count} words @ 140-145 WPM)",
        f"> - **Estimated Speaking Time**: {script.estimated_speaking_minutes:.1f} minutes",
        f"> - **Grounded Facts**: {', '.join(f'[[facts/{fid}]]' for fid in script.key_facts_referenced) if script.key_facts_referenced else 'General'}",
        "",
        "> [!danger] 15-Second Opening Hook (Agitate the Pain)",
        f"> {script.hook_text}",
        "",
        "---",
        "",
    ]

    running_seconds = 0
    for idx, sec in enumerate(script.sections, 1):
        m, s = divmod(running_seconds, 60)
        time_stamp = f"{m:02d}:{s:02d}"
        word_count = len(sec.spoken_text.split())

        lines.extend([
            f"## [{time_stamp}] Section {idx}: {sec.title}",
            f"- **Type**: `{sec.section_type.value}` | **Target**: {sec.target_duration_seconds}s | **Words**: {word_count}",
        ])

        if sec.visual_cue:
            lines.extend([
                "",
                f"> [!tip] Visual Anchor",
                f"> {sec.visual_cue}",
            ])

        lines.extend([
            "",
            sec.spoken_text,
            "",
            "---",
            "",
        ])
        running_seconds += sec.target_duration_seconds

    return "\n".join(lines)


class ScriptStorageService:
    """Manages file persistence for video scripts in the Obsidian Vault (scoped by project)."""

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
        self.scripts_dir = self.base_dir / "scripts"
        self.scripts_dir.mkdir(parents=True, exist_ok=True)

    def save_script(self, script: VideoScript) -> Path:
        """Save a VideoScript note with YAML frontmatter and teleprompter body."""
        file_path = self.scripts_dir / f"{_sanitize_filename(script.script_id)}.md"

        # Ensure full_script_markdown is populated
        if not script.full_script_markdown or not script.full_script_markdown.strip():
            script.full_script_markdown = format_script_markdown(script)

        # Recalculate word count and speaking minutes
        total_words = sum(len(sec.spoken_text.split()) for sec in script.sections)
        if total_words > 0:
            script.total_word_count = total_words
            script.estimated_speaking_minutes = round(total_words / 140.0, 2)

        sections_data = [sec.model_dump(mode="json") for sec in script.sections]

        post_meta: Dict[str, Any] = {
            "script_id": script.script_id,
            "episode_id": script.episode_id,
            "arc_id": script.arc_id,
            "title": script.title,
            "target_duration_minutes": script.target_duration_minutes,
            "total_word_count": script.total_word_count,
            "estimated_speaking_minutes": script.estimated_speaking_minutes,
            "hook_text": script.hook_text,
            "key_facts_referenced": script.key_facts_referenced,
            "created_at": script.created_at.isoformat(),
            "sections": sections_data,
        }

        if script.ai_metadata:
            post_meta["ai_metadata"] = script.ai_metadata.model_dump(mode="json")

        post = frontmatter.Post(script.full_script_markdown, **post_meta)
        file_path.write_text(frontmatter.dumps(post), encoding="utf-8")
        logger.info("Saved video script to %s", file_path)
        return file_path

    def get_script(self, script_id: str) -> Optional[VideoScript]:
        """Retrieve a VideoScript note by script_id."""
        file_path = self.scripts_dir / f"{_sanitize_filename(script_id)}.md"
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

        sections: List[ScriptSection] = []
        for s_data in meta.get("sections", []):
            try:
                sections.append(ScriptSection(**s_data))
            except Exception as e:
                logger.warning("Failed parsing script section in %s: %s", script_id, e)

        ai_meta = None
        if "ai_metadata" in meta and isinstance(meta["ai_metadata"], dict):
            try:
                ai_meta = AIMetadata(**meta["ai_metadata"])
            except Exception:
                pass

        return VideoScript(
            script_id=meta.get("script_id", script_id),
            episode_id=meta.get("episode_id", ""),
            arc_id=meta.get("arc_id"),
            title=meta.get("title", "Untitled Script"),
            target_duration_minutes=meta.get("target_duration_minutes", 6),
            total_word_count=meta.get("total_word_count", 0),
            estimated_speaking_minutes=meta.get("estimated_speaking_minutes", 0.0),
            hook_text=meta.get("hook_text", ""),
            sections=sections,
            full_script_markdown=post.content,
            key_facts_referenced=meta.get("key_facts_referenced", []),
            ai_metadata=ai_meta,
            created_at=created_at,
        )

    def list_scripts(self) -> List[VideoScriptSummary]:
        """List all video scripts in the vault."""
        summaries: List[VideoScriptSummary] = []
        for p in self.scripts_dir.glob("*.md"):
            if p.name.startswith("."):
                continue
            script = self.get_script(p.stem)
            if script:
                summaries.append(
                    VideoScriptSummary(
                        script_id=script.script_id,
                        episode_id=script.episode_id,
                        arc_id=script.arc_id,
                        title=script.title,
                        total_word_count=script.total_word_count,
                        estimated_speaking_minutes=script.estimated_speaking_minutes,
                        created_at=script.created_at,
                    )
                )

        summaries.sort(key=lambda s: s.created_at, reverse=True)
        return summaries

    def delete_script(self, script_id: str) -> bool:
        """Delete a script note from the vault."""
        file_path = self.scripts_dir / f"{_sanitize_filename(script_id)}.md"
        if file_path.exists():
            file_path.unlink()
            return True
        return False
