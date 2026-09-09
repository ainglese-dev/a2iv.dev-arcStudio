"""FastAPI Router for Module 5: Slide Engine & Synced Presentation Studio."""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Union
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.dependencies import get_active_project_id
from app.services.presentation_generator import PresentationGeneratorService
from app.services.presentation_storage import PresentationStorageService
from app.services.project_storage import ProjectStorageService
from app.services.script_storage import ScriptStorageService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/presentation", tags=["Slide Engine & Presentation Studio"])


class GeneratePresentationRequest(BaseModel):
    script_id: str = Field(description="ID of the video script to parse visual cues from.")


class SlideElementVariant(BaseModel):
    headline: str
    subhead: Optional[str] = None
    bullet_points: List[str] = Field(default_factory=list)
    code_snippet: Optional[str] = None
    code_language: Optional[str] = None
    comparison_left: Optional[Dict[str, Any]] = None
    comparison_right: Optional[Dict[str, Any]] = None
    metric_callouts: Optional[List[Dict[str, Any]]] = None
    diagram_nodes: Optional[List[Dict[str, Any]]] = None
    badge_pills: Optional[List[str]] = None
    word_count: int = 0


class PresentationSlide(BaseModel):
    slide_id: str
    slide_index: int
    section_index: int
    title: Optional[str] = None
    timestamp_start_s: float
    timestamp_end_s: float
    duration_s: float
    slide_type: str
    cue_marker: str
    spoken_anchor_text: str
    variant_a: SlideElementVariant
    variant_b: SlideElementVariant


class PresentationObjectiveMetrics(BaseModel):
    cue_coverage_percentage: float = 100.0
    variant_a_avg_words_per_slide: float = 24.0
    variant_b_avg_words_per_slide: float = 16.0
    variant_a_cognitive_load_score: float = 62.0
    variant_b_cognitive_load_score: float = 38.0
    pacing_alignment_score: float = 99.2


class PresentationDeck(BaseModel):
    deck_id: str
    script_id: str
    script_title: str
    total_slides: int
    total_duration_s: float
    slides: List[PresentationSlide] = Field(default_factory=list)
    metrics: PresentationObjectiveMetrics = Field(default_factory=PresentationObjectiveMetrics)
    created_at: Union[datetime, str] = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    ai_metadata: Optional[Dict[str, Any]] = None


# Cache of generated decks in memory
_DECKS_CACHE: Dict[str, PresentationDeck] = {}


def clear_decks_cache() -> None:
    """Clear in-memory presentation deck cache."""
    _DECKS_CACHE.clear()


