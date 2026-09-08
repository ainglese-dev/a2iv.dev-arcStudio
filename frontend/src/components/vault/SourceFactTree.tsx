import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Eye,
  Trash2,
  Plus,
  Search,
  Layers,
  Database,
  Video,
  FileText,
  BookOpen,
  HelpCircle,
  ExternalLink,
  X,
} from 'lucide-react'
import type { AtomicFact, SourceMetadata, ToastItem } from '../../types'
import { FactCard } from '../facts/FactCard'
import { IngestSourceModal } from '../sources/IngestSourceModal'
import { SourceDetailModal } from '../sources/SourceDetailModal'

export interface SourceFactTreeProps {
  sources: SourceMetadata[]
  facts: AtomicFact[]
  selectedSourceId: string | null
  onSelectSource: (sourceId: string | null) => void
  onExtractFacts: (sourceId: string) => void
  onDeleteSource: (sourceId: string) => void
  onDeleteFact: (factId: string) => void
  onRefreshSources: () => void
  extractingSourceId: string | null
  isLoadingSources?: boolean
  isLoadingFacts?: boolean
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
  onRefreshAll?: () => Promise<void> | void
}

// Category filter tabs matching blueprint
const CATEGORY_TABS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Spec', value: 'technical_spec' },
  { label: 'Metric', value: 'benchmark_metric' },
  { label: 'Architecture', value: 'architecture_decision' },
  { label: 'Pitfall', value: 'pitfall_caveat' },
  { label: 'Workflow', value: 'workflow_step' },
  { label: 'Code', value: 'code_pattern' },
  { label: 'Claim', value: 'claim' },
  { label: 'Takeaway', value: 'takeaway' },
]

