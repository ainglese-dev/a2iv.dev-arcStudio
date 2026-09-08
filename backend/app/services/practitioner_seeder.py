"""Practitioner Pain-Point Seeder Service.

Synthesizes deeply grounded, anti-marketing practitioner research briefs
across technical, adult learning, and financial domains into the Obsidian vault.
"""

from datetime import datetime, timezone
import logging
import re
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models.vault import (
    AIMetadata,
    AtomicFact,
    ConfidenceLevel,
    FactCategory,
    PractitionerLens,
    SeedPractitionerRequest,
    SeedPractitionerResponse,
    SourceChunk,
    SourceMetadata,
    SourceType,
)
from app.services.ai.router import AIRouter
from app.services.chunker import DocumentChunker
from app.services.vault_storage import VaultStorageService

logger = logging.getLogger(__name__)


class PractitionerFactSchema(BaseModel):
    statement: str = Field(description="Concrete, battle-tested atomic statement grounded in the briefing.")
    exact_quote: str = Field(description="Exact verbatim excerpt from the briefing document supporting this fact.")
    category: FactCategory = Field(
        default=FactCategory.GENERAL,
        description="Fact category: 'benchmark_metric', 'pitfall_caveat', 'architecture_decision', 'workflow_step', 'technical_spec', or 'general'.",
    )
    confidence: ConfidenceLevel = Field(default=ConfidenceLevel.VERIFIED)
    tags: List[str] = Field(default_factory=list)


class GeneratedPractitionerSeedSchema(BaseModel):
    title: str = Field(description="Authoritative, practitioner-oriented title for the briefing.")
    brief_markdown: str = Field(
        description="Full, in-depth practitioner briefing document in Markdown (strictly 600-900 words). "
        "Must include realistic production/field reality, why textbook solutions fail, gotchas, and trade-offs. "
        "Banned: marketing buzzwords ('seamless, lightweight, game-changer', 'fast and easy')."
    )
    pain_points: List[str] = Field(
        description="3 to 5 sharp, visceral, real-world pain points reflecting actual practitioner friction."
    )
    pitfalls: List[str] = Field(
        description="3 to 5 non-obvious pitfalls, gotchas, or trapdoors encountered in practice."
    )
    facts: List[PractitionerFactSchema] = Field(
        description="4 to 8 atomic facts extracted directly from the briefing with verbatim exact_quote matches."
    )


