import React, { useRef, useState } from 'react'
import {
  MonitorPlay,
  Zap,
  ArrowLeft,
  Loader2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Terminal,
  Layout,
  Eye,
  Wrench,
} from 'lucide-react'
import { api } from '../../../services/api'
import type {
  PresentationDeck,
  PresentationSlide,
  ProjectSummary,
  ToastItem,
  VideoScript,
} from '../../../types'
import { TeleprompterModal } from '../../scripts/TeleprompterModal'

export interface Stage4PresentationProps {
  activeProject: ProjectSummary | null
  script: VideoScript | null
  deck: PresentationDeck | null
  onDeckChange: (deck: PresentationDeck) => void
  onBack: () => void
  onOpenTeleprompter?: () => void
  onOpenStudio: () => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
}

export const Stage4Presentation: React.FC<Stage4PresentationProps> = ({
  script,
  deck,
  onDeckChange,
  onBack,
  onOpenTeleprompter,
  onOpenStudio,
  onToast,
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [activeVariant, setActiveVariant] = useState<'A' | 'B'>('A')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false)

  const slideStageRef = useRef<HTMLDivElement>(null)

  const handleGenerateDeck = async () => {
    if (!script?.script_id) {
      onToast?.({
        type: 'error',
        title: 'Script Required',
        message: 'Please write a teleprompter script before generating slides.',
      })
      return
    }

    setIsGenerating(true)
    try {
      const genDeck = await api.generatePresentation(script.script_id)
      onDeckChange(genDeck)
      setCurrentSlideIndex(0)
      onToast?.({
        type: 'success',
        title: 'Presentation Deck Generated',
        message: `Built ${genDeck.total_slides} slides with dual visual themes.`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate presentation deck.'
      onToast?.({
        type: 'error',
        title: 'Slide Deck Error',
        message: msg,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleFullscreen = () => {
    if (!slideStageRef.current) return
    if (!document.fullscreenElement) {
      slideStageRef.current.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const slides = deck?.slides || []
  const currentSlide: PresentationSlide | undefined = slides[currentSlideIndex]
  const currentVariantData =
    activeVariant === 'A' ? currentSlide?.variant_a : currentSlide?.variant_b

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#090a0f] text-zinc-100">
      {/* Scrollable Stage Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
        {!deck ? (
          /* Empty State / 1-Click Generate Deck */
          <div className="p-8 rounded-2xl bg-[#12141f] border border-[#232738] text-center space-y-4 shadow-xl flex flex-col items-center justify-center my-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <MonitorPlay className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Synthesize 16:9 Dual-Variant Slide Deck
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Generate synchronized 16:9 slide decks aligned with teleprompter timing markers.
                Features Terminal Dark & Clean Infographic variants with zero cognitive clutter.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateDeck}
              disabled={isGenerating || !script}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-xl shadow-indigo-950/40 transition-all hover:scale-[1.02] cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating 16:9 Slide Deck with AI Router...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white/20" />
                  <span>⚡ 1-Click Generate Slide Deck</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Bar: Deck Info, Variant Switcher & Actions */}
            <div className="p-4 rounded-2xl bg-[#12141f] border border-[#232738] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase font-semibold">
                    16:9 Slide Stage
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Slide {currentSlideIndex + 1} of {slides.length}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" /> ~
                    {Math.round(deck.total_duration_s / 60)} mins total
                  </span>
                </div>
                <h1 className="text-base font-bold text-white tracking-tight truncate max-w-xl">
                  {deck.script_title}
                </h1>
              </div>

              {/* Variant Selector Pill */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-[#10121d] p-1 rounded-xl border border-[#23273c]">
                  <button
                    type="button"
                    onClick={() => setActiveVariant('A')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeVariant === 'A'
                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Variant A (Terminal)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveVariant('B')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeVariant === 'B'
                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span>Variant B (Clean)</span>
                  </button>
                </div>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="p-2 rounded-xl bg-[#181b2a] hover:bg-[#22263d] border border-[#292f49] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
              </div>
            </div>

            {/* 16:9 Presentation Slide Canvas */}
            <div
              ref={slideStageRef}
              className={`relative w-full aspect-video rounded-2xl overflow-hidden border shadow-2xl transition-all flex flex-col justify-between p-8 sm:p-12 select-none ${
                activeVariant === 'A'
                  ? 'slide-variant-a bg-[#0b0d14] border-zinc-800 text-zinc-100'
                  : 'slide-variant-b bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-700/80 text-white'
              }`}
            >
              {/* Background watermark badge */}
              <div className="absolute top-4 right-6 flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70 border border-white/10">
                  {activeVariant === 'A' ? 'TERMINAL DARK' : 'INFOGRAPHIC CLEAN'}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {currentSlide?.slide_type}
                </span>
              </div>

              {/* Slide Content */}
              {currentSlide && currentVariantData ? (
                <div className="flex-1 flex flex-col justify-between py-2 space-y-6">
                  {/* Top: Headline & Subhead */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {currentVariantData.badge_pills?.map((pill, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                      {currentVariantData.headline}
                    </h2>

                    {(currentVariantData.subhead || currentVariantData.subtitle) && (
                      <p className="text-sm sm:text-base text-zinc-400 font-medium">
                        {currentVariantData.subhead || currentVariantData.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Middle: Bullets, Code Snippet, or Comparison */}
                  <div className="flex-1 flex flex-col justify-center space-y-4">
                    {/* Bullet Points */}
                    {currentVariantData.bullet_points && currentVariantData.bullet_points.length > 0 && (
                      <ul className="space-y-2.5">
                        {currentVariantData.bullet_points.map((pt, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-sm sm:text-base text-zinc-300 font-sans"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Monospace Code Snippet (Variant A specialty) */}
                    {currentVariantData.code_snippet && (
                      <div className="p-3.5 rounded-xl bg-black/60 border border-zinc-800 text-emerald-400 font-mono text-xs overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{currentVariantData.code_snippet}</pre>
                      </div>
                    )}

                    {/* Comparison Splits (Variant B specialty) */}
                    {currentVariantData.comparison_left && currentVariantData.comparison_right && (
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-1">
                          <div className="text-xs font-mono font-semibold text-rose-300">
                            {currentVariantData.comparison_left.title}
                          </div>
                          <div className="text-sm font-bold text-white">
                            {currentVariantData.comparison_left.status}
                          </div>
                          {currentVariantData.comparison_left.note && (
                            <div className="text-[11px] text-zinc-400">
                              {currentVariantData.comparison_left.note}
                            </div>
                          )}
                        </div>

                        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-1">
                          <div className="text-xs font-mono font-semibold text-emerald-300">
                            {currentVariantData.comparison_right.title}
                          </div>
                          <div className="text-sm font-bold text-white">
                            {currentVariantData.comparison_right.status}
                          </div>
                          {currentVariantData.comparison_right.note && (
                            <div className="text-[11px] text-zinc-400">
                              {currentVariantData.comparison_right.note}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Metric Callouts */}
                    {currentVariantData.metric_callouts && currentVariantData.metric_callouts.length > 0 && (
                      <div className="flex flex-wrap gap-4 pt-2">
                        {currentVariantData.metric_callouts.map((metric, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 min-w-[120px]"
                          >
                            <div className="text-lg font-extrabold text-indigo-200">
                              {metric.value}
                            </div>
                            <div className="text-xs text-zinc-400 font-mono">{metric.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Spoken Anchor Cue Indicator */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <span className="truncate max-w-lg">
                      🎤 Cue: "{currentSlide.spoken_anchor_text}"
                    </span>
                    <span>
                      Duration: ~{currentSlide.duration_s}s ({currentSlide.timestamp_start_s}s -{' '}
                      {currentSlide.timestamp_end_s}s)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-500">
                  Slide content unavailable
                </div>
              )}
            </div>

            {/* Slide Navigation Carousel Bar */}
            <div className="p-3.5 rounded-2xl bg-[#12141f] border border-[#232738] flex items-center justify-between shadow-md">
              <button
                type="button"
                onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentSlideIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#181b28] hover:bg-[#22263d] disabled:opacity-40 disabled:cursor-not-allowed border border-[#262a3f] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Slide</span>
              </button>

              {/* Slide Thumbnail Dots */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-md px-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      currentSlideIndex === idx
                        ? 'w-6 bg-indigo-500'
                        : 'w-2 bg-zinc-800 hover:bg-zinc-600'
                    }`}
                    title={`Jump to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))
                }
                disabled={currentSlideIndex === slides.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#181b28] hover:bg-[#22263d] disabled:opacity-40 disabled:cursor-not-allowed border border-[#262a3f] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <span>Next Slide</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Delivery Action Dock */}
      <footer className="h-16 px-6 bg-[#0c0e16] border-t border-[#232738] flex items-center justify-between z-20 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#141725] hover:bg-[#1a1e30] border border-[#23273c] text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Script</span>
        </button>

        {/* Final Delivery Action Dock Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleFullscreen}
            disabled={!deck}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181b2a] hover:bg-[#22263d] disabled:opacity-40 border border-[#292f49] text-zinc-200 hover:text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
          >
            <MonitorPlay className="w-3.5 h-3.5 text-indigo-400" />
            <span>Fullscreen Slide Show</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenTeleprompter) {
                onOpenTeleprompter()
              } else {
                setIsTeleprompterOpen(true)
              }
            }}
            disabled={!script}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181b2a] hover:bg-[#22263d] disabled:opacity-40 border border-[#292f49] text-zinc-200 hover:text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open Teleprompter</span>
          </button>

          <button
            type="button"
            onClick={onOpenStudio}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-950/40 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Open in Full Studio</span>
          </button>
        </div>
      </footer>

      {/* Teleprompter Modal */}
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
