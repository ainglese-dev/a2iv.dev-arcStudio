import React, { useState } from 'react'
import {
  ScrollText,
  Zap,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Clock,
  Eye,
  FileText,
  MonitorPlay,
  RotateCcw,
} from 'lucide-react'
import { api } from '../../../services/api'
import type {
  ProjectSummary,
  ProjectVision,
  ToastItem,
  VideoEpisode,
  VideoScript,
} from '../../../types'
import { TeleprompterModal } from '../../scripts/TeleprompterModal'

export interface Stage3ScriptProps {
  activeProject: ProjectSummary | null
  activeVision: ProjectVision | null
  selectedEpisode: VideoEpisode | null
  arcId?: string | null
  script: VideoScript | null
  onScriptChange: (script: VideoScript) => void
  onBack: () => void
  onAdvance: () => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
}

export const Stage3Script: React.FC<Stage3ScriptProps> = ({
  activeVision,
  selectedEpisode,
  arcId,
  script,
  onScriptChange,
  onBack,
  onAdvance,
  onToast,
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false)

  const episodeId = selectedEpisode?.episode_id || 'ep_01'
  const episodeTitle = selectedEpisode?.title || 'Episode 1'

  const handleGenerateScript = async () => {
    setIsGenerating(true)
    try {
      const genScript = await api.generateScript({
        episode_id: episodeId,
        arc_id: arcId || null,
        wpm_target: 145,
        speaking_style:
          activeVision?.tone_and_style ||
          'Trench practitioner engineer with high information density',
      })
      onScriptChange(genScript)
      onToast?.({
        type: 'success',
        title: 'Teleprompter Script Drafted',
        message: `Generated ${genScript.total_word_count} words (~${genScript.estimated_speaking_minutes.toFixed(1)} mins spoken).`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate script.'
      onToast?.({
        type: 'error',
        title: 'Script Generation Error',
        message: msg,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Word budget calculations (750 - 1000 words target)
  const wordCount = script?.total_word_count || 0
  const isBudgetMet = wordCount >= 750 && wordCount <= 1000
  const isBudgetNear = wordCount >= 600 && wordCount <= 1200

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#090a0f] text-zinc-100">
      {/* Scrollable Stage Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
        {!script ? (
          /* Empty State / 1-Click Generate Card */
          <div className="p-8 rounded-2xl bg-[#12141f] border border-[#232738] text-center space-y-4 shadow-xl flex flex-col items-center justify-center my-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ScrollText className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Draft Spoken Teleprompter Script
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Generate a 750–1,000 word practitioner teleprompter script for{' '}
                <span className="text-white font-medium">"{episodeTitle}"</span> with clear visual
                anchors and high information density.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateScript}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xl shadow-indigo-950/40 transition-all hover:scale-[1.02] cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Drafting Spoken Script with AI Router...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white/20" />
                  <span>⚡ 1-Click Write Teleprompter Script</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Script Header & Word Budget Bar */}
            <div className="p-5 rounded-2xl bg-[#12141f] border border-[#232738] space-y-4 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase font-semibold">
                      Spoken Script
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Target: 750–1,000 words
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" /> ~
                      {script.estimated_speaking_minutes.toFixed(1)} mins @ 145 WPM
                    </span>
                  </div>
                  <h1 className="text-lg font-bold text-white tracking-tight">{script.title}</h1>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsTeleprompterOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Launch Teleprompter</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateScript}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#181b2a] hover:bg-[#22263d] border border-[#292f49] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                    title="Regenerate script"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              {/* Word Count Budget Indicator */}
              <div className="pt-2 border-t border-[#1e2235] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">Word Count Budget:</span>
                    <span
                      className={`font-semibold ${
                        isBudgetMet
                          ? 'text-emerald-400'
                          : isBudgetNear
                          ? 'text-amber-400'
                          : 'text-zinc-300'
                      }`}
                    >
                      {wordCount} words
                    </span>
                    <span className="text-zinc-500">
                      ({script.estimated_speaking_minutes.toFixed(1)} spoken mins)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      isBudgetMet
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : isBudgetNear
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {isBudgetMet
                      ? '✓ Guardrail Met (750-1,000w)'
                      : isBudgetNear
                      ? '⚡ Near Target Budget'
                      : 'Word Budget Calibrated'}
                  </span>
                </div>

                {/* Progress Visual */}
                <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isBudgetMet
                        ? 'bg-emerald-500'
                        : isBudgetNear
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((wordCount / 1000) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Spoken Script Sections Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" /> Script Sections & Visual Anchors
                </h2>
                <span className="text-[10px] font-mono text-zinc-500">
                  {script.sections?.length || 0} Teleprompter Sections
                </span>
              </div>

              <div className="space-y-3">
                {script.sections?.map((section, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#10121d] border border-[#202538] hover:border-zinc-700 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold">
                          Section {idx + 1}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase">
                          {section.section_type}
                        </span>
                        <span className="text-xs font-semibold text-white">{section.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" /> ~{section.target_duration_seconds}s
                      </span>
                    </div>

                    {/* Spoken text paragraph */}
                    <p className="text-xs text-zinc-200 leading-relaxed font-sans pl-2 border-l-2 border-indigo-500/40">
                      {section.spoken_text}
                    </p>

                    {/* Visual Cue Marker */}
                    {section.visual_cue && (
                      <div className="p-2 rounded-lg bg-[#0e101a] border border-[#1e2235] text-[11px] font-mono text-indigo-300 flex items-center gap-2">
                        <MonitorPlay className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">Visual Cue: {section.visual_cue}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Sticky Action Dock */}
      <footer className="h-16 px-6 bg-[#0c0e16] border-t border-[#232738] flex items-center justify-between z-20 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#141725] hover:bg-[#1a1e30] border border-[#23273c] text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Curriculum</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="font-mono text-indigo-300 font-semibold">Stage 3 of 4</span>
          {script && (
            <>
              <span>•</span>
              <span>{script.total_word_count} Words Drafted</span>
              <span>•</span>
              <span>~{script.estimated_speaking_minutes.toFixed(1)} mins spoken</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onAdvance}
          disabled={!script}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-950/40 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <span>Build 16:9 Presentation Deck</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </footer>

      {/* Fullscreen Teleprompter Modal */}
      {script && (
        <TeleprompterModal
          script={script}
          isOpen={isTeleprompterOpen}
          onClose={() => setIsTeleprompterOpen(false)}
          initialWpm={145}
        />
      )}
    </div>
  )
}
