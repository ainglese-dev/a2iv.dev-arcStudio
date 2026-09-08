import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Sparkles,
  History,
  ChevronDown,
  Clock,
  Zap,
  Layers,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ListVideo,
  Volume2,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  AtomicFact,
  GenerateScriptRequest,
  SourceMetadata,
  ToastItem,
  VideoArc,
  VideoEpisode,
  VideoScript,
  VideoScriptSummary,
} from '../../types'
import { ScriptReader } from './ScriptReader'

interface ScriptStudioProps {
  preSelectedEpisode?: { episode: VideoEpisode; arcId?: string } | null
  sources: SourceMetadata[]
  onAddToast: (toast: Omit<ToastItem, 'id'>) => void
  onModelUsed?: (model: string) => void
  onNavigateToCurriculum?: () => void
  onNavigateToMedia?: () => void
  selectedScriptId?: string | null
  onSelectScriptId?: (id: string | null) => void
  onNavigateToPresentation?: (scriptId: string) => void
}

interface FlattenedEpisode {
  episode: VideoEpisode
  arcId: string
  arcTitle: string
}

export const ScriptStudio: React.FC<ScriptStudioProps> = ({
  preSelectedEpisode,
  sources,
  onAddToast,
  onModelUsed,
  onNavigateToCurriculum,
  onNavigateToMedia,
  selectedScriptId,
  onSelectScriptId,
  onNavigateToPresentation,
}) => {
  // Available episodes aggregated from curriculum arcs
  const [availableArcs, setAvailableArcs] = useState<VideoArc[]>([])
  const [loadingArcs, setLoadingArcs] = useState(false)

  // Selection & generation options
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('')
  const [selectedArcId, setSelectedArcId] = useState<string | null>(null)
  const [wpmTarget, setWpmTarget] = useState<number>(145)
  const [speakingStyle, setSpeakingStyle] = useState<string>(
    'Direct, technical, and high-energy with concrete engineering specifics'
  )
  const [showConfig, setShowConfig] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Active script and history state
  const [savedScripts, setSavedScripts] = useState<VideoScriptSummary[]>([])
  const [activeScript, setActiveScript] = useState<VideoScript | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingScript, setIsLoadingScript] = useState(false)

  // Grounded facts map for instant citation preview
  const [factsMap, setFactsMap] = useState<Record<string, AtomicFact>>({})

  // Load facts map
  const loadFacts = useCallback(async () => {
    try {
      const facts = await api.listFacts()
      const map: Record<string, AtomicFact> = {}
      facts.forEach((f) => {
        map[f.fact_id] = f
      })
      setFactsMap(map)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load facts for script context.'
      onAddToast({
        type: 'error',
        title: 'Facts Load Failed',
        message: msg,
      })
    }
  }, [onAddToast])

  // Load saved scripts
  const loadSavedScripts = useCallback(async () => {
    try {
      const scripts = await api.listScripts()
      setSavedScripts(scripts)
      return scripts
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load saved scripts.'
      onAddToast({
        type: 'error',
        title: 'Scripts Load Failed',
        message: msg,
      })
      return []
    }
  }, [onAddToast])

  // Load all curriculum arcs to discover episodes
  const loadCurricula = useCallback(async () => {
    setLoadingArcs(true)
    try {
      const summaries = await api.listCurricula()
      const fullArcs = await Promise.all(
        summaries.map(async (s) => {
          try {
            return await api.getCurriculum(s.arc_id)
          } catch {
            return null
          }
        })
      )
      const validArcs = fullArcs.filter((a): a is VideoArc => a !== null)
      setAvailableArcs(validArcs)
      return validArcs
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load curriculum arcs.'
      onAddToast({
        type: 'error',
        title: 'Curricula Load Failed',
        message: msg,
      })
      return []
    } finally {
      setLoadingArcs(false)
    }
  }, [onAddToast])

  // Load specific script
  const loadScriptDetails = async (scriptId: string) => {
    setIsLoadingScript(true)
    try {
      const script = await api.getScript(scriptId)
      setActiveScript(script)
      onSelectScriptId?.(script.script_id)
      if (script.ai_metadata?.model) {
        onModelUsed?.(script.ai_metadata.model)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load script'
      onAddToast({
        type: 'error',
        title: 'Error Loading Script',
        message: msg,
      })
    } finally {
      setIsLoadingScript(false)
    }
  }

  // Synchronize selection with external selectedScriptId prop
  useEffect(() => {
    if (selectedScriptId && (!activeScript || activeScript.script_id !== selectedScriptId)) {
      loadScriptDetails(selectedScriptId)
    }
  }, [selectedScriptId])

  // Aggregate all episodes across arcs
  const allEpisodes = useMemo<FlattenedEpisode[]>(() => {
    const list: FlattenedEpisode[] = []
    availableArcs.forEach((arc) => {
      arc.episodes.forEach((ep) => {
        list.push({
          episode: ep,
          arcId: arc.arc_id,
          arcTitle: arc.title,
        })
      })
    })

    // If preSelectedEpisode is provided and not in the list, inject it
    if (
      preSelectedEpisode &&
      !list.some((item) => item.episode.episode_id === preSelectedEpisode.episode.episode_id)
    ) {
      list.unshift({
        episode: preSelectedEpisode.episode,
        arcId: preSelectedEpisode.arcId || '',
        arcTitle: 'Selected Episode',
      })
    }

    return list
  }, [availableArcs, preSelectedEpisode])

  // Resolve currently selected episode object
  const currentSelectedEpisode = useMemo(() => {
    return allEpisodes.find((item) => item.episode.episode_id === selectedEpisodeId)
  }, [allEpisodes, selectedEpisodeId])

  // Initial load
  useEffect(() => {
    const init = async () => {
      await loadFacts()
      const [scripts, arcs] = await Promise.all([loadSavedScripts(), loadCurricula()])

      // Handle preSelectedEpisode or restore initial selection
      if (preSelectedEpisode) {
        setSelectedEpisodeId(preSelectedEpisode.episode.episode_id)
        if (preSelectedEpisode.arcId) {
          setSelectedArcId(preSelectedEpisode.arcId)
        }

        // Check if there is already a script for this episode
        const matchingScript = scripts.find(
          (s) => s.episode_id === preSelectedEpisode.episode.episode_id
        )
        if (matchingScript) {
          loadScriptDetails(matchingScript.script_id)
          return
        }
      } else if (selectedScriptId) {
        loadScriptDetails(selectedScriptId)
        const matched = scripts.find((s) => s.script_id === selectedScriptId)
        if (matched) {
          setSelectedEpisodeId(matched.episode_id)
          if (matched.arc_id) {
            setSelectedArcId(matched.arc_id)
          }
        }
      } else if (scripts.length > 0) {
        // Automatically display latest saved script
        loadScriptDetails(scripts[0].script_id)
        setSelectedEpisodeId(scripts[0].episode_id)
        if (scripts[0].arc_id) {
          setSelectedArcId(scripts[0].arc_id)
        }
      } else if (arcs.length > 0 && arcs[0].episodes.length > 0) {
        setSelectedEpisodeId(arcs[0].episodes[0].episode_id)
        setSelectedArcId(arcs[0].arc_id)
      }
    }
    init()
  }, []) // Run once on mount

  // Sync if preSelectedEpisode prop updates
  useEffect(() => {
    if (preSelectedEpisode) {
      setSelectedEpisodeId(preSelectedEpisode.episode.episode_id)
      if (preSelectedEpisode.arcId) {
        setSelectedArcId(preSelectedEpisode.arcId)
      }
      // Check if existing script exists
      const matchingScript = savedScripts.find(
        (s) => s.episode_id === preSelectedEpisode.episode.episode_id
      )
      if (matchingScript) {
        loadScriptDetails(matchingScript.script_id)
      }
    }
  }, [preSelectedEpisode, savedScripts])

  // Generate Script Trigger
  const handleGenerateScript = async () => {
    if (!selectedEpisodeId || isGenerating) return

    setIsGenerating(true)
    try {
      const payload: GenerateScriptRequest = {
        episode_id: selectedEpisodeId,
        arc_id: selectedArcId || undefined,
        wpm_target: wpmTarget,
        speaking_style: speakingStyle,
      }

      const script = await api.generateScript(payload)
      setActiveScript(script)

      // Telemetry & Failover Notification
      if (script.ai_metadata?.fallback_occurred) {
        onAddToast({
          type: 'fallback',
          title: '⚡ Model Switched: Failover Active',
          message: `Primary provider timed out. Script generated via fallback model (${script.total_word_count} words).`,
          model: script.ai_metadata.model,
          reason: script.ai_metadata.fallback_reason,
          durationMs: script.ai_metadata.duration_ms,
        })
      } else if (script.ai_metadata?.model) {
        onAddToast({
          type: 'success',
          title: 'Video Script Generated',
          message: `Generated "${script.title}" (${script.total_word_count} words, ~${script.estimated_speaking_minutes} min).`,
          model: script.ai_metadata.model,
          durationMs: script.ai_metadata.duration_ms,
        })
      } else {
        onAddToast({
          type: 'success',
          title: 'Script Generated',
          message: `Generated "${script.title}" (${script.total_word_count} words).`,
        })
      }

      if (script.ai_metadata?.model) {
        onModelUsed?.(script.ai_metadata.model)
      }

      // Refresh saved scripts list
      await loadSavedScripts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Script generation failed.'
      onAddToast({
        type: 'error',
        title: 'Script Generation Failed',
        message: msg,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Delete script handler
  const handleDeleteScript = async (scriptId: string) => {
    try {
      await api.deleteScript(scriptId)
      onAddToast({
        type: 'info',
        title: 'Script Deleted',
        message: 'The script was removed from studio records.',
      })
      if (activeScript?.script_id === scriptId) {
        setActiveScript(null)
      }
      const updated = await loadSavedScripts()
      if (updated.length > 0 && activeScript?.script_id === scriptId) {
        loadScriptDetails(updated[0].script_id)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete script.'
      onAddToast({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
      })
    }
  }

  // Calculations for pacing preview
  const estimatedWordsFor6Min = Math.round(wpmTarget * 6)
  const isPacingCalibrated =
    activeScript &&
    activeScript.total_word_count >= 700 &&
    activeScript.total_word_count <= 1050

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#090a0f]">
      {/* Studio Header Bar & Episode Selector Controls */}
      <div className="border-b border-[#232738] bg-[#0d0f18] p-3 space-y-3 shrink-0 relative z-20">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Episode Selection Dropdown */}
          <div className="min-w-0 flex-1 w-full xl:w-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0 font-medium whitespace-nowrap">
              <ListVideo className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Target Episode:</span>
            </div>

            {loadingArcs ? (
              <div className="min-w-0 flex-1 bg-[#151826] border border-[#282d42] rounded-lg px-3 py-1.5 text-xs text-zinc-400 animate-pulse">
                Discovering curriculum episodes...
              </div>
            ) : allEpisodes.length > 0 ? (
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <select
                  value={selectedEpisodeId}
                  onChange={(e) => {
                    const epId = e.target.value
                    setSelectedEpisodeId(epId)
                    const match = allEpisodes.find((i) => i.episode.episode_id === epId)
                    if (match) {
                      setSelectedArcId(match.arcId)
                      // Auto-load existing script if present
                      const existing = savedScripts.find((s) => s.episode_id === epId)
                      if (existing) {
                        loadScriptDetails(existing.script_id)
                      }
                    }
                  }}
                  className="min-w-0 flex-1 bg-[#151826] border border-[#282d42] rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-sans cursor-pointer truncate"
                >
                  {allEpisodes.map((item) => (
                    <option key={item.episode.episode_id} value={item.episode.episode_id} className="bg-[#12141f]">
                      {item.arcTitle ? `[${item.arcTitle}] ` : ''}
                      Ep {item.episode.episode_number}: {item.episode.title} ({item.episode.tier})
                    </option>
                  ))}
                </select>
                {currentSelectedEpisode && (
                  <span className="shrink-0 whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-mono bg-[#161a29] text-zinc-400 border border-[#282d42]">
                    Tier: {currentSelectedEpisode.episode.tier}
                  </span>
                )}
                {sources.length > 0 && (
                  <span className="shrink-0 whitespace-nowrap hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-[#121422] text-zinc-500 border border-[#22273d]">
                    {sources.length} sources
                  </span>
                )}
              </div>
            ) : (
              <div className="min-w-0 flex-1 flex items-center justify-between bg-[#151826] border border-dashed border-[#2d3248] rounded-lg px-3 py-1.5 text-xs text-zinc-400">
                <span className="truncate">No curriculum episodes found. Generate an arc first.</span>
                {onNavigateToCurriculum && (
                  <button
                    onClick={onNavigateToCurriculum}
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium ml-2 shrink-0"
                  >
                    Go to Curriculum Studio &rarr;
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Pacing / WPM Target Display & Trigger */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap w-full xl:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors shrink-0 ${
                showConfig
                  ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
                  : 'bg-[#151826] border-[#282d42] text-zinc-300 hover:border-zinc-700'
              }`}
              title="Configure target WPM and speaking tone"
            >
              <Sliders className="w-3 h-3 text-indigo-400" />
              <span>{wpmTarget} WPM</span>
              <span className="text-[10px] text-zinc-500 font-sans">
                (~{estimatedWordsFor6Min}w budget)
              </span>
              <ChevronDown
                className={`w-3 h-3 text-zinc-400 transition-transform ${
                  showConfig ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Saved Scripts History Dropdown */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#151826] hover:bg-[#1d2133] border border-[#282d42] text-xs text-zinc-300 transition-colors"
                title="Saved scripts in vault"
              >
                <History className="w-3.5 h-3.5 text-zinc-400" />
                <span>Scripts</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#202538] text-[10px] text-zinc-400 font-mono">
                  {savedScripts.length}
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-zinc-400 transition-transform ${
                    showHistory ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* History Dropdown Menu */}
              {showHistory && (
                <div className="absolute right-0 mt-1.5 w-80 max-h-96 overflow-y-auto bg-[#12141f] border border-[#2b3046] rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-[#202538] flex justify-between items-center">
                    <span>Generated Video Scripts ({savedScripts.length})</span>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="text-zinc-500 hover:text-zinc-300 text-xs"
                    >
                      &times;
                    </button>
                  </div>
                  {savedScripts.length === 0 ? (
                    <div className="p-3 text-center text-xs text-zinc-500">
                      No saved scripts yet.
                    </div>
                  ) : (
                    savedScripts.map((s) => (
                      <button
                        key={s.script_id}
                        type="button"
                        onClick={() => {
                          loadScriptDetails(s.script_id)
                          setSelectedEpisodeId(s.episode_id)
                          setShowHistory(false)
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex flex-col gap-0.5 ${
                          activeScript?.script_id === s.script_id
                            ? 'bg-indigo-950/60 border border-indigo-800/60 text-indigo-200'
                            : 'hover:bg-[#1a1e2f] text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-medium">
                          <span className="truncate max-w-[200px]">{s.title}</span>
                          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                            {s.estimated_speaking_minutes.toFixed(1)}m
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span>{s.total_word_count} words</span>
                          <span>{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Script Generation Button */}
            <button
              type="button"
              onClick={handleGenerateScript}
              disabled={isGenerating || !selectedEpisodeId}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all shrink-0"
              title="Generate a 5-7 minute production script with visual cue directives"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-amber-300' : ''}`} />
              <span>{isGenerating ? 'Generating Script...' : 'Generate 5-7m Script'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible WPM & Tone Tuning Sub-Bar */}
        {showConfig && (
          <div className="pt-2 border-t border-[#1d2133] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#10121d] -mx-3 -mb-3 p-3 rounded-b-lg animate-in fade-in duration-150">
            {/* WPM Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-zinc-300 text-xs">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  Target Speaking Rate:
                </span>
                <span className="font-mono text-indigo-300 font-semibold">{wpmTarget} WPM</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-500">120 (Deliberate)</span>
                <input
                  type="range"
                  min={120}
                  max={170}
                  step={5}
                  value={wpmTarget}
                  onChange={(e) => setWpmTarget(Number(e.target.value))}
                  className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-[#202538] rounded-lg"
                />
                <span className="text-[10px] font-mono text-zinc-500">170 (Rapid)</span>
              </div>
              <p className="text-[10px] text-zinc-500">
                Industry standard YouTube tech pacing is ~140–150 WPM. Budget: 750–1000 spoken words for 5–7 min.
              </p>
            </div>

            {/* Speaking Tone Style Preset */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-zinc-300 text-xs">
                <span>Speaking Tone & Delivery:</span>
              </div>
              <select
                value={speakingStyle}
                onChange={(e) => setSpeakingStyle(e.target.value)}
                className="w-full bg-[#161a29] border border-[#2b3046] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Direct, technical, and high-energy with concrete engineering specifics">
                  Direct, technical, & high-energy (Recommended)
                </option>
                <option value="Conversational, pedagogical, and visual with intuitive analogies">
                  Conversational & visual explanations
                </option>
                <option value="Concise, authoritative executive briefing for architects">
                  Concise executive architectural briefing
                </option>
                <option value="Practical, hands-on terminal & code-focused breakdown">
                  Hands-on terminal & implementation focus
                </option>
              </select>
              <p className="text-[10px] text-zinc-500">
                Shapes rhetorical framing, analogy density, and visual directive formatting.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Script Pacing & AI Model Telemetry Banner */}
      {activeScript && (
        <div className="bg-[#0e101b] border-b border-[#202538] px-4 py-2 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Target Duration & Words */}
            <div className="flex items-center gap-1.5 font-mono text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {activeScript.estimated_speaking_minutes.toFixed(1)} min runtime
              </span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">
                {activeScript.total_word_count} spoken words
              </span>
            </div>

            {/* 5-7 min Calibration Badge */}
            {isPacingCalibrated ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Pacing: Calibrated 5–7 Min ({activeScript.total_word_count}w)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/80 text-amber-300 border border-amber-700/60 font-mono">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                Pacing: {activeScript.total_word_count}w ({activeScript.estimated_speaking_minutes.toFixed(1)}m)
              </span>
            )}

            {/* Visual Directives Count */}
            {activeScript.sections && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-zinc-400 bg-[#161a29] border border-[#2b3046]">
                <Layers className="w-3 h-3 text-indigo-400" />
                {activeScript.sections.filter((s) => s.visual_cue).length} Visual Directives
              </span>
            )}

            {/* Grounded Facts Referenced */}
            {activeScript.key_facts_referenced?.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40">
                {activeScript.key_facts_referenced.length} Grounded Citations
              </span>
            )}
          </div>

          {/* AI Failover Telemetry Pill */}
          {activeScript.ai_metadata && (
            <div className="flex items-center gap-2">
              {activeScript.ai_metadata.fallback_occurred ? (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-700/70"
                  title={activeScript.ai_metadata.fallback_reason || 'Fallback provider activated'}
                >
                  <AlertCircle className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span>⚡ Failover: {activeScript.ai_metadata.model}</span>
                  {activeScript.ai_metadata.duration_ms && (
                    <span className="text-amber-500/80">({activeScript.ai_metadata.duration_ms}ms)</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#141724] text-zinc-400 border border-[#252a3d]">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span>{activeScript.ai_metadata.model}</span>
                  {activeScript.ai_metadata.duration_ms && (
                    <span className="text-zinc-500">({activeScript.ai_metadata.duration_ms}ms)</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Studio Viewport */}
      <div className="flex-1 overflow-hidden relative">
        {isGenerating ? (
          /* High-density generation loading skeleton */
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-950/50 border border-indigo-600/40 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-sm font-semibold text-zinc-200">
                Architecting 5-Section Spoken Script
              </h3>
              <p className="text-xs text-zinc-500">
                Grounding hook, problem breakdown, deep-dive mechanisms, pitfalls, and action call
                in your Fact Vault with timed visual cues...
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500 pt-2">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Targeting {wpmTarget} WPM
              </span>
              <span>&bull;</span>
              <span>750–1000 Words</span>
              <span>&bull;</span>
              <span>5–7 Min Delivery</span>
            </div>
          </div>
        ) : isLoadingScript ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-spin mr-2" />
            Loading script...
          </div>
        ) : (
          <ScriptReader
            script={activeScript}
            factsMap={factsMap}
            onDeleteScript={handleDeleteScript}
            onNavigateToMedia={onNavigateToMedia}
            onNavigateToPresentation={onNavigateToPresentation}
          />
        )}
      </div>
    </div>
  )
}
