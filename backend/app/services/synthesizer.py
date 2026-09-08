"""Context expansion & guide synthesizer service.

Synthesizes researched facts into structured markdown documents with Obsidian-compliant footnotes [^1].
Includes fact deduplication, ranking, and context budgeting to prevent LLM timeouts.
"""

from datetime import datetime, timezone
import logging
import re
import time
import uuid
from typing import Any, Dict, List, Optional
from app.config import get_settings
from app.models.vault import (
    AIMetadata,
    AtomicFact,
    ConfidenceLevel,
    ContextExpansionRequest,
    SynthesizedGuide,
)
from app.services.ai.router import AIRouter
from app.services.vault_storage import VaultStorageService

logger = logging.getLogger(__name__)

SYNTHESIS_SYSTEM_PROMPT = """You are a Principal Research Architect and Technical Writer.
Your task is to synthesize verified atomic facts into an authoritative, Obsidian-compatible technical guide.

Output Requirements:
1. Pure Markdown format.
2. Structure into logical sections:
   - # Title
   - ## Executive Overview
   - ## Deep Dive / Technical Architecture
   - ## Implementation & Workflows
   - ## Key Trade-offs, Benchmarks & Pitfalls
   - ## Synthesis & Strategic Takeaways
   - ## Footnotes & Citations
3. CITATION ACCURACY:
   - Every factual claim or metric MUST cite its backing fact using standard markdown footnotes: `[^1]`, `[^2]`, etc.
   - At the bottom under `## Footnotes & Citations`, define each footnote strictly linking to the fact note:
     `[^1]: [[facts/{fact_id}]] ^{fact_id} — {short_statement}`
4. Do not invent facts not grounded in the provided atomic facts.
"""

CONFIDENCE_SCORES = {
    ConfidenceLevel.VERIFIED: 10,
    ConfidenceLevel.HIGH: 8,
    ConfidenceLevel.INFERRED: 6,
    ConfidenceLevel.MEDIUM: 5,
    ConfidenceLevel.SPECULATIVE: 3,
    ConfidenceLevel.LOW: 2,
}


def _normalize_statement(text: str) -> str:
    """Normalize fact text for duplicate detection."""
    return re.sub(r"[^\w\s]", "", text.lower().strip())


