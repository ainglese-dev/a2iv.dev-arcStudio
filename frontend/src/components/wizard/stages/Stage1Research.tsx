import React, { useState } from 'react'
import {
  BrainCircuit,
  Sparkles,
  Zap,
  Quote,
  Loader2,
  ArrowRight,
  Plus,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import { api } from '../../../services/api'
import type {
  AtomicFact,
  ProjectSummary,
  ProjectVision,
  SourceDocument,
  ToastItem,
} from '../../../types'
import { IngestSourceModal } from '../../sources/IngestSourceModal'
import { SeedPractitionerModal } from '../../sources/SeedPractitionerModal'

export interface Stage1ResearchProps {
  activeProject: ProjectSummary | null
  activeVision: ProjectVision | null
  sources: SourceDocument[]
  facts: AtomicFact[]
  onRefresh: () => Promise<void> | void
  onAdvance: () => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
}

export const Stage1Research: React.FC<Stage1ResearchProps> = ({
  activeProject,
  activeVision,
  sources,
  facts,
  onRefresh,
  onAdvance,
  onToast,
}) => {
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false)
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false)
  const [quickUrl, setQuickUrl] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [quickContent, setQuickContent] = useState('')
  const [isQuickIngesting, setIsQuickIngesting] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)

  const projectTitle = activeVision?.title || activeProject?.title || 'Active Project Arc'
  const coreThesis =
    activeVision?.core_thesis ||
    activeProject?.core_thesis ||
    'Grounding complex technical systems into battle-tested practitioner insights.'
  const targetAudience =
    activeVision?.target_audience || activeProject?.target_audience || 'Senior Software Engineers'
  const technicalDepth =
    activeVision?.technical_depth || activeProject?.technical_depth || 'practitioner_deep'

  // Quick Ingest and Auto-Extract
  const handleQuickIngest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickContent.trim() && !quickUrl.trim()) {
      onToast?.({
        type: 'error',
        title: 'Input Required',
        message: 'Please provide content or URL to ingest.',
      })
      return
    }

    setIsQuickIngesting(true)
    try {
      const title = quickTitle.trim() || (quickUrl ? `URL: ${quickUrl}` : 'Trench Notes')
      const content = quickContent.trim() || `Reference content extracted from ${quickUrl}`
      
      const { source } = await api.ingestSource({
        title,
        content,
        url: quickUrl || undefined,
        source_type: quickUrl ? 'article' : 'manual_note',
      })

      // Immediately trigger fact extraction
      const extractResult = await api.extractFacts({
        source_id: source.source_id,
      })

      onToast?.({
        type: 'success',
        title: 'Source Ingested & Facts Extracted',
        message: `Extracted ${extractResult.facts.length} atomic facts from "${title}".`,
      })

      setQuickUrl('')
      setQuickTitle('')
      setQuickContent('')
      await onRefresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Quick ingestion failed.'
      onToast?.({
        type: 'error',
        title: 'Ingestion Error',
        message: msg,
      })
    } finally {
      setIsQuickIngesting(false)
    }
  }

  const handleAdvance = async () => {
    setIsAdvancing(true)
    try {
      onAdvance()
    } finally {
      setIsAdvancing(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#090a0f] text-zinc-100">
      {/* Scrollable Stage Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Project Vision Banner Card */}
        <div className="p-5 rounded-2xl bg-[#12141f] border border-[#232738] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 uppercase font-semibold">
                Project North Star
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Audience: {targetAudience}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-400 border border-zinc-700/60">
                Depth: {technicalDepth.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{projectTitle}</h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">{coreThesis}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSeedModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              title="Seed battle-tested incident scars & constraints"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-400/20" />
              <span>Seed Practitioner Scars</span>
            </button>
            <button
              type="button"
              onClick={() => setIsIngestModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ingest Source</span>
            </button>
          </div>
        </div>

        {/* Quick Ingestion & Facts Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Quick Ingestion Panel (5 cols) */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-[#10121d] border border-[#202538] flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" /> Quick Ingest & Extract
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Atomic Pipeline</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Paste technical notes, post-mortem excerpts, or URLs to extract atomic facts with exact quote grounding.
              </p>
            </div>

            <form onSubmit={handleQuickIngest} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">Source Title (Optional)</label>
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder="e.g. SRE Incident #4092 Post-Mortem"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-[#161826] border border-[#272c40] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">Source URL (Optional)</label>
                <input
                  type="url"
                  value={quickUrl}
                  onChange={(e) => setQuickUrl(e.target.value)}
                  placeholder="https://engineering.blog/outage-deep-dive"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-[#161826] border border-[#272c40] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">Raw Notes / Excerpt</label>
                <textarea
                  value={quickContent}
                  onChange={(e) => setQuickContent(e.target.value)}
                  rows={4}
                  placeholder="Paste raw transcript, code snippet, or engineering post-mortem notes here..."
                  className="w-full text-xs px-3 py-2 rounded-lg bg-[#161826] border border-[#272c40] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isQuickIngesting || (!quickContent.trim() && !quickUrl.trim())}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                {isQuickIngesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting Facts...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>✨ Ingest & Extract Facts</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-[#1e2235] flex items-center justify-between text-[11px] text-zinc-400">
              <span>{sources.length} sources in project</span>
              <button
                type="button"
                onClick={() => setIsSeedModalOpen(true)}
                className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3 h-3" /> Quick Seed Scars
              </button>
            </div>
          </div>

          {/* Right: Curated Atomic Facts List (7 cols) */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-[#10121d] border border-[#202538] flex flex-col space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-indigo-400" /> Curated Atomic Facts
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                  {facts.length} Verified
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Exact Quote Substrings</span>
            </div>

            {facts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-zinc-800 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-xs font-medium text-zinc-300">No Atomic Facts in Vault Yet</p>
                  <p className="text-[11px] text-zinc-500">
                    Ingest technical documentation or click "Seed Practitioner Scars" to instantly extract atomic ground-truth facts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSeedModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Seed Practitioner Scars</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {facts.map((fact) => (
                  <div
                    key={fact.fact_id}
                    className="p-3 rounded-xl bg-[#141725] border border-[#23273c] hover:border-zinc-700 transition-all space-y-1.5 text-xs group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
                          {fact.category}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">#{fact.fact_id}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verbatim
                      </span>
                    </div>

                    <p className="text-zinc-200 font-medium leading-relaxed">{fact.statement}</p>

                    {fact.exact_quote && (
                      <div className="p-2 rounded bg-[#0e101a] border border-[#1e2235] text-[11px] text-zinc-400 italic flex items-start gap-1.5">
                        <Quote className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">"{fact.exact_quote}"</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Sticky Action Dock */}
      <footer className="h-16 px-6 bg-[#0c0e16] border-t border-[#232738] flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="font-mono text-indigo-300 font-semibold">Stage 1 of 4</span>
          <span>•</span>
          <span>{facts.length} Atomic Facts Grounded</span>
          <span>•</span>
          <span>{sources.length} Sources Ingested</span>
        </div>

        <button
          type="button"
          onClick={handleAdvance}
          disabled={isAdvancing}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-950/40 transition-all hover:scale-[1.02] cursor-pointer"
        >
          {isAdvancing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading Stage 2...</span>
            </>
          ) : (
            <>
              <span>Architect Curriculum Arc</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </footer>

      {/* Ingest Source Modal */}
      <IngestSourceModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onSuccess={async () => {
          setIsIngestModalOpen(false)
          await onRefresh()
        }}
        onToast={onToast}
      />

      {/* Seed Practitioner Scars Modal */}
      <SeedPractitionerModal
        isOpen={isSeedModalOpen}
        onClose={() => setIsSeedModalOpen(false)}
        onSuccess={async () => {
          setIsSeedModalOpen(false)
          await onRefresh()
        }}
        onToast={onToast}
      />
    </div>
  )
}
