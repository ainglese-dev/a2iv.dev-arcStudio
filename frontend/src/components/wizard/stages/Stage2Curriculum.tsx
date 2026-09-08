import React, { useState } from 'react'
import {
  ListVideo,
  Sparkles,
  Zap,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  BookOpen,
  Cpu,
  Flame,
} from 'lucide-react'
import { api } from '../../../services/api'
import type {
  ArcTier,
  ProjectSummary,
  ProjectVision,
  ToastItem,
  VideoArc,
  VideoEpisode,
} from '../../../types'

export interface Stage2CurriculumProps {
  activeProject: ProjectSummary | null
  activeVision: ProjectVision | null
  arc: VideoArc | null
  onArcChange: (arc: VideoArc) => void
  selectedEpisode: VideoEpisode | null
  onSelectEpisode: (episode: VideoEpisode) => void
  onBack: () => void
  onAdvance: () => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
}

interface TierInfo {
  tier: ArcTier
  label: string
  badgeLabel: string
  badgeColor: string
  borderHover: string
  icon: React.ComponentType<{ className?: string }>
}

const TIERS: TierInfo[] = [
  {
    tier: 'fundamentals',
    label: 'Tier 1: Foundation',
    badgeLabel: 'Fundamentals',
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    borderHover: 'hover:border-emerald-500/50',
    icon: BookOpen,
  },
  {
    tier: 'advanced',
    label: 'Tier 2: Core Implementation',
    badgeLabel: 'Deep Dive',
    badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
    borderHover: 'hover:border-indigo-500/50',
    icon: Cpu,
  },
  {
    tier: 'lab',
    label: 'Tier 3: Production Reality',
    badgeLabel: 'Hands-On Lab',
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
    borderHover: 'hover:border-amber-500/50',
    icon: Flame,
  },
]

export const Stage2Curriculum: React.FC<Stage2CurriculumProps> = ({
  activeProject,
  activeVision,
  arc,
  onArcChange,
  selectedEpisode,
  onSelectEpisode,
  onBack,
  onAdvance,
  onToast,
}) => {
  const [isGenerating, setIsGenerating] = useState(false)

  const projectTitle = activeVision?.title || activeProject?.title || 'Modern Software Architecture'
  const targetAudience =
    activeVision?.target_audience || activeProject?.target_audience || 'Senior Software Engineers'

  const handleGenerateArc = async () => {
    setIsGenerating(true)
    try {
      const newArc = await api.generateCurriculum({
        topic: projectTitle,
        target_episode_count: 6,
        target_audience: targetAudience,
      })
      onArcChange(newArc)
      if (newArc.episodes && newArc.episodes.length > 0) {
        onSelectEpisode(newArc.episodes[0])
      }
      onToast?.({
        type: 'success',
        title: 'Curriculum Arc Generated',
        message: `Structured 3-tier roadmap with ${newArc.episodes.length} episodes for "${newArc.title}".`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate curriculum arc.'
      onToast?.({
        type: 'error',
        title: 'Curriculum Error',
        message: msg,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Ensure an episode is selected if arc exists
  const activeEp =
    selectedEpisode || (arc?.episodes && arc.episodes.length > 0 ? arc.episodes[0] : null)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#090a0f] text-zinc-100">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Header summary or Generation banner */}
        {!arc ? (
          <div className="p-8 rounded-2xl bg-[#12141f] border border-[#232738] text-center space-y-4 shadow-xl flex flex-col items-center justify-center my-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ListVideo className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Architect 3-Tier Pedagogical Roadmap
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Automatically sequence an end-to-end curriculum based on verified facts:
                Foundation, Core Implementation, and Production Reality.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateArc}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xl shadow-indigo-950/40 transition-all hover:scale-[1.02] cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sequencing 6 Episodes with AI Router...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white/20" />
                  <span>⚡ 1-Click Generate Curriculum Arc</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Arc Overview Card */}
            <div className="p-5 rounded-2xl bg-[#12141f] border border-[#232738] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase font-semibold">
                    Curriculum Arc
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {arc.total_episodes} Episodes
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" /> ~{arc.estimated_total_minutes} mins total
                  </span>
                </div>
                <h1 className="text-lg font-bold text-white tracking-tight">{arc.title}</h1>
                <p className="text-xs text-zinc-400 max-w-2xl">{arc.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleGenerateArc}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181b2a] hover:bg-[#22263d] border border-[#292f49] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span>Re-Generate</span>
                </button>
              </div>
            </div>

            {/* 3-Tier Visual Roadmap Grid */}
            <div className="space-y-6">
              {TIERS.map((tierInfo) => {
                const tierEpisodes = arc.episodes.filter((ep) => ep.tier === tierInfo.tier)
                if (tierEpisodes.length === 0) return null

                const TierIcon = tierInfo.icon

                return (
                  <div key={tierInfo.tier} className="space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-[#1f2336]">
                      <div className="flex items-center gap-2">
                        <TierIcon className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-xs font-semibold text-white tracking-wide uppercase font-mono">
                          {tierInfo.label}
                        </h2>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {tierEpisodes.length} Episodes
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {tierEpisodes.map((episode) => {
                        const isSelected = activeEp?.episode_id === episode.episode_id
                        return (
                          <div
                            key={episode.episode_id}
                            onClick={() => onSelectEpisode(episode)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                              isSelected
                                ? 'bg-indigo-950/30 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                                : `bg-[#10121d] border-[#202538] ${tierInfo.borderHover} hover:bg-[#141726]`
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold">
                                  Ep {episode.episode_number}
                                </span>
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${tierInfo.badgeColor}`}
                                >
                                  {tierInfo.badgeLabel}
                                </span>
                              </div>

                              <h3
                                className={`text-xs font-semibold leading-snug ${
                                  isSelected ? 'text-indigo-200' : 'text-zinc-200'
                                }`}
                              >
                                {episode.title}
                              </h3>

                              <p className="text-[11px] text-zinc-400 line-clamp-2 italic">
                                "{episode.hook}"
                              </p>
                            </div>

                            <div className="pt-2 border-t border-[#1a1d2e] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                {episode.target_duration_minutes} mins
                              </span>
                              {isSelected ? (
                                <span className="text-indigo-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Selected
                                </span>
                              ) : (
                                <span className="text-zinc-600 group-hover:text-zinc-400">
                                  Click to Select
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Selected Episode Spotlight Preview */}
            {activeEp && (
              <div className="p-4 rounded-2xl bg-[#0f111c] border border-indigo-950/60 shadow-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Ready to Script: Episode{' '}
                    {activeEp.episode_number} — {activeEp.title}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Duration: ~{activeEp.target_duration_minutes} min • Tier: {activeEp.tier}
                  </span>
                </div>
                {activeEp.learning_objectives && activeEp.learning_objectives.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activeEp.learning_objectives.map((obj, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
                      >
                        🎯 {obj}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
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
          <span>Research</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="font-mono text-indigo-300 font-semibold">Stage 2 of 4</span>
          {arc && (
            <>
              <span>•</span>
              <span>{arc.total_episodes} Episodes Structured</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onAdvance}
          disabled={!arc || !activeEp}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-950/40 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <span>
            Write Teleprompter Script {activeEp ? `(Ep ${activeEp.episode_number})` : ''}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  )
}