class ContextSynthesizer:
    """Synthesizes researched facts into Obsidian markdown guides."""

    def __init__(
        self,
        ai_router: Optional[AIRouter] = None,
        vault_storage: Optional[VaultStorageService] = None,
        project_id: Optional[str] = None,
    ):
        self.router = ai_router or AIRouter()
        self.project_id = project_id
        self.vault = vault_storage or VaultStorageService(project_id=project_id)
        self.settings = get_settings()

    def _filter_and_budget_facts(
        self, request: ContextExpansionRequest
    ) -> List[AtomicFact]:
        """Filter, rank, deduplicate, and budget facts according to context limits."""
        all_facts = self.vault.list_facts()
        filtered = all_facts

        # 1. Filter by requested source IDs
        if request.source_ids:
            target_sources = set(request.source_ids)
            filtered = [f for f in filtered if f.source_id in target_sources]

        # 2. Filter by requested categories
        if request.categories:
            target_categories = set(request.categories)
            filtered = [f for f in filtered if f.category in target_categories]

        # 3. Filter by requested tags
        if request.tags:
            target_tags = set(t.lower() for t in request.tags)
            filtered = [
                f for f in filtered if any(t.lower() in target_tags for t in f.tags)
            ]

        # If strict filtering returned nothing, fall back to all available facts
        if not filtered and all_facts:
            logger.info(
                "Specific filters returned 0 facts. Falling back to all %d vault facts.",
                len(all_facts),
            )
            filtered = all_facts

        if not filtered:
            return []

        # 4. Deduplication
        deduped: Dict[str, AtomicFact] = {}
        for f in filtered:
            norm_key = _normalize_statement(f.statement)
            if norm_key in deduped:
                existing = deduped[norm_key]
                existing_score = CONFIDENCE_SCORES.get(existing.confidence, 4)
                new_score = CONFIDENCE_SCORES.get(f.confidence, 4)
                if new_score > existing_score:
                    deduped[norm_key] = f
            else:
                deduped[norm_key] = f

        unique_facts = list(deduped.values())

        # 5. Relevance & Quality Scoring
        topic_words = set(re.findall(r"\w+", request.topic.lower()))

        def fact_score(fact: AtomicFact) -> float:
            score = float(CONFIDENCE_SCORES.get(fact.confidence, 5))
            # Relevance boost if topic words appear in statement or tags
            stmt_words = set(re.findall(r"\w+", fact.statement.lower()))
            tag_words = set(t.lower() for t in fact.tags)
            overlap = len(topic_words & (stmt_words | tag_words))
            score += overlap * 4.0

            # Verifiability boost if exact quote is present
            if fact.exact_quote:
                score += 2.0
            return score

        unique_facts.sort(key=fact_score, reverse=True)

        # 6. Budgeting: Cap by maximum facts limit
        max_facts = self.settings.max_synthesis_facts
        budgeted = unique_facts[:max_facts]

        # 7. Character budget check (prevent GPU timeout on remote endpoints)
        char_budget = self.settings.max_synthesis_char_budget
        final_facts: List[AtomicFact] = []
        accumulated_chars = 0

        for f in budgeted:
            fact_len = len(f.statement) + len(f.exact_quote or "") + 120
            if accumulated_chars + fact_len > char_budget and len(final_facts) >= 10:
                logger.info(
                    "Context character budget reached (%d chars). Budgeted %d facts.",
                    accumulated_chars,
                    len(final_facts),
                )
                break
            final_facts.append(f)
            accumulated_chars += fact_len

        logger.info(
            "Selected %d facts (from %d total) for topic '%s'.",
            len(final_facts),
            len(all_facts),
            request.topic,
        )
        return final_facts

    async def expand_context(
        self,
        request: ContextExpansionRequest,
        preferred_provider: Optional[str] = None,
    ) -> SynthesizedGuide:
        """Synthesize facts into a comprehensive guide with footnotes."""
        facts = self._filter_and_budget_facts(request)

        if not facts:
            fact_corpus = "No facts currently stored in the vault."
            fact_id_map: Dict[str, AtomicFact] = {}
        else:
            fact_id_map = {f.fact_id: f for f in facts}
            lines = []
            for i, f in enumerate(facts, 1):
                quote_line = f' | Quote: "{f.exact_quote}"' if f.exact_quote else ""
                ts_line = f" | TS: {f.timestamp_range}" if f.timestamp_range else ""
                lines.append(
                    f"[{i}] ID: {f.fact_id} | Cat: {f.category.value} | Src: {f.source_id}{ts_line}{quote_line}\n"
                    f"    Statement: {f.statement}"
                )
            fact_corpus = "\n\n".join(lines)

        from app.services.project_storage import ProjectStorageService
        project_context = (
            ProjectStorageService().get_project_prompt_context(self.project_id)
            if self.project_id
            else ""
        )

        user_prompt = f"""{project_context}
Topic: {request.topic}
Detail Level: {request.detail_level}
Target Audience: {request.target_audience or 'Senior Engineers & Technical Researchers'}

Available Verified Facts in Vault:
====================================
{fact_corpus}
====================================

Synthesize an authoritative technical guide on '{request.topic}' drawing directly on these facts.
Remember to cite facts using footnotes [^n] that link back to the fact note identifier in Obsidian format!"""

        content, ai_meta = await self.router.generate_text(
            prompt=user_prompt,
            system_prompt=SYNTHESIS_SYSTEM_PROMPT,
            temperature=0.3,
            preferred_provider=preferred_provider,
        )

        # Detect referenced fact IDs from generated markdown
        referenced_fact_ids: List[str] = []
        for fact_id in fact_id_map.keys():
            if fact_id in content:
                referenced_fact_ids.append(fact_id)

        # Detect referenced sources
        referenced_source_ids = list(
            set(
                fact_id_map[fid].source_id
                for fid in referenced_fact_ids
                if fid in fact_id_map and fact_id_map[fid].source_id
            )
        )

        slug = re.sub(r"[^\w\-_]", "_", request.topic.lower())[:30]
        guide_id = f"guide_{slug}_{uuid.uuid4().hex[:6]}"

        guide = SynthesizedGuide(
            guide_id=guide_id,
            topic=request.topic,
            markdown_content=content,
            referenced_fact_ids=referenced_fact_ids,
            referenced_source_ids=referenced_source_ids,
            created_at=datetime.now(timezone.utc),
            ai_metadata=ai_meta,
        )

        # Persist to vault
        self.vault.save_guide(guide)
        return guide
