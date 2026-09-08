"""Domain models for Module 4: A/V Sync, Audio Smoothing & Jump-Cut Editor."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """Execution status of a media render or analysis job."""

    QUEUED = "queued"
    ANALYZING = "analyzing"
    CUTTING = "cutting"
    COMPLETED = "completed"
    FAILED = "failed"


class SilenceInterval(BaseModel):
    """Detected silent period in audio stream."""

    start_time: float = Field(description="Start time of silence in seconds.")
    end_time: float = Field(description="End time of silence in seconds.")
    duration: float = Field(description="Duration of silence in seconds.")


class KeepInterval(BaseModel):
    """Speech/content period retained for jump-cut assembly."""

    start_time: float = Field(description="Start time of kept content in seconds.")
    end_time: float = Field(description="End time of kept content in seconds.")
    duration: float = Field(description="Duration of kept content in seconds.")


class AudioDSPConfig(BaseModel):
    """Configuration for studio-grade audio cleanup and loudness normalization."""

    highpass_hz: int = Field(
        default=80, description="Highpass filter cutoff frequency in Hz to eliminate low-end rumble."
    )
    denoise_db: float = Field(
        default=-25.0, description="FFT noise reduction amount in dB (-20 to -30 dB typical)."
    )
    presence_boost_db: float = Field(
        default=1.5, description="Vocal presence boost in dB around 3000 Hz."
    )
    compression: bool = Field(
        default=True, description="Enable dynamic audio compression for broadcast consistency."
    )
    target_lufs: float = Field(
        default=-16.0, description="Target integrated loudness in LUFS (-14 to -16 for YouTube)."
    )
    true_peak_db: float = Field(
        default=-1.5, description="Maximum allowed true peak in dBFS to prevent inter-sample clipping."
    )
    micro_fade_ms: float = Field(
        default=8.0, description="Micro-fade in/out duration in ms applied at cut boundaries to eliminate clicks."
    )


class MediaAnalysisRequest(BaseModel):
    """Request to probe media and detect silent pause intervals."""

    file_path: str = Field(description="Absolute or relative path to media file.")
    noise_threshold_db: float = Field(
        default=-30.0, description="Noise threshold in dB below which audio is treated as silence."
    )
    min_silence_s: float = Field(
        default=0.45, description="Minimum duration in seconds to classify as a silence gap."
    )
    padding_s: float = Field(
        default=0.08, description="Safety padding in seconds retained around natural speech."
    )


class MediaAnalysisResponse(BaseModel):
    """Media container metadata and detected silence intervals."""

    file_path: str
    duration_s: float
    has_video: bool
    has_audio: bool
    fps: float = 0.0
    width: int = 0
    height: int = 0
    silence_intervals: List[SilenceInterval] = Field(default_factory=list)
    keep_intervals: List[KeepInterval] = Field(default_factory=list)
    potential_time_saved_s: float = 0.0


class MediaRenderRequest(BaseModel):
    """Request to cut media by keep intervals with audio smoothing."""

    source_file: str = Field(description="Path to the source audio or video file.")
    keep_intervals: List[KeepInterval] = Field(
        description="List of intervals to retain in the edited output."
    )
    audio_dsp: AudioDSPConfig = Field(
        default_factory=AudioDSPConfig,
        description="Studio audio DSP chain settings (denoise, EQ, compression, loudness).",
    )
    use_hardware_accel: bool = Field(
        default=True,
        description="Use Apple Silicon VideoToolbox / AudioToolbox hardware acceleration.",
    )


class MediaJobResponse(BaseModel):
    """State of an ongoing or completed media processing job."""

    job_id: str
    status: JobStatus = JobStatus.QUEUED
    progress_pct: float = 0.0
    original_duration_s: float = 0.0
    processed_duration_s: float = 0.0
    cuts_count: int = 0
    time_saved_s: float = 0.0
    output_file: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TranscribeRequest(BaseModel):
    """Request to transcribe an audio or video file with Whisper."""

    file_path: str = Field(description="Path to the audio or video file to transcribe.")
    language: Optional[str] = Field(default="en", description="Optional language code (e.g. 'en').")


class TranscriptionSegment(BaseModel):
    """Timestamped speech segment from transcription."""

    id: int = Field(description="Segment identifier.")
    start: float = Field(description="Start time in seconds.")
    end: float = Field(description="End time in seconds.")
    text: str = Field(description="Transcribed text for this segment.")


class TranscriptionResponse(BaseModel):
    """Whisper transcription response with text, timestamps, and segments."""

    text: str = Field(description="Full concatenated transcription text.")
    duration: float = Field(default=0.0, description="Audio duration in seconds.")
    language: str = Field(default="en", description="Detected or requested language.")
    segments: List[TranscriptionSegment] = Field(
        default_factory=list, description="Timestamped speech segments."
    )
    words: List[Dict[str, Any]] = Field(
        default_factory=list, description="Word-level alignment details if available."
    )
