import React, { useRef, useState } from 'react'
import {
  Copy,
  Check,
  Download,
  Trash2,
  Clock,
  Layers,
  Zap,
  Cpu,
  BookmarkCheck,
  Code2,
} from 'lucide-react'
import type {
  AtomicFact,
  ProjectSummary,
  ProjectVision,
  VideoArc,
  VideoEpisode,
} from '../../types'
import { EpisodeCard } from './EpisodeCard'

interface ArcPlaylistViewProps {
  arc: VideoArc | null
  factsMap?: Record<string, AtomicFact>
  onDeleteArc?: (arcId: string) => void
  onSelectFact?: (factId: string) => void
  onCreateScript?: (episode: VideoEpisode, arcId?: string) => void
  activeProject?: ProjectSummary | null
  activeVision?: ProjectVision | null
  factsCount?: number
  onQuickGenerate?: () => void
  isGenerating?: boolean
}

export const ArcPlaylistView: React.FC<ArcPlaylistViewProps> = ({
  arc,
  factsMap = {},
  onDeleteArc,
  onSelectFact,
  onCreateScript,
  activeProject,
  activeVision,
  factsCount,
  onQuickGenerate,
  isGenerating,
}) => {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'visual' | 'markdown'>('visual')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDeleteClick = () => {
    if (confirmDelete) {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
      setConfirmDelete(false)
      onDeleteArc?.(arc?.arc_id || '')
    } else {
      setConfirmDelete(true)
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmDelete(false)
      }, 3000)
    }
  }

  if (!arc) {
    const projectTitle =
      activeVision?.title || activeProject?.title || 'this project'
    const targetAudience =
      activeVision?.target_audience || 'Practitioners'

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] h-full p-8 text-center">
        <div className="max-w-xl w-full bg-gradient-to-b from-[#131726] to-[#0e111d] border border-indigo-900/40 shadow-2xl rounded-2xl p-8 flex flex-col items-center relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-14 h-14 rounded-2xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center mb-4 shadow-inner">
            <Zap className="w-7 h-7 text-indigo-400" />
          </div>

          <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
            Ready to Architect Video Curriculum
          </h3>

          <p className="text-xs text-zinc-400 mt-2 max-w-md leading-relaxed font-sans">
            Synthesize a 3-tier, 6-episode video arc directly from the curated
            research and facts for <span className="text-indigo-300 font-semibold">{projectTitle}</span>.
          </p>

          {/* Context Badges */}
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171b2e] border border-indigo-800/40 text-xs text-indigo-200 font-medium">
              <span>📚</span>
              <span>{factsCount || 0} Grounded Facts</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171b2e] border border-indigo-800/40 text-xs text-indigo-200 font-medium">
              <span>🎯</span>
              <span className="truncate max-w-[200px]">{targetAudience}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171b2e] border border-indigo-800/40 text-xs text-indigo-200 font-medium">
              <span>⚡</span>
              <span>6 Episodes</span>
            </div>
          </div>

          {/* Primary CTA */}
          {onQuickGenerate && (
            <button
              type="button"
              onClick={onQuickGenerate}
              disabled={isGenerating}
              className="mt-6 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-950/60 transition-all cursor-pointer disabled:cursor-not-allowed group"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Curriculum Arc...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                  <span>⚡ 1-Click Generate Curriculum Arc</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Split episodes by tier
  const tier1Episodes = arc.episodes.filter((e) => e.tier === 'fundamentals')
  const tier2Episodes = arc.episodes.filter((e) => e.tier === 'advanced')
  const tier3Episodes = arc.episodes.filter((e) => e.tier === 'lab')

  // Generate Obsidian markdown export content
  const generateMarkdown = () => {
    let md = `# ${arc.title}\n\n`
    md += `> **Topic**: ${arc.topic}\n`
    md += `> **Total Episodes**: ${arc.total_episodes} (~${arc.estimated_total_minutes} mins runtime)\n\n`
    md += `## Series Overview\n${arc.description}\n\n`

    md += `## 🟢 Tier 1: Fundamentals\n\n`
    tier1Episodes.forEach((ep) => {
      md += `### Episode ${ep.episode_number}: ${ep.title} (${ep.target_duration_minutes} mins)\n`
      md += `> [!quote] 15s Opening Hook\n> "${ep.hook}"\n\n`
      md += `**Learning Objectives:**\n`
      ep.learning_objectives.forEach((obj) => (md += `- ${obj}\n`))
      if (ep.recommended_visuals.length > 0) {
        md += `\n**Visual Ideas:**\n`
        ep.recommended_visuals.forEach((v) => (md += `- 🖼️ ${v}\n`))
      }
      if (ep.key_facts_referenced.length > 0) {
        md += `\n**Referenced Facts:** ${ep.key_facts_referenced.map((f) => `[[facts/${f}]]`).join(', ')}\n`
      }
      md += `\n---\n\n`
    })

    md += `## 🔵 Tier 2: Advanced Deep Dives\n\n`
    tier2Episodes.forEach((ep) => {
      md += `### Episode ${ep.episode_number}: ${ep.title} (${ep.target_duration_minutes} mins)\n`
      md += `> [!quote] 15s Opening Hook\n> "${ep.hook}"\n\n`
      md += `**Learning Objectives:**\n`
      ep.learning_objectives.forEach((obj) => (md += `- ${obj}\n`))
      if (ep.recommended_visuals.length > 0) {
        md += `\n**Visual Ideas:**\n`
        ep.recommended_visuals.forEach((v) => (md += `- 🖼️ ${v}\n`))
      }
      if (ep.key_facts_referenced.length > 0) {
        md += `\n**Referenced Facts:** ${ep.key_facts_referenced.map((f) => `[[facts/${f}]]`).join(', ')}\n`
      }
      md += `\n---\n\n`
    })

    md += `## 🟣 Tier 3: Labs & Hands-On\n\n`
    tier3Episodes.forEach((ep) => {
      md += `### Episode ${ep.episode_number}: ${ep.title} (${ep.target_duration_minutes} mins)\n`
      md += `> [!quote] 15s Opening Hook\n> "${ep.hook}"\n\n`
      md += `**Learning Objectives:**\n`
      ep.learning_objectives.forEach((obj) => (md += `- ${obj}\n`))
      if (ep.lab_exercise) {
        md += `\n> [!example] Hands-On Lab Challenge\n> ${ep.lab_exercise}\n\n`
      }
      if (ep.recommended_visuals.length > 0) {
        md += `\n**Visual Ideas:**\n`
        ep.recommended_visuals.forEach((v) => (md += `- 🖼️ ${v}\n`))
      }
      if (ep.key_facts_referenced.length > 0) {
        md += `\n**Referenced Facts:** ${ep.key_facts_referenced.map((f) => `[[facts/${f}]]`).join(', ')}\n`
      }
      md += `\n---\n\n`
    })

    return md
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdown())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const content = generateMarkdown()
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeName = arc.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    link.href = url
    link.setAttribute('download', `${safeName || 'curriculum-arc'}.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0c13] overflow-hidden">
      {/* Overview Series Header Bar */}
      <div className="p-4 border-b border-[#232738] bg-[#111420] space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 font-semibold">
                Video Series Arc
              </span>
              <span className="text-zinc-500 font-mono text-xs">{arc.arc_id}</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
              {arc.title}
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">{arc.description}</p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#0d0f17] p-0.5 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveTab('visual')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'visual'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Playlist View
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
                <span>Obsidian MD</span>
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#181b28] hover:bg-[#202538] border border-zinc-700/80 text-xs text-zinc-200 transition-colors"
              title="Copy Obsidian Markdown"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-mono text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="font-mono text-[11px]">Copy .md</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#181b28] hover:bg-[#202538] border border-zinc-700/80 text-xs text-zinc-200 transition-colors"
              title="Export Obsidian Markdown Note"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px]">Export</span>
            </button>

            {onDeleteArc && (
              <button
                onClick={handleDeleteClick}
                className={`px-2 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1 ${
                  confirmDelete
                    ? 'bg-rose-600 text-white border border-rose-500 animate-pulse font-semibold'
                    : 'hover:bg-rose-950 text-zinc-500 hover:text-rose-400 border border-transparent'
                }`}
                title={confirmDelete ? 'Click again to permanently delete curriculum arc' : 'Delete curriculum arc'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {confirmDelete && <span>Confirm?</span>}
              </button>
            )}
          </div>
        </div>

        {/* Series Metadata Stats Row */}
        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-3 text-xs text-zinc-400 flex-wrap">
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1 text-zinc-200">
              <BookmarkCheck className="w-3.5 h-3.5 text-indigo-400" />
              <strong>{arc.total_episodes}</strong> Episodes
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-zinc-200">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <strong>~{arc.estimated_total_minutes}</strong> mins total runtime
            </span>
            {arc.sources_referenced?.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-zinc-400">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  {arc.sources_referenced.length} sources grounded
                </span>
              </>
            )}
          </div>

          {/* AI Telemetry Pill */}
          {arc.ai_metadata && (
            <span
              className={`flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded border ${
                arc.ai_metadata.fallback_occurred
                  ? 'bg-amber-950/60 text-amber-300 border-amber-600/60'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
              }`}
            >
              {arc.ai_metadata.fallback_occurred ? (
                <Zap className="w-3 h-3 text-amber-400" />
              ) : (
                <Cpu className="w-3 h-3 text-emerald-400" />
              )}
              <span>{arc.ai_metadata.model}</span>
              {arc.ai_metadata.duration_ms > 0 && (
                <span className="text-zinc-500">({arc.ai_metadata.duration_ms}ms)</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Main Content: 3-Tier Swimlanes or Markdown Preview */}
      <div className="flex-1 overflow-y-auto p-4 select-text">
        {activeTab === 'markdown' ? (
          <textarea
            readOnly
            value={generateMarkdown()}
            className="w-full h-full min-h-[500px] bg-[#0c0e17] border border-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-200 leading-relaxed focus:outline-none resize-none"
          />
        ) : (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Tier 1: Fundamentals */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-emerald-900/40">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="font-semibold text-sm text-emerald-300 font-sans tracking-tight">
                  Tier 1: Fundamentals & Mental Models
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  ({tier1Episodes.length} episodes) — Definitions, conceptual foundations & "Why this matters"
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {tier1Episodes.map((ep) => (
                  <EpisodeCard
                    key={ep.episode_id}
                    episode={ep}
                    factsMap={factsMap}
                    onSelectFact={onSelectFact}
                    onCreateScript={(e) => onCreateScript?.(e, arc.arc_id)}
                  />
                ))}
              </div>
            </section>

            {/* Tier 2: Advanced Deep Dives */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-blue-900/40">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <h3 className="font-semibold text-sm text-blue-300 font-sans tracking-tight">
                  Tier 2: Advanced Technical Deep Dives
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  ({tier2Episodes.length} episodes) — Architecture internals, benchmarks, scaling & trade-offs
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {tier2Episodes.map((ep) => (
                  <EpisodeCard
                    key={ep.episode_id}
                    episode={ep}
                    factsMap={factsMap}
                    onSelectFact={onSelectFact}
                    onCreateScript={(e) => onCreateScript?.(e, arc.arc_id)}
                  />
                ))}
              </div>
            </section>

            {/* Tier 3: Labs & Hands-On */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-purple-900/40">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <h3 className="font-semibold text-sm text-purple-300 font-sans tracking-tight">
                  Tier 3: Hands-On Labs & Reproduction
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  ({tier3Episodes.length} episodes) — Code walkthroughs, CLI reproduction & verifiable challenges
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {tier3Episodes.map((ep) => (
                  <EpisodeCard
                    key={ep.episode_id}
                    episode={ep}
                    factsMap={factsMap}
                    onSelectFact={onSelectFact}
                    onCreateScript={(e) => onCreateScript?.(e, arc.arc_id)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
