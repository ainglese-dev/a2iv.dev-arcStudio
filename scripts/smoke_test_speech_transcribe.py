"""Smoke test for realistic Cloudflare demo speech generator and Whisper AI transcription endpoint."""

import asyncio
from pathlib import Path
import sys

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "backend"))

import httpx
from app.main import app
from app.config import get_settings


async def run_tests():
    print("=================================================================")
    print("   DEMO SPEECH & WHISPER TRANSCRIBE ENDPOINT SMOKE TEST           ")
    print("=================================================================")

    settings = get_settings()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Step 1: POST /api/media/demo-speech-raw
        print("\n--- [1] Testing POST /api/media/demo-speech-raw ---")
        demo_resp = await client.post("/api/media/demo-speech-raw")
        assert demo_resp.status_code == 200, f"Failed demo-speech-raw: {demo_resp.text}"
        demo_data = demo_resp.json()
        print("  ✓ Response received:")
        for k, v in demo_data.items():
            print(f"    - {k}: {v}")

        assert demo_data["filename"] == "demo_script_speech_raw.wav"
        assert demo_data["has_audio"] is True
        assert demo_data["duration_s"] > 15.0
        raw_path = Path(demo_data["file_path"])
        assert raw_path.exists()
        assert raw_path.stat().st_size > 0
        print(f"  ✓ Verified file on disk: {raw_path} ({raw_path.stat().st_size} bytes)")

        # Step 2: POST /api/media/transcribe
        print("\n--- [2] Testing POST /api/media/transcribe ---")
        transcribe_resp = await client.post(
            "/api/media/transcribe",
            json={"file_path": str(raw_path), "language": "en"},
        )
        assert transcribe_resp.status_code == 200, f"Failed transcribe: {transcribe_resp.text}"
        trans_data = transcribe_resp.json()
        print("  ✓ Transcription received:")
        print(f"    - Language: {trans_data['language']}")
        print(f"    - Duration: {trans_data['duration']}s")
        print(f"    - Full text: \"{trans_data['text']}\"")
        print(f"    - Number of segments: {len(trans_data['segments'])}")
        for seg in trans_data["segments"]:
            print(f"      * [{seg['start']}s -> {seg['end']}s] {seg['text']}")

        assert len(trans_data["segments"]) >= 3
        assert "origin" in trans_data["text"].lower() or "cloudflare" in trans_data["text"].lower()
        assert trans_data["duration"] > 15.0

        # Step 3: Test 404 for nonexistent file
        print("\n--- [3] Testing 404 handling on nonexistent file ---")
        notfound_resp = await client.post(
            "/api/media/transcribe",
            json={"file_path": "/path/to/definitely_nonexistent_audio.wav"},
        )
        assert notfound_resp.status_code == 404
        print(f"  ✓ Nonexistent file returned HTTP 404 as expected: {notfound_resp.json()['detail']}")

    print("\n=================================================================")
    print("   ALL DEMO SPEECH & TRANSCRIBE TESTS PASSED (100% SUCCESS)      ")
    print("=================================================================")


if __name__ == "__main__":
    asyncio.run(run_tests())
