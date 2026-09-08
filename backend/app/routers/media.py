"""FastAPI Router for Module 4: A/V Sync, Audio Smoothing & Jump-Cut Editor."""

import asyncio
import logging
from pathlib import Path
import uuid
from fastapi import (
    APIRouter,
    BackgroundTasks,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse

from app.config import get_settings
from app.models.media import (
    JobStatus,
    MediaAnalysisRequest,
    MediaAnalysisResponse,
    MediaJobResponse,
    MediaRenderRequest,
    TranscribeRequest,
    TranscriptionResponse,
    TranscriptionSegment,
)
from app.services.media.cutter import MediaCutterService
from app.services.media.transcriber import (
    detect_silences,
    generate_demo_speech_raw,
    probe_media,
    transcribe_audio,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media", tags=["A/V Jump-Cut Editor & Audio DSP"])
cutter_service = MediaCutterService()
settings = get_settings()


@router.post("/upload")
async def upload_media_file(file: UploadFile = File(...)):
    """Upload a raw recording (video or audio) into the vault uploads directory."""
    try:
        clean_name = Path(file.filename or "upload.mp4").name
        safe_name = f"{uuid.uuid4().hex[:8]}_{clean_name}"
        destination = settings.media_uploads_dir / safe_name

        total_bytes = 0
        with destination.open("wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                buffer.write(chunk)
                total_bytes += len(chunk)

        probe = await probe_media(str(destination))

        return {
            "file_path": str(destination),
            "filename": safe_name,
            "size_bytes": total_bytes,
            "duration_s": probe["duration_s"],
            "has_video": probe["has_video"],
            "has_audio": probe["has_audio"],
            "fps": probe["fps"],
            "width": probe["width"],
            "height": probe["height"],
        }
    except Exception as e:
        logger.error("Media upload failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded file: {e}")


@router.post("/sample-demo")
async def generate_sample_demo_clip():
    """Generate or retrieve a 6-second synthetic test video clip for 1-click A/V jumpcut demo."""
    settings.media_uploads_dir.mkdir(parents=True, exist_ok=True)
    sample_path = settings.media_uploads_dir / "sample_demo_clip.mp4"

    if not sample_path.exists() or sample_path.stat().st_size == 0:
        cmd = [
            "ffmpeg",
            "-y",
            "-nostdin",
            "-f", "lavfi", "-i", "testsrc=duration=6:size=640x360:rate=30",
            "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
            "-filter_complex", "[1:a]volume=enable='between(t,2,4)':volume=0[aout]",
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
            str(sample_path),
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.error("Failed to generate sample demo clip: %s", stderr.decode())
            raise HTTPException(
                status_code=500, detail=f"FFmpeg generation failed: {stderr.decode()[:200]}"
            )

    probe = await probe_media(str(sample_path))
    return {
        "file_path": str(sample_path),
        "filename": "sample_demo_clip.mp4",
        "size_bytes": sample_path.stat().st_size,
        "duration_s": probe["duration_s"],
        "has_video": probe["has_video"],
        "has_audio": probe["has_audio"],
        "fps": probe["fps"],
        "width": probe["width"],
        "height": probe["height"],
    }


@router.post("/demo-speech-raw")
async def generate_demo_speech_raw_endpoint():
    """Generate or retrieve realistic Cloudflare demo speech recording."""
    settings.media_uploads_dir.mkdir(parents=True, exist_ok=True)
    sample_path = settings.media_uploads_dir / "demo_script_speech_raw.wav"
    if not sample_path.exists() or sample_path.stat().st_size == 0:
        await generate_demo_speech_raw(sample_path)
    probe = await probe_media(str(sample_path))
    return {
        "file_path": str(sample_path),
        "filename": "demo_script_speech_raw.wav",
        "size_bytes": sample_path.stat().st_size,
        "duration_s": probe["duration_s"],
        "has_video": probe["has_video"],
        "has_audio": probe["has_audio"],
        "fps": probe["fps"],
        "width": probe["width"],
        "height": probe["height"],
    }


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_media_endpoint(req: TranscribeRequest):
    """Transcribe audio with remote Whisper endpoint, with resilient fallback."""
    path = Path(req.file_path).resolve()
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Media file '{req.file_path}' not found")
    result = await transcribe_audio(str(path), language=req.language)
    return TranscriptionResponse(**result)


@router.post("/analyze", response_model=MediaAnalysisResponse)
async def analyze_media_silence(req: MediaAnalysisRequest):
    """Probe media file and detect silent gaps for jump-cut preview."""
    try:
        probe = await probe_media(req.file_path)
        silences, keeps, time_saved = await detect_silences(
            file_path=req.file_path,
            noise_threshold_db=req.noise_threshold_db,
            min_silence_s=req.min_silence_s,
            padding_s=req.padding_s,
        )

        return MediaAnalysisResponse(
            file_path=req.file_path,
            duration_s=probe["duration_s"],
            has_video=probe["has_video"],
            has_audio=probe["has_audio"],
            fps=probe["fps"],
            width=probe["width"],
            height=probe["height"],
            silence_intervals=silences,
            keep_intervals=keeps,
            potential_time_saved_s=time_saved,
        )
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as e:
        logger.error("Silence analysis failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Silence detection failed: {e}")


@router.post("/render", response_model=MediaJobResponse)
async def render_media_jumpcuts(
    req: MediaRenderRequest,
    background_tasks: BackgroundTasks,
):
    """Queue and execute hardware-accelerated jump-cuts with audio DSP chain."""
    try:
        probe = await probe_media(req.source_file)
        orig_dur = probe["duration_s"]
        kept_dur = sum(k.duration for k in req.keep_intervals)
        cuts_count = max(0, len(req.keep_intervals) - 1)
        time_saved = max(0.0, orig_dur - kept_dur)

        job = cutter_service.create_job(
            original_duration_s=orig_dur,
            cuts_count=cuts_count,
            time_saved_s=time_saved,
        )

        background_tasks.add_task(cutter_service.render_jumpcuts, job.job_id, req)
        return job
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as e:
        logger.error("Render job creation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to queue render job: {e}")


@router.get("/jobs", response_model=list[MediaJobResponse])
async def list_media_jobs():
    """List all recent media processing jobs."""
    return cutter_service.list_jobs()


@router.get("/jobs/{job_id}", response_model=MediaJobResponse)
async def get_media_job(job_id: str):
    """Get the status, progress, and output file of a media job."""
    job = cutter_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return job


@router.get("/download/{job_id}")
async def download_processed_media(job_id: str):
    """Download the cut and audio-processed media file."""
    job = cutter_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Job is not completed yet. Current status: '{job.status.value}'.",
        )

    if not job.output_file or not Path(job.output_file).exists():
        raise HTTPException(
            status_code=404,
            detail="Processed output file does not exist on disk.",
        )

    output_path = Path(job.output_file)
    media_type = "video/mp4" if output_path.suffix == ".mp4" else "audio/mp4"

    return FileResponse(
        path=str(output_path),
        filename=output_path.name,
        media_type=media_type,
    )


@router.get("/raw")
async def get_raw_media_stream(file_path: str):
    """Stream raw media file for A/B player comparison."""
    path = Path(file_path).resolve()
    if not path.exists():
        raise HTTPException(status_code=404, detail="Raw media file not found on disk")
    if path.suffix == ".wav":
        media_type = "audio/wav"
    elif path.suffix == ".mp3":
        media_type = "audio/mpeg"
    elif path.suffix in [".mp4", ".mov", ".mkv", ".webm"]:
        media_type = "video/mp4"
    else:
        media_type = "audio/mp4"
    return FileResponse(
        path=str(path),
        filename=path.name,
        media_type=media_type,
    )

