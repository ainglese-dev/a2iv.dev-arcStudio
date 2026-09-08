import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  X,
  Trash2,
  Search,
  FileText,
  Layers,
  Film,
  Presentation,
  AlertTriangle,
  BookOpen,
  RotateCcw,
  Loader2,
  FolderX,
  Archive,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  AtomicFact,
  ProjectSummary,
  SourceMetadata,
  ToastItem,
  VaultResetTarget,
  VideoArcSummary,
  VideoScriptSummary,
} from '../../types'

export interface VaultManagerModalProps {
  isOpen: boolean
  onClose: () => void
  activeProject: ProjectSummary | null
  onRefreshProject?: () => Promise<void>
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
}

type TabKey = 'facts' | 'sources' | 'deliverables' | 'purge'

interface PresentationDeckMeta {
  deck_id: string
  script_id: string
  script_title: string
  total_slides: number
  total_duration_s: number
  created_at: string
}

export const VaultManagerModal: React.FC<VaultManagerModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  onRefreshProject,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('facts')
  const [isLoading, setIsLoading] = useState(false)

  // Local state for loaded vault entities
  const [facts, setFacts] = useState<AtomicFact[]>([])
  const [sources, setSources] = useState<SourceMetadata[]>([])
  const [scripts, setScripts] = useState<VideoScriptSummary[]>([])
  const [decks, setDecks] = useState<PresentationDeckMeta[]>([])
  const [arcs, setArcs] = useState<VideoArcSummary[]>([])

  // Facts Tab Filter State
  const [factSearch, setFactSearch] = useState('')
  const [factCategoryFilter, setFactCategoryFilter] = useState('all')
  const [confirmEraseAllFacts, setConfirmEraseAllFacts] = useState(false)
  const [isDeletingFactId, setIsDeletingFactId] = useState<string | null>(null)

  // Sources Tab State
  const [isDeletingSourceId, setIsDeletingSourceId] = useState<string | null>(null)

  // Deliverables Tab State
  const [isDeletingScriptId, setIsDeletingScriptId] = useState<string | null>(null)
  const [isDeletingDeckId, setIsDeletingDeckId] = useState<string | null>(null)
  const [isDeletingArcId, setIsDeletingArcId] = useState<string | null>(null)

  // Purge Tab State
  const [confirmPurgeTarget, setConfirmPurgeTarget] = useState<VaultResetTarget | null>(null)
  const [isPurgingTarget, setIsPurgingTarget] = useState<VaultResetTarget | null>(null)

  // Load all project data
  const loadVaultData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [fList, sList, scrList, dList, aList] = await Promise.all([
        api.listFacts().catch(() => []),
        api.listSources().catch(() => []),
        api.listScripts().catch(() => []),
        api.listPresentationDecks().catch(() => []),
        api.listCurricula().catch(() => []),
      ])
      setFacts(fList)
      setSources(sList)
      setScripts(scrList)
      setDecks(dList)
      setArcs(aList)
    } catch (err) {
      console.warn('Failed to fetch vault data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadVaultData()
      setConfirmEraseAllFacts(false)
      setConfirmPurgeTarget(null)
    }
  }, [isOpen, activeProject?.project_id, loadVaultData])

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // 1-Click Delete Fact
  const handleDeleteFact = async (factId: string) => {
    setIsDeletingFactId(factId)
    try {
      await api.deleteFact(factId)
      setFacts((prev) => prev.filter((f) => f.fact_id !== factId))
      onToast?.({
        type: 'info',
        title: 'Fact Deleted',
        message: `Fact ${factId} removed from project vault.`,
      })
      onRefreshProject?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete fact'
      onToast?.({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
      })
    } finally {
      setIsDeletingFactId(null)
    }
  }

  // Erase All Facts
  const handleEraseAllFacts = async () => {
    if (!confirmEraseAllFacts) {
      setConfirmEraseAllFacts(true)
      setTimeout(() => setConfirmEraseAllFacts(false), 4000)
      return
    }

    try {
      const res = await api.resetVault('facts')
      setFacts([])
      setConfirmEraseAllFacts(false)
      onToast?.({
        type: 'info',
        title: 'All Facts Erased',
        message: res.message || `Erased ${res.deleted_count} facts from vault.`,
      })
      onRefreshProject?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to erase facts'
      onToast?.({
        type: 'error',
        title: 'Erase Failed',
        message: msg,
      })
    }
  }

  // 1-Click Delete Source
  const handleDeleteSource = async (sourceId: string) => {
    setIsDeletingSourceId(sourceId)
    try {
      await api.deleteSource(sourceId)
      setSources((prev) => prev.filter((s) => s.source_id !== sourceId))
      onToast?.({
        type: 'info',
        title: 'Source Deleted',
        message: `Source ${sourceId} removed from project vault.`,
      })
      onRefreshProject?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete source'
      onToast?.({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
      })
    } finally {
      setIsDeletingSourceId(null)
    }
  }

  // 1-Click Delete Script
  const handleDeleteScript = async (scriptId: string) => {
    setIsDeletingScriptId(scriptId)
    try {
      await api.deleteScript(scriptId)
      setScripts((prev) => prev.filter((s) => s.script_id !== scriptId))
      onToast?.({
        type: 'info',
        title: 'Script Deleted',
        message: `Script ${scriptId} removed.`,
      })
      onRefreshProject?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete script'
      onToast?.({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
      })
    } finally {
      setIsDeletingScriptId(null)
    }
  }

  // 1-Click Delete Deck
  const handleDeleteDeck = async (deckId: string) => {
    setIsDeletingDeckId(deckId)
    try {
      await api.deletePresentationDeck(deckId)
      setDecks((prev) => prev.filter((d) => d.deck_id !== deckId))
      onToast?.({
        type: 'info',
        title: 'Slide Deck Deleted',
        message: `Presentation deck ${deckId} removed.`,
      })
      onRefreshProject?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete deck'
      onToast?.({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
      })
    } finally {
      setIsDeletingDeckId(null)
    }
  }

  // 1-Click Delete Curriculum Arc
  const handleDeleteArc = async (arcId: string) => {
    setIsDeletingArcId(arcId)
    try {
      await api.deleteCurriculum(arcId)
      setArcs((prev) => prev.filter((a) => a.arc_id !== arcId))
      onToast?.({
        type: 'info',
        title: 'Curriculum Arc Deleted',
        message: `Curriculum arc ${arcId} removed.`,
      })
      onRefreshProject?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete curriculum arc'
      onToast?.({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
      })
    } finally {
      setIsDeletingArcId(null)
    }
  }

  // Selective Purge Handler
  const handlePurge = async (target: VaultResetTarget, label: string) => {
    if (confirmPurgeTarget !== target) {
      setConfirmPurgeTarget(target)
      setTimeout(() => setConfirmPurgeTarget(null), 4000)
      return
    }

    setIsPurgingTarget(target)
    try {
      const res = await api.resetVault(target)
      onToast?.({
        type: 'info',
        title: `${label} Purged`,
        message: res.message || `Deleted ${res.deleted_count} items from ${label}.`,
      })
      setConfirmPurgeTarget(null)
      await loadVaultData()
      onRefreshProject?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Purge failed'
      onToast?.({
        type: 'error',
        title: 'Purge Failed',
        message: msg,
      })
    } finally {
      setIsPurgingTarget(null)
    }
  }

  // Filtered facts
  const categories = useMemo(() => {
    const set = new Set<string>()
    facts.forEach((f) => {
      if (f.category) set.add(f.category)
    })
    return Array.from(set)
  }, [facts])

  const filteredFacts = useMemo(() => {
    return facts.filter((fact) => {
      const matchesCategory =
        factCategoryFilter === 'all' || fact.category === factCategoryFilter
      const query = factSearch.toLowerCase().trim()
      if (!query) return matchesCategory

      const matchesText =
        fact.statement.toLowerCase().includes(query) ||
        (fact.exact_quote && fact.exact_quote.toLowerCase().includes(query)) ||
        (fact.tags && fact.tags.some((t) => t.toLowerCase().includes(query)))
      return matchesCategory && matchesText
    })
  }, [facts, factSearch, factCategoryFilter])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="vault-manager-modal relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0d101a] border border-[#232a42] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f253b] bg-[#111422]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  Vault Manager & Erase Controls
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#1a2035] text-indigo-300 border border-[#2a3352]">
                  {activeProject?.title || 'Default Project'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Inspect, modify, delete individual artifacts, or execute selective vault purges.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadVaultData}
              disabled={isLoading}
              className="p-1.5 rounded-lg border border-[#242b45] bg-[#141829] text-zinc-400 hover:text-white hover:bg-[#1a2036] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Vault Data"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[#242b45] bg-[#141829] text-zinc-400 hover:text-white hover:bg-[#1a2036] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 py-2 border-b border-[#1c2237] bg-[#0f121e] text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('facts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'facts'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#15192b]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Atomic Facts ({facts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'sources'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#15192b]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Sources ({sources.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deliverables')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'deliverables'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#15192b]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Deliverables ({scripts.length + decks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('purge')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'purge'
                ? 'bg-rose-600 text-white font-semibold shadow-sm'
                : 'text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/20'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Purge & Erase</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: FACTS */}
          {activeTab === 'facts' && (
            <div className="space-y-4">
              {/* Filter / Search / Erase Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search statement, quote, or tags..."
                      value={factSearch}
                      onChange={(e) => setFactSearch(e.target.value)}
                      className="w-full bg-[#131625] border border-[#232a42] text-xs text-zinc-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  {/* Category Dropdown */}
                  {categories.length > 0 && (
                    <select
                      value={factCategoryFilter}
                      onChange={(e) => setFactCategoryFilter(e.target.value)}
                      className="bg-[#131625] border border-[#232a42] text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Batch Erase All Facts Button */}
                <button
                  type="button"
                  onClick={handleEraseAllFacts}
                  disabled={facts.length === 0}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    confirmEraseAllFacts
                      ? 'bg-rose-600 text-white animate-pulse shadow-md'
                      : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {confirmEraseAllFacts
                      ? 'Confirm: Erase All Facts?'
                      : `Erase All Facts (${facts.length})`}
                  </span>
                </button>
              </div>

              {/* Facts List */}
              {filteredFacts.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs border border-dashed border-[#232a42] rounded-xl">
                  No atomic facts matched your query.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[58vh] overflow-y-auto pr-1">
                  {filteredFacts.map((fact) => {
                    const isDeleting = isDeletingFactId === fact.fact_id
                    return (
                      <div
                        key={fact.fact_id}
                        className="p-3 bg-[#131728] border border-[#21273e] hover:border-[#2d3554] rounded-xl flex flex-col justify-between space-y-2 text-xs transition-colors group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[9px] uppercase font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                              {fact.category?.replace(/_/g, ' ') || 'fact'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] text-zinc-500">
                                {fact.confidence}
                              </span>
                              {/* 1-Click Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteFact(fact.fact_id)}
                                disabled={isDeleting}
                                title="Delete fact note"
                                className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>

                          <p className="text-zinc-200 font-medium leading-relaxed">
                            {fact.statement}
                          </p>

                          {fact.exact_quote && (
                            <blockquote className="text-[11px] text-zinc-400 italic border-l-2 border-indigo-500/60 pl-2 py-0.5 bg-indigo-950/20 rounded-r">
                              "{fact.exact_quote}"
                            </blockquote>
                          )}
                        </div>

                        {fact.tags && fact.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-[#1b2033]">
                            {fact.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="font-mono text-[8px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SOURCES */}
          {activeTab === 'sources' && (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400 flex items-center justify-between pb-1 border-b border-[#1c2237]">
                <span>Ingested Research Sources ({sources.length})</span>
                <span className="text-[11px] font-mono text-zinc-500">
                  Deleting a source removes its raw markdown & chunk splits.
                </span>
              </div>

              {sources.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs border border-dashed border-[#232a42] rounded-xl">
                  No sources ingested for this project sandbox.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {sources.map((src) => {
                    const isDeleting = isDeletingSourceId === src.source_id
                    return (
                      <div
                        key={src.source_id}
                        className="p-3.5 bg-[#131728] border border-[#21273e] hover:border-[#2d3554] rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-zinc-100 truncate max-w-md">
                              {src.title}
                            </h4>
                            <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                              {src.source_type}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono flex-wrap">
                            <span>{src.total_chunks} chunks</span>
                            <span>•</span>
                            <span>{new Date(src.created_at).toLocaleDateString()}</span>
                            {src.url && (
                              <>
                                <span>•</span>
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-400 hover:underline flex items-center gap-0.5 truncate max-w-xs"
                                >
                                  <span>{src.url}</span>
                                  <ExternalLink className="w-2.5 h-2.5 inline" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 1-Click Delete Source */}
                        <button
                          type="button"
                          onClick={() => handleDeleteSource(src.source_id)}
                          disabled={isDeleting}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          <span>Delete Source</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DELIVERABLES */}
          {activeTab === 'deliverables' && (
            <div className="space-y-6">
              {/* Teleprompter Scripts Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-[#1c2237]">
                  <div className="flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-zinc-200">
                      Teleprompter Scripts ({scripts.length})
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    750–1,000w spoken transcripts
                  </span>
                </div>

                {scripts.length === 0 ? (
                  <div className="py-6 text-center text-zinc-500 text-xs border border-dashed border-[#232a42] rounded-lg">
                    No scripts synthesized yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {scripts.map((s) => {
                      const isDeleting = isDeletingScriptId === s.script_id
                      return (
                        <div
                          key={s.script_id}
                          className="p-3 bg-[#131728] border border-[#21273e] hover:border-[#2d3554] rounded-lg flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] font-bold text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/60">
                                {s.episode_id}
                              </span>
                              <h4 className="font-semibold text-zinc-100 truncate">
                                {s.title}
                              </h4>
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2">
                              <span>{s.total_word_count} words</span>
                              <span>•</span>
                              <span>~{s.estimated_speaking_minutes} mins</span>
                              <span>•</span>
                              <span>{new Date(s.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteScript(s.script_id)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                            title="Delete Script"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Presentation Decks Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-[#1c2237]">
                  <div className="flex items-center gap-1.5">
                    <Presentation className="w-4 h-4 text-violet-400" />
                    <h3 className="text-xs font-bold text-zinc-200">
                      16:9 Presentation Decks ({decks.length})
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Dual-variant synchronized decks
                  </span>
                </div>

                {decks.length === 0 ? (
                  <div className="py-6 text-center text-zinc-500 text-xs border border-dashed border-[#232a42] rounded-lg">
                    No presentation slide decks generated yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {decks.map((d) => {
                      const isDeleting = isDeletingDeckId === d.deck_id
                      return (
                        <div
                          key={d.deck_id}
                          className="p-3 bg-[#131728] border border-[#21273e] hover:border-[#2d3554] rounded-lg flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <h4 className="font-semibold text-zinc-100 truncate">
                              {d.script_title || d.deck_id}
                            </h4>
                            <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2">
                              <span>{d.total_slides} slides</span>
                              <span>•</span>
                              <span>{Math.round(d.total_duration_s)}s</span>
                              <span>•</span>
                              <span>{new Date(d.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteDeck(d.deck_id)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                            title="Delete Presentation Deck"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Curriculum Arcs Section */}
              {arcs.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-[#1c2237]">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold text-zinc-200">
                        Curriculum Arcs ({arcs.length})
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {arcs.map((a) => {
                      const isDeleting = isDeletingArcId === a.arc_id
                      return (
                        <div
                          key={a.arc_id}
                          className="p-3 bg-[#131728] border border-[#21273e] hover:border-[#2d3554] rounded-lg flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <h4 className="font-semibold text-zinc-100 truncate">
                              {a.title}
                            </h4>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              {a.total_episodes} episodes • {a.topic}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteArc(a.arc_id)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                            title="Delete Curriculum Arc"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PURGE & ERASE */}
          {activeTab === 'purge' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold">Selective Vault Erasure</div>
                  <div>
                    Purging deletes artifacts permanently from your local filesystem vault. All purge actions require a two-step confirmation.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Facts Purge */}
                <div className="p-4 rounded-xl bg-[#131728] border border-[#232a42] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Purge Atomic Facts</span>
                      </h4>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {facts.length} notes
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Removes all atomic fact cards, exact quotes, and footnote anchors in <code>vault/projects/.../facts/</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePurge('facts', 'Atomic Facts')}
                    disabled={isPurgingTarget !== null}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      confirmPurgeTarget === 'facts'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50'
                    }`}
                  >
                    {isPurgingTarget === 'facts' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {confirmPurgeTarget === 'facts'
                        ? 'Confirm: Purge All Facts'
                        : 'Purge Facts'}
                    </span>
                  </button>
                </div>

                {/* 2. Sources Purge */}
                <div className="p-4 rounded-xl bg-[#131728] border border-[#232a42] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Purge Sources</span>
                      </h4>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {sources.length} sources
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Removes all raw ingested source texts, chunk manifests, and practitioner briefs in <code>vault/projects/.../sources/</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePurge('sources', 'Research Sources')}
                    disabled={isPurgingTarget !== null}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      confirmPurgeTarget === 'sources'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50'
                    }`}
                  >
                    {isPurgingTarget === 'sources' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {confirmPurgeTarget === 'sources'
                        ? 'Confirm: Purge All Sources'
                        : 'Purge Sources'}
                    </span>
                  </button>
                </div>

                {/* 3. Curriculum Arcs Purge */}
                <div className="p-4 rounded-xl bg-[#131728] border border-[#232a42] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-violet-400" />
                        <span>Purge Curriculum Arcs</span>
                      </h4>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {arcs.length} arcs
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Removes 6-episode course blueprints, pedagogical arcs, and episode metadata in <code>vault/projects/.../curriculum/</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePurge('curriculum', 'Curriculum Arcs')}
                    disabled={isPurgingTarget !== null}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      confirmPurgeTarget === 'curriculum'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50'
                    }`}
                  >
                    {isPurgingTarget === 'curriculum' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {confirmPurgeTarget === 'curriculum'
                        ? 'Confirm: Purge Arcs'
                        : 'Purge Curriculum'}
                    </span>
                  </button>
                </div>

                {/* 4. Scripts Purge */}
                <div className="p-4 rounded-xl bg-[#131728] border border-[#232a42] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-amber-400" />
                        <span>Purge Teleprompter Scripts</span>
                      </h4>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {scripts.length} scripts
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Removes spoken teleprompter transcripts and pacing cues in <code>vault/projects/.../scripts/</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePurge('scripts', 'Teleprompter Scripts')}
                    disabled={isPurgingTarget !== null}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      confirmPurgeTarget === 'scripts'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50'
                    }`}
                  >
                    {isPurgingTarget === 'scripts' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {confirmPurgeTarget === 'scripts'
                        ? 'Confirm: Purge Scripts'
                        : 'Purge Scripts'}
                    </span>
                  </button>
                </div>

                {/* 5. Slides Purge */}
                <div className="p-4 rounded-xl bg-[#131728] border border-[#232a42] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        <Presentation className="w-3.5 h-3.5 text-sky-400" />
                        <span>Purge Slide Decks</span>
                      </h4>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {decks.length} decks
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Removes 16:9 dual-variant slide decks and cognitive metrics in <code>vault/projects/.../presentations/</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePurge('presentations', 'Slide Decks')}
                    disabled={isPurgingTarget !== null}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      confirmPurgeTarget === 'presentations'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50'
                    }`}
                  >
                    {isPurgingTarget === 'presentations' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {confirmPurgeTarget === 'presentations'
                        ? 'Confirm: Purge Slides'
                        : 'Purge Slides'}
                    </span>
                  </button>
                </div>

                {/* 6. Reset Entire Project Workspace */}
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 space-y-3 flex flex-col justify-between md:col-span-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                        <FolderX className="w-4 h-4 text-rose-400" />
                        <span>Reset Entire Project Workspace</span>
                      </h4>
                      <span className="font-mono text-[10px] uppercase font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800/60">
                        Full Soft-Reset
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-300/80 leading-relaxed">
                      Purges all facts, sources, curriculum arcs, scripts, and presentation decks from the active workspace. Vault will be restored to a clean, empty state ready for fresh research.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePurge('all', 'Entire Project Workspace')}
                    disabled={isPurgingTarget !== null}
                    className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      confirmPurgeTarget === 'all'
                        ? 'bg-rose-600 text-white animate-pulse shadow-lg'
                        : 'bg-rose-900/40 hover:bg-rose-900/70 text-rose-200 border border-rose-700/60'
                    }`}
                  >
                    {isPurgingTarget === 'all' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FolderX className="w-4 h-4" />
                    )}
                    <span>
                      {confirmPurgeTarget === 'all'
                        ? '🚨 Confirm Destructive Reset: Purge All Workspace Data'
                        : 'Reset Entire Project Workspace'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
