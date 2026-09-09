"""Smoke test suite for Developer & Vault Management Router.

Tests:
1. Pydantic schemas validation (VaultCategoryStats, VaultStatsResponse, VaultResetRequest, etc.)
2. GET /api/dev/vault/stats endpoint
3. POST /api/dev/vault/seed endpoint (practitioner source & 4 atomic facts)
4. POST /api/dev/vault/reset endpoint (selective category purge and 'all' soft-reset)
"""

import asyncio
import os
from pathlib import Path
import shutil
import sys
import tempfile

# Setup isolated temporary test vault
temp_vault_dir = tempfile.mkdtemp(prefix="arcstudio_dev_vault_")
os.environ["VAULT_DIR"] = temp_vault_dir
os.environ["ENABLE_DEV_ROUTES"] = "true"

# Ensure backend package is in python path
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "backend"))

from app.config import get_settings
settings = get_settings()
settings.vault_dir = temp_vault_dir
settings.enable_dev_routes = True

import httpx
from app.main import app
from app.routers import dev

# Ensure dev router is included in app for test execution
if not any(getattr(r, "path", None) == "/api/dev" for r in app.routes):
    app.include_router(dev.router, prefix="/api/dev", tags=["dev"])

from app.routers.dev import (
    VaultCategoryStats,
    VaultResetRequest,
    VaultResetResponse,
    VaultSeedResponse,
    VaultStatsResponse,
)


def test_dev_domain_models():
    print("\n--- [1] Testing Dev & Vault Management Domain Models ---")

    stat = VaultCategoryStats(count=5, size_bytes=10240)
    assert stat.count == 5
    assert stat.size_bytes == 10240
    print("  ✓ VaultCategoryStats validated")

    stats_resp = VaultStatsResponse(
        sources=stat,
        facts=stat,
        guides=stat,
        curriculum=stat,
        scripts=stat,
        media=stat,
        presentations=stat,
        total_files=35,
        total_size_bytes=71680,
    )
    assert stats_resp.total_files == 35
    assert stats_resp.total_size_bytes == 71680
    print("  ✓ VaultStatsResponse validated")

    req = VaultResetRequest(target="scripts")
    assert req.target == "scripts"
    print("  ✓ VaultResetRequest validated")

    reset_resp = VaultResetResponse(
        status="success", target="scripts", deleted_count=3, message="Purged 3 files."
    )
    assert reset_resp.deleted_count == 3
    print("  ✓ VaultResetResponse validated")

    seed_resp = VaultSeedResponse(
        status="success", sources_created=1, facts_created=4, message="Seeded."
    )
    assert seed_resp.sources_created == 1
    assert seed_resp.facts_created == 4
    print("  ✓ VaultSeedResponse validated")


async def test_dev_fastapi_endpoints():
    print("\n--- [2] Testing FastAPI Dev & Vault Management Endpoints ---")

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. Initial stats
        res = await client.get("/api/dev/vault/stats")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "sources" in data
        assert "facts" in data
        assert "guides" in data
        assert "curriculum" in data
        assert "scripts" in data
        assert "media" in data
        assert "total_files" in data
        assert "total_size_bytes" in data
        print(f"  ✓ GET /api/dev/vault/stats initial files={data['total_files']} (size={data['total_size_bytes']} bytes)")

        # 2. Seed realistic test data
        seed_res = await client.post("/api/dev/vault/seed")
        assert seed_res.status_code == 200, f"Expected 200, got {seed_res.status_code}: {seed_res.text}"
        seed_data = seed_res.json()
        assert seed_data["status"] == "success"
        assert seed_data["sources_created"] == 1
        assert seed_data["facts_created"] == 4
        print(f"  ✓ POST /api/dev/vault/seed succeeded: {seed_data['message']}")

        # 3. Verify stats after seed
        stats_after_seed = (await client.get("/api/dev/vault/stats")).json()
        assert stats_after_seed["sources"]["count"] >= 1
        assert stats_after_seed["facts"]["count"] >= 4
        print(f"  ✓ Stats reflect seeded content: {stats_after_seed['sources']['count']} source(s), {stats_after_seed['facts']['count']} fact(s)")

        # 4. Selective reset: facts
        reset_facts = await client.post("/api/dev/vault/reset", json={"target": "facts"})
        assert reset_facts.status_code == 200
        rf_data = reset_facts.json()
        assert rf_data["status"] == "success"
        assert rf_data["target"] == "facts"
        assert rf_data["deleted_count"] >= 4
        print(f"  ✓ POST /api/dev/vault/reset (target='facts') purged {rf_data['deleted_count']} fact file(s)")

        # Check that sources still exist after selective facts reset
        stats_after_rf = (await client.get("/api/dev/vault/stats")).json()
        assert stats_after_rf["facts"]["count"] == 0
        assert stats_after_rf["sources"]["count"] >= 1
        print(f"  ✓ Verified selective reset: facts=0 while sources={stats_after_rf['sources']['count']}")

        # 5. Re-seed and test target='all' nuclear soft-reset
        reseed_res = await client.post("/api/dev/vault/seed")
        assert reseed_res.status_code == 200

        reset_all = await client.post("/api/dev/vault/reset", json={"target": "all"})
        assert reset_all.status_code == 200
        ra_data = reset_all.json()
        assert ra_data["status"] == "success"
        assert ra_data["target"] == "all"
        print(f"  ✓ POST /api/dev/vault/reset (target='all') purged {ra_data['deleted_count']} file(s)")

        # Verify vault is clean
        clean_stats = (await client.get("/api/dev/vault/stats")).json()
        assert clean_stats["sources"]["count"] == 0
        assert clean_stats["facts"]["count"] == 0
        assert clean_stats["curriculum"]["count"] == 0
        assert clean_stats["scripts"]["count"] == 0
        print(f"  ✓ Verified clean vault after nuclear reset: total_files={clean_stats['total_files']}")

        # 6. Re-seed once so vault has fresh practitioner test data available for work
        final_seed = await client.post("/api/dev/vault/seed")
        assert final_seed.status_code == 200
        print(f"  ✓ Final seed deployed 1 practitioner source and 4 facts for immediate dev usability")


async def main():
    print("=================================================================")
    print("   VAULT MANAGEMENT & DEV TOOLS - SMOKE TEST SUITE               ")
    print("=================================================================")
    try:
        test_dev_domain_models()
        await test_dev_fastapi_endpoints()
        print("\n=================================================================")
        print("   ALL DEV & VAULT MANAGEMENT TESTS PASSED (100% SUCCESS)        ")
        print("=================================================================")
    finally:
        shutil.rmtree(temp_vault_dir, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(main())
