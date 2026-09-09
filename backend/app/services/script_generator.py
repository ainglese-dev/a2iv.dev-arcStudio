"""Script Generator Agent for Module 3: Script Studio & Teleprompter.

Synthesizes curriculum episode blueprints and grounded vault facts into
production teleprompter scripts (750-1,000 words, 5-7 min spoken time)
with embedded visual cue markers and the 'Agitate the Pain' visceral hook.
"""

from datetime import datetime, timezone
import logging
import re
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models.curriculum import VideoArc, VideoEpisode
from app.models.script import (
    GenerateScriptRequest,
    ScriptSection,
    SectionType,
    VideoScript,
)
from app.models.vault import AIMetadata, AtomicFact
from app.services.ai.router import AIRouter
from app.services.curriculum_storage import CurriculumStorageService
from app.services.script_storage import ScriptStorageService, format_script_markdown
from app.services.vault_storage import VaultStorageService

logger = logging.getLogger(__name__)


class GeneratedSectionSchema(BaseModel):
    section_type: SectionType = Field(
        description="One of: 'hook', 'problem_breakdown', 'deep_dive', 'pitfalls', 'action_call'."
    )
    title: str = Field(description="Descriptive heading for this section.")
    spoken_text: str = Field(
        description="Full verbatim spoken transcript written specifically for a teleprompter."
    )
    target_duration_seconds: int = Field(
        description="Target duration in seconds for this section."
    )
    visual_cue: Optional[str] = Field(
        default=None,
        description="Semantic visual presentation cue (e.g. '[SLIDE: ...]', '[DIAGRAM: ...]', '[CODE: ...]').",
    )


class GeneratedScriptSchema(BaseModel):
    title: str = Field(description="Episode title.")
    hook_text: str = Field(
        description=(
            "Visceral 15-second opening hook adhering strictly to the Agitate the Pain formula (~30-45 words). "
            "Practitioner trench tone (scar tissue, post-mortem dread); strictly no corporate brochure fluff."
        )
    )
    sections: List[GeneratedSectionSchema] = Field(
        default_factory=list,
        description="Strictly 5 ordered sections: hook, problem_breakdown, deep_dive, pitfalls, action_call.",
    )


