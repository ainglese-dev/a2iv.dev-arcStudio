"""Obsidian-compliant Presentation Storage Service.

Persists synced presentation slide decks to `vault/presentations/{deck_id}.md`
with YAML frontmatter, structured slide definitions, and human-readable visual layouts.
"""

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import re
from typing import Any, Dict, List, Optional
import frontmatter

from app.config import get_settings
from app.models.presentation import (
    PresentationDeck,
    PresentationDeckSummary,
    PresentationObjectiveMetrics,
    PresentationSlide,
    SlideElementVariant,
    SlideType,
)

logger = logging.getLogger(__name__)


def _sanitize_filename(name: str) -> str:
    """Sanitize string for safe file naming."""
    clean = re.sub(r"[^\w\-_.]", "_", name.strip())
    return clean[:120] if clean else "unnamed_deck"


def format_presentation_markdown(deck: PresentationDeck) -> str:
    """Format presentation deck into clean Obsidian markdown with callouts."""
    m_dur, s_dur = divmod(int(deck.total_duration_s), 60)
    lines = [
        f"# Presentation Deck: {deck.script_title}",
        "",
        "> [!abstract] Presentation Deck Overview",
        f"> - **Deck ID**: `{deck.deck_id}` | **Script ID**: `[[scripts/{deck.script_id}|{deck.script_id}]]`",
        f"> - **Slide Count**: {deck.total_slides} slides | **Total Duration**: {m_dur:02d}:{s_dur:02d} ({deck.total_duration_s:.1f}s)",
        f"> - **Cue Coverage**: {deck.metrics.cue_coverage_percentage:.1f}% | **Pacing Alignment**: {deck.metrics.pacing_alignment_score:.1f}%",
        ">",
        "> ### A/B Comparative Benchmarks",
        f"> - **Variant A (Terminal Dark)**: Words/Slide: **{deck.metrics.variant_a_avg_words_per_slide:.1f}** | Cognitive Load: **{deck.metrics.variant_a_cognitive_load_score:.1f}/100**",
        f"> - **Variant B (Infographic Clean)**: Words/Slide: **{deck.metrics.variant_b_avg_words_per_slide:.1f}** | Cognitive Load: **{deck.metrics.variant_b_cognitive_load_score:.1f}/100**",
        "",
        "---",
        "",
    ]

    for slide in deck.slides:
        m_st, s_st = divmod(int(slide.timestamp_start_s), 60)
        m_et, s_et = divmod(int(slide.timestamp_end_s), 60)
        time_str = f"{m_st:02d}:{s_st:02d} - {m_et:02d}:{s_et:02d} ({slide.duration_s:.1f}s)"

        lines.extend([
            f"## Slide {slide.slide_index + 1}: {slide.variant_b.headline} `^{slide.slide_id}`",
            f"- **Type**: `{slide.slide_type.value}` | **Section**: {slide.section_index + 1} | **Time**: {time_str}",
            f"- **Cue Marker**: `{slide.cue_marker}`",
            "",
            "> [!quote] Spoken Teleprompter Anchor",
            f"> \"{slide.spoken_anchor_text}\"",
            "",
            "> [!example] Variant A: Terminal / Architecture Dark (SRE Console)",
            f"> **Headline**: `{slide.variant_a.headline}`",
        ])

        if slide.variant_a.subhead:
            lines.append(f"> **Subhead**: {slide.variant_a.subhead}")

        if slide.variant_a.code_snippet:
            lines.extend([
                f"> ```{slide.variant_a.code_language or 'bash'}",
                *[f"> {c_line}" for c_line in slide.variant_a.code_snippet.splitlines()],
                "> ```",
            ])

        for bp in slide.variant_a.bullet_points or []:
            lines.append(f"> - `{bp}`")

        for pill in slide.variant_a.badge_pills or []:
            lines.append(f"> `[{pill}]`")

        lines.extend([
            "",
            "> [!info] Variant B: Clean Infographic / Comparison (Executive Visual)",
            f"> **Headline**: {slide.variant_b.headline}",
        ])

        if slide.variant_b.subhead:
            lines.append(f"> **Subhead**: *{slide.variant_b.subhead}*")

        if slide.variant_b.comparison_left and slide.variant_b.comparison_right:
            lines.extend([
                ">",
                "> | " + str(slide.variant_b.comparison_left.get("title", "Left")) + " | " + str(slide.variant_b.comparison_right.get("title", "Right")) + " |",
                "> | :--- | :--- |",
                "> | `" + str(slide.variant_b.comparison_left.get("status", "")) + "` | `" + str(slide.variant_b.comparison_right.get("status", "")) + "` |",
                ">",
            ])

        for bp in slide.variant_b.bullet_points or []:
            lines.append(f"> - {bp}")

        for mc in slide.variant_b.metric_callouts or []:
            lines.append(f"> **{mc.get('label', 'Metric')}**: `{mc.get('value', '')}` ({mc.get('note', '')})")

        lines.extend([
            "",
            "---",
            "",
        ])

    return "\n".join(lines)