export const SourceFactTree: React.FC<SourceFactTreeProps> = ({
  sources,
  facts,
  selectedSourceId,
  onSelectSource,
  onExtractFacts,
  onDeleteSource,
  onDeleteFact,
  onRefreshSources,
  extractingSourceId,
  isLoadingSources = false,
  isLoadingFacts = false,
  onToast,
  onRefreshAll,
}) => {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false)
  const [inspectingSourceId, setInspectingSourceId] = useState<string | null>(null)

  // 2-click delete source safeguard state
  const [pendingDeleteSourceId, setPendingDeleteSourceId] = useState<string | null>(null)
  const deleteSourceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Expanded sources state (default: all sources expanded)
  const [expandedSourceIds, setExpandedSourceIds] = useState<Set<string>>(() => {
    return new Set(sources.map((s) => s.source_id).concat('ungrouped'))
  })

  // Automatically expand newly added sources or selected source
  useEffect(() => {
    if (selectedSourceId) {
      setExpandedSourceIds((prev) => {
        const next = new Set(prev)
        next.add(selectedSourceId)
        return next
      })
    }
  }, [selectedSourceId])

  // Sync expanded sources on first load when sources populate
  const prevSourcesLength = useRef(sources.length)
  useEffect(() => {
    if (prevSourcesLength.current === 0 && sources.length > 0) {
      setExpandedSourceIds(new Set(sources.map((s) => s.source_id).concat('ungrouped')))
    }
    prevSourcesLength.current = sources.length
  }, [sources])

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'youtube_transcript':
        return <Video className="w-3.5 h-3.5 text-rose-400" />
      case 'article':
        return <FileText className="w-3.5 h-3.5 text-sky-400" />
      case 'documentation':
        return <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
    }
  }

  // Handle 2-click inline deletion of source
  const handleDeleteSourceClick = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation()
    if (pendingDeleteSourceId === sourceId) {
      if (deleteSourceTimeoutRef.current) clearTimeout(deleteSourceTimeoutRef.current)
      setPendingDeleteSourceId(null)
      onDeleteSource(sourceId)
    } else {
      setPendingDeleteSourceId(sourceId)
      if (deleteSourceTimeoutRef.current) clearTimeout(deleteSourceTimeoutRef.current)
      deleteSourceTimeoutRef.current = setTimeout(() => {
        setPendingDeleteSourceId(null)
      }, 3000)
    }
  }

  const toggleSourceExpand = (sourceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setExpandedSourceIds((prev) => {
      const next = new Set(prev)
      if (next.has(sourceId)) {
        next.delete(sourceId)
      } else {
        next.add(sourceId)
      }
      return next
    })
  }

  // Group facts by source_id
  const { factsBySource, ungroupedFacts } = useMemo(() => {
    const map: Record<string, AtomicFact[]> = {}
    const ungrouped: AtomicFact[] = []
    const sourceIdSet = new Set(sources.map((s) => s.source_id))

    facts.forEach((fact) => {
      if (fact.source_id && sourceIdSet.has(fact.source_id)) {
        if (!map[fact.source_id]) map[fact.source_id] = []
        map[fact.source_id].push(fact)
      } else {
        ungrouped.push(fact)
      }
    })

    return { factsBySource: map, ungroupedFacts: ungrouped }
  }, [sources, facts])

  // Category matching helper
  const matchesFactCategory = (factCategory: string, cat: string) => {
    if (cat === 'all') return true
    const normalized = factCategory.toLowerCase()
    if (cat === 'benchmark_metric') {
      return normalized === 'benchmark_metric' || normalized === 'metric'
    }
    if (cat === 'technical_spec') {
      return normalized === 'technical_spec' || normalized === 'definition'
    }
    return normalized === cat.toLowerCase()
  }

  // Search matching helper
  const matchesFactSearch = (fact: AtomicFact, query: string) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      fact.statement.toLowerCase().includes(q) ||
      (fact.exact_quote && fact.exact_quote.toLowerCase().includes(q)) ||
      (fact.tags && fact.tags.some((t) => t.toLowerCase().includes(q))) ||
      fact.category.toLowerCase().includes(q)
    )
  }

  // Filter sources and their child facts
  const filteredTree = useMemo(() => {
    const q = search.trim().toLowerCase()

    return sources.map((source) => {
      const allSourceFacts = factsBySource[source.source_id] || []
      const matchingFacts = allSourceFacts.filter(
        (f) => matchesFactCategory(f.category, selectedCategory) && matchesFactSearch(f, q)
      )

      const sourceMatchesSearch =
        !q ||
        source.title.toLowerCase().includes(q) ||
        source.source_id.toLowerCase().includes(q) ||
        (source.author && source.author.toLowerCase().includes(q)) ||
        (source.tags && source.tags.some((t) => t.toLowerCase().includes(q)))

      const isVisible =
        selectedCategory === 'all'
          ? sourceMatchesSearch || matchingFacts.length > 0
          : matchingFacts.length > 0

      return {
        source,
        allFacts: allSourceFacts,
        matchingFacts,
        isVisible,
      }
    })
  }, [sources, factsBySource, search, selectedCategory])

  // Filter ungrouped facts
  const filteredUngroupedFacts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ungroupedFacts.filter(
      (f) => matchesFactCategory(f.category, selectedCategory) && matchesFactSearch(f, q)
    )
  }, [ungroupedFacts, search, selectedCategory])

  // Visible source IDs for expand/collapse all
  const visibleSourceIds = useMemo(() => {
    const ids = filteredTree.filter((t) => t.isVisible).map((t) => t.source.source_id)
    if (filteredUngroupedFacts.length > 0) ids.push('ungrouped')
    return ids
  }, [filteredTree, filteredUngroupedFacts])

  const isAllExpanded =
    visibleSourceIds.length > 0 && visibleSourceIds.every((id) => expandedSourceIds.has(id))

  const handleToggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedSourceIds(new Set())
    } else {
      setExpandedSourceIds(new Set(visibleSourceIds))
    }
  }

  const visibleSourcesCount = filteredTree.filter((t) => t.isVisible).length

  return (
    <div className="source-fact-tree flex flex-col h-full bg-[#0b0d14] overflow-hidden">
      {/* Vault Tree Header Bar */}
      <div className="tree-header p-3 border-b border-[#232738] bg-[#111420] flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <h2 className="font-semibold text-sm text-zinc-100 font-sans tracking-tight">
            Source & Fact Vault
          </h2>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              {sources.length} sources
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-950/70 text-indigo-300 border border-indigo-800/60">
              {facts.length} facts
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Expand/Collapse All Quick Toggle */}
          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#161a29] hover:bg-[#202538] border border-[#262b3d] text-xs text-zinc-300 transition-colors font-mono"
            title={isAllExpanded ? 'Collapse all sources' : 'Expand all sources'}
          >
            {isAllExpanded ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                <span>Expand All</span>
              </>
            )}
          </button>

          {/* Ingest Source Primary CTA */}
          <button
            type="button"
            onClick={() => setIsIngestModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ingest Source</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter Sub-Bar */}
      <div className="tree-search-bar p-2.5 border-b border-[#232738] bg-[#0e101a] space-y-2 shrink-0">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Filter sources, authors, fact statements, quotes, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#141724] border border-[#23273a] rounded-md pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-sans transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedCategory(tab.value)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors border ${
                selectedCategory === tab.value
                  ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                  : 'bg-[#141724] border-[#222638] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Source Filter Banner if a specific source is selected */}
        {selectedSourceId && (
          <div className="flex items-center justify-between text-[11px] px-1 text-zinc-400 pt-0.5">
            <span className="truncate">
              Selected Target: <span className="text-indigo-300 font-mono">{selectedSourceId}</span>
            </span>
            <button
              onClick={() => onSelectSource(null)}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* Main Tree Canvas */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoadingSources || isLoadingFacts ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span>Synchronizing sources and fact vault...</span>
          </div>
        ) : sources.length === 0 && facts.length === 0 ? (
          /* Empty Vault State */
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-200">Fact Vault is Empty</h3>
              <p className="text-xs text-zinc-500 max-w-sm">
                Ingest a YouTube transcript, article, or documentation to begin extracting grounded atomic facts.
              </p>
            </div>
            <button
              onClick={() => setIsIngestModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ingest First Source</span>
            </button>
          </div>
        ) : visibleSourcesCount === 0 && filteredUngroupedFacts.length === 0 ? (
          /* No Search / Filter Matches */
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-zinc-500 text-xs">
            <Search className="w-8 h-8 text-zinc-700 mb-2 stroke-[1.5]" />
            <p className="font-medium text-zinc-400">No matching sources or facts</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Try adjusting your search terms or category filter.
            </p>
            {(search || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearch('')
                  setSelectedCategory('all')
                }}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          /* Tree List */
          <div className="space-y-3">
            {filteredTree
              .filter((item) => item.isVisible)
              .map(({ source, allFacts, matchingFacts }) => {
                const isSelected = selectedSourceId === source.source_id
                const isExpanded = expandedSourceIds.has(source.source_id)
                const isExtracting = extractingSourceId === source.source_id
                const hasPendingDelete = pendingDeleteSourceId === source.source_id

                return (
                  <div
                    key={source.source_id}
                    className={`tree-source-node rounded-xl border transition-all ${
                      isSelected
                        ? 'tree-source-selected bg-[#121524] border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-[#10121c] border-[#222638] hover:border-zinc-700'
                    }`}
                  >
                    {/* Source Parent Node Header */}
                    <div
                      onClick={() => onSelectSource(isSelected ? null : source.source_id)}
                      className="p-3 flex items-start justify-between gap-3 cursor-pointer group"
                    >
                      {/* Left: Expand Chevron + Icon + Details */}
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {/* Chevron expand/collapse toggle */}
                        <button
                          type="button"
                          onClick={(e) => toggleSourceExpand(source.source_id, e)}
                          className="p-1 -ml-1 rounded hover:bg-[#1a1e30] text-zinc-400 hover:text-zinc-200 transition-colors mt-0.5 shrink-0"
                          title={isExpanded ? 'Collapse facts' : 'Expand facts'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        {/* Source Type Icon */}
                        <div className="tree-source-icon p-1.5 rounded-lg bg-[#181c2c] border border-[#282d42] shrink-0 mt-0.5">
                          {getSourceIcon(source.source_type)}
                        </div>

                        {/* Title & Metadata */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-xs text-zinc-100 group-hover:text-white truncate">
                              {source.title}
                            </h3>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-700 shrink-0">
                                Target Selected
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono flex-wrap">
                            {source.author && (
                              <span className="text-zinc-400 truncate max-w-[140px]">
                                {source.author}
                              </span>
                            )}
                            {source.author && <span>&bull;</span>}
                            <span className="text-zinc-500 truncate max-w-[120px]">
                              {source.source_id}
                            </span>
                            <span>&bull;</span>
                            <span>{new Date(source.created_at).toLocaleDateString()}</span>
                          </div>

                          {/* Pills: Fact Count + Chunks */}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                allFacts.length > 0
                                  ? 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60 font-semibold'
                                  : 'bg-[#151826] text-zinc-500 border-[#232738]'
                              }`}
                            >
                              {allFacts.length} {allFacts.length === 1 ? 'fact' : 'facts'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#141724] text-zinc-400 border border-[#222638]">
                              {source.total_chunks} chunks
                            </span>
                            {selectedCategory !== 'all' && (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                ({matchingFacts.length} match)
                              </span>
                            )}
                          </div>

                          {/* 0 Facts Prominent Call-to-Action in Card Body */}
                          {allFacts.length === 0 && (
                            <div className="pt-2">
                              <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                <div className="text-[11px] text-zinc-300 leading-snug">
                                  <span className="font-semibold text-indigo-300">Ready for extraction:</span>{' '}
                                  Parse atomic propositions, technical specs, and architecture decisions.
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onExtractFacts(source.source_id)
                                  }}
                                  disabled={isExtracting}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all shrink-0 cursor-pointer"
                                >
                                  <Sparkles
                                    className={`w-3.5 h-3.5 ${
                                      isExtracting ? 'animate-spin text-amber-300' : 'text-indigo-200'
                                    }`}
                                  />
                                  <span>
                                    {isExtracting ? 'Extracting Facts...' : 'Extract Atomic Facts'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Action Buttons Toolbar */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Inspect Chunks Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setInspectingSourceId(source.source_id)
                          }}
                          className="p-1.5 rounded hover:bg-[#1c2032] text-zinc-400 hover:text-zinc-200 transition-colors"
                          title="Inspect chunks and text"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Extract Facts Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onExtractFacts(source.source_id)
                          }}
                          disabled={isExtracting}
                          className="p-1.5 rounded hover:bg-indigo-950/80 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                          title="Extract atomic facts from this source"
                        >
                          <Sparkles
                            className={`w-3.5 h-3.5 ${
                              isExtracting ? 'animate-spin text-amber-400' : ''
                            }`}
                          />
                        </button>

                        {/* External Link if URL */}
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded hover:bg-[#1c2032] text-zinc-400 hover:text-zinc-200 transition-colors"
                            title="Open external source URL"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Delete Source with 2-click confirm */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSourceClick(e, source.source_id)}
                          className={`px-1.5 py-1 rounded transition-all flex items-center gap-1 text-[10px] font-mono ${
                            hasPendingDelete
                              ? 'bg-rose-600 text-white border border-rose-500 animate-pulse font-semibold'
                              : 'hover:bg-rose-950/80 text-zinc-500 hover:text-rose-400 border border-transparent'
                          }`}
                          title={
                            hasPendingDelete
                              ? 'Click again to permanently delete source'
                              : 'Delete source'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {hasPendingDelete && <span>Confirm?</span>}
                        </button>
                      </div>
                    </div>

                    {/* Child Facts (Indented Branch Under Source) */}
                    {isExpanded && (
                      <div className="tree-child-facts-branch border-t border-[#1d2133] bg-[#0c0e18] px-3 py-3 rounded-b-xl">
                        <div className="border-l-2 border-indigo-500/30 pl-3 ml-3 sm:ml-4 space-y-2.5">
                          {allFacts.length === 0 ? (
                            /* 0 Facts Extracted Gentle Empty State Card */
                            <div className="tree-empty-facts bg-[#121422] border border-dashed border-[#23273c] rounded-lg p-3 text-center space-y-2">
                              <p className="text-xs text-zinc-400 font-sans">
                                No atomic facts extracted yet from this source.
                              </p>
                              <button
                                type="button"
                                onClick={() => onExtractFacts(source.source_id)}
                                disabled={isExtracting}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-sm"
                              >
                                <Sparkles
                                  className={`w-3.5 h-3.5 ${
                                    isExtracting ? 'animate-spin text-amber-300' : ''
                                  }`}
                                />
                                <span>
                                  {isExtracting ? 'Extracting Facts...' : 'Extract Facts with AI'}
                                </span>
                              </button>
                            </div>
                          ) : matchingFacts.length === 0 ? (
                            /* Filter mismatch state */
                            <div className="p-2 text-xs text-zinc-500 font-mono italic">
                              No facts match the active filter in this source ({allFacts.length} total).
                            </div>
                          ) : (
                            /* List of Child Facts */
                            matchingFacts.map((fact) => (
                              <FactCard
                                key={fact.fact_id}
                                fact={fact}
                                onDelete={onDeleteFact}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

            {/* Ungrouped Facts Section (if any facts exist without parent source) */}
            {filteredUngroupedFacts.length > 0 && (
              <div className="tree-ungrouped-node rounded-xl border border-[#222638] bg-[#10121c] overflow-hidden">
                <div
                  onClick={() => toggleSourceExpand('ungrouped')}
                  className="p-3 flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => toggleSourceExpand('ungrouped', e)}
                      className="p-1 -ml-1 rounded hover:bg-[#1a1e30] text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      {expandedSourceIds.has('ungrouped') ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <div className="tree-source-icon p-1.5 rounded-lg bg-[#181c2c] border border-[#282d42]">
                      <Database className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-zinc-200">
                        Direct / Ungrouped Facts
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {filteredUngroupedFacts.length} standalone notes in vault
                      </p>
                    </div>
                  </div>
                </div>

                {expandedSourceIds.has('ungrouped') && (
                  <div className="tree-ungrouped-facts-branch border-t border-[#1d2133] bg-[#0c0e18] px-3 py-3">
                    <div className="border-l-2 border-indigo-500/30 pl-3 ml-3 sm:ml-4 space-y-2.5">
                      {filteredUngroupedFacts.map((fact) => (
                        <FactCard
                          key={fact.fact_id}
                          fact={fact}
                          onDelete={onDeleteFact}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ingest Source Modal (with integrated Seed Reality on top right) */}
      <IngestSourceModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onSuccess={async () => {
          if (onRefreshAll) {
            await onRefreshAll()
          } else {
            onRefreshSources()
          }
        }}
        onToast={onToast}
      />

      {/* Source Detail Modal */}
      <SourceDetailModal
        sourceId={inspectingSourceId}
        isOpen={Boolean(inspectingSourceId)}
        onClose={() => setInspectingSourceId(null)}
      />
    </div>
  )
}