def _build_sample_deck() -> PresentationDeck:
    deck = PresentationDeck(
        deck_id="deck_sample_origin_incident",
        script_id="script_cloudflare_origin_down",
        script_title="Cloudflare Outage Post-Mortem: Why Dashboards Stay Green While Origin Is Down",
        total_slides=5,
        total_duration_s=330.0,
        metrics=PresentationObjectiveMetrics(
            cue_coverage_percentage=100.0,
            variant_a_avg_words_per_slide=24.0,
            variant_b_avg_words_per_slide=16.0,
            variant_a_cognitive_load_score=62.0,
            variant_b_cognitive_load_score=38.0,
            pacing_alignment_score=99.2,
        ),
        slides=[
            PresentationSlide(
                slide_id="slide_01",
                slide_index=1,
                section_index=0,
                timestamp_start_s=0.0,
                timestamp_end_s=30.0,
                duration_s=30.0,
                slide_type="title_hook",
                cue_marker="[SLIDE: Cloudflare Incident Hook - Origin Down vs Edge Green]",
                spoken_anchor_text="Your origin is down, but Cloudflare keeps serving stale assets and your dashboards stay green.",
                variant_a=SlideElementVariant(
                    headline="INCIDENT #4092: Origin Unreachable (HTTP 521)",
                    subhead="Edge POPs acknowledge 200 OK from cache while origin ingress is blackholed",
                    bullet_points=[
                        "Edge cache shields failure from synthetic probes",
                        "Origin TCP keepalives dropping packets silently",
                        "Engineers alerted 24 minutes after first user impact",
                    ],
                    code_snippet="$ curl -I https://api.prod.fabric/v1/health\nHTTP/2 200 OK\ncf-cache-status: HIT\ncf-ray: 88b029f4c3a-EWR\n# REALITY: origin 192.168.10.50 connection refused!",
                    code_language="bash",
                    badge_pills=["P1-SEV1", "Edge-Shield Trap", "False Positive Green"],
                    word_count=26,
                ),
                variant_b=SlideElementVariant(
                    headline="The Illusion of Green Dashboards",
                    subhead="Why Edge Caching Conceals Critical Origin Failures",
                    bullet_points=[
                        "Public probes hit CDN cache and report 100% uptime",
                        "Real customers experience connection refused errors on POST calls",
                    ],
                    comparison_left={
                        "title": "Origin Data Center",
                        "status": "CRITICAL DOWN (0% Up)",
                        "color": "rose",
                        "note": "Connection refused on ingress VIP",
                    },
                    comparison_right={
                        "title": "Cloudflare Edge POP",
                        "status": "HEALTHY MASK (100% Green)",
                        "color": "emerald",
                        "note": "Stale cache serving HTTP 200 OK",
                    },
                    metric_callouts=[
                        {"label": "Detection Lag", "value": "+24 min", "detail": "Delayed alert trigger"},
                        {"label": "Edge Mask", "value": "99.98%", "detail": "Reported by CDN metrics"},
                    ],
                    badge_pills=["Architecture Pitfall", "Observability Debt"],
                    word_count=18,
                ),
            ),
            PresentationSlide(
                slide_id="slide_02",
                slide_index=2,
                section_index=1,
                timestamp_start_s=30.0,
                timestamp_end_s=105.0,
                duration_s=75.0,
                slide_type="architecture_diagram",
                cue_marker="[DIAGRAM: Network Path - Virtual veth to Physical Underlay MTU Mismatch]",
                spoken_anchor_text="It is the asymmetric MTU black hole between the virtual veth pairs and the physical fabric.",
                variant_a=SlideElementVariant(
                    headline="MTU Asymmetry & Black Hole Topology",
                    subhead="Linux bridge veth (1500) -> Encapsulated VXLAN (1550) -> Underlay MTU (1500)",
                    bullet_points=[
                        "BGP control plane packets (< 200 bytes) transit seamlessly",
                        "Payload packets (> 1460 bytes) silently dropped by underlay",
                        "Path MTU Discovery fails when ICMP fragmentation is filtered",
                    ],
                    code_snippet="# Packet size boundary inspection\n$ ping -D -s 1472 10.100.1.10\nPING 10.100.1.10: 1472 data bytes\nping: sendto: Message too long (MTU=1500, DF=1)\n# Packet dropped without ICMP type 3 code 4",
                    code_language="bash",
                    diagram_nodes=[
                        {"label": "SR-Linux Virtual Node", "type": "Router", "status": "MTU 1500"},
                        {"label": "Docker veth bridge", "type": "Interface", "status": "MTU 1500"},
                        {"label": "Underlay Fabric", "type": "Physical", "status": "DROPPING (MTU 1500)"},
                    ],
                    badge_pills=["Underlay Network", "MTU Blackhole", "Silent Discard"],
                    word_count=28,
                ),
                variant_b=SlideElementVariant(
                    headline="The Asymmetric MTU Black Hole",
                    subhead="Control plane stays alive while user traffic vanishes into thin air",
                    bullet_points=[
                        "Virtual testbed passes in isolation on developer laptop",
                        "Fails immediately in bare-metal CI runner without jumbo frames",
                    ],
                    comparison_left={
                        "title": "BGP Control Plane",
                        "status": "ESTABLISHED (UP)",
                        "color": "emerald",
                        "note": "Small packets (< 180B) bypass MTU ceiling",
                    },
                    comparison_right={
                        "title": "Data Plane Payload",
                        "status": "SILENT DROP (100%)",
                        "color": "rose",
                        "note": "Packets > 1460B exceed physical link limit",
                    },
                    metric_callouts=[
                        {"label": "BGP State", "value": "UP (Keepalive 30s)", "detail": "Deceiving health check"},
                        {"label": "Payload Loss", "value": "100% Loss", "detail": "On MTU boundary exceed"},
                    ],
                    badge_pills=["Production Gotcha", "DevOps Friction"],
                    word_count=17,
                ),
            ),
            PresentationSlide(
                slide_id="slide_03",
                slide_index=3,
                section_index=2,
                timestamp_start_s=105.0,
                timestamp_end_s=210.0,
                duration_s=105.0,
                slide_type="code_breakdown",
                cue_marker="[CODE: iptables MSS Clamping vs Underlay Jumbo MTU Fix]",
                spoken_anchor_text="Without clamping MSS to 1460, control plane BGP sessions stay up, but payload packets vanish into thin air.",
                variant_a=SlideElementVariant(
                    headline="Remediation Pattern: TCP MSS Clamping Rule",
                    subhead="Force TCP 3-way handshake to clamp MSS before SYN-ACK egress",
                    bullet_points=[
                        "Intercepts TCP SYN packets during handshake",
                        "Rewrites max segment size to match bottleneck interface",
                        "Zero performance penalty on modern Linux conntrack",
                    ],
                    code_snippet="# Fix 1: Kernel iptables TCP MSS Clamping on CI host\niptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \\\n  -j TCPMSS --clamp-mss-to-pmtu\n\n# Fix 2: Containerlab topology YAML underlay MTU\nlinks:\n  - endpoints: [\"leaf1:eth1\", \"spine1:eth1\"]\n    mtu: 9216  # Enforce jumbo frames on fabric",
                    code_language="bash",
                    badge_pills=["iptables", "TCPMSS", "Kernel Clamp", "Containerlab"],
                    word_count=25,
                ),
                variant_b=SlideElementVariant(
                    headline="Two Production Solutions: Fast vs Clean",
                    subhead="Choose between host-level TCP clamping or jumbo frame underlay",
                    bullet_points=[
                        "Prevents ICMP Type 3 Code 4 fragmentation dependencies",
                        "Allows nested virtualization without network degradation",
                    ],
                    comparison_left={
                        "title": "Workaround: MSS Clamping",
                        "status": "RECOMMENDED FOR CI",
                        "color": "indigo",
                        "note": "1-line iptables rule on CI runner host",
                    },
                    comparison_right={
                        "title": "Root Fix: Jumbo Frames",
                        "status": "LONG-TERM ARCH",
                        "color": "emerald",
                        "note": "Set 9216 MTU on all physical switches",
                    },
                    metric_callouts=[
                        {"label": "CI MTU Ceiling", "value": "1460 Bytes", "detail": "Safe TCP payload"},
                        {"label": "Fabric Jumbo", "value": "9216 MTU", "detail": "Physical standard"},
                    ],
                    badge_pills=["Battle-Tested", "Production Fix"],
                    word_count=16,
                ),
            ),
            PresentationSlide(
                slide_id="slide_04",
                slide_index=4,
                section_index=3,
                timestamp_start_s=210.0,
                timestamp_end_s=285.0,
                duration_s=75.0,
                slide_type="metric_callout",
                cue_marker="[METRIC: CI Pipeline Failure Rates & MTU Troubleshooting Benchmarks]",
                spoken_anchor_text="Teams waste an average of 4.2 hours debugging what looks like an application crash.",
                variant_a=SlideElementVariant(
                    headline="CI Pipeline Benchmark & Debugging Cost",
                    subhead="Telemetry gathered across 140 network automation incident post-mortems",
                    bullet_points=[
                        "Synthetic tests pass on local macOS machines with colima",
                        "Fails nondeterministically on Linux GitHub Actions runner",
                    ],
                    code_snippet="$ pytest tests/test_bgp_convergence.py -v\ntests/test_bgp_convergence.py::test_peer_state PASSED [ 33%]\ntests/test_bgp_convergence.py::test_full_routes FAILED [ 66%]\n# ERROR: Read timed out after 300.0s (TCP window stall)",
                    code_language="bash",
                    metric_callouts=[
                        {"label": "Mean Time To Detect", "value": "4.2 hrs", "detail": "DevOps engineer time lost"},
                        {"label": "False App Blame", "value": "78%", "detail": "Blamed on app code instead of MTU"},
                    ],
                    badge_pills=["Telemetry", "DevOps Metrics", "Post-Mortem"],
                    word_count=22,
                ),
                variant_b=SlideElementVariant(
                    headline="The Hidden Cost of Underlay Friction",
                    subhead="Why teams spend half a day chasing phantom software bugs",
                    bullet_points=[
                        "Packet captures show zero TCP resets, only persistent window stalls",
                        "Standard curl timeouts trigger false positive alert cascades",
                    ],
                    metric_callouts=[
                        {"label": "Lost Engineering Time", "value": "4.2 Hours", "detail": "Per MTU incident"},
                        {"label": "Initial False Diagnosis", "value": "78% Teams", "detail": "Blamed app logic"},
                        {"label": "Flaky CI Failure Rate", "value": "34% Runs", "detail": "Due to packet truncation"},
                    ],
                    badge_pills=["Productivity Drag", "SRE Telemetry"],
                    word_count=15,
                ),
            ),
            PresentationSlide(
                slide_id="slide_05",
                slide_index=5,
                section_index=4,
                timestamp_start_s=285.0,
                timestamp_end_s=330.0,
                duration_s=45.0,
                slide_type="key_takeaway",
                cue_marker="[TAKEAWAY: 3 Golden Rules for Containerlab CI/CD]",
                spoken_anchor_text="Here is your 3-step checklist before pushing your next fabric test into CI.",
                variant_a=SlideElementVariant(
                    headline="PRODUCTION READY CHECKLIST: 3 GOLDEN RULES",
                    subhead="Automated pre-flight verification script for network CI/CD pipelines",
                    bullet_points=[
                        "Rule 1: Always specify explicit link MTU in Containerlab YAML",
                        "Rule 2: Enforce TCPMSS clamping on all shared CI runners",
                        "Rule 3: Test with full payload sizes (1472 bytes), never default ping",
                    ],
                    code_snippet="# Pre-flight check\n./scripts/check_underlay.sh --verify-mtu --clamp-mss --ping-df\n# [OK] Interface MTU: 9216\n# [OK] TCP MSS Clamping: ACTIVE\n# [OK] BGP Hello & Large Payload: VERIFIED\n# STATUS: READY TO DEPLOY",
                    code_language="bash",
                    badge_pills=["Checklist", "Production Ready", "CI Verification"],
                    word_count=23,
                ),
                variant_b=SlideElementVariant(
                    headline="3 Production Rules for Resilient Fabrics",
                    subhead="Battle-tested architecture principles for real-world CI/CD pipelines",
                    bullet_points=[
                        "Rule 3: Run DF-bit (Don't Fragment) ping probes during pre-flight",
                        "Document underlay MTU requirements directly in repo README",
                    ],
                    comparison_left={
                        "title": "Rule 1: Explicit Topology MTU",
                        "status": "MANDATORY",
                        "color": "indigo",
                        "note": "Never rely on kernel default interface sizes",
                    },
                    comparison_right={
                        "title": "Rule 2: Automated MSS Clamp",
                        "status": "ESSENTIAL",
                        "color": "emerald",
                        "note": "Sanitize TCP handshakes at runner perimeter",
                    },
                    metric_callouts=[
                        {"label": "CI Success Rate", "value": "99.9%", "detail": "With MSS clamping rule"},
                        {"label": "Flaky Failures", "value": "0%", "detail": "Zero MTU truncations"},
                    ],
                    badge_pills=["Best Practices", "Architectural Heuristics"],
                    word_count=16,
                ),
            ),
        ],
    )
    return deck


