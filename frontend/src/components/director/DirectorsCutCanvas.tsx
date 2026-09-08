import React, { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Terminal,
  Layout,
  Copy,
  Check,
  CheckCircle2,
  Mic,
  Clock,
  BookOpen,
  MapPin,
  RotateCcw,
  Eye,
  X,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  AtomicFact,
  PresentationDeck,
  PresentationSlide,
  ToastItem,
  VideoArc,
  VideoScript,
} from '../../types'
import { TeleprompterModal } from '../scripts/TeleprompterModal'

export interface DirectorsCutCanvasProps {
  arc: VideoArc
  script: VideoScript
  deck: PresentationDeck
  facts: AtomicFact[]
  onResetToPrompt: () => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
}

export const DirectorsCutCanvas: React.FC<DirectorsCutCanvasProps> = ({
  arc,
  script,
  deck,
  facts,
  onResetToPrompt,
  onToast,
}) => {
  // Active selected episode state
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>(
    script.episode_id || arc.episodes[0]?.episode_id || 'ep_01'
  )

  // Map of loaded scripts and decks per episode_id
  const [scriptsByEp, setScriptsByEp] = useState<Record<string, VideoScript>>({
    [script.episode_id || 'ep_01']: script,
  })
  const [decksByEp, setDecksByEp] = useState<Record<string, PresentationDeck>>({
    [script.episode_id || 'ep_01']: deck,
  })

  // Directing state when user generates an uncompleted episode
  const [isDirectingEpisode, setIsDirectingEpisode] = useState(false)

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [activeVariant, setActiveVariant] = useState<'variant_a' | 'variant_b'>('variant_a')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false)
  const [activeDrawer, setActiveDrawer] = useState<'facts' | 'curriculum' | null>(null)
  const [factFilterCategory, setFactFilterCategory] = useState<string>('all')

  const slideStageRef = useRef<HTMLDivElement | null>(null)

  // Discover other existing scripts/decks for this arc on mount
  useEffect(() => {
    let isMounted = true

    const loadExistingDeliverables = async () => {
      try {
        const [scriptList, deckList] = await Promise.all([
          api.listScripts().catch(() => []),
          api.listPresentationDecks().catch(() => []),
        ])

        if (!isMounted) return

        for (const sSummary of scriptList) {
          if (!scriptsByEp[sSummary.episode_id]) {
            try {
              const fullS = await api.getScript(sSummary.script_id)
              if (!isMounted) return
              setScriptsByEp((prev) => ({ ...prev, [sSummary.episode_id]: fullS }))

              const matchedDeckMeta = deckList.find((d) => d.script_id === sSummary.script_id)
              if (matchedDeckMeta) {
                const fullD = await api.getPresentation(matchedDeckMeta.deck_id)
                if (!isMounted) return
                setDecksByEp((prev) => ({ ...prev, [sSummary.episode_id]: fullD }))
              }
            } catch (err) {
              console.warn('Failed to load sibling script/deck:', err)
            }
          }
        }
      } catch (err) {
        console.warn('Failed listing project deliverables for switcher:', err)
      }
    }

    loadExistingDeliverables()

    return () => {
      isMounted = false
    }
  }, [arc.arc_id])

  const handleSelectEpisode = (episodeId: string) => {
    setSelectedEpisodeId(episodeId)
    setCurrentSlideIndex(0)
    if (activeDrawer === 'curriculum') {
      setActiveDrawer(null)
    }
  }

  const handleDirectEpisode = async (episodeId: string) => {
    const targetEp = arc.episodes.find((ep) => ep.episode_id === episodeId)
    if (!targetEp) return

    setSelectedEpisodeId(episodeId)
    setIsDirectingEpisode(true)

    try {
      // 1. Generate teleprompter script for this episode
      const scriptRes = await api.generateScript({
        arc_id: arc.arc_id,
        episode_id: targetEp.episode_id,
        wpm_target: 145,
      })

      // 2. Synthesize synchronized 16:9 presentation deck
      let deckRes: PresentationDeck | null = null
      try {
        deckRes = await api.generatePresentation(scriptRes.script_id)
      } catch (deckErr) {
        console.warn('Presentation synthesis warning for episode:', deckErr)
      }

      setScriptsByEp((prev) => ({ ...prev, [episodeId]: scriptRes }))
      if (deckRes) {
        setDecksByEp((prev) => ({ ...prev, [episodeId]: deckRes }))
      }
      setCurrentSlideIndex(0)

      if (onToast) {
        onToast({
          type: 'success',
          title: `Episode ${targetEp.episode_number} Ready`,
          message: `Generated teleprompter script and slides for "${targetEp.title}".`,
        })
      }
    } catch (err) {
      console.error('Failed directing episode:', err)
      if (onToast) {
        onToast({
          type: 'error',
          title: `Failed Directing Episode ${targetEp.episode_number}`,
          message: err instanceof Error ? err.message : 'Generation failed.',
        })
      }
    } finally {
      setIsDirectingEpisode(false)
    }
  }

  const activeEpisode = arc.episodes.find((ep) => ep.episode_id === selectedEpisodeId) || arc.episodes[0]
  const activeScript = scriptsByEp[selectedEpisodeId]
  const activeDeck = decksByEp[selectedEpisodeId]
  const slides = activeDeck?.slides || []
  const currentSlide: PresentationSlide | undefined = slides[currentSlideIndex]

  // Keyboard navigation for slides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is inside an input or teleprompter modal is open
      if (isTeleprompterOpen || activeDrawer) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        handleNextSlide()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevSlide()
      } else if (e.key === 'f' || e.key === 'F') {
        handleToggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSlideIndex, slides.length, isTeleprompterOpen, activeDrawer])

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const handleNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1)
    }
  }

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1)
    }
  }

  const handleToggleFullscreen = () => {
    if (!slideStageRef.current) return
    if (!document.fullscreenElement) {
      slideStageRef.current.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err)
      })
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen failed:', err)
      })
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
    onToast?.({
      type: 'info',
      title: 'Copied to Clipboard',
      message: 'Code snippet copied.',
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const speakingMins = activeScript?.estimated_speaking_minutes && activeScript.estimated_speaking_minutes > 0
    ? activeScript.estimated_speaking_minutes.toFixed(1)
    : (((activeScript?.total_word_count || 820) / 140)).toFixed(1)

  // Filtered facts for drawer
  const filteredFacts = factFilterCategory === 'all'
    ? facts
    : facts.filter((f) => f.category === factFilterCategory)

  const factCategories = Array.from(new Set(facts.map((f) => f.category)))

  return (
    <div className="directors-cut-canvas w-full max-w-7xl mx-auto flex flex-col space-y-6 animate-in fade-in duration-300">
      {/* Package Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#22273a]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              DIRECTOR'S CUT READY
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Ep {activeEpisode.episode_number} Production Deliverable
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {activeScript?.title || activeEpisode.title || arc.title || 'Finished Video Package'}
          </h1>
          <p className="text-xs text-zinc-400">
            {arc.title} &bull; {arc.episodes.length} Episodes Planned &bull; {activeDeck?.total_slides || (activeScript ? 5 : 0)} Synced Slides
          </p>
        </div>

        {/* Top Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onResetToPrompt}
            className="direct-another-btn flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#141829] hover:bg-[#202742] border border-[#262f4d] text-zinc-200 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-sm"
            title="Direct another video"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Direct Another</span>
          </button>
        </div>
      </div>

      {/* Episode Navigation Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
        <span className="text-xs font-mono text-zinc-400 shrink-0 mr-1 hidden sm:inline">Episodes:</span>
        <div className="flex items-center gap-1.5 bg-[#0f121e] p-1 rounded-xl border border-[#232942] overflow-x-auto max-w-full">
          {arc.episodes.map((ep) => {
            const isSelected = ep.episode_id === selectedEpisodeId
            const hasScript = Boolean(scriptsByEp[ep.episode_id])
            return (
              <button
                key={ep.episode_id}
                type="button"
                onClick={() => handleSelectEpisode(ep.episode_id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : hasScript
                    ? 'bg-[#15192a] text-zinc-300 hover:text-white hover:bg-[#1d233c] border border-[#232a44]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#141828]'
                }`}
                title={`Episode ${ep.episode_number}: ${ep.title} (${hasScript ? 'Ready' : 'Not directed yet'})`}
              >
                <span>Ep {ep.episode_number}</span>
                {hasScript ? (
                  <CheckCircle2 className={`w-3 h-3 ${isSelected ? 'text-emerald-300' : 'text-emerald-500'}`} />
                ) : (
                  <span className="text-[10px] text-amber-400 opacity-80">⚡</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Stage: If activeScript exists, show 16:9 Presentation + Teleprompter. Otherwise show 1-click Direct Episode Hero */}
      {!activeScript ? (
        <div className="w-full bg-[#0d101c] border border-[#232a44] rounded-2xl p-8 sm:p-12 text-center shadow-2xl space-y-6">
          {isDirectingEpisode ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Directing Episode {activeEpisode.episode_number}: {activeEpisode.title}
                </h3>
                <p className="text-xs font-mono text-zinc-400">
                  Drafting 750–1,000w teleprompter script & synthesizing 16:9 slides...
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-200">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                <span>Episode {activeEpisode.episode_number} of {arc.episodes.length}</span>
                <span>&bull;</span>
                <span className="uppercase">{activeEpisode.tier}</span>
                <span>&bull;</span>
                <span>{activeEpisode.target_duration_minutes} mins</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {activeEpisode.title}
                </h2>
                <p className="text-sm text-zinc-300 leading-relaxed max-w-xl mx-auto">
                  {activeEpisode.hook}
                </p>
              </div>

              <div className="p-4 bg-[#121627] border border-[#232a44] rounded-xl text-left max-w-lg mx-auto space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400">
                  <span className="font-semibold text-zinc-300">Curriculum Objective:</span>
                  <span className="text-indigo-400 font-bold">{activeEpisode.target_duration_minutes} Minutes</span>
                </div>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  Directing this episode will synthesize a 750–1,000w spoken teleprompter transcript and synchronized 16:9 presentation slides grounded in your {facts.length} research facts.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDirectEpisode(activeEpisode.episode_id)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-950/40 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Direct Episode {activeEpisode.episode_number} Package</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Main Stage Grid: Left 16:9 Presentation Stage + Right Teleprompter Reader */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT / MAIN STAGE: 16:9 Presentation Slide Stage */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-zinc-300 font-medium">
                Slide {currentSlideIndex + 1} of {slides.length}
              </span>
              {currentSlide && (
                <span className="text-indigo-400 font-mono text-[11px] hidden sm:inline">
                  [{formatTime(currentSlide.timestamp_start_s)} &rarr; {formatTime(currentSlide.timestamp_end_s)}]
                </span>
              )}
            </div>

            {/* Slide Variant Switcher & Fullscreen Action */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#111422] p-0.5 rounded-lg border border-[#242b44]">
                <button
                  type="button"
                  onClick={() => setActiveVariant('variant_a')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeVariant === 'variant_a'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Variant A: Terminal Dark / Engineering Analytic"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Variant A</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVariant('variant_b')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeVariant === 'variant_b'
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Variant B: Clean Infographic / Executive Summary"
                >
                  <Layout className="w-3 h-3" />
                  <span>Variant B</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141829] hover:bg-[#202742] border border-[#262f4d] text-zinc-200 hover:text-white text-xs font-medium transition-all cursor-pointer"
                title="Present Fullscreen (Press F)"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Present Fullscreen</span>
              </button>
            </div>
          </div>

          {/* 16:9 Aspect Ratio Container */}
          <div
            ref={slideStageRef}
            className={`w-full aspect-video rounded-xl overflow-hidden border border-[#242b45] shadow-2xl relative bg-[#090b14] ${
              isFullscreen ? 'p-8 flex flex-col justify-center items-center' : ''
            }`}
          >
            {currentSlide ? (
              activeVariant === 'variant_a' ? (
                /* Variant A: Analytic / Terminal Dark */
                <div className="slide-variant-a w-full h-full flex flex-col bg-[#0b0d17] p-4 sm:p-6 text-xs select-none">
                  {/* Titlebar */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#1d2238] shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                      </div>
                      <span className="font-mono text-[10px] text-zinc-400 pl-2 truncate max-w-sm">
                        {currentSlide.title || currentSlide.cue_marker.replace(/[[\]]/g, '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-indigo-400">
                      <Terminal className="w-3 h-3" />
                      <span>TERMINAL DARK &bull; 1080p 16:9</span>
                    </div>
                  </div>

                  {/* Body Grid */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 overflow-hidden">
                    {/* Left: Headline & Bullets */}
                    <div className="md:col-span-7 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded font-mono text-[9px] uppercase font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/60">
                            {currentSlide.slide_type.replace('_', ' ')}
                          </span>
                          {currentSlide.variant_a.badge_pills?.map((b, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded font-mono text-[8px] bg-zinc-800/80 text-zinc-400 border border-zinc-700"
                            >
                              {b}
                            </span>
                          ))}
                        </div>

                        <h2 className="font-mono font-bold text-white text-sm sm:text-base md:text-lg tracking-tight leading-snug">
                          {currentSlide.variant_a.headline}
                        </h2>
                        {currentSlide.variant_a.subhead && (
                          <p className="text-zinc-400 font-mono text-[11px] mt-1 leading-relaxed">
                            {currentSlide.variant_a.subhead}
                          </p>
                        )}

                        {/* Bullet Points */}
                        <div className="space-y-1.5 mt-3">
                          {currentSlide.variant_a.bullet_points.map((b, idx) => (
                            <div key={idx} className="flex items-start gap-2 font-mono text-zinc-300">
                              <span className="text-indigo-400 font-bold select-none">&gt;</span>
                              <span className="text-[11px] sm:text-xs leading-relaxed">{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Anchor Cue Excerpt */}
                      <div className="pt-2 border-t border-[#1a1f33] flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                        <Mic className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="truncate italic">"{currentSlide.spoken_anchor_text}"</span>
                      </div>
                    </div>

                    {/* Right: Code / Diagram / Detail */}
                    <div className="md:col-span-5 flex flex-col justify-between space-y-2">
                      {currentSlide.variant_a.code_snippet ? (
                        <div className="relative bg-[#070810] border border-[#21273d] rounded-lg p-3 font-mono overflow-hidden flex flex-col justify-between flex-1">
                          <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#181d2e] text-[9px] text-zinc-500">
                            <span>{currentSlide.variant_a.code_language || 'bash'}</span>
                            <button
                              type="button"
                              onClick={() => currentSlide.variant_a.code_snippet && handleCopyCode(currentSlide.variant_a.code_snippet)}
                              className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
                            >
                              {copiedCode === currentSlide.variant_a.code_snippet ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="text-emerald-400 text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap flex-1">
                            {currentSlide.variant_a.code_snippet}
                          </pre>
                        </div>
                      ) : (
                        <div className="bg-[#0e111d] border border-[#22283e] rounded-lg p-3 flex flex-col justify-between flex-1">
                          <div className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 font-semibold mb-1">
                            Core Architecture
                          </div>
                          <p className="text-zinc-300 text-xs leading-relaxed">
                            {currentSlide.variant_a.subhead || currentSlide.spoken_anchor_text}
                          </p>
                          <div className="pt-2 text-[9px] font-mono text-zinc-500">
                            Pacing: {currentSlide.duration_s}s synced
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Variant B: Infographic Clean / Executive */
                <div className="slide-variant-b w-full h-full flex flex-col bg-gradient-to-br from-[#101322] to-[#0a0c16] p-4 sm:p-6 text-xs select-none">
                  {/* Clean Header Bar */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#21273e] shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                        INFOGRAPHIC
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {currentSlide.cue_marker.replace(/[[\]]/g, '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-sans font-semibold text-[10px] text-emerald-400">
                      <Layout className="w-3 h-3" />
                      <span>VARIANT B: CLEAN INFOGRAPHIC</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 flex flex-col justify-between pt-3 space-y-3 overflow-hidden">
                    <div>
                      <h2 className="font-sans font-extrabold text-white text-base sm:text-lg md:text-xl tracking-tight">
                        {currentSlide.variant_b.headline}
                      </h2>
                      {currentSlide.variant_b.subhead && (
                        <p className="text-zinc-300 font-sans text-xs mt-1">
                          {currentSlide.variant_b.subhead}
                        </p>
                      )}
                    </div>

                    {/* Comparison Cards if present */}
                    {currentSlide.variant_b.comparison_left && currentSlide.variant_b.comparison_right ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2.5 bg-[#161a2b]/80 border border-rose-800/40 rounded-lg">
                          <span className="text-[9px] uppercase tracking-wider text-rose-300 font-semibold">
                            {currentSlide.variant_b.comparison_left.title}
                          </span>
                          <div className="text-xs font-bold text-rose-200 mt-0.5">
                            {currentSlide.variant_b.comparison_left.status}
                          </div>
                          {currentSlide.variant_b.comparison_left.note && (
                            <p className="text-[9px] text-zinc-400 mt-1 italic">
                              {currentSlide.variant_b.comparison_left.note}
                            </p>
                          )}
                        </div>

                        <div className="p-2.5 bg-[#161a2b]/80 border border-emerald-800/40 rounded-lg">
                          <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-semibold">
                            {currentSlide.variant_b.comparison_right.title}
                          </span>
                          <div className="text-xs font-bold text-emerald-200 mt-0.5">
                            {currentSlide.variant_b.comparison_right.status}
                          </div>
                          {currentSlide.variant_b.comparison_right.note && (
                            <p className="text-[9px] text-zinc-400 mt-1 italic">
                              {currentSlide.variant_b.comparison_right.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* Metric Callouts if present */}
                    {currentSlide.variant_b.metric_callouts && currentSlide.variant_b.metric_callouts.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {currentSlide.variant_b.metric_callouts.map((m, i) => (
                          <div key={i} className="p-2 bg-[#141829] border border-[#2b3353] rounded-lg text-center">
                            <div className="text-[9px] text-zinc-400 uppercase font-medium">{m.label}</div>
                            <div className="text-sm md:text-base font-extrabold text-emerald-300 my-0.5">{m.value}</div>
                            {m.detail && <div className="text-[8px] text-zinc-400">{m.detail}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bullets */}
                    <div className="space-y-1.5">
                      {currentSlide.variant_b.bullet_points.map((b, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-zinc-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-xs leading-relaxed">{b}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer Anchor Text */}
                    <div className="pt-2 border-t border-[#21273e] flex items-center justify-between text-[10px] text-zinc-400">
                      <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                        <Mic className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate italic">"{currentSlide.spoken_anchor_text}"</span>
                      </div>
                      <span className="font-mono text-[9px] text-emerald-400 shrink-0">
                        {currentSlide.variant_b.word_count} words &bull; {currentSlide.duration_s}s
                      </span>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
                No slide data available
              </div>
            )}
          </div>

          {/* Slide Navigation Controls */}
          <div className="bg-[#101322] border border-[#222840] rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevSlide}
                disabled={currentSlideIndex === 0}
                className="p-1.5 rounded-lg bg-[#181d33] hover:bg-[#232b49] disabled:opacity-40 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Previous slide (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 font-mono text-zinc-300">
                <span className="font-bold text-white">Slide {currentSlideIndex + 1}</span>
                <span className="text-zinc-600">&bull;</span>
                <span>of {slides.length}</span>
              </div>

              <button
                type="button"
                onClick={handleNextSlide}
                disabled={currentSlideIndex === slides.length - 1}
                className="p-1.5 rounded-lg bg-[#181d33] hover:bg-[#232b49] disabled:opacity-40 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Next slide (Right Arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Slide Quick Scrub Thumbnails */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-xs px-2">
              {slides.map((s, idx) => (
                <button
                  key={s.slide_id || idx}
                  type="button"
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] transition-all cursor-pointer ${
                    idx === currentSlideIndex
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-[#181d33] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <div className="font-mono text-[11px] text-zinc-400">
              Total {activeDeck?.total_duration_s ? formatTime(activeDeck.total_duration_s) : '5:30'}
            </div>
          </div>
        </div>

        {/* RIGHT: Teleprompter Script Reader */}
        <div className="lg:col-span-5 flex flex-col space-y-3 bg-[#0d0f1a] border border-[#232840] rounded-xl p-4 shadow-xl">
          {/* Script Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1f243a]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-sans tracking-tight">
                  Spoken Script & Teleprompter
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                  Episode {activeEpisode.episode_number}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {activeScript.total_word_count || 820} words &bull; ~{speakingMins} mins spoken
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsTeleprompterOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Launch Teleprompter</span>
            </button>
          </div>

          {/* Script Sections Scroll Area */}
          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
            {activeScript.sections && activeScript.sections.length > 0 ? (
              activeScript.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#121626] border border-[#222944] rounded-lg space-y-2 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                      {section.section_type.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {section.target_duration_seconds}s &bull; {section.estimated_wpm || 145} WPM
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-zinc-200">
                    {section.title}
                  </h4>

                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {section.spoken_text}
                  </p>

                  {section.visual_cue && (
                    <div className="p-2 bg-[#0b0e1b] rounded border border-[#1b2238] text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                      <Layout className="w-3 h-3 shrink-0" />
                      <span className="truncate">{section.visual_cue}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap font-sans">
                {activeScript.full_script_markdown || activeScript.hook_text || 'No script text available'}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* Subtle Bottom Collapsible Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#22273a] text-xs">
        <div className="flex items-center gap-2">
          {/* Grounded Facts Drawer Trigger */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'facts' ? null : 'facts')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              activeDrawer === 'facts'
                ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                : 'bg-[#121524] border-[#22283e] text-zinc-300 hover:text-white hover:bg-[#181d33]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Grounded Facts ({facts.length})</span>
          </button>

          {/* Full Curriculum Arc Drawer Trigger */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'curriculum' ? null : 'curriculum')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              activeDrawer === 'curriculum'
                ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                : 'bg-[#121524] border-[#22283e] text-zinc-300 hover:text-white hover:bg-[#181d33]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Full Curriculum Arc ({arc.episodes.length} Episodes)</span>
          </button>
        </div>

        {/* Direct Another Video Action */}
        <button
          type="button"
          onClick={onResetToPrompt}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Direct Another Video</span>
        </button>
      </div>

      {/* Expandable Facts Drawer */}
      {activeDrawer === 'facts' && (
        <div className="bg-[#0f121e] border border-[#262c45] rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#1f243b]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Grounded Atomic Facts & Quotes</h3>
              <span className="text-xs text-zinc-400">({filteredFacts.length} displayed)</span>
            </div>

            <div className="flex items-center gap-2">
              {factCategories.length > 1 && (
                <select
                  value={factFilterCategory}
                  onChange={(e) => setFactFilterCategory(e.target.value)}
                  className="bg-[#161a2c] border border-[#27304f] text-xs text-zinc-200 rounded-md px-2 py-1"
                >
                  <option value="all">All Categories</option>
                  {factCategories.map((c) => (
                    <option key={c} value={c}>
                      {c.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredFacts.map((fact) => (
              <div
                key={fact.fact_id}
                className="p-3 bg-[#141828] border border-[#232a44] rounded-lg space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                    {fact.category.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-[9px] text-zinc-500">
                    {fact.confidence}
                  </span>
                </div>

                <p className="text-zinc-200 font-medium">{fact.statement}</p>

                {fact.exact_quote && (
                  <blockquote className="text-[11px] text-zinc-400 italic border-l border-indigo-500/50 pl-2">
                    "{fact.exact_quote}"
                  </blockquote>
                )}

                {fact.tags && fact.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {fact.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[8px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Curriculum Arc Drawer */}
      {activeDrawer === 'curriculum' && (
        <div className="bg-[#0f121e] border border-[#262c45] rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#1f243b]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm text-white">Full 6-Episode Curriculum Arc</h3>
              <span className="text-xs text-zinc-400 font-mono">
                {arc.estimated_total_minutes} total estimated minutes
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveDrawer(null)}
              className="p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {arc.episodes.map((ep) => {
              const isSelected = ep.episode_id === selectedEpisodeId
              const hasScript = Boolean(scriptsByEp[ep.episode_id])
              return (
                <div
                  key={ep.episode_id}
                  className={`p-3.5 rounded-lg border space-y-2 text-xs flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/40'
                      : hasScript
                      ? 'bg-[#151a2d] border-[#252e4d]'
                      : 'bg-[#121626] border-[#20263d]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-indigo-300">
                        Episode {ep.episode_number}
                      </span>
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                        {ep.tier}
                      </span>
                    </div>

                    <h4 className="font-bold text-zinc-100 text-xs line-clamp-2">
                      {ep.title}
                    </h4>

                    <p className="text-zinc-400 text-[11px] mt-1 line-clamp-2">
                      {ep.hook}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#1e2439] flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>{ep.target_duration_minutes} mins</span>
                    {isSelected ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Active View
                      </span>
                    ) : hasScript ? (
                      <button
                        type="button"
                        onClick={() => handleSelectEpisode(ep.episode_id)}
                        className="px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white font-sans font-semibold text-[10px] transition-colors cursor-pointer"
                      >
                        Switch ➔
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDirectEpisode(ep.episode_id)}
                        disabled={isDirectingEpisode}
                        className="px-2 py-1 rounded bg-amber-600/80 hover:bg-amber-600 text-white font-sans font-semibold text-[10px] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        ⚡ Direct Ep {ep.episode_number}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Teleprompter Modal */}
      {isTeleprompterOpen && activeScript && (
        <TeleprompterModal
          script={activeScript}
          isOpen={isTeleprompterOpen}
          onClose={() => setIsTeleprompterOpen(false)}
        />
      )}
    </div>
  )
}
