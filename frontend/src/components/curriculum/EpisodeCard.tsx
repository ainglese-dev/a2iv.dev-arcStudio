import React, { useState } from 'react'
import {
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  Image as ImageIcon,
  Terminal,
  Layers,
  Database,
  ChevronRight,
} from 'lucide-react'
import type { AtomicFact, VideoEpisode } from '../../types'

interface EpisodeCardProps {
  episode: VideoEpisode
  factsMap?: Record<string, AtomicFact>
  onSelectFact?: (factId: string) => void
  onCreateScript?: (episode: VideoEpisode) => void
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  factsMap = {},
  onSelectFact,
  onCreateScript,
}) => {
  const [activeFactPreview, setActiveFactPreview] = useState<string | null>(null)

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'fundamentals':
        return {
          label: 'Tier 1: Fundamentals',
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
          dot: 'bg-emerald-400',
        }
      case 'advanced':
        return {
          label: 'Tier 2: Advanced Deep Dive',
          badge: 'bg-blue-950/80 text-blue-300 border-blue-700/60',
          dot: 'bg-blue-400',
        }
      case 'lab':
        return {
          label: 'Tier 3: Hands-On Lab',
          badge: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
          dot: 'bg-purple-400',
        }
      default:
        return {
          label: tier,
          badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          dot: 'bg-zinc-400',
        }
    }
  }

  const tierInfo = getTierBadge(episode.tier)

  return (
    <div className="bg-[#121520] border border-[#23283c] hover:border-zinc-700 rounded-xl p-4 space-y-3.5 transition-all shadow-md group">
      {/* Top Meta Bar: Episode Number, Tier Badge, Target Duration */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
            EP {episode.episode_number.toString().padStart(2, '0')}
          </span>

          <span
            className={`flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full border ${tierInfo.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tierInfo.dot}`} />
            <span>{tierInfo.label}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>{episode.target_duration_minutes} mins</span>
          </span>

          {/* Create Script Studio Trigger */}
          {onCreateScript && (
            <button
              type="button"
              onClick={() => onCreateScript(episode)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-medium border border-indigo-500/40 hover:border-indigo-500 transition-all shadow-sm"
              title="Create 5-7 min teleprompter script for this episode"
            >
              <Sparkles className="w-3 h-3 text-indigo-400 group-hover:text-white" />
              <span>Create Script</span>
            </button>
          )}
        </div>
      </div>

      {/* Episode Title */}
      <h3 className="text-sm font-semibold text-white tracking-tight leading-snug">
        {episode.title}
      </h3>

      {/* 15s Opening Hook in Obsidian Callout Style */}
      {episode.hook && (
        <div className="border-l-2 border-amber-500 bg-amber-950/20 rounded-r-lg p-2.5 space-y-1">
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-300">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>15s Opening Hook</span>
          </div>
          <p className="text-xs text-zinc-200 italic font-mono leading-relaxed pl-1">
            "{episode.hook}"
          </p>
        </div>
      )}

      {/* Learning Objectives */}
      {episode.learning_objectives && episode.learning_objectives.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Learning Objectives:
          </span>
          <ul className="space-y-1 text-xs text-zinc-300 pl-4 list-disc marker:text-indigo-400">
            {episode.learning_objectives.map((obj, idx) => (
              <li key={idx} className="leading-relaxed font-sans">
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Executable Lab Challenge (for Lab Tier) */}
      {episode.lab_exercise && (
        <div className="bg-[#0b0d14] border border-purple-900/40 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-purple-300 font-semibold font-mono">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              <span>Hands-On Lab Challenge</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
              REPRODUCIBLE
            </span>
          </div>
          <p className="text-xs text-zinc-300 font-mono leading-relaxed bg-[#111420] p-2 rounded border border-zinc-800/80 select-text">
            {episode.lab_exercise}
          </p>
        </div>
      )}

      {/* Visual / Slide Recommendations */}
      {episode.recommended_visuals && episode.recommended_visuals.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <ImageIcon className="w-3 h-3 text-sky-400" /> Recommended Visuals & Slides:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {episode.recommended_visuals.map((vis, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-1 rounded bg-[#161a28] text-zinc-300 border border-[#272d42] font-sans flex items-center gap-1"
              >
                <ChevronRight className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                {vis}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grounded Fact Vault Citations */}
      {episode.key_facts_referenced && episode.key_facts_referenced.length > 0 && (
        <div className="pt-2 border-t border-zinc-800/60 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <Database className="w-3 h-3 text-indigo-400" />
              <span>Grounded Vault Evidence ({episode.key_facts_referenced.length})</span>
            </span>
            <span className="text-[10px] text-zinc-500">Click pill for evidence</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {episode.key_facts_referenced.map((factId) => {
              const factData = factsMap[factId]
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

                  {/* Fact preview popover on click */}
                  {isPreviewing && (
                    <div className="absolute bottom-full left-0 mb-2 w-72 p-2.5 rounded-lg bg-[#141724] border border-[#2b3047] shadow-2xl z-30 text-left space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-800 pb-1">
                        <span className="font-mono text-indigo-400 font-semibold">{factId}</span>
                        {factData?.category && (
                          <span className="uppercase text-[9px] px-1 bg-zinc-800 rounded">
                            {factData.category}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-zinc-200 font-sans leading-relaxed">
                        {factData?.statement || 'Statement stored in Fact Vault.'}
                      </div>

                      {factData?.exact_quote && (
                        <div className="border-l-2 border-indigo-500 bg-indigo-950/30 p-1.5 rounded-r text-[10px] italic font-mono text-zinc-300">
                          "{factData.exact_quote}"
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
  )
}
