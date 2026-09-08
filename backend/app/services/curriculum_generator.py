"""Curriculum Generator Agent for Module 2: Arc & Curriculum Architect.

Synthesizes verified atomic facts from the vault into a pedagogically sequenced,
multi-tier video curriculum arc (Fundamentals -> Advanced -> Hands-On Labs).
"""

from datetime import datetime, timezone
import logging
import re
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.config import get_settings
from app.models.curriculum import (
    ArcTier,
    GenerateCurriculumRequest,
    VideoArc,
    VideoEpisode,
)
from app.models.vault import AIMetadata, AtomicFact
from app.services.ai.router import AIRouter
from app.services.curriculum_storage import CurriculumStorageService
from app.services.vault_storage import VaultStorageService

logger = logging.getLogger(__name__)


class GeneratedEpisodeSchema(BaseModel):
    episode_number: int = Field(description="Sequential episode index starting at 1.")
    tier: ArcTier = Field(
        default=ArcTier.FUNDAMENTALS,
        description="Progression tier: 'fundamentals', 'advanced', or 'lab'.",
    )
    title: str = Field(description="Compelling, descriptive YouTube-style title.")
    hook: str = Field(
        description=(
            "Visceral 15-second opening hook (~30-45 spoken words) using the 3-part 'Agitate the Pain' formula: "
            "1) Agonizing Production Reality (practitioner trench scar tissue: 2 AM outages, screaming laptop fans, 400-row audit spreadsheets), "
            "2) Emotional/Professional Stakes (failed audits, post-mortem dread, executive escalation), "
            "3) Punchy Pivot or Immediate Command (practical escape hatch). "
            "Banned: corporate brochure fluff ('testing against SLAs', 'operational excellence') and polite rhetorical questions."
        )
    )
    learning_objectives: List[str] = Field(
        default_factory=list, description="3-4 concrete, actionable engineering takeaways."
    )
    key_facts_referenced: List[str] = Field(
        default_factory=list, description="Exact fact IDs from the vault grounded in this episode."
    )
    target_duration_minutes: int = Field(
        default=6, description="Strictly between 5 and 7 minutes for optimal video pacing."
    )
    recommended_visuals: List[str] = Field(
        default_factory=list, description="Concrete visual/diagram suggestions for slides or animations."
    )
    lab_exercise: Optional[str] = Field(
        default=None, description="Hands-on terminal/Docker/code command for lab tier (null for fundamentals/advanced)."
    )


class GeneratedCurriculumSchema(BaseModel):
    title: str = Field(description="Title of the entire video curriculum arc.")
    description: str = Field(description="Executive summary and pedagogical mission of the course.")
    episodes: List[GeneratedEpisodeSchema] = Field(
        default_factory=list, description="Sequenced episodes covering fundamentals, advanced concepts, and labs."
    )


