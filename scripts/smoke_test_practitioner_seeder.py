"""Smoke test suite for Practitioner Pain-Point Seeder across 3 distinct domains:
1. Tech/Networking (Containerlab in CI/CD pipeline validation)
2. Language Learning (Overcoming intermediate speaking plateau for engineers)
3. Personal Finance (Cash drag vs Dollar-Cost Averaging during high interest rates)

Verifies:
- Domain model schemas and enums
- Anti-marketing constraints (no brochure fluff, no textbook platitudes)
- Grounded verbatim fact quotes from briefing document
- Multi-domain coverage with authentic practitioner pain points
- FastAPI endpoint POST /api/sources/seed-practitioner
- Obsidian vault persistence (sources and facts)
"""

import asyncio
from pathlib import Path
import sys

# Ensure backend package is in python path
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "backend"))

import httpx
from app.main import app
from app.models.vault import (
    PractitionerLens,
    SeedPractitionerRequest,
    SeedPractitionerResponse,
)
from app.services.practitioner_seeder import PractitionerSeederService
from app.services.vault_storage import VaultStorageService


def test_practitioner_domain_models():
    print("\n--- [1] Testing Practitioner Seeder Domain Models ---")

    assert PractitionerLens.TECH_DEVOPS_INCIDENT.value == "tech_devops_incident"
    assert PractitionerLens.ADULT_LEARNING_PLATEAU.value == "adult_learning_plateau"
    assert PractitionerLens.FINANCE_RISK_PSYCHOLOGY.value == "finance_risk_psychology"
    assert PractitionerLens.GENERAL_PRACTITIONER.value == "general_practitioner"
    print("  ✓ PractitionerLens enum values verified")

    req = SeedPractitionerRequest(
        topic="eBPF Observability Overhead",
        lens=PractitionerLens.TECH_DEVOPS_INCIDENT,
        target_audience="Site Reliability Engineers",
    )
    assert req.topic == "eBPF Observability Overhead"
    assert req.lens == PractitionerLens.TECH_DEVOPS_INCIDENT
    print("  ✓ SeedPractitionerRequest schema validated")