SCRIPT_SYSTEM_PROMPT = """You are a World-Class Video Scriptwriter and Teleprompter Director.
Your mission is to transform research facts, domain knowledge, and an episode curriculum outline into a compelling, 5-to-7-minute teleprompter video script tailored specifically to the project's domain, target audience, and editorial vision.

STRICT EXECUTION RULES:
1. WORD COUNT BUDGET (NON-NEGOTIABLE):
   - The ENTIRE script across all 5 sections MUST total strictly between 750 and 1,000 spoken words (~5 to 7 minutes at 140-145 words per minute).
   - Do NOT write brief bullet summaries or outlines. Every single section MUST contain complete, full-sentence spoken paragraphs ready to be read from a teleprompter.
   - Section word distribution targets:
     * Section 1 (hook): ~60 to 80 words (~30s)
     * Section 2 (problem_breakdown): ~150 to 200 words (~60-90s)
     * Section 3 (deep_dive): ~350 to 450 words (~150-180s)
     * Section 4 (pitfalls): ~140 to 180 words (~60-90s)
     * Section 5 (action_call): ~70 to 100 words (~30-45s)
     Total = 770 to 1,000 words.

2. PRACTITIONER TRENCH & DOMAIN REALITY MINDSET (SECTIONS 1 & 2):
   - Derive the specific practitioner voice, terminology, and stakes directly from the project's North Star vision (target audience, tone and style, core thesis).
   - Infuse Section 1 (Hook) and Section 2 (Problem Breakdown) with the authentic, battle-tested voice of real practitioners in the topic's domain:
     * For tech/infrastructure: Trench scar tissue, broken CI/CD, undocumented config debt, midnight outages, and post-mortem regret.
     * For cinema/storytelling/creative: Narrative pacing collapse, flat exposition, character dissonance, director/editor tension, and production compromises.
     * For business/humanities: Operational breakdowns, unexamined assumptions, strategic blind spots, and real human impact.
   - Frame technologies, frameworks, and solutions strictly as PRACTICAL ESCAPE HATCHES and survival kits, NOT sanitized corporate transformations.
   - BAN ALL CORPORATE SALES BROCHURE FLUFF. Never use:
     * "testing things against SLAs" / "testing against SLAs"
     * "operational excellence"
     * "streamlining workflows" / "streamline workflows"
     * "enterprise ROI"
     * "mission-critical uptime"
     * "holistic compliance paradigm"
     * "leveraging synergies" / "accelerating transformation"
     * "seamless" / "game-changer" / "blazing fast"
   - Section 2 (problem_breakdown) must candidly break down why conventional approaches fail in messy reality, why standard advice is a lie, and why naive implementations burn practitioners.

3. "AGITATE THE PAIN" VISCERAL OPENING HOOK (Section 1):
   - Open IMMEDIATELY with the visceral 3-part formula:
     * Part 1: Agonizing Real-World Reality (the real-world crisis, breaking system, creative blockage, or undocumented mess)
     * Part 2: High Professional / Emotional Stakes (reputation, failure, wasted budgets, audience drop-off, or post-mortem dread)
     * Part 3: Punchy Pivot / Immediate Command ("Stop guessing. Fix it now. Here is how.")
   - NEVER start with polite rhetorical questions ("What if...", "Have you ever wondered...", "Did you know...").

4. NATURAL SPOKEN RHYTHM & CONVERSATIONAL VOICE:
   - Write for the ear, not the eye. Use natural contractions (you're, don't, it's, we've).
   - Use direct, active address ("you", "your scene", "your system", "let's look at").
   - Ban academic, stiff corporate filler ("furthermore", "moreover", "in summary", "delve into").

5. FACT GROUNDING:
   - Weave the provided vault facts and benchmark metrics directly into the spoken narrative of Section 3 (deep_dive) and Section 4 (pitfalls).

6. EMBEDDED VISUAL ANCHORS:
   - Every section MUST include a concrete `visual_cue` indicating what appears on screen:
     * `[SLIDE: title and key visual text]`
     * `[DIAGRAM: split-screen comparative model, story beat map, or architecture flow]`
     * `[CODE: terminal command, code snippet, screenplay excerpt, or structured text block]`

7. PEDAGOGICAL VOICE & TEACHING CADENCE:
   - Direct Questions: Every section MUST include at least one direct, thought-provoking question addressed to the learner to prompt active reflection (e.g. "So what happens when the timeline fractures?", "Why does this assumption fail in practice?").
   - First-Person Practitioner Voice: Every episode MUST include at least one authentic first-person teaching anchor (e.g. "In my experience...", "When I first analyzed this pattern...", "Here is where teams get tripped up..."). Speak as an experienced guide in the room, not an impersonal corporate broadcaster.
   - Dynamic Sentence Cadence: Deliberately vary sentence lengths. Mix punchy 3-5 word assertions with fluid 20-35 word explanatory thoughts. Strictly avoid repetitive, monotone 8-10 word declarative sentences.
"""