CURRICULUM_SYSTEM_PROMPT = """You are a Principal Technical Curriculum Architect and YouTube Video Director.
Your mission is to structure a compelling, high-retention video curriculum arc from verified atomic research facts.

Pedagogical Rules:
1. THREE-TIER PROGRESSION:
   - Tier 1: 'fundamentals' (First 25-40% of episodes) — Core mental models, why traditional systems break in production, basic terminology.
   - Tier 2: 'advanced' (Middle 35-50% of episodes) — Algorithmic deep dives, benchmark trade-offs, architecture internals.
   - Tier 3: 'lab' (Final 20-30% of episodes) — Hands-on terminal deployment, Docker/CLI recipes, benchmark stress-testing.

2. DURATION CALIBRATION:
   - Every single episode MUST be calibrated strictly for a 5 to 7 minute video format (`target_duration_minutes`: 5, 6, or 7).

3. ATOMIC FACT GROUNDING:
   - In `key_facts_referenced`, cite the exact `fact_id`s from the provided vault facts list that back the episode claims.

4. PRACTITIONER TRENCH / REAL-WORLD & POST-MORTEM MINDSET (CRITICAL):
   - You are writing for real practitioners, operators, engineers, and domain researchers who navigate high-stakes production environments.
   - Ground problems in visceral real-world scar tissue, failure modes, production trade-offs, and critical lessons learned across technology, sciences, systems, or humanities:
     * Resource exhaustion, system lockups, and degraded performance under production scale or testing workloads.
     * Drowning in tedious audit spreadsheets, compliance matrices, or complex multi-variable documentation with zero automated visibility.
     * High-stakes deployments, unverified configuration changes, or experimental steps pushed blind into production.
     * The post-mortem you never want to write: explaining to leadership or stakeholders why a subtle regression caused a major failure.
   - Frame every tool, methodology, or architecture strictly as a PRACTICAL ESCAPE HATCH and practitioner survival kit, NEVER as an "enterprise transformation".
   - BAN ALL CORPORATE SALES BROCHURE FLUFF & VENDOR BUZZWORDS. Strictly ban:
     * "testing things against SLAs" / "testing against SLAs"
     * "operational excellence"
     * "streamlining workflows" / "streamline workflows"
     * "enterprise ROI"
     * "mission-critical uptime"
     * "holistic compliance paradigm"
     * "leveraging synergies" / "seamless digital transformation"

5. "AGITATE THE PAIN" 15-SECOND OPENING HOOK FORMULA:
   - Every episode MUST open with a visceral, high-stakes, pain-first hook.
   - BAN ALL polite, academic, or generic rhetorical questions. NEVER use:
     * "What if a complex system could run smoothly?"
     * "Have you ever wondered how this works?"
     * "Did you know that this causes bottlenecks?"
     * "In this video, we will explore..."
   - ENFORCE the 3-part Visceral Pain Hook in every episode:
     * Part 1: The Agonizing Production Reality (e.g. "Critical system running in production, zero documentation, nobody can explain it, and you're terrified a single oversight brings it down?")
     * Part 2: The Emotional / Professional Stakes (e.g. "Walking into a leadership or stakeholder assessment feeling like you missed critical failure modes and you're about to deliver an incomplete report?")
     * Part 3: The Punchy Pivot / Immediate Command (e.g. "Stress-test it, and do it fast.", "Stop burning your afternoon on manual guesswork. Here is how.")
   - Hook Exemplars:
     * ❌ BANNED (Corporate Brochure): "In this episode, we explore how modern tools empower teams to achieve operational excellence and test things against SLAs to deliver mission-critical enterprise ROI."
     * ✅ REQUIRED (Practitioner Reality): "Tried stress-testing a distributed pipeline in your test environment only to have resource limits max out and your test machine freeze before processing the first batch? Terrified your next deployment is the one where an unhandled edge case kills production? Strip away bloated overhead and test real-world failure modes under 30 seconds."
     * ✅ REQUIRED (Audit/Compliance/Analysis): "Dropped into a high-stakes compliance assessment or complex forensic audit with 400 spreadsheet rows and zero visibility? Dreading delivering an inaccurate report and failing the audit? Stop manually clicking through consoles. Automate your evidence collection, and do it fast."
   - STRICT LENGTH CALIBRATION: Calibrate the hook strictly for a 15-second spoken delivery (~30 to 45 spoken words).

6. CONCRETE VISUALS:
   - Provide concrete slide/diagram descriptions for technical animators (e.g. "Split-screen comparing static contiguous memory vs dynamic page table").
"""