class PresentationStorageService:
    """Manages file persistence for synchronized presentation decks in Obsidian."""

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
        self.presentations_dir = self.base_dir / "presentations"
        self.presentations_dir.mkdir(parents=True, exist_ok=True)

    def save_deck(self, deck: PresentationDeck) -> Path:
        """Save a presentation deck note with YAML frontmatter and human-readable body."""
        file_path = self.presentations_dir / f"{_sanitize_filename(deck.deck_id)}.md"

        body = format_presentation_markdown(deck)

        slides_data = [slide.model_dump(mode="json") for slide in deck.slides]
        metrics_data = deck.metrics.model_dump(mode="json")

        post_meta: Dict[str, Any] = {
            "deck_id": deck.deck_id,
            "script_id": deck.script_id,
            "script_title": deck.script_title,
            "total_slides": deck.total_slides,
            "total_duration_s": deck.total_duration_s,
            "metrics": metrics_data,
            "slides": slides_data,
            "created_at": deck.created_at.isoformat(),
        }

        if deck.ai_metadata:
            post_meta["ai_metadata"] = deck.ai_metadata

        post = frontmatter.Post(body, **post_meta)
        file_path.write_text(frontmatter.dumps(post), encoding="utf-8")
        logger.info("Saved presentation deck to %s", file_path)
        return file_path

    def get_deck(self, deck_id: str) -> Optional[PresentationDeck]:
        """Retrieve a PresentationDeck by deck_id."""
        file_path = self.presentations_dir / f"{_sanitize_filename(deck_id)}.md"
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

        slides: List[PresentationSlide] = []
        for s_data in meta.get("slides", []):
            try:
                slides.append(PresentationSlide(**s_data))
            except Exception as e:
                logger.warning("Failed parsing presentation slide in %s: %s", deck_id, e)

        metrics = PresentationObjectiveMetrics(
            variant_a_avg_words_per_slide=0.0,
            variant_b_avg_words_per_slide=0.0,
            variant_a_cognitive_load_score=0.0,
            variant_b_cognitive_load_score=0.0,
        )
        if "metrics" in meta and isinstance(meta["metrics"], dict):
            try:
                metrics = PresentationObjectiveMetrics(**meta["metrics"])
            except Exception as e:
                logger.warning("Failed parsing metrics in %s: %s", deck_id, e)

        return PresentationDeck(
            deck_id=meta.get("deck_id", deck_id),
            script_id=meta.get("script_id", ""),
            script_title=meta.get("script_title", "Untitled Presentation"),
            total_slides=meta.get("total_slides", len(slides)),
            total_duration_s=float(meta.get("total_duration_s", 0.0)),
            slides=slides,
            metrics=metrics,
            created_at=created_at,
            ai_metadata=meta.get("ai_metadata"),
        )

    def list_decks(self) -> List[Dict[str, Any]]:
        """List summary of all presentation decks in the vault."""
        summaries: List[Dict[str, Any]] = []
        for p in self.presentations_dir.glob("*.md"):
            if p.name.startswith("."):
                continue
            deck = self.get_deck(p.stem)
            if deck:
                summaries.append({
                    "deck_id": deck.deck_id,
                    "script_id": deck.script_id,
                    "script_title": deck.script_title,
                    "total_slides": deck.total_slides,
                    "total_duration_s": deck.total_duration_s,
                    "metrics": deck.metrics.model_dump(mode="json"),
                    "created_at": deck.created_at.isoformat(),
                })

        summaries.sort(key=lambda s: s["created_at"], reverse=True)
        return summaries

    def delete_deck(self, deck_id: str) -> bool:
        """Delete a presentation deck note from the vault."""
        file_path = self.presentations_dir / f"{_sanitize_filename(deck_id)}.md"
        if file_path.exists():
            file_path.unlink()
            return True
        return False
