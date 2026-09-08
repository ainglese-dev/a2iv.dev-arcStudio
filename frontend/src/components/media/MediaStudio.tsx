import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Scissors,
  Upload,
  Sparkles,
  Play,
  Zap,
  Cpu,
  Volume2,
  Video,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Download,
  Sliders,
  History,
  ChevronDown,
  RefreshCw,
  Filter,
  ShieldCheck,
  Layers,
  Radio,
  Mic,
  Clock,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  AudioDSPConfig,
  KeepInterval,
  MediaAnalysisResponse,
  MediaJob,
  MediaRenderRequest,
  MediaUploadResponse,
  ToastItem,
  TranscriptionResponse,
} from '../../types'

interface MediaStudioProps {
  onToast: (toast: Omit<ToastItem, 'id'>) => void
}

// Utility formatting helpers
const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`
}

const formatHumanDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds <= 0) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const MediaStudio: React.FC<MediaStudioProps> = ({ onToast }) => {
  // Upload State
  const [uploadedFile, setUploadedFile] = useState<MediaUploadResponse | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)
  const [isLoadingRealisticDemo, setIsLoadingRealisticDemo] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState<TranscriptionResponse | null>(null)
  const [playerMode, setPlayerMode] = useState<'cleaned' | 'raw'>('cleaned')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Silence Detection Parameters
  const [noiseThresholdDb, setNoiseThresholdDb] = useState<number>(-30.0)
  const [minSilenceS, setMinSilenceS] = useState<number>(0.45)
  const [paddingMs, setPaddingMs] = useState<number>(80) // 80ms = 0.08s
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<MediaAnalysisResponse | null>(null)

  // Retained speech interval selection
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set())

  // Audio DSP Configuration
  const [audioDSP, setAudioDSP] = useState<AudioDSPConfig>({
    highpass_hz: 80,
    denoise_db: -25.0,
    presence_boost_db: 1.5,
    compression: true,
    target_lufs: -16.0,
    true_peak_db: -1.5,
    micro_fade_ms: 8.0,
  })
  const [useHardwareAccel, setUseHardwareAccel] = useState<boolean>(true)
  const [showDSPConfig, setShowDSPConfig] = useState(false)

  // Render & Job State
  const [activeJob, setActiveJob] = useState<MediaJob | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [recentJobs, setRecentJobs] = useState<MediaJob[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Timeline hover inspection
  const [hoveredInterval, setHoveredInterval] = useState<{
    type: 'keep' | 'silence'
    start: number
    end: number
    duration: number
    label: string
  } | null>(null)

  // Fetch recent jobs
  const loadRecentJobs = useCallback(async () => {
    try {
      const jobs = await api.listMediaJobs()
      setRecentJobs(jobs)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadRecentJobs()
  }, [loadRecentJobs])

  // Poll active render job
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      return
    }

    const interval = setInterval(async () => {
      try {
        const job = await api.getMediaJob(activeJob.job_id)
        setActiveJob(job)
        if (job.status === 'completed') {
          setIsRendering(false)
          onToast({
            type: 'success',
            title: 'Jump-Cut Rendering Completed',
            message: `Rendered ${formatHumanDuration(job.processed_duration_s)} output with ${job.cuts_count} cuts (saved ${formatHumanDuration(job.time_saved_s)}).`,
          })
          loadRecentJobs()
        } else if (job.status === 'failed') {
          setIsRendering(false)
          onToast({
            type: 'error',
            title: 'Render Job Failed',
            message: job.error_message || 'Media render encountered an error.',
          })
        }
      } catch {
        // ignore
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeJob, onToast, loadRecentJobs])

  // Handle file drop / upload
  const handleFileUpload = async (file: File) => {
    if (!file) return
    setIsUploading(true)
    try {
      const uploaded = await api.uploadMedia(file)
      setUploadedFile(uploaded)
      setAnalysis(null)
      setExcludedIndices(new Set())
      setActiveJob(null)

      onToast({
        type: 'success',
        title: 'Media Uploaded',
        message: `${file.name} (${formatFileSize(uploaded.size_bytes)}) ready for silence detection.`,
      })

      // Proactively run silence detection on newly uploaded file
      runSilenceAnalysis(uploaded.file_path)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Media upload failed'
      onToast({
        type: 'error',
        title: 'Upload Failed',
        message: msg,
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Handle loading sample demo clip
  const handleLoadDemo = async () => {
    setIsLoadingDemo(true)
    setTranscription(null)
    setPlayerMode('cleaned')
    try {
      const demo = await api.loadSampleDemo()
      setUploadedFile(demo)
      setAnalysis(null)
      setExcludedIndices(new Set())
      setActiveJob(null)

      onToast({
        type: 'success',
        title: 'Demo Clip Loaded',
        message: `${demo.filename} (6s test clip) ready for analysis.`,
      })

      // Proactively run silence detection on sample demo clip
      runSilenceAnalysis(demo.file_path)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load sample demo'
      onToast({
        type: 'error',
        title: 'Demo Load Failed',
        message: msg,
      })
    } finally {
      setIsLoadingDemo(false)
    }
  }

  // Handle loading realistic script demo clip (speech + 2.5s awkward dead pauses + room noise)
  const handleLoadRealisticDemo = async () => {
    setIsLoadingRealisticDemo(true)
    setTranscription(null)
    setPlayerMode('cleaned')
    try {
      const demo = await api.loadRealisticDemo()
      setUploadedFile(demo)
      setAnalysis(null)
      setExcludedIndices(new Set())
      setActiveJob(null)

      onToast({
        type: 'success',
        title: 'Realistic Script Demo Loaded',
        message: `${demo.filename} loaded with actual speech, 2.5s awkward dead pauses, and room hiss.`,
      })

      // Proactively run silence detection on realistic demo clip
      await runSilenceAnalysis(demo.file_path)

      // Automatically run Whisper speech transcription
      setIsTranscribing(true)
      try {
        const transRes = await api.transcribeMedia(demo.file_path)
        setTranscription(transRes)
        onToast({
          type: 'info',
          title: 'Whisper Transcription Ready',
          message: `Identified ${transRes.segments.length} speech segments (${transRes.language?.toUpperCase() || 'EN'}).`,
        })
      } catch (transErr: unknown) {
        console.warn('Transcription failed:', transErr)
      } finally {
        setIsTranscribing(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load realistic speech demo'
      onToast({
        type: 'error',
        title: 'Demo Load Failed',
        message: msg,
      })
    } finally {
      setIsLoadingRealisticDemo(false)
    }
  }

  // Explicit Whisper transcription trigger
  const handleTranscribeMedia = async (filePath?: string) => {
    const targetPath = filePath || uploadedFile?.file_path
    if (!targetPath) return

    setIsTranscribing(true)
    try {
      const transRes = await api.transcribeMedia(targetPath)
      setTranscription(transRes)
      onToast({
        type: 'info',
        title: 'Whisper AI Transcribed',
        message: `Transcribed ${transRes.segments.length} spoken segments.`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transcription failed'
      onToast({
        type: 'error',
        title: 'Transcription Failed',
        message: msg,
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  // Run silence detection
  const runSilenceAnalysis = async (filePath?: string) => {
    const targetPath = filePath || uploadedFile?.file_path
    if (!targetPath) return

    setIsAnalyzing(true)
    try {
      const result = await api.analyzeMedia(targetPath, {
        noiseThresholdDb,
        minSilenceS,
        paddingS: paddingMs / 1000,
      })
      setAnalysis(result)
      setExcludedIndices(new Set())

      onToast({
        type: 'info',
        title: 'Silences Detected',
        message: `Identified ${result.silence_intervals.length} pauses (${formatHumanDuration(result.potential_time_saved_s)} potential savings across ${result.keep_intervals.length} speech segments).`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Silence detection probe failed'
      onToast({
        type: 'error',
        title: 'Analysis Failed',
        message: msg,
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Active keep intervals (filtering out manually excluded speech segments)
  const activeKeepIntervals = useMemo<KeepInterval[]>(() => {
    if (!analysis) return []
    return analysis.keep_intervals.filter((_, idx) => !excludedIndices.has(idx))
  }, [analysis, excludedIndices])

  // Compute live potential time saved based on active intervals
  const totalDuration = analysis?.duration_s || uploadedFile?.duration_s || 0
  const activeRetainedDuration = useMemo(() => {
    return activeKeepIntervals.reduce((acc, curr) => acc + curr.duration, 0)
  }, [activeKeepIntervals])
  const activeTimeSaved = Math.max(0, totalDuration - activeRetainedDuration)
  const activeSavingsPercent = totalDuration > 0 ? ((activeTimeSaved / totalDuration) * 100).toFixed(1) : '0'

  // Toggle interval exclusion
  const toggleIntervalExclusion = (index: number) => {
    setExcludedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // Trigger media render
  const handleRenderMedia = async () => {
    if (!uploadedFile || activeKeepIntervals.length === 0 || isRendering) return

    setIsRendering(true)
    try {
      const req: MediaRenderRequest = {
        source_file: uploadedFile.file_path,
        keep_intervals: activeKeepIntervals,
        audio_dsp: audioDSP,
        use_hardware_accel: useHardwareAccel,
      }

      const job = await api.renderMedia(req)
      setActiveJob(job)
      onToast({
        type: 'info',
        title: 'Render Job Queued',
        message: `Rendering ${activeKeepIntervals.length} segments with Apple Silicon VideoToolbox & audio DSP...`,
      })
    } catch (err: unknown) {
      setIsRendering(false)
      const msg = err instanceof Error ? err.message : 'Failed to queue render job'
      onToast({
        type: 'error',
        title: 'Render Failed',
        message: msg,
      })
    }
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#090a0f] text-zinc-100">
      {/* Top Controls Header Bar */}
      <div className="border-b border-[#232738] bg-[#0d0f18] p-3 shrink-0 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Left Module Badge & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-700/60 flex items-center justify-center text-indigo-400 shrink-0">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-zinc-200 tracking-tight">
                Jump-Cut Editor & Audio Smoothing
              </h2>
              <span className="px-1.5 py-0.2 rounded bg-indigo-950/80 text-[10px] text-indigo-300 border border-indigo-800/60 font-mono">
                0.33ms Sync
              </span>
              <span className="hidden md:inline-flex px-1.5 py-0.2 rounded bg-emerald-950/80 text-[10px] text-emerald-300 border border-emerald-800/60 font-mono">
                VideoToolbox Hardware Accel
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              Zero-latency speech detection, 8ms micro-fades, and studio-grade broadcast loudness
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Audio DSP Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowDSPConfig(!showDSPConfig)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-sans transition-colors ${
              showDSPConfig
                ? 'bg-indigo-950/70 border-indigo-500/60 text-indigo-200'
                : 'bg-[#151826] border-[#282d42] text-zinc-300 hover:border-zinc-700'
            }`}
            title="Configure studio audio DSP chain & hardware acceleration"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Studio Voice DSP</span>
            <ChevronDown
              className={`w-3 h-3 text-zinc-400 transition-transform ${
                showDSPConfig ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Render History Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151826] hover:bg-[#1d2133] border border-[#282d42] text-xs text-zinc-300 transition-colors"
              title="Recent render jobs"
            >
              <History className="w-3.5 h-3.5 text-zinc-400" />
              <span>Jobs</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#202538] text-[10px] text-zinc-400 font-mono">
                {recentJobs.length}
              </span>
            </button>

            {showHistory && (
              <div className="absolute right-0 mt-1.5 w-80 max-h-96 overflow-y-auto bg-[#12141f] border border-[#2b3046] rounded-xl shadow-2xl z-30 p-2 space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-[#202538] flex justify-between items-center">
                  <span>Render History ({recentJobs.length})</span>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-zinc-500 hover:text-zinc-300 text-xs"
                  >
                    &times;
                  </button>
                </div>
                {recentJobs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-500">
                    No rendered jobs yet.
                  </div>
                ) : (
                  recentJobs.map((j) => (
                    <div
                      key={j.job_id}
                      onClick={() => {
                        setActiveJob(j)
                        setShowHistory(false)
                      }}
                      className={`p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                        activeJob?.job_id === j.job_id
                          ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-200'
                          : 'bg-[#151826]/60 border-transparent hover:bg-[#1a1e2f] text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="truncate max-w-[180px]">Job {j.job_id.substring(0, 8)}</span>
                        <span
                          className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded ${
                            j.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : j.status === 'failed'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                              : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                          }`}
                        >
                          {j.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                        <span>
                          {formatHumanDuration(j.processed_duration_s)} ({j.cuts_count} cuts)
                        </span>
                        <span className="text-emerald-400">
                          Saved {formatHumanDuration(j.time_saved_s)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Audio DSP Configuration Drawer */}
      {showDSPConfig && (
        <div className="border-b border-[#232738] bg-[#0c0e17] p-4 animate-in fade-in duration-150 shrink-0">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* 80Hz Highpass Filter */}
            <div className="bg-[#121522] border border-[#23273b] p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-400" />
                  Rumble Highpass
                </span>
                <span className="font-mono text-indigo-300">{audioDSP.highpass_hz} Hz</span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Eliminates room air-conditioning hum, plosives, and desk vibrations below 80 Hz.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="range"
                  min={40}
                  max={150}
                  step={5}
                  value={audioDSP.highpass_hz}
                  onChange={(e) =>
                    setAudioDSP((prev) => ({ ...prev, highpass_hz: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-500 h-1 bg-[#202538] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Spectral Denoise */}
            <div className="bg-[#121522] border border-[#23273b] p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Noise Suppression
                </span>
                <span className="font-mono text-indigo-300">{audioDSP.denoise_db} dB</span>
              </div>
              <p className="text-[10px] text-zinc-400">
                FFT frequency-domain spectral subtraction to remove steady background hiss.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="range"
                  min={-35}
                  max={-10}
                  step={1}
                  value={audioDSP.denoise_db}
                  onChange={(e) =>
                    setAudioDSP((prev) => ({ ...prev, denoise_db: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-500 h-1 bg-[#202538] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Presence Boost & Compression */}
            <div className="bg-[#121522] border border-[#23273b] p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  Presence & Dynamics
                </span>
                <label className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audioDSP.compression}
                    onChange={(e) =>
                      setAudioDSP((prev) => ({ ...prev, compression: e.target.checked }))
                    }
                    className="accent-indigo-500 rounded"
                  />
                  <span>Compress</span>
                </label>
              </div>
              <p className="text-[10px] text-zinc-400">
                +1.5 dB vocal presence EQ @ 3kHz and broadcast dynamics leveling for intelligibility.
              </p>
              <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-zinc-400">
                <span>Micro-Fades: {audioDSP.micro_fade_ms}ms</span>
                <span className="text-emerald-400">Zero Clicks</span>
              </div>
            </div>

            {/* YouTube Loudness & Hardware Accel */}
            <div className="bg-[#121522] border border-[#23273b] p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  Broadcast Normalization
                </span>
                <span className="font-mono text-emerald-400">{audioDSP.target_lufs} LUFS</span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Standard YouTube -16 LUFS integrated target with -1.5 dB True Peak ceiling.
              </p>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useHardwareAccel}
                    onChange={(e) => setUseHardwareAccel(e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>Apple Silicon Accel</span>
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">VideoToolbox</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Step 1: Media Dropzone & Uploaded File Card */}
        <div className="bg-[#10121d] border border-[#202538] rounded-xl p-4 shadow-sm">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0])
              }
            }}
            accept="video/*,audio/*,.mp4,.mov,.mkv,.webm,.mp3,.wav,.m4a,.aac"
            className="hidden"
          />

          {!uploadedFile ? (
            /* Upload Dropzone */
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0])
                }
              }}
              className="border-2 border-dashed border-[#2b3046] hover:border-indigo-500/70 bg-[#131624]/60 hover:bg-[#15192b] rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-600/40 flex items-center justify-center text-indigo-400">
                {isUploading ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-200">
                  {isUploading ? 'Uploading Media into Vault...' : 'Select or Drop Recording'}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Supports MP4, MOV, MKV, MP3, WAV, M4A raw spoken video or audio recording.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button
                  type="button"
                  disabled={isUploading || isLoadingDemo || isLoadingRealisticDemo}
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Browse Files
                </button>

                {/* Primary Demo Button: Realistic Script Demo (speech + awkward pauses + noise) */}
                <button
                  type="button"
                  disabled={isUploading || isLoadingDemo || isLoadingRealisticDemo}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLoadRealisticDemo()
                  }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-500/70 hover:border-indigo-400 text-indigo-200 hover:text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
                  title="Load a realistic recording of our Vault script with actual speech, room noise/hiss, and 2.5s awkward dead pauses"
                >
                  <Radio className={`w-3.5 h-3.5 ${isLoadingRealisticDemo ? 'animate-spin text-amber-400' : 'text-indigo-400'}`} />
                  <span>
                    {isLoadingRealisticDemo
                      ? 'Loading Speech & Transcribing...'
                      : 'Try Realistic Script Demo (Pauses + Noise)'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isUploading || isLoadingDemo || isLoadingRealisticDemo}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLoadDemo()
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1d2e] hover:bg-[#242940] border border-zinc-700 text-zinc-300 hover:text-zinc-200 text-xs font-medium transition-all shadow-sm cursor-pointer"
                  title="Load a 6-second synthetic test video clip with silent gaps"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isLoadingDemo ? 'animate-spin text-amber-300' : 'text-zinc-400'}`} />
                  <span>{isLoadingDemo ? 'Loading...' : 'Try 6s Synthetic Clip'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Uploaded Media Pill Card */
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-950/70 border border-indigo-700/60 flex items-center justify-center text-indigo-400 shrink-0">
                  {uploadedFile.has_video ? (
                    <Video className="w-5 h-5" />
                  ) : (
                    <FileAudio className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-zinc-200 font-mono truncate max-w-md">
                      {uploadedFile.filename}
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1c2033] text-zinc-400 border border-[#2b3046]">
                      {formatFileSize(uploadedFile.size_bytes)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                    <span>Duration: {formatDuration(uploadedFile.duration_s || 0)}</span>
                    {uploadedFile.has_video && (
                      <>
                        <span>&bull;</span>
                        <span>
                          {uploadedFile.width}x{uploadedFile.height} @ {uploadedFile.fps?.toFixed(1)}fps
                        </span>
                      </>
                    )}
                    <span>&bull;</span>
                    <span className="text-indigo-400">
                      {uploadedFile.has_video ? 'A/V Stream Synchronized' : 'Audio Stream'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Switch to Realistic Demo quickly */}
                <button
                  type="button"
                  disabled={isLoadingRealisticDemo}
                  onClick={handleLoadRealisticDemo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181d33] hover:bg-[#202744] border border-indigo-500/40 text-xs text-indigo-300 transition-colors"
                  title="Switch to realistic Vault script demo"
                >
                  <Radio className="w-3 h-3 text-indigo-400" />
                  <span>Realistic Demo</span>
                </button>

                {/* Transcribe if not yet transcribed */}
                {!transcription && (
                  <button
                    type="button"
                    disabled={isTranscribing}
                    onClick={() => handleTranscribeMedia()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181b2a] hover:bg-[#202538] border border-[#2b3046] text-xs text-zinc-300 transition-colors"
                  >
                    <Mic className="w-3 h-3 text-indigo-400" />
                    <span>{isTranscribing ? 'Transcribing...' : 'Transcribe (Whisper)'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-[#181b2a] hover:bg-[#202538] border border-[#2b3046] text-xs text-zinc-300 transition-colors"
                >
                  Change File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Silence & Jump-Cut Detection Tuning Panel */}
        {uploadedFile && (
          <div className="bg-[#10121d] border border-[#202538] rounded-xl p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  Silence & Jump-Cut Threshold Calibration
                </h3>
                <p className="text-[10px] text-zinc-500">
                  Tune threshold sensitivity to automatically detect natural breath pauses and eliminate dead air.
                </p>
              </div>

              <button
                type="button"
                onClick={() => runSilenceAnalysis()}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all shrink-0"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-amber-300' : ''}`} />
                <span>{isAnalyzing ? 'Detecting Pauses...' : 'Detect Silences & Cuts'}</span>
              </button>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
              {/* Noise Threshold Slider */}
              <div className="bg-[#131624] border border-[#23283d] p-3 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Noise Gate Ceiling:</span>
                  <span className="font-mono text-indigo-300 font-semibold">{noiseThresholdDb} dB</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={-15}
                  step={1}
                  value={noiseThresholdDb}
                  onChange={(e) => setNoiseThresholdDb(Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-[#202538] rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>-50 dB (Sensitive)</span>
                  <span>-15 dB (Aggressive)</span>
                </div>
              </div>

              {/* Min Silence Duration Slider */}
              <div className="bg-[#131624] border border-[#23283d] p-3 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Min Pause Duration:</span>
                  <span className="font-mono text-indigo-300 font-semibold">{minSilenceS.toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1.5}
                  step={0.05}
                  value={minSilenceS}
                  onChange={(e) => setMinSilenceS(Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-[#202538] rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>0.20s (Fast cuts)</span>
                  <span>1.50s (Long pauses)</span>
                </div>
              </div>

              {/* Speech Safety Padding Slider */}
              <div className="bg-[#131624] border border-[#23283d] p-3 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Speech Head/Tail Padding:</span>
                  <span className="font-mono text-indigo-300 font-semibold">{paddingMs}ms</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={250}
                  step={10}
                  value={paddingMs}
                  onChange={(e) => setPaddingMs(Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-[#202538] rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>20ms (Tight)</span>
                  <span>250ms (Spacious)</span>
                </div>
              </div>
            </div>

            {/* Analysis Telemetry Summary Cards */}
            {analysis && (
              <div className="pt-2 border-t border-[#1e2235] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* Original Duration */}
                <div className="bg-[#131624] p-2.5 rounded-lg border border-[#21263a]">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Original Duration</span>
                  <div className="text-sm font-semibold font-mono text-zinc-200 mt-0.5">
                    {formatDuration(analysis.duration_s)}
                  </div>
                </div>

                {/* Retained Speech */}
                <div className="bg-[#131624] p-2.5 rounded-lg border border-[#21263a]">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Retained Speech</span>
                  <div className="text-sm font-semibold font-mono text-emerald-300 mt-0.5">
                    {formatDuration(activeRetainedDuration)}
                  </div>
                </div>

                {/* Time Saved */}
                <div className="bg-[#131624] p-2.5 rounded-lg border border-emerald-800/40 bg-emerald-950/20">
                  <span className="text-[10px] text-emerald-400 font-mono uppercase">Time Saved</span>
                  <div className="text-sm font-semibold font-mono text-emerald-300 mt-0.5 flex items-center gap-1.5">
                    <span>{formatHumanDuration(activeTimeSaved)}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-900/60 text-emerald-300">
                      -{activeSavingsPercent}%
                    </span>
                  </div>
                </div>

                {/* Cuts Count */}
                <div className="bg-[#131624] p-2.5 rounded-lg border border-[#21263a]">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Total Cuts</span>
                  <div className="text-sm font-semibold font-mono text-indigo-300 mt-0.5">
                    {Math.max(0, activeKeepIntervals.length - 1)} jump-cuts
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Interactive Proportional Timeline Bar */}
        {analysis && totalDuration > 0 && (
          <div className="bg-[#10121d] border border-[#202538] rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Timeline Visualization & Cut Boundaries
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  Green = Kept Speech &bull; Dark Red = Cut Silence Gap
                </span>
              </div>

              {hoveredInterval ? (
                <div className="font-mono text-[11px] text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/60 animate-in fade-in">
                  {hoveredInterval.label}: {formatDuration(hoveredInterval.start)} &rarr;{' '}
                  {formatDuration(hoveredInterval.end)} ({hoveredInterval.duration.toFixed(2)}s)
                </div>
              ) : (
                <div className="text-[10px] font-mono text-zinc-500">
                  Hover over blocks to inspect cut timestamps
                </div>
              )}
            </div>

            {/* Proportional Timeline Bar */}
            <div className="relative w-full h-9 bg-[#141624] rounded-lg border border-[#282d42] overflow-hidden flex select-none">
              {/* Silence Blocks (Striped red background layer) */}
              {analysis.silence_intervals.map((silence, idx) => {
                const leftPct = (silence.start_time / totalDuration) * 100
                const widthPct = (silence.duration / totalDuration) * 100
                return (
                  <div
                    key={`silence-${idx}`}
                    onMouseEnter={() =>
                      setHoveredInterval({
                        type: 'silence',
                        start: silence.start_time,
                        end: silence.end_time,
                        duration: silence.duration,
                        label: `Cut Silence #${idx + 1}`,
                      })
                    }
                    onMouseLeave={() => setHoveredInterval(null)}
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(0.3, widthPct)}%`,
                    }}
                    className="absolute top-0 bottom-0 bg-rose-950/70 border-x border-rose-800/40 hover:bg-rose-900 transition-colors cursor-crosshair"
                  />
                )
              })}

              {/* Keep Intervals (Vibrant Emerald speech blocks) */}
              {analysis.keep_intervals.map((keep, idx) => {
                const leftPct = (keep.start_time / totalDuration) * 100
                const widthPct = (keep.duration / totalDuration) * 100
                const isExcluded = excludedIndices.has(idx)

                return (
                  <div
                    key={`keep-${idx}`}
                    onClick={() => toggleIntervalExclusion(idx)}
                    onMouseEnter={() =>
                      setHoveredInterval({
                        type: 'keep',
                        start: keep.start_time,
                        end: keep.end_time,
                        duration: keep.duration,
                        label: `${isExcluded ? 'Excluded' : 'Kept'} Speech #${idx + 1}`,
                      })
                    }
                    onMouseLeave={() => setHoveredInterval(null)}
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(0.3, widthPct)}%`,
                    }}
                    className={`absolute top-0 bottom-0 border-x transition-colors cursor-pointer ${
                      isExcluded
                        ? 'bg-zinc-800/60 border-zinc-700/50 opacity-40'
                        : 'bg-emerald-600/90 hover:bg-emerald-500 border-emerald-400/40 shadow-sm'
                    }`}
                  />
                )
              })}
            </div>

            {/* Time markers bar */}
            <div className="flex justify-between text-[10px] font-mono text-zinc-500 px-0.5">
              <span>00:00.0</span>
              <span>{formatDuration(totalDuration * 0.25)}</span>
              <span>{formatDuration(totalDuration * 0.5)}</span>
              <span>{formatDuration(totalDuration * 0.75)}</span>
              <span>{formatDuration(totalDuration)}</span>
            </div>

            {/* Segment Exclusion Checklist (Collapsible / Compact) */}
            <div className="pt-2 border-t border-[#1e2235]">
              <div className="flex items-center justify-between text-[11px] mb-2">
                <span className="text-zinc-400 font-medium">
                  Speech Segments ({activeKeepIntervals.length} of {analysis.keep_intervals.length} active):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExcludedIndices(new Set())}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono underline"
                  >
                    Select All
                  </button>
                  <span className="text-zinc-600">&bull;</span>
                  <button
                    type="button"
                    onClick={() => {
                      const all = new Set<number>()
                      analysis.keep_intervals.forEach((_, i) => all.add(i))
                      setExcludedIndices(all)
                    }}
                    className="text-[10px] text-zinc-400 hover:text-zinc-300 font-mono underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Scrollable Chip Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-h-24 flex-wrap">
                {analysis.keep_intervals.map((k, idx) => {
                  const isExcluded = excludedIndices.has(idx)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleIntervalExclusion(idx)}
                      className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 border transition-all ${
                        isExcluded
                          ? 'bg-[#121420] text-zinc-500 border-[#222638] line-through'
                          : 'bg-emerald-950/50 text-emerald-300 border-emerald-700/60 hover:border-emerald-500'
                      }`}
                      title={`Click to ${isExcluded ? 'keep' : 'cut'} this segment`}
                    >
                      <span className="font-sans font-medium">#{idx + 1}:</span>
                      <span>
                        {formatDuration(k.start_time)} - {formatDuration(k.end_time)}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-sans">({k.duration.toFixed(1)}s)</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3b: Whisper AI Speech Transcription & Dead-Pause Inspector */}
        {(transcription || isTranscribing) && (
          <div className="bg-[#10121d] border border-[#202538] rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-indigo-400" />
                  Whisper AI Transcription & Dead-Pause Analysis
                </span>
                {transcription?.language && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-indigo-950/70 text-indigo-300 border border-indigo-800/60">
                    Language: {transcription.language.toUpperCase()}
                  </span>
                )}
                {transcription && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                    {transcription.text.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                )}
              </div>

              {isTranscribing ? (
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                  <span>Transcribing with Whisper AI...</span>
                </div>
              ) : (
                <div className="text-[10px] font-mono text-zinc-400">
                  {transcription?.segments.length || 0} timestamped segments detected
                </div>
              )}
            </div>

            {/* Segment & Awkward Pause Flow */}
            {transcription && (
              <div className="space-y-2 pt-1">
                {transcription.segments.map((seg, idx) => {
                  const prevSeg = idx > 0 ? transcription.segments[idx - 1] : null
                  const gapBefore = prevSeg ? seg.start - prevSeg.end : (seg.start > 1.5 ? seg.start : 0)

                  return (
                    <React.Fragment key={`whisper-seg-${seg.id}-${idx}`}>
                      {/* Highlight awkward dead pause if gap > 1.5s */}
                      {gapBefore >= 1.5 && (
                        <div className="p-2.5 bg-rose-950/30 border border-rose-800/50 rounded-lg flex items-center justify-between text-xs text-rose-300 font-mono animate-in fade-in">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                            <span className="font-semibold text-rose-200">
                              ⚠️ Awkward Dead Pause: {gapBefore.toFixed(2)}s
                            </span>
                            <span className="text-[11px] text-rose-400/80 font-sans hidden sm:inline">
                              (dead air & room noise detected between spoken thoughts)
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-rose-900/60 border border-rose-700/60 text-[10px] font-semibold text-rose-200 uppercase tracking-wider">
                            Trimmed in Jump-Cut
                          </span>
                        </div>
                      )}

                      {/* Spoken Speech Segment Card */}
                      <div className="p-3 bg-[#131626] border border-[#232840] hover:border-indigo-500/40 rounded-lg transition-all flex items-start gap-3 text-xs">
                        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                          <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                            #{idx + 1}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-500">
                            {(seg.end - seg.start).toFixed(1)}s
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 font-mono text-[10px] text-indigo-400">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            <span>
                              [{formatDuration(seg.start)} &rarr; {formatDuration(seg.end)}]
                            </span>
                          </div>
                          <p className="text-zinc-200 text-xs leading-relaxed font-sans select-text">
                            "{seg.text}"
                          </p>
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Render Execution & Live Progress */}
        {analysis && (
          <div className="bg-[#10121d] border border-[#202538] rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  Hardware-Accelerated Render Engine
                </h3>
                <p className="text-[10px] text-zinc-500">
                  Executes VideoToolbox cut pipeline with 8ms anti-pop crossfades, FFT noise gate, EQ, and YouTube -16 LUFS normalizer.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRenderMedia}
                disabled={isRendering || activeKeepIntervals.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-950/50 transition-all shrink-0"
              >
                {isRendering ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rendering Cuts ({activeJob?.status || 'Processing'})...</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>Render Jump-Cut Media ({formatHumanDuration(activeRetainedDuration)})</span>
                  </>
                )}
              </button>
            </div>

            {/* Active Job Progress Display */}
            {activeJob && (
              <div className="bg-[#141624] border border-[#282d42] rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">
                      Job Status: <span className="font-mono text-indigo-400 uppercase">{activeJob.status}</span>
                    </span>
                    {activeJob.status === 'completed' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {activeJob.status === 'failed' && (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400">
                    ID: {activeJob.job_id.substring(0, 12)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-[#1d2136] rounded-full overflow-hidden">
                  <div
                    style={{
                      width:
                        activeJob.status === 'completed'
                          ? '100%'
                          : activeJob.status === 'cutting'
                          ? '65%'
                          : activeJob.status === 'analyzing'
                          ? '30%'
                          : '10%',
                    }}
                    className={`h-full transition-all duration-500 ${
                      activeJob.status === 'completed'
                        ? 'bg-emerald-500'
                        : activeJob.status === 'failed'
                        ? 'bg-rose-500'
                        : 'bg-indigo-500 animate-pulse'
                    }`}
                  />
                </div>

                {/* Live Telemetry / Result Summary */}
                {activeJob.status === 'completed' && (
                  <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs border-t border-[#202538] mt-2">
                    <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-300">
                      <span className="text-emerald-300">
                        ✓ Output: {formatHumanDuration(activeJob.processed_duration_s)}
                      </span>
                      <span>&bull;</span>
                      <span className="text-zinc-400">{activeJob.cuts_count} cuts</span>
                      <span>&bull;</span>
                      <span className="text-emerald-400">
                        Saved {formatHumanDuration(activeJob.time_saved_s)}
                      </span>
                    </div>

                    <a
                      href={api.getMediaDownloadUrl(activeJob.job_id)}
                      download
                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Processed File</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Processed Media HTML5 Preview Player & Subjective A/B Recovery Switch */}
        {activeJob && activeJob.status === 'completed' && (
          <div className="bg-[#10121d] border border-[#202538] rounded-xl p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  A/B Subjective Transformation & Recovery Player
                </h3>
                <p className="text-[10px] text-zinc-500">
                  Switch between the unedited master recording and the jump-cut render to hear the audio recovery.
                </p>
              </div>

              {/* A/B Switch Control */}
              <div className="flex items-center p-1 bg-[#141626] border border-[#262b42] rounded-lg">
                <button
                  type="button"
                  onClick={() => setPlayerMode('cleaned')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    playerMode === 'cleaned'
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1e32]'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Play Jump-Cut (Clean & Paced)</span>
                  <span className="text-[10px] font-mono opacity-80">
                    ({formatHumanDuration(activeJob.processed_duration_s)})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlayerMode('raw')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    playerMode === 'raw'
                      ? 'bg-amber-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1e32]'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Play Original Raw (With Pauses & Hiss)</span>
                  <span className="text-[10px] font-mono opacity-80">
                    ({formatHumanDuration(uploadedFile?.duration_s || activeJob.original_duration_s)})
                  </span>
                </button>
              </div>
            </div>

            {/* A/B Status Notice Banner */}
            {playerMode === 'cleaned' ? (
              <div className="px-3.5 py-2 bg-emerald-950/30 border border-emerald-800/40 rounded-lg flex items-center justify-between text-xs text-emerald-300 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Playing Cleaned Output:</strong> All dead pauses excised, 8ms anti-pop crossfades, highpass filter, and -16 LUFS loudness active.
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 font-semibold uppercase px-2 py-0.5 rounded bg-emerald-900/40 border border-emerald-700/50 shrink-0">
                  Saved {formatHumanDuration(activeJob.time_saved_s)}
                </span>
              </div>
            ) : (
              <div className="px-3.5 py-2 bg-amber-950/30 border border-amber-800/40 rounded-lg flex items-center justify-between text-xs text-amber-300 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Playing Original Raw Master:</strong> Notice awkward 2.5s dead air pauses, vocal hesitation, and ambient room noise.
                  </span>
                </div>
                <span className="font-mono text-[10px] text-amber-400 font-semibold uppercase px-2 py-0.5 rounded bg-amber-900/40 border border-amber-700/50 shrink-0">
                  Unedited Master
                </span>
              </div>
            )}

            {/* Media Player Container */}
            {uploadedFile?.has_video ? (
              <div className="rounded-lg overflow-hidden bg-black max-w-2xl mx-auto border border-[#252a3f]">
                <video
                  key={`player-${playerMode}-${activeJob.job_id}`}
                  controls
                  autoPlay
                  src={
                    playerMode === 'cleaned'
                      ? api.getMediaDownloadUrl(activeJob.job_id)
                      : api.getMediaRawUrl(uploadedFile ? uploadedFile.file_path : activeJob.output_file || '')
                  }
                  className="w-full max-h-[380px] object-contain"
                />
              </div>
            ) : (
              <div className="p-4 bg-[#141624] border border-[#282d42] rounded-lg max-w-xl mx-auto flex flex-col items-center gap-3">
                <Volume2 className="w-8 h-8 text-indigo-400" />
                <audio
                  key={`player-${playerMode}-${activeJob.job_id}`}
                  controls
                  autoPlay
                  src={
                    playerMode === 'cleaned'
                      ? api.getMediaDownloadUrl(activeJob.job_id)
                      : api.getMediaRawUrl(uploadedFile ? uploadedFile.file_path : activeJob.output_file || '')
                  }
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