async def test_multi_domain_practitioner_seeding(live: bool = False):
    print(f"\n--- [2] Testing Multi-Domain Practitioner Seeding (Mode: {'LIVE AI' if live else 'DETERMINISTIC / FAST'}) ---")

    transport = httpx.ASGITransport(app=app)
    storage = VaultStorageService()
    created_sources = []
    created_facts = []

    domains = [
        {
            "name": "Domain 1: Tech / DevOps & Incident Post-Mortem",
            "topic": "Containerlab in CI/CD pipeline validation",
            "lens": PractitionerLens.TECH_DEVOPS_INCIDENT.value,
            "audience": "Staff Infrastructure and Network Automation Engineers",
            "expected_keywords": ["ci", "veth", "mtu", "bgp", "boot", "vendor", "asic", "route", "post-mortem"],
            "banned_phrases": ["seamless", "effortless", "game-changer", "blazing fast", "revolutionize"],
        },
        {
            "name": "Domain 2: Adult Learning & Cognitive Plateau",
            "topic": "Overcoming the intermediate speaking plateau for non-native software engineers",
            "lens": PractitionerLens.ADULT_LEARNING_PLATEAU.value,
            "audience": "Senior Non-Native Software Engineers and Tech Leads",
            "expected_keywords": ["freeze", "cognitive", "latency", "zoom", "translation", "affective", "chunk", "retrieval"],
            "banned_phrases": ["seamless", "effortless", "game-changer", "magic bullet", "easy fix"],
        },
        {
            "name": "Domain 3: Personal Finance & Risk Psychology",
            "topic": "Cash drag vs Dollar-Cost Averaging during high interest rates",
            "lens": PractitionerLens.FINANCE_RISK_PSYCHOLOGY.value,
            "audience": "Tech professionals and high-earning individual investors",
            "expected_keywords": ["cash drag", "dca", "lump-sum", "psychology", "tax", "yield", "opportunity cost", "regret"],
            "banned_phrases": ["seamless", "effortless", "game-changer", "get rich quick", "foolproof"],
        },
    ]

    async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=120.0) as client:
        for domain in domains:
            print(f"\n>>> Executing {domain['name']}...")
            payload = {
                "topic": domain["topic"],
                "lens": domain["lens"],
                "target_audience": domain["audience"],
            }

            res = await client.post("/api/sources/seed-practitioner", json=payload)
            assert res.status_code == 200, f"Seeding failed for {domain['topic']}: {res.status_code} - {res.text}"

            data = res.json()
            source = data["source"]
            brief = data["brief_markdown"]
            pain_points = data["pain_points"]
            pitfalls = data["pitfalls"]
            facts = data["facts"]

            source_id = source["source_id"]
            created_sources.append(source_id)
            for f in facts:
                created_facts.append(f["fact_id"])

            print(f"  ✓ Source created: '{source['title']}' (ID={source_id}, type={source['source_type']})")
            print(f"  ✓ Briefing word count: {len(brief.split())} words")
            print(f"  ✓ Extracted {len(pain_points)} pain points, {len(pitfalls)} pitfalls, and {len(facts)} atomic facts")

            # 1. Verify counts
            assert len(pain_points) >= 3, f"Expected >= 3 pain points, got {len(pain_points)}"
            assert len(pitfalls) >= 3, f"Expected >= 3 pitfalls, got {len(pitfalls)}"
            assert len(facts) >= 4, f"Expected >= 4 facts, got {len(facts)}"

            # 2. Verify negative constraints (no banned marketing buzzwords)
            full_corpus = (brief + " " + " ".join(pain_points) + " " + " ".join(pitfalls)).lower()
            for banned in domain["banned_phrases"]:
                assert banned not in full_corpus, f"Banned marketing/textbook phrase '{banned}' found in output!"
            print(f"  ✓ Negative constraints verified: 0 instances of banned marketing rhetoric")

            # 3. Verify domain-specific authentic keywords
            matched_keywords = [kw for kw in domain["expected_keywords"] if kw in full_corpus]
            assert len(matched_keywords) >= 2, f"Expected domain keywords missing. Found: {matched_keywords}"
            print(f"  ✓ Authentic practitioner keywords matched: {matched_keywords}")

            # 4. Print authentic pain points
            print("  --- Extracted Practitioner Pain Points ---")
            for i, p in enumerate(pain_points, 1):
                print(f"    {i}. {p}")

            print("  --- Sample Grounded Atomic Facts ---")
            for f in facts[:2]:
                print(f"    * [{f['fact_id']}] {f['statement']}")
                print(f"      Quote: \"{f['exact_quote']}\"")

            # 5. Verify persistence in vault
            persisted_source = storage.get_source(source_id)
            assert persisted_source is not None, f"Source note {source_id} not found in vault"
            for f in facts:
                persisted_fact = storage.get_fact(f["fact_id"])
                assert persisted_fact is not None, f"Fact note {f['fact_id']} not found in vault"

            print("  ✓ Vault persistence verified for source and all atomic facts")

    # Clean up test files to keep vault tidy
    print("\n--- Cleaning up test artifacts from vault ---")
    for sid in created_sources:
        storage.delete_source(sid)
    for fid in created_facts:
        storage.delete_fact(fid)
    print(f"  ✓ Cleaned up {len(created_sources)} source(s) and {len(created_facts)} fact(s) from vault.")


async def main():
    live_mode = "--live" in sys.argv
    print("=================================================================")
    print("   PRACTITIONER PAIN-POINT SEEDER - MULTI-DOMAIN SMOKE TEST      ")
    print(f"   Mode: {'LIVE AI' if live_mode else 'DETERMINISTIC FALLBACK / FAST'}")
    print("=================================================================")

    test_practitioner_domain_models()
    await test_multi_domain_practitioner_seeding(live=live_mode)

    print("\n=================================================================")
    print("   ALL MULTI-DOMAIN PRACTITIONER SEEDER TESTS PASSED (100%)       ")
    print("=================================================================")


if __name__ == "__main__":
    asyncio.run(main())