PRACTITIONER_SEEDER_SYSTEM_PROMPT = """You are an Elite Battle-Tested Practitioner, Principal Systems Architect, and Post-Mortem Investigator.
Your mission is to generate an authentic, unfiltered, research-grade briefing document and grounded atomic facts for technical learners and engineers.

ABSOLUTE NEGATIVE CONSTRAINTS (STRICTLY BANNED):
1. NO MARKETING FLUFF OR BROCHURE RHETORIC:
   - BAN ALL vendor buzzwords: "seamless", "effortless", "game-changer", "lightweight", "robust", "revolutionize", "cutting-edge", "blazing fast", "unlock potential", "transformative".
   - You are NOT writing a sales brochure, sponsored blog post, or vendor whitepaper.
2. NO SUPERFICIAL TEXTBOOK PLATITUDES:
   - BAN simplistic textbook truisms. Do NOT cite, quote, or echo slogans (e.g. "practice makes perfect", "just speak more", "save more than you spend") even to refute them; analyze the underlying mechanisms directly.
3. NO ACADEMIC STERILITY OR CHEERLEADING:
   - Do NOT sanitize failures or treat technical debt as "learning opportunities".
   - Speak with the scar tissue of someone who has diagnosed 2 AM outages, stared at frozen terminals, fought cognitive exhaustion, or taken painful financial losses.

MANDATORY PRACTITIONER REQUIREMENTS (MUST INCLUDE):
1. THE UNFILTERED FIELD/PRODUCTION REALITY:
   - What ACTUALLY breaks, degrades, or causes excruciating friction in real life?
   - Detail the specific mechanical points of failure (e.g. kernel veth drops, CPU queue saturation, cognitive latency in real-time meetings, behavioral loss aversion during market drawdowns).
2. WHY STANDARD TEXTBOOK / PRIOR WORKAROUNDS FAIL:
   - Dissect why conventional recommendations fail when subjected to real stress, scale, or human psychology.
3. CONCRETE GOTCHAS, FAILURE MODES & HIDDEN TRAPS:
   - Pinpoint non-obvious edge cases, silent bugs, cognitive blockers, or structural drag that textbooks never mention.
4. REAL-WORLD TRADE-OFFS & ADOPTION COST:
   - Be radically honest about what the solution actually costs (maintenance tax, operational complexity, cognitive discipline, tax drag, tooling fragility).
5. GROUNDED VERBATIM CITATIONS:
   - Every atomic fact MUST have an `exact_quote` that is a verbatim substring of the generated `brief_markdown`.

LENS CALIBRATION:
- If lens is 'tech_devops_incident' (Enterprise Post-Mortem & Production Reality):
  * Emphasize: production outages, CI/CD pipeline breakage, route-leaks, unversioned bash hacks, multi-vendor CLI divergence, MTU truncation, memory saturation, and post-mortem regret.
- If lens is 'adult_learning_plateau' (Skill Acquisition & Cognitive Plateaus):
  * Emphasize: the agonizing gap between high passive comprehension and low real-time spontaneous speech, cognitive freeze in high-stakes Zoom meetings, processing latency translating thoughts in one's head, affective filter, fear of losing professional authority, and why isolated grammar apps fail.
- If lens is 'finance_risk_psychology' (Wealth, Tax Drag & Market Psychology):
  * Emphasize: cash drag opportunity cost during high interest rate regimes vs stock market timing, behavioral paralysis of lump-sum vs DCA, dividend tax drag in taxable brokerage accounts, sequence of returns risk, and human regret heuristics.
- If lens is 'general_practitioner' (Real-World Trade-Offs & Pitfalls):
  * Emphasize: unfiltered practitioner realities, maintenance debt, hidden friction, and the real cost of operational adoption.
"""


