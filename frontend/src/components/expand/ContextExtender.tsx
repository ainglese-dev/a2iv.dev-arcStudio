import React, { useEffect, useMemo, useState } from 'react'
import {
  Sparkles,
  BookOpen,
  History,
  ChevronDown,
  ChevronRight,
  Compass,
  FileSpreadsheet,
  Zap,
  RefreshCw,
  AlertTriangle,
  Layers,
  ChevronsUpDown,
  FileText,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  ContextExpansionRequest,
  SourceMetadata,
  SynthesizedGuide,
  SynthesisJob,
  ToastItem,
} from '../../types'
import { GuidePreview } from './GuidePreview'

interface ContextExtenderProps {
  sources: SourceMetadata[]
  selectedSourceId: string | null
  currentGuide: SynthesizedGuide | null
  onGuideSynthesized: (guide: SynthesizedGuide) => void
  onDeleteGuide: (guideId: string) => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
  onPlanCurriculum?: (topic: string) => void
  activeSynthesisJob?: SynthesisJob | null
  onStartSynthesis?: (req: ContextExpansionRequest) => Promise<SynthesizedGuide | void>
  onDismissFailedJob?: () => void
}

interface PresetOption {
  id: string
  label: string
  desc: string
  icon: React.ElementType
  detailLevel: string
  audience: string
  topicSuffix: string
}

const PRESETS: PresetOption[] = [
  {
    id: 'deep-dive',
    label: 'Deep Dive',
    desc: 'Comprehensive technical walkthrough with architecture and patterns',
    icon: Compass,
    detailLevel: 'comprehensive',
    audience: 'Senior Software Engineers & Architects',
    topicSuffix: 'Technical Architecture & Implementation Deep Dive',
  },
  {
    id: 'briefing',
    label: 'Executive Briefing',
    desc: 'High-density summary of key facts, benchmarks, and takeaways',
    icon: Zap,
    detailLevel: 'concise',
    audience: 'Engineering Leads & Decision Makers',
    topicSuffix: 'Executive Briefing & Key Insights',
  },
  {
    id: 'comparative',
    label: 'Comparative Analysis',
    desc: 'Side-by-side trade-offs, pitfalls, and design choices',
    icon: FileSpreadsheet,
    detailLevel: 'technical',
    audience: 'Technical Evaluators',
    topicSuffix: 'Comparative Analysis & Trade-Offs',
  },
]