class CurriculumGenerator:
    """Agent that designs grounded video curriculum arcs from the Fact Vault."""

    def __init__(
        self,
        ai_router: Optional[AIRouter] = None,
        vault_storage: Optional[VaultStorageService] = None,
        curriculum_storage: Optional[CurriculumStorageService] = None,
        project_id: Optional[str] = None,
    ):
        self.router = ai_router or AIRouter()
        self.project_id = project_id
        self.vault = vault_storage or VaultStorageService(project_id=project_id)
        self.storage = curriculum_storage or CurriculumStorageService(vault_dir=self.vault.vault_dir, project_id=project_id)
        self.settings = get_settings()

    def _gather_facts(
        self,
        request: GenerateCurriculumRequest,
        effective_topic: Optional[str] = None,
    ) -> List[AtomicFact]:
        """Gather relevant facts from vault for curriculum generation."""
        all_facts = self.vault.list_facts()
        if not all_facts:
            return []

        # Filter by source if specified
        if request.source_ids:
            target_sources = set(request.source_ids)
            filtered = [f for f in all_facts if f.source_id in target_sources]
            if filtered:
                return filtered[: self.settings.max_synthesis_facts]

        # Filter by topic lexical match
        search_topic = (effective_topic or request.topic or "").strip()
        topic_words = set(re.findall(r"\w+", search_topic.lower()))

        def score(f: AtomicFact) -> float:
            words = set(re.findall(r"\w+", f.statement.lower())) | set(t.lower() for t in f.tags)
            return float(len(topic_words & words))

        ranked = sorted(all_facts, key=score, reverse=True)
        return ranked[: self.settings.max_synthesis_facts]

    async def generate_curriculum(
        self,
        request: GenerateCurriculumRequest,
        preferred_provider: Optional[str] = None,
    ) -> VideoArc:
        """Generate a complete video curriculum arc grounded in vault facts."""
        vision = None
        if self.project_id:
            from app.services.project_storage import ProjectStorageService
            vision = ProjectStorageService().get_project_vision(self.project_id)

        req_topic = (request.topic or "").strip()
        vision_title = (vision.title or "").strip() if vision else ""
        vision_thesis = (vision.core_thesis or "").strip() if vision else ""
        effective_topic = (
            req_topic
            or vision_title
            or vision_thesis
            or "Curated Video Curriculum"
        )

        req_audience = (request.target_audience or "").strip()
        vision_audience = (vision.target_audience or "").strip() if vision else ""
        effective_audience = (
            req_audience
            or vision_audience
            or "Technical Practitioners"
        )

        facts = self._gather_facts(request, effective_topic=effective_topic)

        fact_lines = []
        fact_id_to_source: Dict[str, str] = {}
        for f in facts:
            fact_id_to_source[f.fact_id] = f.source_id
            quote_part = f' | Quote: "{f.exact_quote}"' if f.exact_quote else ""
            fact_lines.append(
                f"- Fact ID: `{f.fact_id}` | Cat: {f.category.value}\n"
                f"  Statement: {f.statement}{quote_part}"
            )

        fact_corpus = "\n".join(fact_lines) if fact_lines else "No specific facts stored yet."

        from app.services.project_storage import ProjectStorageService
        project_context = (
            ProjectStorageService().get_project_prompt_context(self.project_id)
            if self.project_id
            else ""
        )

        prompt = f"""{project_context}
Topic: {effective_topic}
Target Episode Count: {request.target_episode_count} episodes
Target Audience: {effective_audience}

Available Grounded Facts in Vault:
====================================
{fact_corpus}
====================================

Design a {request.target_episode_count}-episode video curriculum arc on '{effective_topic}'.
Ensure balanced distribution across Fundamentals, Advanced, and Hands-on Lab tiers.
Ground each episode with relevant Fact IDs from the vault."""

        structured_data, ai_meta = await self.router.generate_structured(
            prompt=prompt,
            schema=GeneratedCurriculumSchema,
            system_prompt=CURRICULUM_SYSTEM_PROMPT,
            temperature=0.2,
            preferred_provider=preferred_provider,
        )

        # Unpack if model nested the curriculum under a top-level key (e.g. 'curriculum', 'course', 'data')
        if "title" not in structured_data:
            for key, val in structured_data.items():
                if isinstance(val, dict) and "title" in val:
                    structured_data = val
                    break

        curriculum_obj = GeneratedCurriculumSchema(**structured_data)

        slug = re.sub(r"[^\w\-_]", "_", effective_topic.lower().strip())[:25]
        arc_id = f"arc_{slug}_{uuid.uuid4().hex[:6]}"

        episodes: List[VideoEpisode] = []
        all_sources_referenced: List[str] = []

        for item in curriculum_obj.episodes:
            ep_id = f"{arc_id}_ep{item.episode_number}"

            # Validate target duration
            duration = max(5, min(7, item.target_duration_minutes))

            # Collect referenced sources
            for fid in item.key_facts_referenced:
                if fid in fact_id_to_source and fact_id_to_source[fid]:
                    src = fact_id_to_source[fid]
                    if src not in all_sources_referenced:
                        all_sources_referenced.append(src)

            episodes.append(
                VideoEpisode(
                    episode_id=ep_id,
                    episode_number=item.episode_number,
                    tier=item.tier,
                    title=item.title,
                    hook=item.hook,
                    learning_objectives=item.learning_objectives,
                    key_facts_referenced=item.key_facts_referenced,
                    target_duration_minutes=duration,
                    recommended_visuals=item.recommended_visuals,
                    lab_exercise=item.lab_exercise,
                )
            )

        video_arc = VideoArc(
            arc_id=arc_id,
            title=curriculum_obj.title,
            topic=effective_topic,
            description=curriculum_obj.description,
            episodes=episodes,
            total_episodes=len(episodes),
            estimated_total_minutes=sum(ep.target_duration_minutes for ep in episodes),
            sources_referenced=all_sources_referenced,
            created_at=datetime.now(timezone.utc),
            ai_metadata=ai_meta,
        )

        # Persist to Obsidian vault
        self.storage.save_arc(video_arc)
        return video_arc