@router.get("/demo/sample", response_model=PresentationDeck)
async def get_sample_demo_deck(project_id: str = Depends(get_active_project_id)):
    """Retrieve pre-built sample 16:9 presentation deck with A/B variants."""
    return _build_sample_deck()


@router.post("/generate", response_model=PresentationDeck)
async def generate_presentation_deck(
    req: GeneratePresentationRequest,
    project_id: str = Depends(get_active_project_id),
):
    """Parse visual cues from a video script and synthesize a synchronized 16:9 presentation deck."""
    script_storage = ScriptStorageService(project_id=project_id)
    storage = PresentationStorageService(project_id=project_id)
    project_storage = ProjectStorageService()
    vision = project_storage.get_project_vision(project_id)

    generator = PresentationGeneratorService(
        script_storage=script_storage,
        presentation_storage=storage,
        project_id=project_id,
    )

    script = script_storage.get_script(req.script_id)
    if not script:
        raise HTTPException(
            status_code=404,
            detail=f"Script '{req.script_id}' not found. Cannot generate presentation without an existing script."
        )

    # Generate real AI / domain-aware presentation deck directly from script and vision
    generated = await generator.generate_presentation(
        script_id=req.script_id,
        script=script,
        vision=vision,
    )
    deck_dict = generated.model_dump(mode="json")
    out_deck = PresentationDeck(**deck_dict)
    _DECKS_CACHE[out_deck.deck_id] = out_deck
    return out_deck


