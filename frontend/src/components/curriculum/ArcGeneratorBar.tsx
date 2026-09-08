import React, { useEffect, useMemo, useState } from 'react'
import {
  Sparkles,
  History,
  ChevronDown,
  Layers,
  ListVideo,
  Settings,
  Target,
} from 'lucide-react'
import type {
  AtomicFact,
  GenerateCurriculumRequest,
  ProjectSummary,
  ProjectVision,
  SourceMetadata,
  VideoArcSummary,
} from '../../types'

interface ArcGeneratorBarProps {
  sources: SourceMetadata[]
  savedArcs: VideoArcSummary[]
  selectedArcId: string | null
  onSelectArc: (arcId: string) => void
  onGenerate: (req: GenerateCurriculumRequest) => Promise<void>
  isGenerating: boolean
  initialTopic?: string
  activeProject?: ProjectSummary | null
  activeVision?: ProjectVision | null
  facts?: AtomicFact[]
}

export const ArcGeneratorBar: React.FC<ArcGeneratorBarProps> = ({
  sources,
  savedArcs,
  selectedArcId,
  onSelectArc,
  onGenerate,
  isGenerating,
  initialTopic,
  activeProject,
  activeVision,
  facts,
}) => {
  const [topic, setTopic] = useState(
    initialTopic || activeVision?.title || activeProject?.title || ''
  )
  const [targetEpisodes, setTargetEpisodes] = useState<number>(6)
  const [targetAudience, setTargetAudience] = useState(
    activeVision?.target_audience || 'Senior Practitioners'
  )
  const [scopeSourceId, setScopeSourceId] = useState<string>('all')
  const [showHistory, setShowHistory] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic)
    } else if (!topic.trim()) {
      const fallback = activeVision?.title || activeProject?.title || ''
      if (fallback) {
        setTopic(fallback)
      }
    }
  }, [initialTopic, activeVision?.title, activeProject?.title])

  useEffect(() => {
    if (activeVision?.target_audience) {
      setTargetAudience(activeVision.target_audience)
    }
  }, [activeVision?.target_audience])

  const factTags = useMemo(() => {
    if (!facts || facts.length === 0) return []
    const tagSet = new Set<string>()
    facts.forEach((f) => f.tags?.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).slice(0, 4)
  }, [facts])

  const canGenerate = Boolean(
    topic.trim() || activeVision?.title || activeProject?.title
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const effectiveTopic =
      topic.trim() || activeVision?.title || activeProject?.title || ''
    if (!effectiveTopic || isGenerating) return

    const req: GenerateCurriculumRequest = {
      topic: effectiveTopic,
      source_ids: scopeSourceId !== 'all' ? [scopeSourceId] : undefined,
      target_episode_count: targetEpisodes,
      target_audience: targetAudience.trim() || undefined,
    }

    onGenerate(req)
  }

  return (
    <div className="border-b border-[#232738] bg-[#0d0f18] p-3.5 space-y-3">
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Top Generator Input Row */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Topic Input */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder={
                activeVision?.title
                  ? `Curriculum topic (default: "${activeVision.title}")...`
                  : 'Enter topic, core thesis, or practitioner focus...'
              }
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-[#151826] border border-[#282d42] rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 font-sans transition-colors"
            />
          </div>

          {/* Target Episodes Select */}
          <div className="flex items-center gap-1.5 bg-[#151826] border border-[#282d42] rounded-lg px-2.5 py-1.5 shrink-0">
            <Target className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={targetEpisodes}
              onChange={(e) => setTargetEpisodes(Number(e.target.value))}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none font-mono cursor-pointer"
              title="Target total episodes across the 3 tiers"
            >
              <option value={3} className="bg-[#12141f]">3 Episodes</option>
              <option value={6} className="bg-[#12141f]">6 Episodes (Balanced)</option>
              <option value={9} className="bg-[#12141f]">9 Episodes (Comprehensive)</option>
              <option value={12} className="bg-[#12141f]">12 Episodes (Masterclass)</option>
            </select>
          </div>

          {/* Generate Button */}
          <button
            type="submit"
            disabled={isGenerating || !canGenerate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-amber-300' : ''}`} />
            <span>{isGenerating ? 'Architecting Arc...' : 'Generate Video Arc'}</span>
          </button>

          {/* History Dropdown Trigger */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#151826] hover:bg-[#1d2133] border border-[#282d42] text-xs text-zinc-300 transition-colors"
              title="Saved video curriculum arcs"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono text-[11px]">{savedArcs.length}</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {/* Arcs History Popover */}
            {showHistory && (
              <div className="absolute right-0 mt-2 w-80 bg-[#12141f] border border-[#272c40] rounded-xl shadow-2xl p-2.5 z-50 text-xs max-h-80 overflow-y-auto">
                <div className="font-semibold text-zinc-200 px-2 py-1 text-[11px] border-b border-zinc-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ListVideo className="w-3.5 h-3.5 text-indigo-400" /> Saved Curriculum Arcs
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">{savedArcs.length} arcs</span>
                </div>

                {savedArcs.length === 0 ? (
                  <div className="text-zinc-500 text-center py-6 text-xs">
                    No curriculum arcs generated yet.
                  </div>
                ) : (
                  <div className="py-1 space-y-1">
                    {savedArcs.map((arc) => (
                      <button
                        key={arc.arc_id}
                        type="button"
                        onClick={() => {
                          onSelectArc(arc.arc_id)
                          setShowHistory(false)
                        }}
                        className={`w-full text-left p-2.5 rounded-lg transition-colors flex flex-col ${
                          selectedArcId === arc.arc_id
                            ? 'bg-indigo-950/60 border border-indigo-700/60 text-white'
                            : 'hover:bg-[#181b28] text-zinc-300'
                        }`}
                      >
                        <span className="font-semibold text-xs truncate">{arc.title}</span>
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-1">
                          <span>{arc.total_episodes} eps • ~{arc.estimated_total_minutes}m</span>
                          <span>{new Date(arc.created_at).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Suggestion Pills */}
        {(activeVision || factTags.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px]">
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider shrink-0 mr-1">
              Suggestions:
            </span>

            {/* Project Title pill */}
            {activeVision?.title && (
              <button
                type="button"
                onClick={() => setTopic(activeVision.title)}
                title={activeVision.title}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-950/50 hover:bg-indigo-900/70 text-indigo-300 border border-indigo-700/40 text-[11px] font-medium transition-colors max-w-[220px] truncate cursor-pointer"
              >
                <span>✨</span>
                <span className="truncate">{activeVision.title}</span>
              </button>
            )}

            {/* Core Thesis pill */}
            {activeVision?.core_thesis && (
              <button
                type="button"
                onClick={() => setTopic(activeVision.core_thesis)}
                title={activeVision.core_thesis}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-950/50 hover:bg-violet-900/70 text-violet-300 border border-violet-700/40 text-[11px] font-medium transition-colors max-w-[260px] truncate cursor-pointer"
              >
                <span>🎯</span>
                <span className="truncate">{activeVision.core_thesis}</span>
              </button>
            )}

            {/* Key Questions pills */}
            {activeVision?.key_questions_to_answer &&
              activeVision.key_questions_to_answer.slice(0, 2).map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopic(q)}
                  title={q}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-950/50 hover:bg-sky-900/70 text-sky-300 border border-sky-700/40 text-[11px] font-medium transition-colors max-w-[240px] truncate cursor-pointer"
                >
                  <span>❓</span>
                  <span className="truncate">{q}</span>
                </button>
              ))}

            {/* Fact Tag pills */}
            {factTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTopic(tag)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/70 hover:bg-zinc-700/70 text-zinc-300 border border-zinc-700/50 text-[11px] font-mono transition-colors cursor-pointer"
              >
                <span>🏷️</span>
                <span>{tag}</span>
              </button>
            ))}
          </div>
        )}

        {/* Practitioner Hint Banner / Text */}
        <div className="text-[11px] text-zinc-500 font-sans flex items-center gap-1.5 pt-0.5">
          <span className="text-amber-400/90 font-mono font-semibold">Trench Tip:</span>
          <span>
            {"Ground topics in real " +
              (activeVision?.target_audience || "practitioner") +
              " challenges, failure modes, or lessons learned—not vendor brochure speak."}
          </span>
        </div>

        {/* Optional Filters & Audience Toggle */}
        <div className="flex items-center justify-between gap-3 text-xs text-zinc-400 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Source Scope */}
            {sources.length > 0 && (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Layers className="w-3 h-3 text-zinc-500" />
                <span>Scope:</span>
                <select
                  value={scopeSourceId}
                  onChange={(e) => setScopeSourceId(e.target.value)}
                  className="bg-[#151826] border border-[#272c40] rounded px-2 py-0.5 text-zinc-300 text-[11px] focus:outline-none"
                >
                  <option value="all">All Vault Sources ({sources.length})</option>
                  {sources.map((s) => (
                    <option key={s.source_id} value={s.source_id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              <span>{showOptions ? 'Hide Audience' : 'Audience Target'}</span>
            </button>
          </div>

          <div className="text-[11px] text-zinc-500 font-mono">
            3-Tier Architecture: Fundamentals ➔ Deep Dives ➔ Labs
          </div>
        </div>

        {/* Expanded Audience Setting */}
        {showOptions && (
          <div className="p-2.5 rounded-lg bg-[#141724] border border-[#24293e] flex items-center gap-2 text-xs">
            <span className="text-zinc-400 font-medium whitespace-nowrap">Audience:</span>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Senior Engineers and Technical Practitioners"
              className="flex-1 bg-[#10121d] border border-zinc-800 rounded px-2.5 py-1 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>
        )}
      </form>
    </div>
  )
}
