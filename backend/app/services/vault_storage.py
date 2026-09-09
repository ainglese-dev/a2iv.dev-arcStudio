"""Obsidian-compliant Vault Storage Service.

Reads and writes pure Markdown notes with YAML frontmatter, quote callouts (> [!quote]),
wikilinks ([[source]]), and block anchors (^fact-id).
"""

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import re
import shutil
from typing import Any, Dict, List, Optional, Tuple
import frontmatter
from app.config import get_settings
from app.models.vault import (
    AIMetadata,
    AtomicFact,
    ConfidenceLevel,
    FactCategory,
    SourceChunk,
    SourceMetadata,
    SourceType,
    SynthesizedGuide,
)
from app.services.project_storage import ProjectStorageService, _sanitize_project_id

logger = logging.getLogger(__name__)


def _sanitize_filename(name: str) -> str:
    """Sanitize string for safe file naming."""
    clean = re.sub(r"[^\w\-_.]", "_", name.strip())
    return clean[:120] if clean else "unnamed"


class VaultStorageService:
    """Manages file persistence in the Obsidian Vault directory (scoped by project)."""

    def __init__(self, vault_dir: Optional[Path] = None, project_id: Optional[str] = None):
        settings = get_settings()

        if project_id is None and vault_dir is None:
            self.project_id = ProjectStorageService().get_default_or_first_project_id()
        else:
            self.project_id = project_id

        if self.project_id:
            clean_id = _sanitize_project_id(self.project_id)
            self.project_id = clean_id
            base_vault = vault_dir or settings.resolved_vault_dir
            self.base_dir = base_vault / "projects" / clean_id
        else:
            self.base_dir = vault_dir or settings.resolved_vault_dir

        self.vault_dir = self.base_dir
        self.sources_dir = self.base_dir / "sources"
        self.facts_dir = self.base_dir / "facts"
        self.guides_dir = self.base_dir / "guides"

        self.sources_dir.mkdir(parents=True, exist_ok=True)
        self.facts_dir.mkdir(parents=True, exist_ok=True)
        self.guides_dir.mkdir(parents=True, exist_ok=True)

    def _move_to_trash(self, file_path: Path) -> bool:
        """Move a file to .trash directory instead of hard unlinking."""
        if file_path.exists():
            trash_dir = self.vault_dir / ".trash"
            trash_dir.mkdir(parents=True, exist_ok=True)
            trash_dest = trash_dir / f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file_path.name}"
            shutil.move(str(file_path), str(trash_dest))
            return True
        return False

    # --------------------------------------------------------------------------
    # Sources Storage
    # --------------------------------------------------------------------------
    def save_source(
        self,
        metadata: SourceMetadata,
        chunks: List[SourceChunk],
        raw_content: str,
    ) -> Path:
        """Save a source document with frontmatter, chunks, and content."""
        file_path = self.sources_dir / f"{_sanitize_filename(metadata.source_id)}.md"

        chunks_data = [
            {
                "chunk_id": c.chunk_id,
                "chunk_index": c.chunk_index,
                "timestamp_start": c.timestamp_start,
                "timestamp_end": c.timestamp_end,
                "char_count": c.char_count,
                "word_count": c.word_count,
                "text": c.text,
            }
            for c in chunks
        ]

        post_meta = {
            "source_id": metadata.source_id,
            "title": metadata.title,
            "source_type": metadata.source_type.value,
            "url": metadata.url,
            "author": metadata.author,
            "published_date": metadata.published_date,
            "total_chunks": len(chunks),
            "tags": metadata.tags,
            "created_at": metadata.created_at.isoformat(),
            "chunks": chunks_data,
        }

        # Build Obsidian markdown body
        body_lines = [
            f"# {metadata.title}",
            "",
            "## Metadata",
            f"- **Source ID**: `{metadata.source_id}`",
            f"- **Type**: `{metadata.source_type.value}`",
        ]
        if metadata.url:
            body_lines.append(f"- **URL**: [{metadata.url}]({metadata.url})")
        if metadata.author:
            body_lines.append(f"- **Author**: {metadata.author}")
        if metadata.published_date:
            body_lines.append(f"- **Published**: {metadata.published_date}")
        if metadata.tags:
            body_lines.append(f"- **Tags**: {', '.join('#' + t for t in metadata.tags)}")

        body_lines.extend(["", "## Raw Content", "", raw_content, "", "## Chunks", ""])

        for c in chunks:
            ts_info = ""
            if c.timestamp_start or c.timestamp_end:
                ts_info = f" ({c.timestamp_start or ''} - {c.timestamp_end or ''})"
            body_lines.append(f"### Chunk {c.chunk_index}{ts_info}")
            body_lines.append(f"{c.text} ^{c.chunk_id}")
            body_lines.append("")

        post = frontmatter.Post("\n".join(body_lines), **post_meta)
        file_path.write_text(frontmatter.dumps(post), encoding="utf-8")
        logger.info("Saved source to %s", file_path)
        return file_path

    def get_source(self, source_id: str) -> Optional[Tuple[SourceMetadata, List[SourceChunk], str]]:
        """Retrieve source metadata, chunks, and raw content from vault."""
        file_path = self.sources_dir / f"{_sanitize_filename(source_id)}.md"
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

        source_meta = SourceMetadata(
            source_id=meta.get("source_id", source_id),
            title=meta.get("title", "Untitled Source"),
            source_type=SourceType(meta.get("source_type", SourceType.ARTICLE.value)),
            url=meta.get("url"),
            author=meta.get("author"),
            published_date=meta.get("published_date"),
            total_chunks=meta.get("total_chunks", 0),
            tags=meta.get("tags", []),
            created_at=created_at,
        )

        chunks: List[SourceChunk] = []
        for c in meta.get("chunks", []):
            chunks.append(
                SourceChunk(
                    chunk_id=c["chunk_id"],
                    chunk_index=c["chunk_index"],
                    text=c.get("text", ""),
                    timestamp_start=c.get("timestamp_start"),
                    timestamp_end=c.get("timestamp_end"),
                    char_count=c.get("char_count", 0),
                    word_count=c.get("word_count", 0),
                )
            )

        return source_meta, chunks, post.content

    def list_sources(self) -> List[SourceMetadata]:
        """List all ingested sources in the vault."""
        sources: List[SourceMetadata] = []
        for p in self.sources_dir.glob("*.md"):
            if p.name.startswith("."):
                continue
            try:
                post = frontmatter.loads(p.read_text(encoding="utf-8"))
                meta = post.metadata
                created_at = datetime.now(timezone.utc)
                if "created_at" in meta and meta["created_at"]:
                    try:
                        created_at = datetime.fromisoformat(str(meta["created_at"]))
                    except Exception:
                        pass

                sources.append(
                    SourceMetadata(
                        source_id=meta.get("source_id", p.stem),
                        title=meta.get("title", p.stem),
                        source_type=SourceType(meta.get("source_type", SourceType.ARTICLE.value)),
                        url=meta.get("url"),
                        author=meta.get("author"),
                        published_date=meta.get("published_date"),
                        total_chunks=meta.get("total_chunks", 0),
                        tags=meta.get("tags", []),
                        created_at=created_at,
                    )
                )
            except Exception as e:
                logger.warning("Failed parsing source file %s: %s", p, e)

        # Sort descending by created_at
        sources.sort(key=lambda s: s.created_at, reverse=True)
        return sources

    def delete_source(self, source_id: str) -> bool:
        """Move a source file to .trash instead of hard unlinking."""
        file_path = self.sources_dir / f"{_sanitize_filename(source_id)}.md"
        return self._move_to_trash(file_path)

    # --------------------------------------------------------------------------
    # Facts Storage
    # --------------------------------------------------------------------------
    def save_fact(self, fact: AtomicFact) -> Path:
        """Save an individual atomic fact as an Obsidian-compliant note."""
        file_path = self.facts_dir / f"{_sanitize_filename(fact.fact_id)}.md"

        post_meta = {
            "fact_id": fact.fact_id,
            "category": fact.category.value,
            "confidence": fact.confidence.value,
            "source_id": fact.source_id,
            "source_chunk_id": fact.source_chunk_id,
            "timestamp_range": fact.timestamp_range,
            "exact_quote": fact.exact_quote,
            "tags": fact.tags,
            "created_at": fact.created_at.isoformat(),
        }

        # Build Obsidian markdown body with callout and block anchor
        quote_section = ""
        if fact.exact_quote:
            quoted_lines = "\n".join(f"> {line}" for line in fact.exact_quote.splitlines())
            quote_section = f"\n> [!quote] Source Evidence\n{quoted_lines}\n"

        summary_title = fact.statement.split(".")[0][:60]
        body = f"""# Fact: {summary_title}

{fact.statement} ^{fact.fact_id}
{quote_section}
## Provenance
- **Source**: [[{fact.source_id}]]
- **Source Chunk**: `{fact.source_chunk_id or 'N/A'}`
- **Timestamp**: `{fact.timestamp_range or 'N/A'}`
- **Category**: `{fact.category.value}`
- **Confidence**: `{fact.confidence.value}`
"""
        post = frontmatter.Post(body, **post_meta)
        file_path.write_text(frontmatter.dumps(post), encoding="utf-8")
        return file_path

    def save_facts(self, facts: List[AtomicFact]) -> List[Path]:
        """Batch save multiple atomic facts."""
        paths = []
        for fact in facts:
            paths.append(self.save_fact(fact))
        return paths

    def get_fact(self, fact_id: str) -> Optional[AtomicFact]:
        """Retrieve a single atomic fact by ID."""
        file_path = self.facts_dir / f"{_sanitize_filename(fact_id)}.md"
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

        # Parse statement from content if not in meta
        statement = meta.get("statement", "")
        if not statement:
            # Look for line ending with ^{fact_id} or first non-header line
            for line in post.content.splitlines():
                line_str = line.strip()
                if line_str.startswith("#") or not line_str or line_str.startswith(">"):
                    continue
                # Strip block anchor if present
                clean_line = re.sub(r"\s*\^[A-Za-z0-9_\-]+$", "", line_str)
                statement = clean_line
                break

        return AtomicFact(
            fact_id=meta.get("fact_id", fact_id),
            statement=statement,
            category=FactCategory(meta.get("category", FactCategory.GENERAL.value)),
            confidence=ConfidenceLevel(meta.get("confidence", ConfidenceLevel.HIGH.value)),
            source_id=meta.get("source_id", ""),
            source_chunk_id=meta.get("source_chunk_id"),
            exact_quote=meta.get("exact_quote"),
            timestamp_range=meta.get("timestamp_range"),
            tags=meta.get("tags", []),
            created_at=created_at,
        )

    def list_facts(
        self,
        source_id: Optional[str] = None,
        category: Optional[FactCategory] = None,
        tag: Optional[str] = None,
    ) -> List[AtomicFact]:
        """List and optionally filter facts in the vault."""
        facts: List[AtomicFact] = []
        for p in self.facts_dir.glob("*.md"):
            if p.name.startswith("."):
                continue
            fact = self.get_fact(p.stem)
            if not fact:
                continue

            if source_id and fact.source_id != source_id:
                continue
            if category and fact.category != category:
                continue
            if tag and tag not in fact.tags:
                continue

            facts.append(fact)

        facts.sort(key=lambda f: f.created_at, reverse=True)
        return facts

    def delete_fact(self, fact_id: str) -> bool:
        """Move an atomic fact to .trash instead of hard unlinking."""
        file_path = self.facts_dir / f"{_sanitize_filename(fact_id)}.md"
        return self._move_to_trash(file_path)

    # --------------------------------------------------------------------------
    # Guides Storage
    # --------------------------------------------------------------------------
    def save_guide(self, guide: SynthesizedGuide) -> Path:
        """Save a synthesized guide as an Obsidian-compliant note."""
        file_path = self.guides_dir / f"{_sanitize_filename(guide.guide_id)}.md"

        post_meta = {
            "guide_id": guide.guide_id,
            "topic": guide.topic,
            "referenced_fact_ids": guide.referenced_fact_ids,
            "referenced_source_ids": guide.referenced_source_ids,
            "created_at": guide.created_at.isoformat(),
        }
        if guide.ai_metadata:
            post_meta["ai_metadata"] = guide.ai_metadata.model_dump()

        post = frontmatter.Post(guide.markdown_content, **post_meta)
        file_path.write_text(frontmatter.dumps(post), encoding="utf-8")
        return file_path

    def get_guide(self, guide_id: str) -> Optional[SynthesizedGuide]:
        """Retrieve a synthesized guide by ID."""
        file_path = self.guides_dir / f"{_sanitize_filename(guide_id)}.md"
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

        ai_meta = None
        if "ai_metadata" in meta and isinstance(meta["ai_metadata"], dict):
            try:
                ai_meta = AIMetadata(**meta["ai_metadata"])
            except Exception:
                pass

        return SynthesizedGuide(
            guide_id=meta.get("guide_id", guide_id),
            topic=meta.get("topic", "Untitled Guide"),
            markdown_content=post.content,
            referenced_fact_ids=meta.get("referenced_fact_ids", []),
            referenced_source_ids=meta.get("referenced_source_ids", []),
            created_at=created_at,
            ai_metadata=ai_meta,
        )

    def list_guides(self) -> List[Dict[str, Any]]:
        """List all synthesized guides in the vault."""
        guides: List[Dict[str, Any]] = []
        for p in self.guides_dir.glob("*.md"):
            if p.name.startswith("."):
                continue
            guide = self.get_guide(p.stem)
            if guide:
                guides.append(
                    {
                        "guide_id": guide.guide_id,
                        "topic": guide.topic,
                        "created_at": guide.created_at.isoformat(),
                        "referenced_facts_count": len(guide.referenced_fact_ids),
                        "referenced_sources_count": len(guide.referenced_source_ids),
                    }
                )
        guides.sort(key=lambda g: g.get("created_at", ""), reverse=True)
        return guides

    def delete_guide(self, guide_id: str) -> bool:
        """Move a guide note to .trash instead of hard unlinking."""
        file_path = self.guides_dir / f"{_sanitize_filename(guide_id)}.md"
        return self._move_to_trash(file_path)