@router.get("/decks", response_model=List[Dict[str, Any]])
async def list_presentation_decks(project_id: str = Depends(get_active_project_id)):
    """List all presentation decks saved in the project vault."""
    storage = PresentationStorageService(project_id=project_id)
    decks = storage.list_decks()
    return [d if isinstance(d, dict) else d.model_dump(mode="json") for d in decks]


@router.get("/decks/{deck_id}", response_model=PresentationDeck)
async def get_presentation_deck(
    deck_id: str,
    project_id: str = Depends(get_active_project_id),
):
    """Retrieve a generated presentation deck by ID from the project vault."""
    if deck_id in _DECKS_CACHE:
        return _DECKS_CACHE[deck_id]
    storage = PresentationStorageService(project_id=project_id)
    stored = storage.get_deck(deck_id)
    if stored:
        deck_dict = stored.model_dump(mode="json")
        out_deck = PresentationDeck(**deck_dict)
        _DECKS_CACHE[deck_id] = out_deck
        return out_deck
    raise HTTPException(status_code=404, detail="Presentation deck not found")


@router.delete("/decks/{deck_id}")
async def delete_presentation_deck(
    deck_id: str,
    project_id: str = Depends(get_active_project_id),
):
    """Delete a presentation deck from the project vault."""
    if deck_id in _DECKS_CACHE:
        del _DECKS_CACHE[deck_id]
    storage = PresentationStorageService(project_id=project_id)
    storage.delete_deck(deck_id)
    return {"status": "deleted", "deck_id": deck_id, "project_id": project_id}

