"""Precision Hardware-Accelerated Jump-Cut & Audio DSP Engine."""

import asyncio
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import re
import shutil
from typing import Any, Dict, List, Optional, Tuple
import uuid

from app.config import get_settings
from app.models.media import (
    AudioDSPConfig,
    JobStatus,
    KeepInterval,
    MediaJobResponse,
    MediaRenderRequest,
)
from app.services.media.transcriber import probe_media

logger = logging.getLogger(__name__)


class MediaCutterService:
    """Manages jump-cut rendering jobs with Apple Silicon hardware acceleration."""

    def __init__(self, media_dir: Optional[Path] = None):
        settings = get_settings()
        self.media_dir = media_dir or settings.media_dir
        self.uploads_dir = self.media_dir / "uploads"
        self.processed_dir = self.media_dir / "processed"
        self.jobs_dir = self.media_dir / "jobs"

        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        self.jobs_dir.mkdir(parents=True, exist_ok=True)

        self._jobs: Dict[str, MediaJobResponse] = {}
        self._load_persisted_jobs()

    def _load_persisted_jobs(self) -> None:
        """Load existing job status files from disk into memory."""
        for p in self.jobs_dir.glob("*.json"):
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
                job = MediaJobResponse(**data)
                self._jobs[job.job_id] = job
            except Exception as e:
                logger.warning("Failed loading job file %s: %s", p, e)

    def _save_job(self, job: MediaJobResponse) -> None:
        """Persist job state to memory and disk."""
        self._jobs[job.job_id] = job
        file_path = self.jobs_dir / f"{job.job_id}.json"
        try:
            file_path.write_text(job.model_dump_json(indent=2), encoding="utf-8")
        except Exception as e:
            logger.error("Failed saving job file %s: %s", file_path, e)

    def get_job(self, job_id: str) -> Optional[MediaJobResponse]:
        """Retrieve job status by job_id."""
        if job_id in self._jobs:
            return self._jobs[job_id]
        file_path = self.jobs_dir / f"{job_id}.json"
        if file_path.exists():
            try:
                data = json.loads(file_path.read_text(encoding="utf-8"))
                job = MediaJobResponse(**data)
                self._jobs[job_id] = job
                return job
            except Exception:
                return None
        return None

    def list_jobs(self) -> List[MediaJobResponse]:
        """List all media jobs sorted by creation time."""
        return sorted(self._jobs.values(), key=lambda j: j.created_at, reverse=True)

    def create_job(
        self,
        original_duration_s: float,
        cuts_count: int,
        time_saved_s: float,
    ) -> MediaJobResponse:
        """Create and queue a new media cut job."""
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        job = MediaJobResponse(
            job_id=job_id,
            status=JobStatus.QUEUED,
            progress_pct=0.0,
            original_duration_s=round(original_duration_s, 3),
            processed_duration_s=max(0.0, round(original_duration_s - time_saved_s, 3)),
            cuts_count=cuts_count,
            time_saved_s=round(time_saved_s, 3),
            created_at=datetime.now(timezone.utc),
        )
        self._save_job(job)
        return job

    def build_filter_complex(
        self,
        keep_intervals: List[KeepInterval],
        audio_dsp: AudioDSPConfig,
        has_video: bool,
    ) -> Tuple[str, str, str]:
        """Generate dynamic filter_complex string and map flags for FFmpeg.

        Returns:
            (filter_complex_str, video_map, audio_map)
        """
        n = len(keep_intervals)
        filter_parts: List[str] = []

        micro_fade_s = audio_dsp.micro_fade_ms / 1000.0

        for i, k in enumerate(keep_intervals):
            dur = max(0.001, k.end_time - k.start_time)
            fade_d = min(micro_fade_s, dur / 2.0)
            fade_out_st = max(0.0, dur - fade_d)

            if has_video:
                filter_parts.append(
                    f"[0:v]trim=start={k.start_time:.3f}:end={k.end_time:.3f},setpts=PTS-STARTPTS[v{i}]"
                )

            filter_parts.append(
                f"[0:a]atrim=start={k.start_time:.3f}:end={k.end_time:.3f},asetpts=PTS-STARTPTS,"
                f"afade=t=in:ss=0:d={fade_d:.4f},afade=t=out:st={fade_out_st:.4f}:d={fade_d:.4f}[a{i}]"
            )

        # Concat filter
        if has_video:
            concat_inputs = "".join(f"[v{i}][a{i}]" for i in range(n))
            filter_parts.append(f"{concat_inputs}concat=n={n}:v=1:a=1[v_cat][a_cat]")
            v_out_map = "[v_cat]"
        else:
            concat_inputs = "".join(f"[a{i}]" for i in range(n))
            filter_parts.append(f"{concat_inputs}concat=n={n}:v=0:a=1[a_cat]")
            v_out_map = ""

        # Audio DSP chain
        dsp_filters = [
            f"highpass=f={audio_dsp.highpass_hz}",
            f"afftdn=nf={audio_dsp.denoise_db}:tn=1",
            f"equalizer=f=3000:t=q:w=1.5:g={audio_dsp.presence_boost_db}",
        ]
        if audio_dsp.compression:
            dsp_filters.append("acompressor=threshold=-18dB:ratio=3:attack=15:release=100:makeup=2dB")

        dsp_filters.append(
            f"loudnorm=I={audio_dsp.target_lufs}:TP={audio_dsp.true_peak_db}:LRA=11"
        )
        # Resample to standard 48kHz for broadcast and AudioToolbox compatibility
        dsp_filters.append("aresample=48000")

        dsp_chain_str = ",".join(dsp_filters)
        filter_parts.append(f"[a_cat]{dsp_chain_str}[a_out]")

        filter_complex_str = ";".join(filter_parts)
        a_out_map = "[a_out]"

        return filter_complex_str, v_out_map, a_out_map

    async def render_jumpcuts(
        self,
        job_id: str,
        request: MediaRenderRequest,
    ) -> MediaJobResponse:
        """Execute jump-cut editing and audio DSP pipeline asynchronously."""
        job = self.get_job(job_id)
        if not job:
            job = self.create_job(
                original_duration_s=0.0,
                cuts_count=max(0, len(request.keep_intervals) - 1),
                time_saved_s=0.0,
            )

        try:
            job.status = JobStatus.ANALYZING
            job.progress_pct = 5.0
            self._save_job(job)

            probe = await probe_media(request.source_file)
            has_video = probe["has_video"]
            has_audio = probe["has_audio"]
            orig_duration = probe["duration_s"]

            if not has_audio and not has_video:
                raise ValueError("Source file contains neither audio nor video streams.")

            if not request.keep_intervals:
                # If no intervals given, default to entire media
                request.keep_intervals = [
                    KeepInterval(
                        start_time=0.0,
                        end_time=orig_duration,
                        duration=orig_duration,
                    )
                ]

            target_duration = sum(k.duration for k in request.keep_intervals)
            job.original_duration_s = round(orig_duration, 3)
            job.processed_duration_s = round(target_duration, 3)
            job.cuts_count = max(0, len(request.keep_intervals) - 1)
            job.time_saved_s = max(0.0, round(orig_duration - target_duration, 3))

            job.status = JobStatus.CUTTING
            job.progress_pct = 15.0
            self._save_job(job)

            ext = ".mp4" if has_video else ".m4a"
            out_filename = f"{job_id}_jumpcut{ext}"
            output_path = self.processed_dir / out_filename

            filter_complex_str, v_map, a_map = self.build_filter_complex(
                keep_intervals=request.keep_intervals,
                audio_dsp=request.audio_dsp,
                has_video=has_video,
            )

            cmd: List[str] = ["ffmpeg", "-y", "-nostdin"]

            # Hardware decode flag if requested and video exists
            if request.use_hardware_accel and has_video:
                cmd.extend(["-hwaccel", "videotoolbox"])

            cmd.extend(["-i", str(request.source_file)])
            cmd.extend(["-filter_complex", filter_complex_str])

            if has_video and v_map:
                cmd.extend(["-map", v_map])
            cmd.extend(["-map", a_map])

            # Video encoding parameters
            if has_video:
                if request.use_hardware_accel:
                    cmd.extend(["-c:v", "h264_videotoolbox", "-b:v", "6000k"])
                else:
                    cmd.extend(["-c:v", "libx264", "-preset", "fast", "-crf", "20"])

            # Audio encoding parameters
            if request.use_hardware_accel:
                cmd.extend(["-c:a", "aac_at", "-b:a", "192k"])
            else:
                cmd.extend(["-c:a", "aac", "-b:a", "192k"])

            if has_video:
                cmd.append("-shortest")

            cmd.extend(["-f", "mp4" if has_video else "ipod"])
            cmd.append(str(output_path))

            logger.info("Executing FFmpeg jumpcut render for job %s...", job_id)
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                err_text = stderr.decode(errors="replace").strip()
                logger.error("FFmpeg render failed for job %s: %s", job_id, err_text)
                job.status = JobStatus.FAILED
                job.error_message = f"FFmpeg failed: {err_text[-400:]}"
                self._save_job(job)
                return job

            # Verify rendered output
            if not output_path.exists() or output_path.stat().st_size == 0:
                raise RuntimeError("Output file was not created or is empty.")

            job.status = JobStatus.COMPLETED
            job.progress_pct = 100.0
            job.output_file = str(output_path)
            self._save_job(job)
            logger.info("Jumpcut render completed successfully for job %s: %s", job_id, output_path)
            return job

        except Exception as e:
            logger.error("Job %s encountered unexpected exception: %s", job_id, e)
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            self._save_job(job)
            return job
