import asyncio, sys
from pathlib import Path
from unittest.mock import patch
import httpx

sys.path.insert(0, "backend")
from app.main import app
from app.models.vault import AIMetadata
from app.services.curriculum_storage import CurriculumStorageService

MOCK_STRUCTURED_RESPONSE = {
    "title": "Cloudflare Architecture & Incident Resilience Arc",
    "description": "Comprehensive 3-tier masterclass on DNS, CDN caching, and synthetic origin failover.",
    "episodes": [
        {
            "episode_number": 1,
            "tier": "fundamentals",
            "title": "The Orange Cloud Dilemma: Edge 200 OK vs Backend 502",
            "hook": "Your origin backend is throwing 502 errors, but your CDN is masking the outage with stale cache, leaving you completely blind during a critical incident. You cannot explain this failure to leadership with vague hand-waving. Master edge proxy decoupling right now.",
            "learning_objectives": ["Identify edge masking", "Understand DNS proxy vs DNS only"],
            "key_facts_referenced": [],
            "target_duration_minutes": 6,
            "recommended_visuals": ["Edge proxy routing diagram"],
            "lab_exercise": None,
        },
        {
            "episode_number": 2,
            "tier": "advanced",
            "title": "Decoupling DNS and Dynamic Traffic",
            "hook": "Production traffic is degrading, caching rules are conflicting with dynamic user sessions, and your response headers show erratic bypass behavior. Relying on default edge caching rules destroys user trust. Decouple dynamic routing right now.",
            "learning_objectives": ["Implement cache bypass rules", "Configure origin headers"],
            "key_facts_referenced": [],
            "target_duration_minutes": 6,
            "recommended_visuals": ["Cache rule matrix"],
            "lab_exercise": None,
        },
        {
            "episode_number": 3,
            "tier": "lab",
            "title": "Hands-On Synthetic Origin Health Checks",
            "hook": "You pushed an origin routing change blind into production without synthetic probes, and customer tickets are flooding in before your alerts even register. Waiting for user reports to detect downtime is fatal. Deploy synthetic origin probes right now.",
            "learning_objectives": ["Deploy health check probes", "Automate failover"],
            "key_facts_referenced": [],
            "target_duration_minutes": 5,
            "recommended_visuals": ["Terminal probe demonstration"],
            "lab_exercise": "curl -sv https://origin.internal/health",
        },
    ],
}

mock_ai_meta = AIMetadata(
    provider="mock_test",
    model="mock_model",
    fallback_occurred=False,
    duration_ms=42,
)

async def run():
    print("=== Testing POST /api/curriculum/generate with empty/omitted topic ===")
    created_arcs = []
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        captured_prompts = []
        async def mock_generate_structured(self, prompt, *args, **kwargs):
            captured_prompts.append(prompt)
            return MOCK_STRUCTURED_RESPONSE, mock_ai_meta

        with patch("app.services.ai.router.AIRouter.generate_structured", new=mock_generate_structured):
            # Test 1: {\"topic\": null}
            resp1 = await client.post(
                "/api/curriculum/generate",
                json={"topic": None, "target_episode_count": 3},
                headers={"x-project-id": "proj_cloudflare_origin_incident"},
            )
            assert resp1.status_code == 200, f"Expected 200, got {resp1.status_code}: {resp1.text}"
            data1 = resp1.json()
            created_arcs.append(data1["arc_id"])
            t1 = data1["topic"]
            assert "First Steps Into Cloudflare" in t1, f"Unexpected topic: {t1}"
            assert "First Steps Into Cloudflare" in captured_prompts[-1]
            print("  ✓ topic=None: status 200, auto-derived topic:", t1)

            # Test 2: {}
            resp2 = await client.post(
                "/api/curriculum/generate",
                json={},
                headers={"x-project-id": "proj_cloudflare_origin_incident"},
            )
            assert resp2.status_code == 200, f"Expected 200, got {resp2.status_code}: {resp2.text}"
            data2 = resp2.json()
            created_arcs.append(data2["arc_id"])
            t2 = data2["topic"]
            assert "First Steps Into Cloudflare" in t2, f"Unexpected topic: {t2}"
            assert "First Steps Into Cloudflare" in captured_prompts[-1]
            print("  ✓ {} (omitted topic): status 200, auto-derived topic:", t2)

            # Test 3: {\"topic\": \"   \"} (empty string)
            resp3 = await client.post(
                "/api/curriculum/generate",
                json={"topic": "   "},
                headers={"x-project-id": "proj_cloudflare_origin_incident"},
            )
            assert resp3.status_code == 200, f"Expected 200, got {resp3.status_code}: {resp3.text}"
            data3 = resp3.json()
            created_arcs.append(data3["arc_id"])
            t3 = data3["topic"]
            assert "First Steps Into Cloudflare" in t3
            print("  ✓ topic="   " (whitespace): status 200, auto-derived topic:", t3)

    # Cleanup
    storage = CurriculumStorageService(project_id="proj_cloudflare_origin_incident")
    for arc_id in created_arcs:
        storage.delete_arc(arc_id)
        print("  ✓ Cleaned up test arc", arc_id)
    print("All empty/omitted topic checks PASSED!")

asyncio.run(run())