export const ContextExtender: React.FC<ContextExtenderProps> = ({
  sources,
  selectedSourceId,
  currentGuide,
  onGuideSynthesized,
  onDeleteGuide,
  onToast,
  onPlanCurriculum,
  activeSynthesisJob,
  onStartSynthesis,
  onDismissFailedJob,
}) => {
  const [topic, setTopic] = useState('')
  const [activePreset, setActivePreset] = useState<string>('deep-dive')
  const [detailLevel, setDetailLevel] = useState('comprehensive')
  const [targetAudience, setTargetAudience] = useState('')
  const [scopeAllSources, setScopeAllSources] = useState(true)
  const [selectedScopeSourceIds, setSelectedScopeSourceIds] = useState<string[]>([])
  const [isSourcesCollapsibleOpen, setIsSourcesCollapsibleOpen] = useState(false)
  const [localSynthesizing, setLocalSynthesizing] = useState(false)
  const [guidesHistory, setGuidesHistory] = useState<
    Array<{ guide_id: string; topic: string; created_at: string }>
  >([])
  const [loadedGuides, setLoadedGuides] = useState<SynthesizedGuide[]>([])
  const [collapsedGuideIds, setCollapsedGuideIds] = useState<Record<string, boolean>>({})
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConfigExpanded, setIsConfigExpanded] = useState(false)

  const isSynthesizing = (activeSynthesisJob?.status === 'running') || localSynthesizing

  // Initialize selectedScopeSourceIds with all available source ids
  useEffect(() => {
    if (selectedScopeSourceIds.length === 0 && sources.length > 0) {
      setSelectedScopeSourceIds(sources.map((s) => s.source_id))
    }
  }, [sources])

  // If a source is selected externally while not in all-sources mode, ensure it's selected
  useEffect(() => {
    if (selectedSourceId && !scopeAllSources) {
      setSelectedScopeSourceIds((prev) =>
        prev.includes(selectedSourceId) ? prev : [...prev, selectedSourceId]
      )
    }
  }, [selectedSourceId, scopeAllSources])

  // Sync topic if background job is actively running and current input is blank
  useEffect(() => {
    if (activeSynthesisJob?.status === 'running' && !topic && activeSynthesisJob.topic) {
      setTopic(activeSynthesisJob.topic)
    }
  }, [activeSynthesisJob?.status, activeSynthesisJob?.topic, topic])

  // Load guide history & all project guides on mount
  const refreshHistory = async () => {
    try {
      const history = await api.listGuides()
      setGuidesHistory(history)

      if (history.length > 0) {
        const fullGuides = await Promise.all(
          history.map(async (h) => {
            try {
              return await api.getGuide(h.guide_id)
            } catch {
              return null
            }
          })
        )
        const validGuides = fullGuides.filter((g): g is SynthesizedGuide => g !== null)
        setLoadedGuides((prev) => {
          const map = new Map<string, SynthesizedGuide>()
          validGuides.forEach((g) => map.set(g.guide_id, g))
          if (currentGuide) map.set(currentGuide.guide_id, currentGuide)
          prev.forEach((g) => {
            if (!map.has(g.guide_id)) map.set(g.guide_id, g)
          })
          return Array.from(map.values())
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load synthesized guides.'
      onToast?.({
        type: 'error',
        title: 'Guide History Load Failed',
        message: msg,
      })
    }
  }

  useEffect(() => {
    refreshHistory()
  }, [sources])

  // Sync currentGuide prop when updated from WorkspaceLayout
  useEffect(() => {
    if (currentGuide) {
      setLoadedGuides((prev) => {
        const exists = prev.some((g) => g.guide_id === currentGuide.guide_id)
        if (exists) {
          return prev.map((g) => (g.guide_id === currentGuide.guide_id ? currentGuide : g))
        }
        return [currentGuide, ...prev]
      })
      // Ensure newly selected/synthesized guide is expanded by default
      setCollapsedGuideIds((prev) => ({
        ...prev,
        [currentGuide.guide_id]: false,
      }))
    }
  }, [currentGuide])

  const toggleGuideCard = (guideId: string) => {
    setCollapsedGuideIds((prev) => ({
      ...prev,
      [guideId]: !prev[guideId],
    }))
  }

  const allContextsExpanded = useMemo(() => {
    if (loadedGuides.length === 0) return true
    return loadedGuides.every((g) => !collapsedGuideIds[g.guide_id])
  }, [loadedGuides, collapsedGuideIds])

  const toggleAllContexts = () => {
    if (allContextsExpanded) {
      const allCollapsed: Record<string, boolean> = {}
      loadedGuides.forEach((g) => {
        allCollapsed[g.guide_id] = true
      })
      setCollapsedGuideIds(allCollapsed)
    } else {
      setCollapsedGuideIds({})
    }
  }

  const handleDeleteGuideInternal = (guideId: string) => {
    setLoadedGuides((prev) => prev.filter((g) => g.guide_id !== guideId))
    onDeleteGuide(guideId)
    refreshHistory()
  }

  const handleSelectPreset = (preset: PresetOption) => {
    setActivePreset(preset.id)
    setDetailLevel(preset.detailLevel)
    setTargetAudience(preset.audience)
    if (!topic.trim() && sources.length > 0) {
      const sourceTitle = selectedSourceId
        ? sources.find((s) => s.source_id === selectedSourceId)?.title || ''
        : sources[0]?.title || ''
      setTopic(`${sourceTitle}: ${preset.topicSuffix}`)
    }
  }

  const handleSynthesize = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      setError('Please provide a research topic or question to synthesize.')
      return
    }

    setError(null)

    const payload: ContextExpansionRequest = {
      topic: topic.trim(),
      source_ids: scopeAllSources
        ? undefined
        : selectedScopeSourceIds.length > 0
        ? selectedScopeSourceIds
        : selectedSourceId
        ? [selectedSourceId]
        : undefined,
      detail_level: detailLevel,
      target_audience: targetAudience.trim() || undefined,
    }

    if (onStartSynthesis) {
      try {
        const res = await onStartSynthesis(payload)
        if (res) {
          setLoadedGuides((prev) => [res, ...prev.filter((g) => g.guide_id !== res.guide_id)])
          setCollapsedGuideIds((prev) => ({ ...prev, [res.guide_id]: false }))
        }
        refreshHistory()
        setIsConfigExpanded(false)
      } catch (err: unknown) {
        // Error toast handled centrally
        setError(err instanceof Error ? err.message : 'Guide synthesis failed.')
      }
      return
    }

    setLocalSynthesizing(true)
    try {
      const result = await api.synthesizeGuide(payload)
      onGuideSynthesized(result)
      setLoadedGuides((prev) => [result, ...prev.filter((g) => g.guide_id !== result.guide_id)])
      setCollapsedGuideIds((prev) => ({ ...prev, [result.guide_id]: false }))
      refreshHistory()
      setIsConfigExpanded(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Guide synthesis failed.')
    } finally {
      setLocalSynthesizing(false)
    }
  }

  const handleSelectHistoricalGuide = async (guideId: string) => {
    try {
      const existing = loadedGuides.find((g) => g.guide_id === guideId)
      let guideToSelect = existing
      if (!guideToSelect) {
        guideToSelect = await api.getGuide(guideId)
        setLoadedGuides((prev) => [guideToSelect!, ...prev])
      }
      setCollapsedGuideIds((prev) => ({ ...prev, [guideId]: false }))
      onGuideSynthesized(guideToSelect)
      setShowHistoryDropdown(false)
      setIsConfigExpanded(false)
      setTimeout(() => {
        const el = document.getElementById(`context-card-${guideId}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load guide.')
    }
  }

  const hasLoadedGuides = loadedGuides.length > 0

  return (
    <div className="flex flex-col h-full bg-[#0a0c13]">
      {/* Panel Header */}
      <div className="p-3 border-b border-[#232738] bg-[#111420] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <h2 className="font-semibold text-sm text-zinc-100 font-sans tracking-tight">
            Context Extender
          </h2>
          {loadedGuides.length > 0 && (
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
              {loadedGuides.length} {loadedGuides.length === 1 ? 'context' : 'contexts'}
            </span>
          )}
        </div>

        {/* History Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#181b28] hover:bg-[#202538] border border-[#272c40] text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Saved Guides"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-[11px]">{guidesHistory.length}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {showHistoryDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-[#12141f] border border-[#272c40] rounded-lg shadow-2xl p-2 z-50 text-xs max-h-72 overflow-y-auto">
              <div className="font-semibold text-zinc-300 px-2 py-1 text-[11px] border-b border-zinc-800 flex items-center justify-between">
                <span>Synthesized Guides</span>
                <span className="font-mono text-[10px] text-zinc-500">{guidesHistory.length} files</span>
              </div>
              {guidesHistory.length === 0 ? (
                <div className="text-zinc-500 text-center py-4 text-[11px]">
                  No saved guides yet.
                </div>
              ) : (
                <div className="py-1 space-y-1">
                  {guidesHistory.map((g) => (
                    <button
                      key={g.guide_id}
                      onClick={() => handleSelectHistoricalGuide(g.guide_id)}
                      className="w-full text-left p-2 rounded hover:bg-[#1a1d2c] transition-colors group flex flex-col cursor-pointer"
                    >
                      <span className="font-medium text-zinc-200 text-xs truncate group-hover:text-indigo-300">
                        {g.topic}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
                        {new Date(g.created_at).toLocaleDateString()} • {g.guide_id}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Background Synthesis Banner */}
      {activeSynthesisJob?.status === 'running' && (
        <div className="synthesis-running-banner px-3 py-2.5 bg-indigo-950/60 border-b border-indigo-500/40 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-indigo-900/80 border border-indigo-500/50 shrink-0">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-300 animate-spin" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-indigo-100">Synthesis in progress...</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-900/90 text-indigo-300 border border-indigo-700/50">
                  {activeSynthesisJob.elapsedSeconds}s elapsed
                </span>
              </div>
              <span className="text-[11px] text-zinc-300 truncate font-mono">
                "{activeSynthesisJob.topic}"
              </span>
            </div>
          </div>
          <div className="text-[10px] text-indigo-300/90 font-sans hidden sm:block shrink-0 px-2 py-0.5 rounded bg-indigo-900/50 border border-indigo-800/40">
            Background task active • Safe to switch tabs
          </div>
        </div>
      )}

      {/* Failed Synthesis Banner */}
      {activeSynthesisJob?.status === 'failed' && (
        <div className="px-3 py-2 bg-rose-950/60 border-b border-rose-800/60 flex items-center justify-between gap-2 text-xs text-rose-200">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">Synthesis failed: {activeSynthesisJob.error || 'Unknown error'}</span>
          </div>
          {onDismissFailedJob && (
            <button
              type="button"
              onClick={onDismissFailedJob}
              className="text-[11px] px-2 py-0.5 rounded bg-rose-900/80 hover:bg-rose-800 text-white shrink-0 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Compact Synthesis Bar when guides exist and config is collapsed */}
      {hasLoadedGuides && !isConfigExpanded && (
        <div
          onClick={() => setIsConfigExpanded(true)}
          className="synthesis-compact-bar px-3 py-2 bg-[#121522] border-b border-[#232738] hover:bg-[#161a2b] flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium text-zinc-200">Synthesis Controls</span>
            <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
              • Preset: {PRESETS.find((p) => p.id === activePreset)?.label || activePreset}
            </span>
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
              {scopeAllSources
                ? `All Sources (${sources.length})`
                : `${selectedScopeSourceIds.length} sources`}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-mono">
            <span>Configure New</span>
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>
      )}

      {/* Full Synthesis Configuration Controls */}
      {(!hasLoadedGuides || isConfigExpanded) && (
        <div className="p-3 border-b border-[#232738] bg-[#0e111a] space-y-3">
          {hasLoadedGuides && (
            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Synthesis Controls</span>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigExpanded(false)}
                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 font-mono cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors"
              >
                <span>Collapse</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
          <form onSubmit={handleSynthesize} className="space-y-3">
            {/* Preset Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              {PRESETS.map((preset) => {
                const Icon = preset.icon
                const isSelected = activePreset === preset.id
                return (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2 rounded-md border text-left flex flex-col items-start gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/50 border-indigo-500/80 text-white'
                        : 'bg-[#151825] border-[#25293d] hover:border-zinc-700 text-zinc-400'
                    }`}
                    title={preset.desc}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                      <span className={isSelected ? 'text-white' : 'text-zinc-300'}>
                        {preset.label}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Topic Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Guide Topic or Research Question..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-[#161927] border border-[#282d42] rounded-md px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 font-sans transition-colors"
              />
            </div>

            {/* Collapsible Sources Scope Section */}
            <div className="sources-scope-collapsible border border-[#232738] bg-[#121522] rounded-md overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setIsSourcesCollapsibleOpen(!isSourcesCollapsibleOpen)}
                className="w-full px-2.5 py-1.5 flex items-center justify-between hover:bg-[#161a2b] transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {isSourcesCollapsibleOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-zinc-200">
                    Target Sources
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 shrink-0">
                    {scopeAllSources
                      ? `All Sources (${sources.length})`
                      : `${selectedScopeSourceIds.length} of ${sources.length}`}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200 font-sans">
                  {isSourcesCollapsibleOpen ? 'Collapse' : 'Filter sources'}
                </span>
              </button>

              {isSourcesCollapsibleOpen && (
                <div className="p-2 border-t border-[#232738] bg-[#0c0e18] space-y-1.5">
                  {/* Master checkbox & bulk actions */}
                  <div className="flex items-center justify-between text-[11px] pb-1 border-b border-zinc-800/60">
                    <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                      <input
                        type="checkbox"
                        checked={scopeAllSources}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setScopeAllSources(checked)
                          if (checked) {
                            setSelectedScopeSourceIds(sources.map((s) => s.source_id))
                          }
                        }}
                        className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="text-[11px] font-medium">Include All Sources</span>
                    </label>
                    {!scopeAllSources && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedScopeSourceIds(sources.map((s) => s.source_id))}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          Select all
                        </button>
                        <span className="text-zinc-600">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedScopeSourceIds([])}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Individual source checkboxes */}
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
                    {sources.length === 0 ? (
                      <div className="text-[11px] text-zinc-500 py-1 text-center">
                        No sources ingested yet.
                      </div>
                    ) : (
                      sources.map((src) => {
                        const isSelected =
                          scopeAllSources || selectedScopeSourceIds.includes(src.source_id)
                        return (
                          <label
                            key={src.source_id}
                            className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#161a2c] hover:bg-[#1c2238] border border-indigo-900/40'
                                : 'hover:bg-[#131624] opacity-60 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={scopeAllSources}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedScopeSourceIds((prev) => [...prev, src.source_id])
                                  } else {
                                    setSelectedScopeSourceIds((prev) =>
                                      prev.filter((id) => id !== src.source_id)
                                    )
                                  }
                                }}
                                className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-0 w-3 h-3 shrink-0"
                              />
                              <span className="truncate text-zinc-200 text-[11px]">
                                {src.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                              {src.fact_count ?? 0} facts
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Trigger Row */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="text-[11px] text-zinc-400 font-mono">
                {scopeAllSources ? (
                  <span className="text-zinc-400">Context: <strong className="text-zinc-200">{sources.length} sources</strong></span>
                ) : (
                  <span className="text-indigo-300 font-medium">Context: {selectedScopeSourceIds.length} source(s)</span>
                )}
              </div>

              {/* Synthesize Button */}
              <button
                type="submit"
                disabled={isSynthesizing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed ml-auto"
              >
                {isSynthesizing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    <span>Synthesizing ({activeSynthesisJob?.elapsedSeconds ?? 0}s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Synthesize Guide</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-2 rounded bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs">
                {error}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Master Contexts Toolbar */}
      {hasLoadedGuides && (
        <div className="context-master-bar px-3 py-1.5 bg-[#111420] border-b border-[#232738] flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-zinc-200">
              Synthesized Contexts
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
              {loadedGuides.length} {loadedGuides.length === 1 ? 'context' : 'contexts'}
            </span>
          </div>

          {loadedGuides.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAllContexts}
                className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-[#181c2d] hover:bg-[#22273e] text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                title={allContextsExpanded ? 'Collapse all contexts' : 'Expand all contexts'}
              >
                <ChevronsUpDown className="w-3 h-3 text-indigo-400" />
                <span>{allContextsExpanded ? 'Collapse All Contexts' : 'Expand All Contexts'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stacked Multiple Context Cards Display */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {!hasLoadedGuides ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-zinc-500 text-xs">
            <FileText className="w-10 h-10 text-zinc-700 mb-2 stroke-[1.5]" />
            <p className="font-medium text-zinc-400">No Contexts Synthesized Yet</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-[280px]">
              Enter a topic and synthesize research contexts with Obsidian-style citations and footnotes.
            </p>
          </div>
        ) : (
          loadedGuides.map((guide) => {
            const isExpanded = !collapsedGuideIds[guide.guide_id]
            return (
              <div
                key={guide.guide_id}
                id={`context-card-${guide.guide_id}`}
                className="scroll-mt-2"
              >
                <GuidePreview
                  guide={guide}
                  isCardExpanded={isExpanded}
                  onToggleCard={() => toggleGuideCard(guide.guide_id)}
                  onDelete={(id) => handleDeleteGuideInternal(id)}
                  onPlanCurriculum={onPlanCurriculum}
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