class ScriptGenerator:
    """Agent that creates teleprompter video scripts grounded in vault facts."""

    def __init__(
        self,
        ai_router: Optional[AIRouter] = None,
        vault_storage: Optional[VaultStorageService] = None,
        curriculum_storage: Optional[CurriculumStorageService] = None,
        script_storage: Optional[ScriptStorageService] = None,
        project_id: Optional[str] = None,
    ):
        self.router = ai_router or AIRouter()
        self.project_id = project_id
        self.vault = vault_storage or VaultStorageService(project_id=project_id)
        self.curriculum = curriculum_storage or CurriculumStorageService(
            vault_dir=self.vault.vault_dir, project_id=project_id
        )
        self.storage = script_storage or ScriptStorageService(
            vault_dir=self.vault.vault_dir, project_id=project_id
        )
        self.settings = get_settings()

    def _find_episode(
        self, episode_id: str, arc_id: Optional[str] = None
    ) -> Optional[VideoEpisode]:
        """Find episode by episode_id across curriculum arcs."""
        if arc_id:
            arc = self.curriculum.get_arc(arc_id)
            if arc:
                for ep in arc.episodes:
                    if ep.episode_id == episode_id:
                        return ep

        # Search all curriculum arcs if arc_id not specified or not found
        for summary in self.curriculum.list_arcs():
            arc = self.curriculum.get_arc(summary.arc_id)
            if arc:
                for ep in arc.episodes:
                    if ep.episode_id == episode_id:
                        return ep
        return None

    def _gather_facts_for_episode(self, episode: VideoEpisode) -> List[AtomicFact]:
        """Fetch referenced facts from vault for this episode."""
        facts: List[AtomicFact] = []
        if not episode.key_facts_referenced:
            # Fallback: lexical match on episode title
            all_facts = self.vault.list_facts()
            words = set(re.findall(r"\w+", episode.title.lower()))
            for f in all_facts:
                if any(w in f.statement.lower() for w in words):
                    facts.append(f)
                    if len(facts) >= 10:
                        break
            return facts

        for fid in episode.key_facts_referenced:
            fact = self.vault.get_fact(fid)
            if fact:
                facts.append(fact)
        return facts

    async def generate_script(
        self,
        request: GenerateScriptRequest,
        preferred_provider: Optional[str] = None,
    ) -> VideoScript:
        """Generate a complete 750-1,000 word teleprompter script for an episode."""
        episode = self._find_episode(request.episode_id, request.arc_id)

        # Build episode context
        if episode:
            ep_title = episode.title
            ep_hook = episode.hook
            ep_objectives = "\n".join(f"- {obj}" for obj in episode.learning_objectives)
            ep_visuals = "\n".join(f"- {v}" for v in episode.recommended_visuals)
            ep_lab = f"Hands-on Lab: {episode.lab_exercise}" if episode.lab_exercise else ""
            duration_target = episode.target_duration_minutes
            facts = self._gather_facts_for_episode(episode)
            fact_ids = [f.fact_id for f in facts]
        else:
            # Standalone generation if episode not found in vault
            ep_title = request.episode_id.replace("_", " ").title()
            ep_hook = "Visceral pain hook addressing real production failures."
            ep_objectives = "- Understand core system architecture\n- Identify production failure modes\n- Implement hands-on solution"
            ep_visuals = "- Architectural diagrams and code comparisons"
            ep_lab = ""
            duration_target = 6
            facts = []
            fact_ids = []

        fact_lines = []
        for f in facts:
            quote_part = f' | Quote: "{f.exact_quote}"' if f.exact_quote else ""
            fact_lines.append(f"- [{f.fact_id}] {f.statement}{quote_part}")
        fact_corpus = "\n".join(fact_lines) if fact_lines else "General engineering principles."

        from app.services.project_storage import ProjectStorageService
        project_context = (
            ProjectStorageService().get_project_prompt_context(self.project_id)
            if self.project_id
            else ""
        )

        prompt = f"""{project_context}
Episode Title: {ep_title}
Target Duration: {duration_target} minutes
Target Words: strictly 750 - 1,000 spoken words (calibrated for {request.wpm_target} WPM)
Speaking Style: {request.speaking_style}

Episode Blueprint:
------------------
Current Hook: {ep_hook}
Learning Objectives:
{ep_objectives}

Recommended Visuals:
{ep_visuals}
{ep_lab}

Grounded Vault Facts to cite:
-----------------------------
{fact_corpus}

Write a complete, full-length 5-section teleprompter script for this episode.
Ensure the total word count is strictly between 750 and 1,000 words.
Include concrete visual cues in each section like [SLIDE: ...], [DIAGRAM: ...], or [CODE: ...]."""

        structured_data, ai_meta = await self.router.generate_structured(
            prompt=prompt,
            schema=GeneratedScriptSchema,
            system_prompt=SCRIPT_SYSTEM_PROMPT,
            temperature=0.3,
            preferred_provider=preferred_provider,
        )

        # Unpack if nested under a top-level key
        if "sections" not in structured_data:
            for key, val in structured_data.items():
                if isinstance(val, dict) and "sections" in val:
                    structured_data = val
                    break

        script_obj = GeneratedScriptSchema(**structured_data)

        # Build ScriptSection models
        sections: List[ScriptSection] = []
        for sec in script_obj.sections:
            sec_words = len(sec.spoken_text.split())
            sec_wpm = int((sec_words / max(1, sec.target_duration_seconds)) * 60)
            sections.append(
                ScriptSection(
                    section_type=sec.section_type,
                    title=sec.title,
                    spoken_text=sec.spoken_text,
                    target_duration_seconds=sec.target_duration_seconds,
                    estimated_wpm=sec_wpm or request.wpm_target,
                    visual_cue=sec.visual_cue,
                )
            )

        total_words = sum(len(s.spoken_text.split()) for s in sections)
        speaking_mins = round(total_words / float(request.wpm_target), 2)
        script_id = f"script_{request.episode_id}_{uuid.uuid4().hex[:6]}"

        script = VideoScript(
            script_id=script_id,
            episode_id=request.episode_id,
            arc_id=request.arc_id,
            title=script_obj.title or ep_title,
            target_duration_minutes=duration_target,
            total_word_count=total_words,
            estimated_speaking_minutes=speaking_mins,
            hook_text=script_obj.hook_text or ep_hook,
            sections=sections,
            full_script_markdown="",
            key_facts_referenced=fact_ids,
            ai_metadata=ai_meta,
            created_at=datetime.now(timezone.utc),
        )

        # Format teleprompter markdown and persist to vault
        script.full_script_markdown = format_script_markdown(script)
        self.storage.save_script(script)
        return script
