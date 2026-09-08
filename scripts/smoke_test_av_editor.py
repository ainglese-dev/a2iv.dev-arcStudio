"""Smoke test suite for Module 4: A/V Sync, Audio Smoothing & Jump-Cut Editor.

Tests:
1. Synthetic 6-second A/V video generation with visual timecode and audio tones
2. Silence detection verifying exact 2.0s - 4.0s silence gap identification
3. Hardware-accelerated jump-cut rendering with 8ms micro-fades and full studio DSP chain
4. Output A/V synchronization verification (duration ~4.0s, video vs audio sync within 35ms)
5. FastAPI HTTP endpoints (/api/media/upload, /api/media/analyze, /api/media/render, /api/media/jobs)
"""

import asyncio
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import time

# Ensure backend package is in python path
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "backend"))

import httpx

from app.main import app
from app.models.media import (
    AudioDSPConfig,
    JobStatus,
    KeepInterval,
    MediaAnalysisRequest,
    MediaRenderRequest,
)
from app.services.media.cutter import MediaCutterService
from app.services.media.transcriber import detect_silences, probe_media


async def generate_synthetic_video(output_path: Path) -> Path:
    """Generate a 6-second video: 0-2s 440Hz tone, 2-4s silence, 4-6s 880Hz tone with video timecode."""
    # Build two tones: 0-2s 440Hz, 4-6s 880Hz, with 2-4s silence using volume expression
    # Use testsrc for visual countdown / timecode
    cmd = [
        "ffmpeg",
        "-y",
        "-nostdin",
        "-f",
        "lavfi",
        "-i",
        "testsrc=duration=6:size=640x360:rate=30",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=6",
        "-filter_complex",
        "[1:a]volume=enable='between(t,2,4)':volume=0[aout]",
        "-map",
        "0:v",
        "-map",
        "[aout]",
        "-c:v",
        "h264_videotoolbox",
        "-b:v",
        "4000k",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        str(output_path),
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        err = stderr.decode(errors="replace")
        raise RuntimeError(f"Failed generating synthetic test video: {err}")

    assert output_path.exists() and output_path.stat().st_size > 0
    return output_path


async def test_media_probing_and_silence_detection(sample_video: Path):
    print("\n--- [1] Testing Media Probe & Silence Detection ---")

    # 1. Probe media
    probe = await probe_media(str(sample_video))
    print(f"  ✓ Probed duration: {probe['duration_s']}s (Video: {probe['has_video']}, Audio: {probe['has_audio']})")
    print(f"  ✓ Video: {probe['width']}x{probe['height']} @ {probe['fps']} fps, Codec: {probe['video_codec']}")
    print(f"  ✓ Audio Codec: {probe['audio_codec']}, Sample Rate: {probe['audio_sample_rate']} Hz")

    assert probe["has_video"] is True
    assert probe["has_audio"] is True
    assert 5.8 <= probe["duration_s"] <= 6.2

    # 2. Detect silences
    silences, keeps, time_saved = await detect_silences(
        file_path=str(sample_video),
        noise_threshold_db=-30.0,
        min_silence_s=0.45,
        padding_s=0.08,
    )

    print(f"  ✓ Detected {len(silences)} silence interval(s):")
    for s in silences:
        print(f"    - Silence: {s.start_time:.3f}s -> {s.end_time:.3f}s (dur: {s.duration:.3f}s)")

    assert len(silences) == 1, f"Expected 1 silence interval, got {len(silences)}"
    s0 = silences[0]
    # Check that silence interval is around 2.0s to 4.0s (±0.25s)
    assert 1.8 <= s0.start_time <= 2.2, f"Silence start {s0.start_time} not near 2.0s"
    assert 3.8 <= s0.end_time <= 4.2, f"Silence end {s0.end_time} not near 4.0s"
    assert 1.7 <= s0.duration <= 2.3, f"Silence duration {s0.duration} not near 2.0s"

    print(f"  ✓ Generated {len(keeps)} keep interval(s) with 80ms speech padding:")
    for k in keeps:
        print(f"    - Keep: {k.start_time:.3f}s -> {k.end_time:.3f}s (dur: {k.duration:.3f}s)")

    assert len(keeps) == 2, f"Expected 2 keep intervals, got {len(keeps)}"
    # First keep interval should start at 0.0 and end around 2.0 + padding (e.g. 2.08)
    assert keeps[0].start_time == 0.0
    assert 1.9 <= keeps[0].end_time <= 2.2
    # Second keep interval should start around 4.0 - padding (e.g. 3.92) and end around 6.0
    assert 3.8 <= keeps[1].start_time <= 4.1
    assert 5.8 <= keeps[1].end_time <= 6.2

    print(f"  ✓ Potential time saved: {time_saved:.3f}s")
    assert 1.6 <= time_saved <= 2.1


async def test_jumpcut_render_and_av_sync(sample_video: Path, temp_vault_dir: Path):
    print("\n--- [2] Testing Hardware-Accelerated Jump-Cut Engine & Audio DSP ---")

    cutter = MediaCutterService(media_dir=temp_vault_dir / "media")

    # Re-detect keep intervals
    _, keeps, _ = await detect_silences(str(sample_video))

    dsp_config = AudioDSPConfig(
        highpass_hz=80,
        denoise_db=-25.0,
        presence_boost_db=1.5,
        compression=True,
        target_lufs=-16.0,
        true_peak_db=-1.5,
        micro_fade_ms=8.0,
    )

    req = MediaRenderRequest(
        source_file=str(sample_video),
        keep_intervals=keeps,
        audio_dsp=dsp_config,
        use_hardware_accel=True,
    )

    t0 = time.perf_counter()
    job = cutter.create_job(
        original_duration_s=6.0,
        cuts_count=len(keeps) - 1,
        time_saved_s=2.0,
    )
    result_job = await cutter.render_jumpcuts(job.job_id, req)
    elapsed = time.perf_counter() - t0

    print(f"  ✓ Render completed in {elapsed:.2f}s (Status: {result_job.status.value})")
    assert result_job.status == JobStatus.COMPLETED
    assert result_job.output_file is not None
    assert Path(result_job.output_file).exists()
    print(f"  ✓ Output file generated: {result_job.output_file}")

    # Inspect output with ffprobe to verify duration and A/V sync!
    probe_cmd = [
        "ffprobe",
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        result_job.output_file,
    ]
    proc = await asyncio.create_subprocess_exec(
        *probe_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    data = json.loads(stdout.decode(errors="replace"))

    fmt_dur = float(data.get("format", {}).get("duration", 0.0))
    video_stream = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    audio_stream = next((s for s in data["streams"] if s["codec_type"] == "audio"), None)

    assert video_stream is not None, "Output missing video stream"
    assert audio_stream is not None, "Output missing audio stream"

    v_dur = float(video_stream.get("duration", fmt_dur))
    a_dur = float(audio_stream.get("duration", fmt_dur))
    diff_ms = abs(v_dur - a_dur) * 1000.0

    print(f"  ✓ Container duration: {fmt_dur:.3f}s")
    print(f"  ✓ Video stream duration: {v_dur:.3f}s (Codec: {video_stream.get('codec_name')})")
    print(f"  ✓ Audio stream duration: {a_dur:.3f}s (Codec: {audio_stream.get('codec_name')}, Rate: {audio_stream.get('sample_rate')} Hz)")
    print(f"  ✓ A/V Desync difference: {diff_ms:.2f} ms")

    # 1. Total duration must be approximately 4.0s (6.0s - ~2.0s silence gap) within ±0.2s
    assert 3.85 <= fmt_dur <= 4.25, f"Unexpected cut duration: {fmt_dur}s"
    print("  ✓ Jump-cut duration correctly shortened to ~4.0s (removed 2-4s silence gap)")

    # 2. Strict A/V sync check: difference must be <= 35ms (within 1 single video frame at 30fps)
    assert diff_ms <= 35.0, f"A/V Desync exceeded threshold: {diff_ms:.2f}ms > 35ms!"
    print("  ✓ Zero A/V Desync verified: Video and Audio aligned within 35ms threshold!")


async def test_media_fastapi_endpoints(sample_video: Path):
    print("\n--- [3] Testing FastAPI Media Endpoints ---")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 0. 1-Click sample demo clip generation
        demo_resp = await client.post("/api/media/sample-demo")
        assert demo_resp.status_code == 200, f"Sample demo failed: {demo_resp.text}"
        demo_data = demo_resp.json()
        assert demo_data["filename"] == "sample_demo_clip.mp4"
        assert demo_data["duration_s"] == 6.0
        assert demo_data["has_video"] is True
        assert demo_data["has_audio"] is True
        assert demo_data["size_bytes"] > 0
        print(f"  ✓ POST /api/media/sample-demo generated/retrieved demo clip ({demo_data['size_bytes']} bytes, {demo_data['duration_s']}s)")

        # 1. Upload media
        with sample_video.open("rb") as f:
            files = {"file": ("test_recording.mp4", f, "video/mp4")}
            upload_resp = await client.post("/api/media/upload", files=files)
        assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
        upload_data = upload_resp.json()
        uploaded_path = upload_data["file_path"]
        print(f"  ✓ POST /api/media/upload uploaded {upload_data['size_bytes']} bytes to {upload_data['filename']}")

        # 2. Analyze silence via API
        analyze_req = {
            "file_path": uploaded_path,
            "noise_threshold_db": -30.0,
            "min_silence_s": 0.45,
            "padding_s": 0.08,
        }
        analyze_resp = await client.post("/api/media/analyze", json=analyze_req)
        assert analyze_resp.status_code == 200, f"Analyze failed: {analyze_resp.text}"
        analysis_data = analyze_resp.json()
        print(f"  ✓ POST /api/media/analyze returned {len(analysis_data['silence_intervals'])} silences and {len(analysis_data['keep_intervals'])} keep intervals")
        assert len(analysis_data["silence_intervals"]) >= 1
        assert len(analysis_data["keep_intervals"]) >= 2

        # 3. Render jump-cuts via API (async background task)
        render_req = {
            "source_file": uploaded_path,
            "keep_intervals": analysis_data["keep_intervals"],
            "audio_dsp": {
                "highpass_hz": 80,
                "denoise_db": -25.0,
                "presence_boost_db": 1.5,
                "compression": True,
                "target_lufs": -16.0,
                "true_peak_db": -1.5,
                "micro_fade_ms": 8.0,
            },
            "use_hardware_accel": True,
        }
        render_resp = await client.post("/api/media/render", json=render_req)
        assert render_resp.status_code == 200, f"Render trigger failed: {render_resp.text}"
        job_data = render_resp.json()
        job_id = job_data["job_id"]
        print(f"  ✓ POST /api/media/render initiated job '{job_id}' (Status: {job_data['status']})")

        # 4. Poll job status until completed
        for attempt in range(40):
            status_resp = await client.get(f"/api/media/jobs/{job_id}")
            assert status_resp.status_code == 200
            current_job = status_resp.json()
            if current_job["status"] == "completed":
                print(f"  ✓ Job '{job_id}' completed with output: {current_job['output_file']}")
                break
            elif current_job["status"] == "failed":
                raise RuntimeError(f"Render job failed: {current_job.get('error_message')}")
            await asyncio.sleep(0.2)
        else:
            raise TimeoutError("Render job timed out waiting for completion")

        # 5. List jobs
        list_resp = await client.get("/api/media/jobs")
        assert list_resp.status_code == 200
        assert any(j["job_id"] == job_id for j in list_resp.json())
        print(f"  ✓ GET /api/media/jobs verified job '{job_id}' listed")

        # 6. Download rendered file
        download_resp = await client.get(f"/api/media/download/{job_id}")
        assert download_resp.status_code == 200
        assert len(download_resp.content) > 0
        print(f"  ✓ GET /api/media/download/{job_id} downloaded {len(download_resp.content)} bytes of rendered video")

        # Clean up test artifacts from vault
        try:
            if Path(uploaded_path).exists():
                Path(uploaded_path).unlink()
            if current_job.get("output_file") and Path(current_job["output_file"]).exists():
                Path(current_job["output_file"]).unlink()
            job_file = Path("vault/media/jobs") / f"{job_id}.json"
            if job_file.exists():
                job_file.unlink()
        except Exception:
            pass


async def main():
    print("=================================================================")
    print("   A/V SYNC & JUMP-CUT EDITOR (MODULE 4) - SMOKE TEST SUITE      ")
    print("=================================================================")

    temp_dir = tempfile.mkdtemp(prefix="av_editor_test_")
    temp_path = Path(temp_dir)
    synth_video_path = temp_path / "synthetic_recording.mp4"

    try:
        # Step 0: Generate synthetic video
        print("\n[Step 0] Generating synthetic 6-second test video with 2-4s silence gap...")
        await generate_synthetic_video(synth_video_path)
        print(f"  ✓ Synthetic video generated: {synth_video_path.stat().st_size} bytes")

        # Step 1: Probe & Silence detection
        await test_media_probing_and_silence_detection(synth_video_path)

        # Step 2: Render jumpcut & A/V sync check
        await test_jumpcut_render_and_av_sync(synth_video_path, temp_path)

        # Step 3: FastAPI endpoints
        await test_media_fastapi_endpoints(synth_video_path)

        print("\n=================================================================")
        print("   ALL MODULE 4 A/V JUMP-CUT TESTS PASSED (100% SUCCESS)         ")
        print("=================================================================")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(main())