class PractitionerSeederService:
    """Service that coordinates AI generation of practitioner briefings and vault storage."""

    def __init__(
        self,
        ai_router: Optional[AIRouter] = None,
        vault_storage: Optional[VaultStorageService] = None,
        chunker: Optional[DocumentChunker] = None,
        project_id: Optional[str] = None,
    ):
        self.router = ai_router or AIRouter()
        self.project_id = project_id
        self.vault = vault_storage or VaultStorageService(project_id=project_id)
        self.chunker = chunker or DocumentChunker()
        self.settings = get_settings()

    async def seed_practitioner(
        self,
        request: SeedPractitionerRequest,
        preferred_provider: Optional[str] = None,
    ) -> SeedPractitionerResponse:
        """Generate an authentic practitioner briefing and persist source & facts to vault."""
        lens_descriptions = {
            PractitionerLens.AUTO: "Autonomous Universal Synthesis: Intelligently detect the natural domain of the topic (technology, science, cinema, business, philosophy, history). Dissect authentic practitioner reality, non-obvious failure modes, and critical trade-offs without marketing buzzwords.",
            PractitionerLens.DEEP_DIVE: "First-Principles Structural Mechanics: Under-the-hood internal architecture, theoretical foundations, concrete invariants, and structural trade-offs.",
            PractitionerLens.LESSONS_PITFALLS: "Real-World Post-Mortem & Critical Pitfalls: Production incidents, subtle edge cases, unexpected trapdoors, failed textbook assumptions, and battle-tested gotchas.",
            PractitionerLens.CASE_STUDY: "Chronological Narrative & Decision Analysis: Real-world scenario evolution, pressure-tested decision branches, inflection points, and tangible before-and-after outcomes.",
            PractitionerLens.TECH_DEVOPS_INCIDENT: "Enterprise Post-Mortem & Production Reality (production outages, CI/CD pipeline friction, route-leaks, unversioned bash scripts, silent packet drops)",
            PractitionerLens.ADULT_LEARNING_PLATEAU: "Skill Acquisition & Cognitive Plateaus (high passive comprehension vs low spontaneous speech, Zoom meeting freeze, translation latency, affective filter)",
            PractitionerLens.FINANCE_RISK_PSYCHOLOGY: "Wealth, Tax Drag & Market Psychology (cash drag opportunity cost in high interest regimes, DCA vs lump-sum paralysis, taxable account drag, sequence of returns)",
            PractitionerLens.GENERAL_PRACTITIONER: "Real-World Trade-Offs & Pitfalls (practical failure modes, maintenance taxes, edge cases, adoption friction)",
        }

        lens_guidance = lens_descriptions.get(request.lens, lens_descriptions[PractitionerLens.AUTO])
        audience = request.target_audience or "Senior practitioners, staff engineers, and serious learners"

        prompt = f"""Topic: {request.topic}
Practitioner Lens: {request.lens.value} — {lens_guidance}
Target Audience: {audience}

Generate a comprehensive practitioner briefing document (strictly 600-900 words) dissecting '{request.topic}'.
Provide:
1. An authoritative title.
2. A 600-900 word Markdown briefing exposing field realities, failed textbook workarounds, concrete gotchas, and real adoption trade-offs.
3. 3 to 5 sharp, visceral pain points.
4. 3 to 5 non-obvious pitfalls and trapdoors.
5. 4 to 8 atomic facts where `exact_quote` is a verbatim excerpt from your briefing text.

Do NOT include generic marketing buzzwords or basic textbook definitions."""

        try:
            structured_data, ai_meta = await self.router.generate_structured(
                prompt=prompt,
                schema=GeneratedPractitionerSeedSchema,
                system_prompt=PRACTITIONER_SEEDER_SYSTEM_PROMPT,
                temperature=0.3,
                preferred_provider=preferred_provider,
            )

            # Unpack if nested under top-level key
            if "brief_markdown" not in structured_data:
                for val in structured_data.values():
                    if isinstance(val, dict) and "brief_markdown" in val:
                        structured_data = val
                        break

            seed_obj = GeneratedPractitionerSeedSchema(**structured_data)
            meta_dict = ai_meta.model_dump() if ai_meta else None
        except Exception as e:
            logger.warning("AIRouter structured generation failed for practitioner seeder: %s. Using fallback.", e)
            seed_obj, meta_dict = self._generate_fallback(request)

        # Build Obsidian Source Note
        slug = re.sub(r"[^\w\-_]", "_", request.topic.lower().strip())[:25]
        now = datetime.now(timezone.utc)
        source_id = f"src_seed_{slug}_{uuid.uuid4().hex[:6]}"

        # Chunk the briefing document
        chunks = self.chunker.chunk_text(
            source_id=source_id,
            text=seed_obj.brief_markdown,
            chunk_size=1200,
            chunk_overlap=150,
        )

        source_meta = SourceMetadata(
            source_id=source_id,
            title=seed_obj.title,
            source_type=SourceType.PRACTITIONER_SEED,
            url=f"internal://practitioner-seed/{request.lens.value}",
            author=f"Practitioner Engine ({request.lens.value})",
            published_date=now.strftime("%Y-%m-%d"),
            total_chunks=len(chunks),
            tags=[request.lens.value, "practitioner_seed", "battle_tested"],
            created_at=now,
        )

        # Save source note to vault
        self.vault.save_source(
            metadata=source_meta,
            chunks=chunks,
            raw_content=seed_obj.brief_markdown,
        )

        # Create and persist atomic facts
        atomic_facts: List[AtomicFact] = []
        for idx, f in enumerate(seed_obj.facts):
            fact_id = f"fact_{slug}_{idx+1:02d}_{uuid.uuid4().hex[:4]}"

            # Locate source chunk containing quote if possible
            matched_chunk_id = None
            if f.exact_quote:
                for c in chunks:
                    if f.exact_quote in c.text:
                        matched_chunk_id = c.chunk_id
                        break
            if not matched_chunk_id and chunks:
                matched_chunk_id = chunks[0].chunk_id

            tags = f.tags if f.tags else [request.lens.value]
            if "practitioner" not in tags:
                tags.append("practitioner")

            atomic_fact = AtomicFact(
                fact_id=fact_id,
                statement=f.statement,
                category=f.category,
                confidence=f.confidence,
                source_id=source_id,
                source_chunk_id=matched_chunk_id,
                exact_quote=f.exact_quote,
                tags=tags,
                created_at=now,
            )
            atomic_facts.append(atomic_fact)

        self.vault.save_facts(atomic_facts)
        logger.info("Successfully seeded practitioner brief '%s' with %d facts", source_id, len(atomic_facts))

        return SeedPractitionerResponse(
            source=source_meta,
            brief_markdown=seed_obj.brief_markdown,
            pain_points=seed_obj.pain_points,
            pitfalls=seed_obj.pitfalls,
            facts=atomic_facts,
            ai_metadata=meta_dict,
        )

    def _generate_fallback(
        self, request: SeedPractitionerRequest
    ) -> tuple[GeneratedPractitionerSeedSchema, Optional[Dict[str, Any]]]:
        """Deterministic practitioner fallbacks for offline testing across domains."""
        topic = request.topic.lower()
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        if "containerlab" in topic or "network" in topic or "ci/cd" in topic:
            brief = (
                "# Containerlab in CI/CD Pipeline Validation: Real-World Friction and Post-Mortems\n\n"
                "In traditional network engineering, pre-change validation was virtually impossible in continuous integration. "
                "Engineers attempting to run multi-vendor topologies in EVE-NG or GNS3 were crippled by QEMU boot storms, "
                "where spinning up eight virtual router instances demanded over 32GB of RAM and twenty minutes of startup latency. "
                "Automated CI runners repeatedly timed out before BGP adjacency could even be negotiated.\n\n"
                "Containerlab shifts network testing from hypervisor-managed virtual machines into lightweight containerized network "
                "operating systems (such as Arista cEOS, Nokia SR Linux, and FRRouting). "
                "While this enables an entire eight-node spine-leaf fabric to boot in under 45 seconds using less than 3.5GB of RAM, "
                "adopting it in production CI pipelines introduces brutal operational gotchas that textbook tutorials omit.\n\n"
                "First, Linux kernel virtual ethernet (veth) pairs behave fundamentally differently from physical ASIC data planes. "
                "Standard MTU truncation bugs frequently pass silently in container labs because the default Linux bridge ignores "
                "jumbo frames, only to trigger catastrophic blackholing when the configuration is pushed to physical Arista 7050 hardware.\n\n"
                "Second, multi-vendor CLI divergence creates severe pipeline maintenance drag. "
                "A syntax check passing on containerized FRR will not catch Cisco IOS-XR or Juniper Junos proprietary route-policy semantics. "
                "Teams running CI-based validation often suffer from false confidence, pushing route-reflectors that pass in YAML "
                "but cause route-leaks and BGP flapping in production maintenance windows.\n\n"
                "Third, stateful data plane features like hardware TCAM lookup, MPLS label imposition, and line-rate policing "
                "cannot be verified in containerized control planes. Treating Containerlab as a full substitute for staging hardware "
                "creates blind spots that culminate in post-mortems you never want to write."
            )
            pain_points = [
                "VM boot storms in legacy EVE-NG/GNS3 testbeds saturate host CPU queues and cause CI runner timeouts.",
                "Kernel veth interfaces mask physical MTU mismatch bugs, leading to silent packet blackholing in prod.",
                "False confidence from passing control-plane tests that cannot validate hardware ASIC line-rate behavior.",
            ]
            pitfalls = [
                "Assuming containerized control-plane routing parity guarantees identical TCAM behavior on physical ASICs.",
                "Ignoring MTU clamping on Linux veth interfaces before pushing to physical spine-leaf fabrics.",
                "Vendor syntax divergences between FRR/Linux containers and enterprise Junos/IOS-XR route policies.",
            ]
            facts = [
                PractitionerFactSchema(
                    statement="Containerlab allows an 8-node spine-leaf fabric to boot in under 45 seconds using less than 3.5GB of RAM compared to 32GB+ for VM-based testbeds.",
                    exact_quote="While this enables an entire eight-node spine-leaf fabric to boot in under 45 seconds using less than 3.5GB of RAM",
                    category=FactCategory.BENCHMARK_METRIC,
                    confidence=ConfidenceLevel.VERIFIED,
                    tags=["containerlab", "memory", "ci-cd"],
                ),
                PractitionerFactSchema(
                    statement="Linux kernel veth pairs mask MTU truncation bugs in containerized network labs that cause packet loss on physical hardware.",
                    exact_quote="Standard MTU truncation bugs frequently pass silently in container labs because the default Linux bridge ignores jumbo frames",
                    category=FactCategory.PITFALL_CAVEAT,
                    confidence=ConfidenceLevel.VERIFIED,
                    tags=["veth", "mtu", "networking"],
                ),
                PractitionerFactSchema(
                    statement="Containerized network control planes cannot validate stateful hardware ASIC line-rate policing or TCAM lookup constraints.",
                    exact_quote="stateful data plane features like hardware TCAM lookup, MPLS label imposition, and line-rate policing cannot be verified in containerized control planes",
                    category=FactCategory.TECHNICAL_SPEC,
                    confidence=ConfidenceLevel.VERIFIED,
                    tags=["tcam", "asic", "dataplane"],
                ),
                PractitionerFactSchema(
                    statement="Legacy VM-based virtual router testbeds saturate CPU queues during startup, causing automated CI test suites to time out before BGP peering forms.",
                    exact_quote="Engineers attempting to run multi-vendor topologies in EVE-NG or GNS3 were crippled by QEMU boot storms, where spinning up eight virtual router instances demanded over 32GB of RAM and twenty minutes of startup latency.",
                    category=FactCategory.PITFALL_CAVEAT,
                    confidence=ConfidenceLevel.VERIFIED,
                    tags=["qemu", "boot-storm", "eve-ng"],
                ),
            ]
            title = "Containerlab in CI/CD: Multi-Vendor Validation and Data Plane Blind Spots"

        elif "speaking" in topic or "language" in topic or "plateau" in topic:
            brief = (
                "# Overcoming the Intermediate Speaking Plateau: Cognitive Load and Real-Time Latency\n\n"
                "Non-native software engineers frequently hit a frustrating ceiling: they can read complex architectural RFCs, "
                "write articulate pull request comments, and understand 95% of native conversations, yet they freeze during "
                "high-stakes Zoom meetings and unscripted incident triage calls.\n\n"
                "Traditional textbook advice insists that more vocabulary flashcards, grammar drills, or passive podcast listening "
                "will unlock fluency. In reality, the intermediate plateau is not a knowledge deficiency; it is a real-time retrieval "
                "and cognitive load bottleneck. When speaking, the brain must concurrently formulate arguments, manage syntactic agreement, "
                "monitor accent pronunciation, and decode social cues.\n\n"
                "The first major failure point is the 'silent translation loop.' Engineers attempt to construct complete, grammatically flawless "
                "sentences in their native language before translating them word-by-word into English. This introduces a 1.5 to 3 second latency "
                "in conversational turn-taking, causing colleagues to interrupt or assume hesitation indicates technical uncertainty.\n\n"
                "The second friction point is the affective filter triggered by professional authority anxiety. Senior engineers fear that stumbling "
                "over prepositions or struggling for an idiom undermines their technical competence in front of leadership. "
                "Consequently, they self-censor, defaulting to silence or overly terse one-sentence updates that hide their true expertise.\n\n"
                "Overcoming this plateau requires abandoning passive input and training high-stress spontaneous output. "
                "Practitioners must shift to deliberate 'chunking'—internalizing conversational transition stems and architectural discourse markers "
                "as atomic audio units rather than assembling words from grammar rules during live discussions."
            )
            pain_points = [
                "Cognitive freezing in unscripted Zoom architectural debates despite high technical competence.",
                "The 2-second internal translation latency that leads to being spoken over in fast-paced standups.",
                "Affective filter paralysis: self-censoring technical insights out of fear that linguistic hesitation looks like ignorance.",
            ]
            pitfalls = [
                "Relying on passive comprehension (podcasts/reading) to fix an active real-time neural retrieval bottleneck.",
                "Translating full sentences word-by-word from native syntax rather than deploying automated discourse chunks.",
                "Over-focusing on rare vocabulary instead of conversational turn-taking rhythm and filler management.",
            ]
            facts = [
                PractitionerFactSchema(
                    statement="The intermediate speaking plateau is a real-time retrieval and cognitive load bottleneck rather than a vocabulary knowledge deficiency.",
                    exact_quote="the intermediate plateau is not a knowledge deficiency; it is a real-time retrieval and cognitive load bottleneck",
                    category=FactCategory.GENERAL,
                    confidence=ConfidenceLevel.VERIFIED,
                    tags=["cognitive-load", "fluency", "linguistics"],
                ),
                PractitionerFactSchema(
                    statement="Internal word-by-word sentence translation creates a 1.5 to 3 second latency in conversation, triggering interruptions in engineering meetings.",
                    exact_quote="This introduces a 1.5 to 3 second latency in conversational turn-taking, causing colleagues to interrupt or assume hesitation indicates technical uncertainty.",
                    category=FactCategory.BENCHMARK_METRIC,
                    confidence=ConfidenceLevel.VERIFIED,
                    tags=["latency", "turn-taking", "communication"],
                ),
                PractitionerFactSchema(
                    statement="Professional authority anxiety triggers an elevated affective filter, causing senior non-native engineers to self-censor valuable insights.",
                    exact_quote="Senior engineers fear that stumbling over prepositions or struggling for an idiom undermines their technical competence in front of leadership. Consequently, they self-censor",
                    category=FactCategory.PITFALL_CAVEAT,
                    confidence=ConfidenceLevel.VERIFIED,
                    tags=["affective-filter", "psychology", "career"],
                ),
                PractitionerFactSchema(
                    statement="Spontaneous fluency under pressure requires deploying internalized architectural discourse chunks rather than real-time grammar assembly.",
                    exact_quote="Practitioners must shift to deliberate 'chunking'—internalizing conversational transition stems and architectural discourse markers as atomic audio units",
                    category=FactCategory.WORKFLOW_STEP,
                    confidence=ConfidenceLevel.VERIFIED,
                    tags=["chunking", "fluency-drills", "habit"],
                ),
            ]
            title = "The Intermediate Speaking Plateau: Cognitive Load and Real-Time Latency in Tech"

        else:
            # Finance domain
            brief = (
                "# Cash Drag vs Dollar-Cost Averaging During Shifting Interest Rate Regimes\n\n"
                "In prolonged periods of elevated interest rates, retail and institutional investors fall prey to a subtle psychological "
                "trap: cash drag disguised as prudent risk management. With Treasury bills and high-yield money market funds yielding "
                "over 4% to 5% with zero volatility, investors hoard excess liquidity, telling themselves they are 'waiting for a pullback' "
                "or planning to dollar-cost average into equities.\n\n"
                "Textbook personal finance often presents Dollar-Cost Averaging (DCA) as a mathematically optimal strategy. "
                "In historical reality, Lump-Sum investing outperforms DCA approximately 68% of the time across global equity markets "
                "because markets exhibit an upward drift. DCA is not an alpha-generating tool; it is a behavioral insurance policy "
                "where investors pay an explicit opportunity cost to mitigate short-term regret.\n\n"
                "The friction intensifies during shifting monetary regimes. When central banks signal rate cuts, cash yields evaporate rapidly "
                "while equity valuations front-run policy changes. Investors sitting on oversized cash allocations experience brutal cash drag, "
                "frequently suffering double compounding losses: missing the initial 15% equity surge and then buying in at cycle tops out of FOMO.\n\n"
                "Furthermore, holding cash in non-registered taxable accounts incurs severe annual tax drag. Short-term interest income is taxed "
                "at ordinary income rates (up to 40%+ depending on jurisdiction), whereas unrealized equity capital gains compound untaxed. "
                "A 5% nominal money market return often dwindles to sub-3% real return after factoring in inflation and income taxes.\n\n"
                "Understanding the real trade-off requires acknowledging that cash is an expensive psychological sedative. "
                "Systematic asset allocation rules with automated rebalancing bands consistently outperform emotional market timing."
            )
            pain_points = [
                "Suffering compounding cash drag in money market funds while equities surge on monetary pivot expectations.",
                "Behavioral paralysis: being unable to deploy cash during market dips due to acute loss aversion.",
                "Heavy ordinary income tax drag on short-term interest yields compared to tax-deferred capital appreciation.",
            ]
            pitfalls = [
                "Treating Dollar-Cost Averaging as an alpha strategy rather than a behavioral insurance policy that carries opportunity cost.",
                "Holding oversized cash in taxable accounts where ordinary income tax rates erode real inflation-adjusted returns.",
                "Attempting to time the transition from Treasury bills to equities after the broader market has already priced in cuts.",
            ]
            facts = [
                PractitionerFactSchema(
                    statement="Historical backtesting shows Lump-Sum investing outperforms Dollar-Cost Averaging approximately 68% of the time due to upward market drift.",
                    exact_quote="Lump-Sum investing outperforms DCA approximately 68% of the time across global equity markets because markets exhibit an upward drift.",
                    category=FactCategory.BENCHMARK_METRIC,
                    confidence=ConfidenceLevel.VERIFIED,
                    tags=["dca", "lump-sum", "asset-allocation"],
                ),
                PractitionerFactSchema(
                    statement="Dollar-Cost Averaging is a behavioral regret-mitigation tool rather than a mathematically superior return strategy.",
                    exact_quote="DCA is not an alpha-generating tool; it is a behavioral insurance policy where investors pay an explicit opportunity cost to mitigate short-term regret.",
                    category=FactCategory.ARCHITECTURE_DECISION,
                    confidence=ConfidenceLevel.VERIFIED,
                    tags=["psychology", "risk-management", "dca"],
                ),
                PractitionerFactSchema(
                    statement="Holding high-yield cash in taxable brokerage accounts incurs ordinary income tax drag that significantly reduces real purchasing power.",
                    exact_quote="Short-term interest income is taxed at ordinary income rates (up to 40%+ depending on jurisdiction), whereas unrealized equity capital gains compound untaxed.",
                    category=FactCategory.PITFALL_CAVEAT,
                    confidence=ConfidenceLevel.VERIFIED,
                    tags=["tax-drag", "cash-drag", "fixed-income"],
                ),
                PractitionerFactSchema(
                    statement="High nominal cash yields create a behavioral illusion of safety while equity markets front-run central bank policy pivots.",
                    exact_quote="When central banks signal rate cuts, cash yields evaporate rapidly while equity valuations front-run policy changes.",
                    category=FactCategory.GENERAL,
                    confidence=ConfidenceLevel.VERIFIED,
                    tags=["interest-rates", "market-timing", "macro"],
                ),
            ]
            title = "Cash Drag vs Dollar-Cost Averaging: Regret Psychology and Tax Friction"

        schema = GeneratedPractitionerSeedSchema(
            title=title,
            brief_markdown=brief,
            pain_points=pain_points,
            pitfalls=pitfalls,
            facts=facts,
        )
        return schema, {"provider": "fallback_mock", "model": "practitioner_deterministic", "fallback_occurred": True}
