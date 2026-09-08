import React, { useRef, useState } from 'react'
import {
  Play,
  Copy,
  Check,
  Download,
  Trash2,
  Clock,
  Zap,
  Cpu,
  Layers,
  FileText,
  BookmarkCheck,
  Code2,
  Database,
  Scissors,
  MonitorPlay,
} from 'lucide-react'
import type { AtomicFact, VideoScript } from '../../types'
import { TeleprompterModal } from './TeleprompterModal'

interface ScriptReaderProps {
  script: VideoScript | null
  factsMap?: Record<string, AtomicFact>
  onDeleteScript?: (scriptId: string) => void
  onSelectFact?: (factId: string) => void
  onNavigateToMedia?: () => void
  onNavigateToPresentation?: (scriptId: string) => void
}

export const ScriptReader: React.FC<ScriptReaderProps> = ({
  script,
  factsMap = {},
  onDeleteScript,
  onSelectFact,
  onNavigateToMedia,
  onNavigateToPresentation,
}) => {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'reader' | 'markdown'>('reader')
  const [isPrompterOpen, setIsPrompterOpen] = useState(false)
  const [activeFactPreview, setActiveFactPreview] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDeleteClick = () => {
    if (confirmDelete) {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
      setConfirmDelete(false)
      onDeleteScript?.(script?.script_id || '')
    } else {
      setConfirmDelete(true)
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmDelete(false)
      }, 3000)
    }
  }

  if (!script) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center p-8 text-zinc-500 text-xs">
        <FileText className="w-12 h-12 text-zinc-700 mb-3 stroke-[1.5]" />
        <h3 className="font-semibold text-zinc-300 text-sm">No Script Selected</h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          Select an episode and generate a teleprompter-ready 750–1000 word video script with paced visual cues.
        </p>
      </div>
    )
  }

  // Check 5-7 min pacing calibration (750 - 1000 words @ 140 WPM)
  const isPacingCalibrated =
    script.total_word_count >= 700 && script.total_word_count <= 1050

  const handleCopy = () => {
    navigator.clipboard.writeText(script.full_script_markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([script.full_script_markdown], {
      type: 'text/markdown;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeName = script.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    link.href = url
    link.setAttribute('download', `${safeName || 'video-script'}.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Calculate cumulative timestamps for the 5 sections
  let runningSeconds = 0
  const sectionsWithTimestamps = script.sections.map((sec) => {
    const startSec = runningSeconds
    runningSeconds += sec.target_duration_seconds
    const mins = Math.floor(startSec / 60)
    const secs = startSec % 60
    const ts = `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`
    return {
      ...sec,
      timestamp: ts,
    }
  })

  return (
    <div className="flex flex-col h-full bg-[#0a0c13] overflow-hidden">
      {/* Script Header Bar */}
      <div className="p-4 border-b border-[#232738] bg-[#111420] space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 font-semibold">
                Episode Teleprompter Script
              </span>
              <span className="text-zinc-500 font-mono text-xs">{script.script_id}</span>
              {script.arc_id && (
                <span className="text-zinc-500 font-mono text-[11px]">
                  • Arc: {script.arc_id}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
              {script.title}
            </h2>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {/* Launch Teleprompter Primary Button */}
            <button
              onClick={() => setIsPrompterOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              title="Launch distraction-free auto-scrolling Teleprompter"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Teleprompter</span>
            </button>

            {/* Open in Slide Engine Action Button */}
            {onNavigateToPresentation && (
              <button
                type="button"
                onClick={() => onNavigateToPresentation(script.script_id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#181d33] hover:bg-[#232b49] border border-indigo-500/50 hover:border-indigo-400 text-indigo-300 hover:text-white text-xs font-semibold shadow-md transition-all shrink-0 cursor-pointer"
                title="Open this script in Module 5 Synced Slide Engine"
              >
                <MonitorPlay className="w-3.5 h-3.5 text-indigo-400" />
                <span>Open in Slide Engine</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#0d0f17] p-0.5 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveTab('reader')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'reader'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Script Reader
              </button>
              <button
                onClick={() => setActiveTab('markdown')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  activeTab === 'markdown'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>Raw Markdown</span>
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#181b28] hover:bg-[#202538] border border-zinc-700/80 text-xs text-zinc-200 transition-colors"
              title="Copy Teleprompter Markdown"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-mono text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="font-mono text-[11px]">Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#181b28] hover:bg-[#202538] border border-zinc-700/80 text-xs text-zinc-200 transition-colors"
              title="Export Markdown File"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px]">Export</span>
            </button>

            {onNavigateToMedia && (
              <button
                onClick={onNavigateToMedia}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all shrink-0"
                title="Open Jump-Cut Audio/Video Editor to trim silences and polish audio"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Open in Jump-Cut Studio</span>
              </button>
            )}

            {onDeleteScript && (
              <button
                onClick={handleDeleteClick}
                className={`px-2 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1 ${
                  confirmDelete
                    ? 'bg-rose-600 text-white border border-rose-500 animate-pulse font-semibold'
                    : 'hover:bg-rose-950 text-zinc-500 hover:text-rose-400 border border-transparent'
                }`}
                title={confirmDelete ? 'Click again to permanently delete script' : 'Delete script'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {confirmDelete && <span>Confirm?</span>}
              </button>
            )}
          </div>
        </div>

        {/* Telemetry & Pacing Stats Bar */}
        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-3 text-xs text-zinc-400 flex-wrap font-mono">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-zinc-200">
              <BookmarkCheck className="w-3.5 h-3.5 text-indigo-400" />
              <strong>{script.total_word_count}</strong> Words
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-zinc-200">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <strong>~{script.estimated_speaking_minutes.toFixed(1)}</strong> mins @ 140 WPM
            </span>
            <span>•</span>
            {/* Pacing Badge */}
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                isPacingCalibrated
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
              }`}
            >
              {isPacingCalibrated ? 'Pacing: 5–7 min target ✅' : 'Pacing: Calibrated'}
            </span>
          </div>

          {/* AI Model Attribution */}
          {script.ai_metadata && (
            <span
              className={`flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded border ${
                script.ai_metadata.fallback_occurred
                  ? 'bg-amber-950/60 text-amber-300 border-amber-600/60'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
              }`}
            >
              {script.ai_metadata.fallback_occurred ? (
                <Zap className="w-3 h-3 text-amber-400" />
              ) : (
                <Cpu className="w-3 h-3 text-emerald-400" />
              )}
              <span>{script.ai_metadata.model}</span>
              {script.ai_metadata.duration_ms > 0 && (
                <span className="text-zinc-500">({script.ai_metadata.duration_ms}ms)</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 select-text">
        {activeTab === 'markdown' ? (
          <textarea
            readOnly
            value={script.full_script_markdown}
            className="w-full h-full min-h-[500px] bg-[#0c0e17] border border-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-200 leading-relaxed focus:outline-none resize-none"
          />
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto pb-12">
            {/* Visceral 15s Hook Callout */}
            {script.hook_text && (
              <div className="border-l-3 border-amber-500 bg-amber-950/20 rounded-r-xl p-4 space-y-1.5 shadow-md">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-300 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>15-Second Opening Hook (Agitate the Pain)</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">[00:00 - 00:15]</span>
                </div>
                <p className="text-sm text-zinc-100 italic font-mono leading-relaxed pl-1">
                  "{script.hook_text}"
                </p>
              </div>
            )}

            {/* 5 Pedagogical Script Sections */}
            <div className="space-y-4">
              {sectionsWithTimestamps.map((sec, idx) => (
                <div
                  key={idx}
                  className="bg-[#12141f] border border-[#232738] hover:border-zinc-700 rounded-xl p-4 space-y-3 transition-colors shadow-sm"
                >
                  {/* Section Title Bar with Timestamp & Pacing */}
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/60">
                        {sec.timestamp}
                      </span>
                      <h4 className="font-semibold text-sm text-white font-sans tracking-tight">
                        {sec.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                      <span>{sec.target_duration_seconds}s</span>
                      <span>•</span>
                      <span>{sec.estimated_wpm} WPM</span>
                    </div>
                  </div>

                  {/* Visual Cue Presentation Banner */}
                  {sec.visual_cue && (
                    <div className="p-2.5 rounded-lg bg-[#0c1424] border border-cyan-500/40 text-cyan-300 font-mono text-xs leading-relaxed flex items-start gap-2 shadow-sm">
                      <span className="font-bold text-cyan-400 uppercase text-[10px] tracking-wider shrink-0 mt-0.5">
                        [VISUAL]:
                      </span>
                      <span>{sec.visual_cue}</span>
                    </div>
                  )}

                  {/* Spoken Text Delivery */}
                  <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap select-text pl-1">
                    {sec.spoken_text}
                  </div>
                </div>
              ))}
            </div>

            {/* Grounded Fact Citations Bar */}
            {script.key_facts_referenced?.length > 0 && (
              <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Grounded Vault Fact Citations ({script.key_facts_referenced.length})</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">Click pill to preview evidence quote</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {script.key_facts_referenced.map((factId) => {
                    const fact = factsMap[factId]
                    const isPreviewing = activeFactPreview === factId

                    return (
                      <div key={factId} className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectFact) onSelectFact(factId)
                            setActiveFactPreview(isPreviewing ? null : factId)
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors flex items-center gap-1 ${
                            isPreviewing
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                              : 'bg-[#181b28] hover:bg-[#202538] text-indigo-300 border-[#2b3047]'
                          }`}
                        >
                          <Layers className="w-2.5 h-2.5 text-indigo-400" />
                          <span>{factId}</span>
                        </button>

                        {/* Evidence Popover */}
                        {isPreviewing && (
                          <div className="absolute bottom-full left-0 mb-2 w-80 p-3 rounded-lg bg-[#141724] border border-[#2b3047] shadow-2xl z-30 text-left space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-800 pb-1 font-mono">
                              <span className="text-indigo-400 font-semibold">{factId}</span>
                              {fact?.category && (
                                <span className="uppercase text-[9px] px-1 bg-zinc-800 rounded">
                                  {fact.category}
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-zinc-200 font-sans leading-relaxed">
                              {fact?.statement || 'Statement stored in Fact Vault.'}
                            </div>

                            {fact?.exact_quote && (
                              <div className="border-l-2 border-indigo-500 bg-indigo-950/30 p-1.5 rounded-r text-[10px] italic font-mono text-zinc-300">
                                "{fact.exact_quote}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Teleprompter Fullscreen Modal */}
      <TeleprompterModal
        script={script}
        isOpen={isPrompterOpen}
        onClose={() => setIsPrompterOpen(false)}
        initialWpm={145}
      />
    </div>
  )
}
